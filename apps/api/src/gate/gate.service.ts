import { Injectable } from '@nestjs/common';
import { Ticket } from '@prisma/client';
import { PinoLogger } from 'nestjs-pino';
import { GateValidationResult, TicketStatus } from '@eventful/contracts';
import { PrismaService } from '../prisma/prisma.service';
import { QrService } from '../tickets/qr.service';

type TicketWithDetails = Ticket & {
  customer: { name: string };
  event: { title: string };
  seat: { rowLabel: string; seatNumber: number } | null;
};

export interface GateTicketSummary {
  id: string;
  customerName: string;
  eventTitle: string;
  seatLabel: string | null;
  usedAt: Date | null;
}

export interface GateValidationOutcome {
  result: GateValidationResult;
  ticket: GateTicketSummary | null;
}

function toSummary(ticket: TicketWithDetails): GateTicketSummary {
  return {
    id: ticket.id,
    customerName: ticket.customer.name,
    eventTitle: ticket.event.title,
    seatLabel: ticket.seat
      ? `${ticket.seat.rowLabel}${ticket.seat.seatNumber}`
      : null,
    usedAt: ticket.usedAt,
  };
}

@Injectable()
export class GateService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly qrService: QrService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(GateService.name);
  }

  async validate(
    eventId: string,
    payload: string,
  ): Promise<GateValidationOutcome> {
    const parsed = this.qrService.parsePayload(payload);
    if (!parsed) {
      return { result: GateValidationResult.NOT_FOUND, ticket: null };
    }

    const isAuthentic = this.qrService.verify(
      parsed.ticketId,
      parsed.signature,
    );
    if (!isAuthentic) {
      return { result: GateValidationResult.NOT_FOUND, ticket: null };
    }

    const ticket = await this.findTicketWithDetails(parsed.ticketId);
    if (!ticket) {
      return { result: GateValidationResult.NOT_FOUND, ticket: null };
    }

    if (ticket.eventId !== eventId) {
      return {
        result: GateValidationResult.WRONG_EVENT,
        ticket: toSummary(ticket),
      };
    }

    const wasClaimed = await this.claimTicket(ticket.id);
    const result = wasClaimed
      ? GateValidationResult.VALID
      : GateValidationResult.ALREADY_USED;

    return { result, ticket: toSummary(ticket) };
  }

  private async findTicketWithDetails(
    ticketId: string,
  ): Promise<TicketWithDetails | null> {
    try {
      return await this.prisma.ticket.findUnique({
        where: { id: ticketId },
        include: {
          customer: { select: { name: true } },
          event: { select: { title: true } },
          seat: { select: { rowLabel: true, seatNumber: true } },
        },
      });
    } catch (error) {
      this.logger.error(
        { err: error },
        'Failed to look up ticket for gate validation',
      );
      throw error;
    } finally {
      this.logger.debug('Gate ticket lookup completed');
    }
  }

  private async claimTicket(ticketId: string): Promise<boolean> {
    try {
      const result = await this.prisma.ticket.updateMany({
        where: { id: ticketId, status: TicketStatus.ISSUED },
        data: { status: TicketStatus.USED, usedAt: new Date() },
      });
      return result.count === 1;
    } catch (error) {
      this.logger.error({ err: error }, 'Failed to claim ticket at the gate');
      throw error;
    } finally {
      this.logger.debug('Gate ticket claim completed');
    }
  }
}

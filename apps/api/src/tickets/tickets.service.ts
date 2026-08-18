import { ForbiddenException, Injectable } from '@nestjs/common';
import { Event, Reservation, Ticket } from '@prisma/client';
import { PinoLogger } from 'nestjs-pino';
import {
  buildPaginationMeta,
  EventLayoutType,
  PaginatedResult,
  TicketStatus,
} from '@eventful/contracts';
import { castPrismaEnum } from '../common/utils/prisma-enum.util';
import { PrismaService } from '../prisma/prisma.service';
import { ReservationTransactionClient } from '../reservations/strategies/allocation-strategy.interface';
import { TicketNotFoundException } from './exceptions/ticket-not-found.exception';
import { generateTicketPublicCode } from './ticket-public-code.util';

type ReservationWithEvent = Reservation & { event: Event };

type SeatIdResolver = (
  tx: ReservationTransactionClient,
  reservation: ReservationWithEvent,
) => Promise<Array<string | null>>;

const SEAT_ID_RESOLVERS: Record<EventLayoutType, SeatIdResolver> = {
  [EventLayoutType.SEATED]: async (tx, reservation) => {
    const holds = await tx.reservationSeat.findMany({
      where: { reservationId: reservation.id },
      select: { seatId: true },
    });
    return holds.map((hold) => hold.seatId);
  },
  [EventLayoutType.GENERAL_ADMISSION]: (_tx, reservation) =>
    Promise.resolve(
      Array.from({ length: reservation.quantity ?? 0 }, () => null),
    ),
};

@Injectable()
export class TicketsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(TicketsService.name);
  }

  async issueForReservation(
    tx: ReservationTransactionClient,
    reservation: ReservationWithEvent,
  ): Promise<Ticket[]> {
    const resolveSeatIds =
      SEAT_ID_RESOLVERS[
        castPrismaEnum<EventLayoutType>(reservation.event.layoutType)
      ];
    const seatIds = await resolveSeatIds(tx, reservation);

    try {
      await tx.ticket.createMany({
        data: seatIds.map((seatId) => ({
          reservationId: reservation.id,
          eventId: reservation.eventId,
          customerId: reservation.customerId,
          seatId,
          status: TicketStatus.ISSUED,
          qrPublicCode: generateTicketPublicCode(),
        })),
      });
    } catch (error) {
      this.logger.error(
        { err: error },
        'Failed to issue tickets for reservation',
      );
      throw error;
    } finally {
      this.logger.debug('Ticket issuance completed');
    }

    return tx.ticket.findMany({ where: { reservationId: reservation.id } });
  }

  async listMine(
    customerId: string,
    page: number,
    pageSize: number,
  ): Promise<PaginatedResult<Ticket>> {
    const where = { customerId };

    try {
      const [data, total] = await Promise.all([
        this.prisma.ticket.findMany({
          where,
          include: { event: { include: { venue: true } }, seat: true },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        this.prisma.ticket.count({ where }),
      ]);

      return { data, meta: buildPaginationMeta(page, pageSize, total) };
    } catch (error) {
      this.logger.error({ err: error }, "Failed to list customer's tickets");
      throw error;
    } finally {
      this.logger.debug('Ticket listing completed');
    }
  }

  async findOwned(customerId: string, ticketId: string): Promise<Ticket> {
    const ticket = await this.findByIdOrThrow(ticketId);

    if (ticket.customerId !== customerId) {
      throw new ForbiddenException();
    }

    return ticket;
  }

  async findByPublicCode(qrPublicCode: string): Promise<Ticket> {
    let ticket: Ticket | null;

    try {
      ticket = await this.prisma.ticket.findUnique({
        where: { qrPublicCode },
        include: { event: { include: { venue: true } }, seat: true },
      });
    } catch (error) {
      this.logger.error(
        { err: error },
        'Failed to look up ticket by public code',
      );
      throw error;
    } finally {
      this.logger.debug('Ticket lookup by public code completed');
    }

    if (!ticket) {
      throw new TicketNotFoundException();
    }

    return ticket;
  }

  private async findByIdOrThrow(ticketId: string): Promise<Ticket> {
    let ticket: Ticket | null;

    try {
      ticket = await this.prisma.ticket.findUnique({
        where: { id: ticketId },
        include: { event: { include: { venue: true } }, seat: true },
      });
    } catch (error) {
      this.logger.error({ err: error }, 'Failed to look up ticket');
      throw error;
    } finally {
      this.logger.debug('Ticket lookup completed');
    }

    if (!ticket) {
      throw new TicketNotFoundException();
    }

    return ticket;
  }
}

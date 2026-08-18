import { Injectable } from '@nestjs/common';
import { Event, Payment, Reservation, Ticket } from '@prisma/client';
import { PinoLogger } from 'nestjs-pino';
import {
  EventLayoutType,
  PaymentOutcome,
  PaymentStatus,
  ReservationStatus,
} from '@eventful/contracts';
import { castPrismaEnum } from '../common/utils/prisma-enum.util';
import { PrismaService } from '../prisma/prisma.service';
import { ReservationNotFoundException } from '../reservations/exceptions/reservation-not-found.exception';
import { ReservationNotOwnedException } from '../reservations/exceptions/reservation-not-owned.exception';
import { ReservationTransactionClient } from '../reservations/strategies/allocation-strategy.interface';
import { AllocationStrategyFactory } from '../reservations/strategies/allocation-strategy.factory';
import { TicketsService } from '../tickets/tickets.service';
import { PaymentAlreadyProcessedException } from './exceptions/payment-already-processed.exception';
import { ReservationExpiredException } from './exceptions/reservation-expired.exception';
import { ReservationNotPendingException } from './exceptions/reservation-not-pending.exception';

type ReservationWithEvent = Reservation & { event: Event };

export interface PaymentResult {
  payment: Payment;
  tickets: Ticket[];
}

type OutcomeHandler = (
  tx: ReservationTransactionClient,
  reservation: ReservationWithEvent,
) => Promise<PaymentResult>;

@Injectable()
export class PaymentsService {
  private readonly outcomeHandlers: Record<PaymentOutcome, OutcomeHandler>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly allocationStrategyFactory: AllocationStrategyFactory,
    private readonly ticketsService: TicketsService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(PaymentsService.name);
    this.outcomeHandlers = {
      [PaymentOutcome.APPROVE]: (tx, reservation) =>
        this.approve(tx, reservation),
      [PaymentOutcome.DECLINE]: (tx, reservation) =>
        this.decline(tx, reservation),
    };
  }

  async pay(
    customerId: string,
    reservationId: string,
    outcome: PaymentOutcome,
  ): Promise<PaymentResult> {
    const reservation = await this.findOwnedReservationOrThrow(
      customerId,
      reservationId,
    );

    const existingPayment = await this.prisma.payment.findUnique({
      where: { reservationId },
    });
    if (existingPayment) {
      throw new PaymentAlreadyProcessedException();
    }

    try {
      return await this.prisma.$transaction((tx) =>
        this.outcomeHandlers[outcome](tx, reservation),
      );
    } catch (error) {
      this.logger.warn({ err: error }, 'Payment attempt failed');
      throw error;
    } finally {
      this.logger.debug('Payment attempt completed');
    }
  }

  private async approve(
    tx: ReservationTransactionClient,
    reservation: ReservationWithEvent,
  ): Promise<PaymentResult> {
    await this.claimReservationOrThrow(
      tx,
      reservation.id,
      ReservationStatus.CONFIRMED,
    );

    const payment = await tx.payment.create({
      data: {
        reservationId: reservation.id,
        amountCents: reservation.event.priceCents,
        status: PaymentStatus.APPROVED,
      },
    });

    const tickets = await this.ticketsService.issueForReservation(
      tx,
      reservation,
    );

    return { payment, tickets };
  }

  private async decline(
    tx: ReservationTransactionClient,
    reservation: ReservationWithEvent,
  ): Promise<PaymentResult> {
    await this.claimReservationOrThrow(
      tx,
      reservation.id,
      ReservationStatus.CANCELLED,
    );

    const strategy = this.allocationStrategyFactory.for(
      castPrismaEnum<EventLayoutType>(reservation.event.layoutType),
    );
    await strategy.release(tx, reservation);

    const payment = await tx.payment.create({
      data: {
        reservationId: reservation.id,
        amountCents: reservation.event.priceCents,
        status: PaymentStatus.DECLINED,
        declineReason: 'Simulated decline requested by the customer.',
      },
    });

    return { payment, tickets: [] };
  }

  private async claimReservationOrThrow(
    tx: ReservationTransactionClient,
    reservationId: string,
    nextStatus: ReservationStatus,
  ): Promise<void> {
    const claimed = await tx.reservation.updateMany({
      where: { id: reservationId, status: ReservationStatus.PENDING },
      data: { status: nextStatus },
    });

    if (claimed.count === 0) {
      await this.throwClaimFailureReason(tx, reservationId);
    }
  }

  private async throwClaimFailureReason(
    tx: ReservationTransactionClient,
    reservationId: string,
  ): Promise<never> {
    const existingPayment = await tx.payment.findUnique({
      where: { reservationId },
    });
    if (existingPayment) {
      throw new PaymentAlreadyProcessedException();
    }

    const reservation = await tx.reservation.findUnique({
      where: { id: reservationId },
    });
    if (
      reservation &&
      castPrismaEnum<ReservationStatus>(reservation.status) ===
        ReservationStatus.EXPIRED
    ) {
      throw new ReservationExpiredException();
    }

    throw new ReservationNotPendingException();
  }

  private async findOwnedReservationOrThrow(
    customerId: string,
    reservationId: string,
  ): Promise<ReservationWithEvent> {
    let reservation: ReservationWithEvent | null;

    try {
      reservation = await this.prisma.reservation.findUnique({
        where: { id: reservationId },
        include: { event: true },
      });
    } catch (error) {
      this.logger.error(
        { err: error },
        'Failed to look up reservation for payment',
      );
      throw error;
    } finally {
      this.logger.debug('Reservation lookup for payment completed');
    }

    if (!reservation) {
      throw new ReservationNotFoundException();
    }

    if (reservation.customerId !== customerId) {
      throw new ReservationNotOwnedException();
    }

    return reservation;
  }
}

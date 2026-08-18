import { BadRequestException, Injectable } from '@nestjs/common';
import { Event, Prisma, Reservation } from '@prisma/client';
import { ReservationStatus } from '@eventful/contracts';
import { SeatAlreadyTakenException } from '../exceptions/seat-already-taken.exception';
import { SeatNotFoundException } from '../exceptions/seat-not-found.exception';
import { buildReservationExpiry } from '../reservations.constants';
import {
  AllocationStrategy,
  ReservationTransactionClient,
  ReserveInput,
} from './allocation-strategy.interface';

function isUniqueConstraintViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}

@Injectable()
export class SeatedAllocationStrategy implements AllocationStrategy {
  async reserve(
    tx: ReservationTransactionClient,
    event: Event,
    customerId: string,
    input: ReserveInput,
  ): Promise<Reservation> {
    const seatIds = input.seatIds ?? [];
    if (seatIds.length === 0) {
      throw new BadRequestException('At least one seat must be selected.');
    }

    const seatsBelongingToEvent = await tx.seat.findMany({
      where: { id: { in: seatIds }, seatMap: { eventId: event.id } },
      select: { id: true },
    });
    if (seatsBelongingToEvent.length !== seatIds.length) {
      throw new SeatNotFoundException();
    }

    const reservation = await tx.reservation.create({
      data: {
        eventId: event.id,
        customerId,
        status: ReservationStatus.PENDING,
        expiresAt: buildReservationExpiry(),
      },
    });

    try {
      await tx.reservationSeat.createMany({
        data: seatIds.map((seatId) => ({
          reservationId: reservation.id,
          seatId,
        })),
      });
    } catch (error) {
      if (isUniqueConstraintViolation(error)) {
        throw new SeatAlreadyTakenException();
      }
      throw error;
    }

    return reservation;
  }

  async release(
    tx: ReservationTransactionClient,
    reservation: Reservation,
  ): Promise<void> {
    await tx.reservationSeat.deleteMany({
      where: { reservationId: reservation.id },
    });
  }
}

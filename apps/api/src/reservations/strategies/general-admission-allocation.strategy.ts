import { BadRequestException, Injectable } from '@nestjs/common';
import { Event, Reservation } from '@prisma/client';
import { ReservationStatus } from '@eventful/contracts';
import { InsufficientCapacityException } from '../exceptions/insufficient-capacity.exception';
import {
  MAX_GENERAL_ADMISSION_QUANTITY_PER_RESERVATION,
  buildReservationExpiry,
} from '../reservations.constants';
import {
  AllocationStrategy,
  ReservationTransactionClient,
  ReserveInput,
} from './allocation-strategy.interface';

@Injectable()
export class GeneralAdmissionAllocationStrategy implements AllocationStrategy {
  async reserve(
    tx: ReservationTransactionClient,
    event: Event,
    customerId: string,
    input: ReserveInput,
  ): Promise<Reservation> {
    const quantity = input.quantity ?? 0;
    if (quantity < 1) {
      throw new BadRequestException('Quantity must be at least 1.');
    }
    if (quantity > MAX_GENERAL_ADMISSION_QUANTITY_PER_RESERVATION) {
      throw new BadRequestException(
        `Quantity cannot exceed ${MAX_GENERAL_ADMISSION_QUANTITY_PER_RESERVATION} per reservation.`,
      );
    }

    const pool = await tx.generalAdmissionPool.findUniqueOrThrow({
      where: { eventId: event.id },
    });

    const updateResult = await tx.generalAdmissionPool.updateMany({
      where: { eventId: event.id, sold: { lte: pool.capacity - quantity } },
      data: { sold: { increment: quantity } },
    });

    if (updateResult.count === 0) {
      throw new InsufficientCapacityException();
    }

    return tx.reservation.create({
      data: {
        eventId: event.id,
        customerId,
        status: ReservationStatus.PENDING,
        quantity,
        expiresAt: buildReservationExpiry(),
      },
    });
  }

  async release(
    tx: ReservationTransactionClient,
    reservation: Reservation,
  ): Promise<void> {
    await tx.generalAdmissionPool.updateMany({
      where: { eventId: reservation.eventId },
      data: { sold: { decrement: reservation.quantity ?? 0 } },
    });
  }
}

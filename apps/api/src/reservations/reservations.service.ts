import { Injectable } from '@nestjs/common';
import { Event, Reservation } from '@prisma/client';
import { PinoLogger } from 'nestjs-pino';
import { EventLayoutType, EventStatus } from '@eventful/contracts';
import { castPrismaEnum } from '../common/utils/prisma-enum.util';
import { EventNotFoundException } from '../events/exceptions/event-not-found.exception';
import { PrismaService } from '../prisma/prisma.service';
import { ReservationNotFoundException } from './exceptions/reservation-not-found.exception';
import { ReservationNotOwnedException } from './exceptions/reservation-not-owned.exception';
import { ReserveInput } from './strategies/allocation-strategy.interface';
import { AllocationStrategyFactory } from './strategies/allocation-strategy.factory';

@Injectable()
export class ReservationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly allocationStrategyFactory: AllocationStrategyFactory,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(ReservationsService.name);
  }

  async createReservation(
    customerId: string,
    eventId: string,
    input: ReserveInput,
  ): Promise<Reservation> {
    const event = await this.findPublishedEventOrThrow(eventId);
    const strategy = this.allocationStrategyFactory.for(
      castPrismaEnum<EventLayoutType>(event.layoutType),
    );

    try {
      return await this.prisma.$transaction((tx) =>
        strategy.reserve(tx, event, customerId, input),
      );
    } catch (error) {
      this.logger.warn({ err: error }, 'Reservation attempt failed');
      throw error;
    } finally {
      this.logger.debug('Reservation attempt completed');
    }
  }

  async findOwned(
    customerId: string,
    reservationId: string,
  ): Promise<Reservation> {
    let reservation: Reservation | null;

    try {
      reservation = await this.prisma.reservation.findUnique({
        where: { id: reservationId },
      });
    } catch (error) {
      this.logger.error({ err: error }, 'Failed to look up reservation');
      throw error;
    } finally {
      this.logger.debug('Reservation lookup completed');
    }

    if (!reservation) {
      throw new ReservationNotFoundException();
    }

    if (reservation.customerId !== customerId) {
      throw new ReservationNotOwnedException();
    }

    return reservation;
  }

  private async findPublishedEventOrThrow(eventId: string): Promise<Event> {
    let event: Event | null;

    try {
      event = await this.prisma.event.findUnique({ where: { id: eventId } });
    } catch (error) {
      this.logger.error(
        { err: error },
        'Failed to look up event for reservation',
      );
      throw error;
    } finally {
      this.logger.debug('Event lookup for reservation completed');
    }

    if (!event) {
      throw new EventNotFoundException();
    }

    if (castPrismaEnum<EventStatus>(event.status) !== EventStatus.PUBLISHED) {
      throw new EventNotFoundException();
    }

    return event;
  }
}

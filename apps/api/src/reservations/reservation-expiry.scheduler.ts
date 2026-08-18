import { Injectable } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { Event, Reservation } from '@prisma/client';
import { PinoLogger } from 'nestjs-pino';
import {
  EventLayoutType,
  KnownNotificationType,
  ReservationStatus,
} from '@eventful/contracts';
import { castPrismaEnum } from '../common/utils/prisma-enum.util';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  RESERVATION_EXPIRY_SWEEP_INTERVAL_MS,
  RESERVATION_EXPIRY_WARNING_WINDOW_MS,
} from './reservations.constants';
import { AllocationStrategyFactory } from './strategies/allocation-strategy.factory';

type ExpiredReservation = Reservation & { event: Event };

@Injectable()
export class ReservationExpiryScheduler {
  constructor(
    private readonly prisma: PrismaService,
    private readonly allocationStrategyFactory: AllocationStrategyFactory,
    private readonly notificationsService: NotificationsService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(ReservationExpiryScheduler.name);
  }

  @Interval(RESERVATION_EXPIRY_SWEEP_INTERVAL_MS)
  async sweepExpiredReservations(): Promise<void> {
    let expired: ExpiredReservation[];

    try {
      expired = await this.prisma.reservation.findMany({
        where: {
          status: ReservationStatus.PENDING,
          expiresAt: { lt: new Date() },
        },
        include: { event: true },
      });
    } catch (error) {
      this.logger.error({ err: error }, 'Failed to load expired reservations');
      return;
    } finally {
      this.logger.debug('Expired reservation lookup completed');
    }

    for (const reservation of expired) {
      await this.releaseOne(reservation);
    }
  }

  @Interval(RESERVATION_EXPIRY_SWEEP_INTERVAL_MS)
  async warnExpiringSoonReservations(): Promise<void> {
    let expiringSoon: ExpiredReservation[];

    try {
      expiringSoon = await this.prisma.reservation.findMany({
        where: {
          status: ReservationStatus.PENDING,
          expiryWarningSentAt: null,
          expiresAt: {
            gte: new Date(),
            lt: new Date(Date.now() + RESERVATION_EXPIRY_WARNING_WINDOW_MS),
          },
        },
        include: { event: true },
      });
    } catch (error) {
      this.logger.error(
        { err: error },
        'Failed to load soon-to-expire reservations',
      );
      return;
    } finally {
      this.logger.debug('Soon-to-expire reservation lookup completed');
    }

    for (const reservation of expiringSoon) {
      await this.warnOne(reservation);
    }
  }

  private async warnOne(reservation: ExpiredReservation): Promise<void> {
    try {
      await this.notificationsService.create({
        userId: reservation.customerId,
        type: KnownNotificationType.RESERVATION_EXPIRING_SOON,
        title: 'Your reservation is expiring soon',
        message: `Your hold for ${reservation.event.title} expires soon. Complete your payment to keep your seats.`,
        relatedEntityType: 'RESERVATION',
        relatedEntityId: reservation.id,
      });

      await this.prisma.reservation.update({
        where: { id: reservation.id },
        data: { expiryWarningSentAt: new Date() },
      });
    } catch (error) {
      this.logger.warn(
        { err: error, reservationId: reservation.id },
        'Failed to send expiring-soon notification',
      );
    }
  }

  private async releaseOne(reservation: ExpiredReservation): Promise<void> {
    const strategy = this.allocationStrategyFactory.for(
      castPrismaEnum<EventLayoutType>(reservation.event.layoutType),
    );

    try {
      await this.prisma.$transaction(async (tx) => {
        const claimed = await tx.reservation.updateMany({
          where: { id: reservation.id, status: ReservationStatus.PENDING },
          data: { status: ReservationStatus.EXPIRED },
        });

        if (claimed.count === 0) {
          return;
        }

        await strategy.release(tx, reservation);
      });
    } catch (error) {
      this.logger.error(
        { err: error, reservationId: reservation.id },
        'Failed to release expired reservation',
      );
    }
  }
}

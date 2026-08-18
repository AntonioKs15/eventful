import { EventLayoutType, ReservationStatus } from '@eventful/contracts';
import { ReservationExpiryScheduler } from './reservation-expiry.scheduler';

function createMockLogger() {
  return {
    setContext: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
}

function createScheduler() {
  const fakeTx = { reservation: { updateMany: jest.fn() } };
  const prisma = {
    reservation: { findMany: jest.fn() },
    $transaction: jest.fn((callback: (tx: unknown) => unknown) =>
      callback(fakeTx),
    ),
  };
  const strategy = { release: jest.fn() };
  const allocationStrategyFactory = {
    for: jest.fn().mockReturnValue(strategy),
  };
  const notificationsService = { create: jest.fn() };

  const scheduler = new ReservationExpiryScheduler(
    prisma as never,
    allocationStrategyFactory as never,
    notificationsService as never,
    createMockLogger() as never,
  );

  return { scheduler, prisma, strategy, fakeTx, notificationsService };
}

const expiredReservation = {
  id: 'reservation-1',
  event: { layoutType: EventLayoutType.SEATED },
};

describe('ReservationExpiryScheduler', () => {
  it('releases the allocation when it wins the race to claim the expired reservation', async () => {
    const { scheduler, prisma, strategy, fakeTx } = createScheduler();
    prisma.reservation.findMany.mockResolvedValue([expiredReservation]);
    fakeTx.reservation.updateMany.mockResolvedValue({ count: 1 });

    await scheduler.sweepExpiredReservations();

    expect(fakeTx.reservation.updateMany).toHaveBeenCalledWith({
      where: { id: 'reservation-1', status: ReservationStatus.PENDING },
      data: { status: ReservationStatus.EXPIRED },
    });
    expect(strategy.release).toHaveBeenCalledWith(fakeTx, expiredReservation);
  });

  it('does not release the allocation when payment already confirmed it first', async () => {
    const { scheduler, prisma, strategy, fakeTx } = createScheduler();
    prisma.reservation.findMany.mockResolvedValue([expiredReservation]);
    fakeTx.reservation.updateMany.mockResolvedValue({ count: 0 });

    await scheduler.sweepExpiredReservations();

    expect(strategy.release).not.toHaveBeenCalled();
  });

  it('keeps sweeping the remaining reservations when one release fails', async () => {
    const { scheduler, prisma, strategy, fakeTx } = createScheduler();
    const other = {
      id: 'reservation-2',
      event: { layoutType: EventLayoutType.SEATED },
    };
    prisma.reservation.findMany.mockResolvedValue([expiredReservation, other]);
    fakeTx.reservation.updateMany.mockResolvedValue({ count: 1 });
    strategy.release
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce(undefined);

    await expect(scheduler.sweepExpiredReservations()).resolves.toBeUndefined();

    expect(strategy.release).toHaveBeenCalledTimes(2);
  });
});

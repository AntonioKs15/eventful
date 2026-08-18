import { EventLayoutType, EventStatus } from '@eventful/contracts';
import { EventNotFoundException } from '../events/exceptions/event-not-found.exception';
import { ReservationNotFoundException } from './exceptions/reservation-not-found.exception';
import { ReservationNotOwnedException } from './exceptions/reservation-not-owned.exception';
import { ReservationsService } from './reservations.service';

function createMockLogger() {
  return {
    setContext: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
}

function createService() {
  const fakeTx = { marker: 'fake-tx' };
  const prisma = {
    event: { findUnique: jest.fn() },
    reservation: { findUnique: jest.fn() },
    $transaction: jest.fn((callback: (tx: unknown) => unknown) =>
      callback(fakeTx),
    ),
  };
  const strategy = { reserve: jest.fn(), release: jest.fn() };
  const allocationStrategyFactory = {
    for: jest.fn().mockReturnValue(strategy),
  };

  const service = new ReservationsService(
    prisma as never,
    allocationStrategyFactory as never,
    createMockLogger() as never,
  );

  return { service, prisma, strategy, allocationStrategyFactory, fakeTx };
}

const publishedSeatedEvent = {
  id: 'event-1',
  status: EventStatus.PUBLISHED,
  layoutType: EventLayoutType.SEATED,
};

describe('ReservationsService.createReservation', () => {
  it('throws EventNotFoundException when the event does not exist', async () => {
    const { service, prisma } = createService();
    prisma.event.findUnique.mockResolvedValue(null);

    await expect(
      service.createReservation('customer-1', 'event-1', {
        seatIds: ['seat-1'],
      }),
    ).rejects.toBeInstanceOf(EventNotFoundException);
  });

  it('throws EventNotFoundException when the event is not published', async () => {
    const { service, prisma } = createService();
    prisma.event.findUnique.mockResolvedValue({
      ...publishedSeatedEvent,
      status: EventStatus.DRAFT,
    });

    await expect(
      service.createReservation('customer-1', 'event-1', {
        seatIds: ['seat-1'],
      }),
    ).rejects.toBeInstanceOf(EventNotFoundException);
  });

  it('picks the strategy matching the event layout type and runs it inside a transaction', async () => {
    const { service, prisma, strategy, allocationStrategyFactory, fakeTx } =
      createService();
    prisma.event.findUnique.mockResolvedValue(publishedSeatedEvent);
    strategy.reserve.mockResolvedValue({ id: 'reservation-1' });

    const result = await service.createReservation('customer-1', 'event-1', {
      seatIds: ['seat-1'],
    });

    expect(allocationStrategyFactory.for).toHaveBeenCalledWith(
      EventLayoutType.SEATED,
    );
    expect(strategy.reserve).toHaveBeenCalledWith(
      fakeTx,
      publishedSeatedEvent,
      'customer-1',
      { seatIds: ['seat-1'] },
    );
    expect(result).toEqual({ id: 'reservation-1' });
  });
});

describe('ReservationsService.findOwned', () => {
  it('throws ReservationNotFoundException when the reservation does not exist', async () => {
    const { service, prisma } = createService();
    prisma.reservation.findUnique.mockResolvedValue(null);

    await expect(
      service.findOwned('customer-1', 'reservation-1'),
    ).rejects.toBeInstanceOf(ReservationNotFoundException);
  });

  it('throws ReservationNotOwnedException when a different customer requests it', async () => {
    const { service, prisma } = createService();
    prisma.reservation.findUnique.mockResolvedValue({
      id: 'reservation-1',
      customerId: 'customer-1',
    });

    await expect(
      service.findOwned('customer-2', 'reservation-1'),
    ).rejects.toBeInstanceOf(ReservationNotOwnedException);
  });

  it('returns the reservation when it belongs to the requesting customer', async () => {
    const { service, prisma } = createService();
    prisma.reservation.findUnique.mockResolvedValue({
      id: 'reservation-1',
      customerId: 'customer-1',
    });

    const reservation = await service.findOwned('customer-1', 'reservation-1');

    expect(reservation.id).toBe('reservation-1');
  });
});

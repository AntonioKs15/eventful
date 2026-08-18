import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { SeatAlreadyTakenException } from '../exceptions/seat-already-taken.exception';
import { SeatNotFoundException } from '../exceptions/seat-not-found.exception';
import { SeatedAllocationStrategy } from './seated-allocation.strategy';

function createMockTx() {
  return {
    seat: { findMany: jest.fn() },
    reservation: { create: jest.fn() },
    reservationSeat: { createMany: jest.fn(), deleteMany: jest.fn() },
  };
}

const fakeEvent = { id: 'event-1' } as never;

function uniqueConstraintError() {
  return new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: '6.19.3',
  });
}

describe('SeatedAllocationStrategy.reserve', () => {
  const strategy = new SeatedAllocationStrategy();

  it('rejects when no seatIds are provided', async () => {
    const tx = createMockTx();

    await expect(
      strategy.reserve(tx as never, fakeEvent, 'customer-1', {}),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects when a requested seat does not belong to the event', async () => {
    const tx = createMockTx();
    tx.seat.findMany.mockResolvedValue([{ id: 'seat-1' }]);

    await expect(
      strategy.reserve(tx as never, fakeEvent, 'customer-1', {
        seatIds: ['seat-1', 'seat-2'],
      }),
    ).rejects.toBeInstanceOf(SeatNotFoundException);
  });

  it('creates a PENDING reservation with a hold on each requested seat', async () => {
    const tx = createMockTx();
    tx.seat.findMany.mockResolvedValue([{ id: 'seat-1' }, { id: 'seat-2' }]);
    tx.reservation.create.mockResolvedValue({ id: 'reservation-1' });
    tx.reservationSeat.createMany.mockResolvedValue({ count: 2 });

    const reservation = await strategy.reserve(
      tx as never,
      fakeEvent,
      'customer-1',
      {
        seatIds: ['seat-1', 'seat-2'],
      },
    );

    expect(reservation.id).toBe('reservation-1');
    expect(tx.reservationSeat.createMany).toHaveBeenCalledWith({
      data: [
        { reservationId: 'reservation-1', seatId: 'seat-1' },
        { reservationId: 'reservation-1', seatId: 'seat-2' },
      ],
    });
  });

  it('translates a unique-constraint violation into SeatAlreadyTakenException', async () => {
    const tx = createMockTx();
    tx.seat.findMany.mockResolvedValue([{ id: 'seat-1' }]);
    tx.reservation.create.mockResolvedValue({ id: 'reservation-1' });
    tx.reservationSeat.createMany.mockRejectedValue(uniqueConstraintError());

    await expect(
      strategy.reserve(tx as never, fakeEvent, 'customer-1', {
        seatIds: ['seat-1'],
      }),
    ).rejects.toBeInstanceOf(SeatAlreadyTakenException);
  });
});

describe('SeatedAllocationStrategy.release', () => {
  const strategy = new SeatedAllocationStrategy();

  it('deletes every seat hold belonging to the reservation', async () => {
    const tx = createMockTx();
    tx.reservationSeat.deleteMany.mockResolvedValue({ count: 2 });

    await strategy.release(tx as never, { id: 'reservation-1' } as never);

    expect(tx.reservationSeat.deleteMany).toHaveBeenCalledWith({
      where: { reservationId: 'reservation-1' },
    });
  });
});

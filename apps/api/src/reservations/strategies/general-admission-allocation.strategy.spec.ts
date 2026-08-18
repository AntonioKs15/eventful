import { BadRequestException } from '@nestjs/common';
import { InsufficientCapacityException } from '../exceptions/insufficient-capacity.exception';
import { GeneralAdmissionAllocationStrategy } from './general-admission-allocation.strategy';

function createMockTx() {
  return {
    generalAdmissionPool: {
      findUniqueOrThrow: jest.fn(),
      updateMany: jest.fn(),
    },
    reservation: { create: jest.fn() },
  };
}

const fakeEvent = { id: 'event-1' } as never;

describe('GeneralAdmissionAllocationStrategy.reserve', () => {
  const strategy = new GeneralAdmissionAllocationStrategy();

  it('rejects when no quantity is provided', async () => {
    const tx = createMockTx();

    await expect(
      strategy.reserve(tx as never, fakeEvent, 'customer-1', {}),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a quantity above the per-reservation maximum', async () => {
    const tx = createMockTx();

    await expect(
      strategy.reserve(tx as never, fakeEvent, 'customer-1', { quantity: 999 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('atomically increments sold only when capacity allows it, in a single conditional UPDATE', async () => {
    const tx = createMockTx();
    tx.generalAdmissionPool.findUniqueOrThrow.mockResolvedValue({
      capacity: 100,
      sold: 90,
    });
    tx.generalAdmissionPool.updateMany.mockResolvedValue({ count: 1 });
    tx.reservation.create.mockResolvedValue({
      id: 'reservation-1',
      quantity: 5,
    });

    await strategy.reserve(tx as never, fakeEvent, 'customer-1', {
      quantity: 5,
    });

    expect(tx.generalAdmissionPool.updateMany).toHaveBeenCalledWith({
      where: { eventId: 'event-1', sold: { lte: 95 } },
      data: { sold: { increment: 5 } },
    });
  });

  it('throws InsufficientCapacityException when the conditional update matches zero rows', async () => {
    const tx = createMockTx();
    tx.generalAdmissionPool.findUniqueOrThrow.mockResolvedValue({
      capacity: 100,
      sold: 98,
    });
    tx.generalAdmissionPool.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      strategy.reserve(tx as never, fakeEvent, 'customer-1', { quantity: 5 }),
    ).rejects.toBeInstanceOf(InsufficientCapacityException);
    expect(tx.reservation.create).not.toHaveBeenCalled();
  });

  it('creates a PENDING reservation carrying the requested quantity on success', async () => {
    const tx = createMockTx();
    tx.generalAdmissionPool.findUniqueOrThrow.mockResolvedValue({
      capacity: 100,
      sold: 0,
    });
    tx.generalAdmissionPool.updateMany.mockResolvedValue({ count: 1 });
    tx.reservation.create.mockResolvedValue({
      id: 'reservation-1',
      quantity: 3,
    });

    const reservation = await strategy.reserve(
      tx as never,
      fakeEvent,
      'customer-1',
      {
        quantity: 3,
      },
    );

    expect(reservation.quantity).toBe(3);
    const createArgs = tx.reservation.create.mock.calls[0][0];
    expect(createArgs.data.quantity).toBe(3);
    expect(createArgs.data.eventId).toBe('event-1');
    expect(createArgs.data.customerId).toBe('customer-1');
  });
});

describe('GeneralAdmissionAllocationStrategy.release', () => {
  const strategy = new GeneralAdmissionAllocationStrategy();

  it('decrements sold by the reservation quantity', async () => {
    const tx = createMockTx();
    tx.generalAdmissionPool.updateMany.mockResolvedValue({ count: 1 });

    await strategy.release(
      tx as never,
      {
        id: 'reservation-1',
        eventId: 'event-1',
        quantity: 4,
      } as never,
    );

    expect(tx.generalAdmissionPool.updateMany).toHaveBeenCalledWith({
      where: { eventId: 'event-1' },
      data: { sold: { decrement: 4 } },
    });
  });
});

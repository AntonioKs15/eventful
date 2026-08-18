import { EventLayoutType } from '@eventful/contracts';
import { TicketsService } from './tickets.service';

function createMockLogger() {
  return {
    setContext: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
}

function createService() {
  const prisma = {
    ticket: { findMany: jest.fn(), count: jest.fn(), findUnique: jest.fn() },
  };
  const service = new TicketsService(
    prisma as never,
    createMockLogger() as never,
  );
  return { service, prisma };
}

function createMockTx() {
  return {
    reservationSeat: { findMany: jest.fn() },
    ticket: { createMany: jest.fn(), findMany: jest.fn() },
  };
}

describe('TicketsService.issueForReservation', () => {
  it('issues one ticket per held seat for a SEATED reservation', async () => {
    const { service } = createService();
    const tx = createMockTx();
    tx.reservationSeat.findMany.mockResolvedValue([
      { seatId: 'seat-1' },
      { seatId: 'seat-2' },
    ]);
    tx.ticket.findMany.mockResolvedValue([
      { id: 'ticket-1', seatId: 'seat-1' },
      { id: 'ticket-2', seatId: 'seat-2' },
    ]);

    const reservation = {
      id: 'reservation-1',
      eventId: 'event-1',
      customerId: 'customer-1',
      quantity: null,
      event: { layoutType: EventLayoutType.SEATED },
    };

    const tickets = await service.issueForReservation(
      tx as never,
      reservation as never,
    );

    expect(tickets).toHaveLength(2);
    const createArgs = tx.ticket.createMany.mock.calls[0][0];
    expect(createArgs.data).toHaveLength(2);
    expect(
      createArgs.data.map((t: { seatId: string }) => t.seatId).sort(),
    ).toEqual(['seat-1', 'seat-2']);
    createArgs.data.forEach((ticket: { qrPublicCode: string }) => {
      expect(typeof ticket.qrPublicCode).toBe('string');
      expect(ticket.qrPublicCode.length).toBeGreaterThan(10);
    });
    const distinctCodes = new Set(
      createArgs.data.map((t: { qrPublicCode: string }) => t.qrPublicCode),
    );
    expect(distinctCodes.size).toBe(2);
  });

  it('issues exactly `quantity` seatless tickets for a GENERAL_ADMISSION reservation', async () => {
    const { service } = createService();
    const tx = createMockTx();
    tx.ticket.findMany.mockResolvedValue([
      { id: 'ticket-1' },
      { id: 'ticket-2' },
      { id: 'ticket-3' },
    ]);

    const reservation = {
      id: 'reservation-1',
      eventId: 'event-1',
      customerId: 'customer-1',
      quantity: 3,
      event: { layoutType: EventLayoutType.GENERAL_ADMISSION },
    };

    await service.issueForReservation(tx as never, reservation as never);

    expect(tx.reservationSeat.findMany).not.toHaveBeenCalled();
    const createArgs = tx.ticket.createMany.mock.calls[0][0];
    expect(createArgs.data).toHaveLength(3);
    createArgs.data.forEach((ticket: { seatId: string | null }) => {
      expect(ticket.seatId).toBeNull();
    });
  });
});

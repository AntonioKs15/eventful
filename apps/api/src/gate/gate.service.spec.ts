import { GateValidationResult } from '@eventful/contracts';
import { GateService } from './gate.service';

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
    ticket: { findUnique: jest.fn(), updateMany: jest.fn() },
  };
  const qrService = { parsePayload: jest.fn(), verify: jest.fn() };

  const service = new GateService(
    prisma as never,
    qrService as never,
    createMockLogger() as never,
  );

  return { service, prisma, qrService };
}

const richTicket = {
  id: 'ticket-1',
  eventId: 'event-1',
  status: 'ISSUED',
  usedAt: null,
  customer: { name: 'Carlos Customer' },
  event: { title: 'Summer Sound Festival' },
  seat: null,
};

describe('GateService.validate', () => {
  it('returns NOT_FOUND without a ticket for a malformed payload', async () => {
    const { service, qrService } = createService();
    qrService.parsePayload.mockReturnValue(null);

    const outcome = await service.validate('event-1', 'not-a-real-payload');

    expect(outcome).toEqual({
      result: GateValidationResult.NOT_FOUND,
      ticket: null,
    });
  });

  it('returns the identical NOT_FOUND shape for a well-formed but forged signature', async () => {
    const { service, qrService, prisma } = createService();
    qrService.parsePayload.mockReturnValue({
      ticketId: 'ticket-1',
      signature: 'forged',
    });
    qrService.verify.mockReturnValue(false);

    const outcome = await service.validate('event-1', 'ticket-1.forged');

    expect(outcome).toEqual({
      result: GateValidationResult.NOT_FOUND,
      ticket: null,
    });
    expect(prisma.ticket.findUnique).not.toHaveBeenCalled();
  });

  it('returns NOT_FOUND when the signature is authentic but no such ticket exists', async () => {
    const { service, qrService, prisma } = createService();
    qrService.parsePayload.mockReturnValue({
      ticketId: 'ghost-ticket',
      signature: 'sig',
    });
    qrService.verify.mockReturnValue(true);
    prisma.ticket.findUnique.mockResolvedValue(null);

    const outcome = await service.validate('event-1', 'ghost-ticket.sig');

    expect(outcome).toEqual({
      result: GateValidationResult.NOT_FOUND,
      ticket: null,
    });
  });

  it('returns WRONG_EVENT when the ticket belongs to a different event than the gate is scoped to', async () => {
    const { service, qrService, prisma } = createService();
    qrService.parsePayload.mockReturnValue({
      ticketId: 'ticket-1',
      signature: 'sig',
    });
    qrService.verify.mockReturnValue(true);
    prisma.ticket.findUnique.mockResolvedValue({
      ...richTicket,
      eventId: 'other-event',
    });

    const outcome = await service.validate('event-1', 'ticket-1.sig');

    expect(outcome.result).toBe(GateValidationResult.WRONG_EVENT);
    expect(outcome.ticket).not.toBeNull();
    expect(prisma.ticket.updateMany).not.toHaveBeenCalled();
  });

  it('flips ISSUED to USED and returns VALID on first validation', async () => {
    const { service, qrService, prisma } = createService();
    qrService.parsePayload.mockReturnValue({
      ticketId: 'ticket-1',
      signature: 'sig',
    });
    qrService.verify.mockReturnValue(true);
    prisma.ticket.findUnique.mockResolvedValue(richTicket);
    prisma.ticket.updateMany.mockResolvedValue({ count: 1 });

    const outcome = await service.validate('event-1', 'ticket-1.sig');

    expect(prisma.ticket.updateMany).toHaveBeenCalledWith({
      where: { id: 'ticket-1', status: 'ISSUED' },
      data: { status: 'USED', usedAt: expect.any(Date) },
    });
    expect(outcome.result).toBe(GateValidationResult.VALID);
    expect(outcome.ticket).not.toBeNull();
  });

  it('returns ALREADY_USED on a second validation of the same ticket', async () => {
    const { service, qrService, prisma } = createService();
    qrService.parsePayload.mockReturnValue({
      ticketId: 'ticket-1',
      signature: 'sig',
    });
    qrService.verify.mockReturnValue(true);
    prisma.ticket.findUnique.mockResolvedValue({
      ...richTicket,
      status: 'USED',
    });
    prisma.ticket.updateMany.mockResolvedValue({ count: 0 });

    const outcome = await service.validate('event-1', 'ticket-1.sig');

    expect(outcome.result).toBe(GateValidationResult.ALREADY_USED);
    expect(outcome.ticket).not.toBeNull();
  });
});

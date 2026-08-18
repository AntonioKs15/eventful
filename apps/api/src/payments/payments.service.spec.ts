import {
  EventLayoutType,
  PaymentOutcome,
  ReservationStatus,
} from '@eventful/contracts';
import { ReservationNotFoundException } from '../reservations/exceptions/reservation-not-found.exception';
import { ReservationNotOwnedException } from '../reservations/exceptions/reservation-not-owned.exception';
import { PaymentAlreadyProcessedException } from './exceptions/payment-already-processed.exception';
import { ReservationExpiredException } from './exceptions/reservation-expired.exception';
import { ReservationNotPendingException } from './exceptions/reservation-not-pending.exception';
import { PaymentsService } from './payments.service';

function createMockLogger() {
  return {
    setContext: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
}

const seatedReservation = {
  id: 'reservation-1',
  eventId: 'event-1',
  customerId: 'customer-1',
  quantity: null,
  status: ReservationStatus.PENDING,
  event: {
    id: 'event-1',
    layoutType: EventLayoutType.SEATED,
    priceCents: 1000,
  },
};

function createService() {
  const fakeTx = {
    payment: { findUnique: jest.fn(), create: jest.fn() },
    reservation: { updateMany: jest.fn(), findUnique: jest.fn() },
  };
  const prisma = {
    reservation: { findUnique: jest.fn() },
    payment: { findUnique: jest.fn() },
    $transaction: jest.fn((callback: (tx: unknown) => unknown) =>
      callback(fakeTx),
    ),
  };
  const strategy = { release: jest.fn() };
  const allocationStrategyFactory = {
    for: jest.fn().mockReturnValue(strategy),
  };
  const ticketsService = { issueForReservation: jest.fn() };

  const service = new PaymentsService(
    prisma as never,
    allocationStrategyFactory as never,
    ticketsService as never,
    createMockLogger() as never,
  );

  return { service, prisma, fakeTx, strategy, ticketsService };
}

describe('PaymentsService.pay', () => {
  it('throws ReservationNotFoundException when the reservation does not exist', async () => {
    const { service, prisma } = createService();
    prisma.reservation.findUnique.mockResolvedValue(null);

    await expect(
      service.pay('customer-1', 'reservation-1', PaymentOutcome.APPROVE),
    ).rejects.toBeInstanceOf(ReservationNotFoundException);
  });

  it('throws ReservationNotOwnedException when a different customer pays', async () => {
    const { service, prisma } = createService();
    prisma.reservation.findUnique.mockResolvedValue(seatedReservation);

    await expect(
      service.pay('someone-else', 'reservation-1', PaymentOutcome.APPROVE),
    ).rejects.toBeInstanceOf(ReservationNotOwnedException);
  });

  it('throws PaymentAlreadyProcessedException when a payment already exists (idempotency pre-check)', async () => {
    const { service, prisma } = createService();
    prisma.reservation.findUnique.mockResolvedValue(seatedReservation);
    prisma.payment.findUnique.mockResolvedValue({ id: 'payment-1' });

    await expect(
      service.pay('customer-1', 'reservation-1', PaymentOutcome.APPROVE),
    ).rejects.toBeInstanceOf(PaymentAlreadyProcessedException);
  });

  describe('APPROVE', () => {
    it('confirms the reservation, records an APPROVED payment, and issues tickets', async () => {
      const { service, prisma, fakeTx, ticketsService } = createService();
      prisma.reservation.findUnique.mockResolvedValue(seatedReservation);
      prisma.payment.findUnique.mockResolvedValue(null);
      fakeTx.reservation.updateMany.mockResolvedValue({ count: 1 });
      fakeTx.payment.create.mockResolvedValue({
        id: 'payment-1',
        status: 'APPROVED',
      });
      ticketsService.issueForReservation.mockResolvedValue([
        { id: 'ticket-1' },
        { id: 'ticket-2' },
      ]);

      const result = await service.pay(
        'customer-1',
        'reservation-1',
        PaymentOutcome.APPROVE,
      );

      expect(fakeTx.reservation.updateMany).toHaveBeenCalledWith({
        where: { id: 'reservation-1', status: ReservationStatus.PENDING },
        data: { status: ReservationStatus.CONFIRMED },
      });
      expect(fakeTx.payment.create).toHaveBeenCalledWith({
        data: {
          reservationId: 'reservation-1',
          amountCents: 1000,
          status: 'APPROVED',
        },
      });
      expect(ticketsService.issueForReservation).toHaveBeenCalledWith(
        fakeTx,
        seatedReservation,
      );
      expect(result.tickets).toHaveLength(2);
    });

    it('throws ReservationExpiredException when the hold expired before payment landed', async () => {
      const { service, prisma, fakeTx } = createService();
      prisma.reservation.findUnique.mockResolvedValue(seatedReservation);
      prisma.payment.findUnique.mockResolvedValue(null);
      fakeTx.reservation.updateMany.mockResolvedValue({ count: 0 });
      fakeTx.payment.findUnique.mockResolvedValue(null);
      fakeTx.reservation.findUnique.mockResolvedValue({
        status: ReservationStatus.EXPIRED,
      });

      await expect(
        service.pay('customer-1', 'reservation-1', PaymentOutcome.APPROVE),
      ).rejects.toBeInstanceOf(ReservationExpiredException);
    });

    it('throws PaymentAlreadyProcessedException when a concurrent payment won the race', async () => {
      const { service, prisma, fakeTx } = createService();
      prisma.reservation.findUnique.mockResolvedValue(seatedReservation);
      prisma.payment.findUnique.mockResolvedValue(null);
      fakeTx.reservation.updateMany.mockResolvedValue({ count: 0 });
      fakeTx.payment.findUnique.mockResolvedValue({ id: 'payment-1' });

      await expect(
        service.pay('customer-1', 'reservation-1', PaymentOutcome.APPROVE),
      ).rejects.toBeInstanceOf(PaymentAlreadyProcessedException);
    });

    it('throws ReservationNotPendingException for any other unexpected status', async () => {
      const { service, prisma, fakeTx } = createService();
      prisma.reservation.findUnique.mockResolvedValue(seatedReservation);
      prisma.payment.findUnique.mockResolvedValue(null);
      fakeTx.reservation.updateMany.mockResolvedValue({ count: 0 });
      fakeTx.payment.findUnique.mockResolvedValue(null);
      fakeTx.reservation.findUnique.mockResolvedValue({
        status: ReservationStatus.CANCELLED,
      });

      await expect(
        service.pay('customer-1', 'reservation-1', PaymentOutcome.APPROVE),
      ).rejects.toBeInstanceOf(ReservationNotPendingException);
    });
  });

  describe('DECLINE', () => {
    it('cancels the reservation, releases the allocation, and records a DECLINED payment without issuing tickets', async () => {
      const { service, prisma, fakeTx, strategy, ticketsService } =
        createService();
      prisma.reservation.findUnique.mockResolvedValue(seatedReservation);
      prisma.payment.findUnique.mockResolvedValue(null);
      fakeTx.reservation.updateMany.mockResolvedValue({ count: 1 });
      fakeTx.payment.create.mockResolvedValue({
        id: 'payment-1',
        status: 'DECLINED',
      });

      const result = await service.pay(
        'customer-1',
        'reservation-1',
        PaymentOutcome.DECLINE,
      );

      expect(fakeTx.reservation.updateMany).toHaveBeenCalledWith({
        where: { id: 'reservation-1', status: ReservationStatus.PENDING },
        data: { status: ReservationStatus.CANCELLED },
      });
      expect(strategy.release).toHaveBeenCalledWith(fakeTx, seatedReservation);
      expect(fakeTx.payment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          reservationId: 'reservation-1',
          status: 'DECLINED',
        }),
      });
      expect(ticketsService.issueForReservation).not.toHaveBeenCalled();
      expect(result.tickets).toEqual([]);
    });
  });
});

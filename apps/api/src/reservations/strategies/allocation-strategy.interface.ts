import { Event, Prisma, Reservation } from '@prisma/client';

export type ReservationTransactionClient = Prisma.TransactionClient;

export interface ReserveInput {
  seatIds?: string[];
  quantity?: number;
}

export interface AllocationStrategy {
  reserve(
    tx: ReservationTransactionClient,
    event: Event,
    customerId: string,
    input: ReserveInput,
  ): Promise<Reservation>;

  release(
    tx: ReservationTransactionClient,
    reservation: Reservation,
  ): Promise<void>;
}

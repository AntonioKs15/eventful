import { ReservationStatus } from "@eventful/contracts";
import { apiRequest } from "../api/api-client";
import { EventSummary } from "../events/types";

export interface Reservation {
  id: string;
  eventId: string;
  customerId: string;
  status: ReservationStatus;
  quantity: number | null;
  expiresAt: string;
}

export interface ReservationWithEvent extends Reservation {
  event: EventSummary;
}

export interface CreateReservationInput {
  eventId: string;
  seatIds?: string[];
  quantity?: number;
}

export function createReservation(input: CreateReservationInput): Promise<Reservation> {
  return apiRequest("/reservations", { method: "POST", body: input });
}

export function getReservation(id: string): Promise<ReservationWithEvent> {
  return apiRequest(`/reservations/${id}`);
}

import { PaginatedResult, TicketStatus } from "@eventful/contracts";
import { apiRequest } from "../api/api-client";
import { EventSummary } from "../events/types";

export interface TicketSeat {
  id: string;
  rowLabel: string;
  seatNumber: number;
}

export interface Ticket {
  id: string;
  eventId: string;
  customerId: string;
  seatId: string | null;
  status: TicketStatus;
  qrPublicCode: string;
  usedAt: string | null;
  createdAt: string;
  event: EventSummary;
  seat: TicketSeat | null;
}

export interface TicketQrCode {
  payload: string;
  dataUrl: string;
}

export function listMyTickets(page: number, pageSize: number): Promise<PaginatedResult<Ticket>> {
  return apiRequest("/tickets/mine", { query: { page, pageSize } });
}

export function getTicket(id: string): Promise<Ticket> {
  return apiRequest(`/tickets/${id}`);
}

export function getTicketByPublicCode(code: string): Promise<Ticket> {
  return apiRequest(`/tickets/share/${code}`);
}

export function getTicketQr(id: string): Promise<TicketQrCode> {
  return apiRequest(`/tickets/${id}/qr`);
}

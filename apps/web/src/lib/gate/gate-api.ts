import { GateValidationResult } from "@eventful/contracts";
import { apiRequest } from "../api/api-client";

export interface GateTicketSummary {
  id: string;
  customerName: string;
  eventTitle: string;
  seatLabel: string | null;
  usedAt: string | null;
}

export interface GateValidationOutcome {
  result: GateValidationResult;
  ticket: GateTicketSummary | null;
}

export function validateTicket(eventId: string, payload: string): Promise<GateValidationOutcome> {
  return apiRequest("/gate/validate", { method: "POST", body: { eventId, payload } });
}

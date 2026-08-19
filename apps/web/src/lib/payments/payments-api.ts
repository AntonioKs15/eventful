import { PaymentOutcome } from "@eventful/contracts";
import { apiRequest } from "../api/api-client";

export interface PaymentTicket {
  id: string;
  status: string;
  qrPublicCode: string;
  seatId: string | null;
}

export interface PaymentResult {
  payment: {
    id: string;
    status: string;
    amountCents: number;
    declineReason: string | null;
  };
  tickets: PaymentTicket[];
}

export function pay(reservationId: string, outcome: PaymentOutcome): Promise<PaymentResult> {
  return apiRequest("/payments", { method: "POST", body: { reservationId, outcome } });
}

export function redeemWithSubscription(reservationId: string): Promise<PaymentResult> {
  return apiRequest("/payments/redeem-with-subscription", {
    method: "POST",
    body: { reservationId },
  });
}

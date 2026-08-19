import { SubscriptionStatus } from "@eventful/contracts";
import { apiRequest } from "../api/api-client";

export interface Subscription {
  id: string;
  userId: string;
  status: SubscriptionStatus;
  freeTicketsRemaining: number;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
}

export function getMySubscription(): Promise<Subscription | null> {
  return apiRequest("/subscriptions/me");
}

export function createCheckoutSession(): Promise<{ url: string }> {
  return apiRequest("/subscriptions/checkout-session", { method: "POST" });
}

export function createPortalSession(): Promise<{ url: string }> {
  return apiRequest("/subscriptions/portal-session", { method: "POST" });
}

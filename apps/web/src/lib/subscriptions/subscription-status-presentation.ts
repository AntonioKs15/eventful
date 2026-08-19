import { SubscriptionStatus } from "@eventful/contracts";
import { StatusTone } from "@/components/ui/status-pill";

const SUBSCRIPTION_STATUS_TONE: Record<SubscriptionStatus, StatusTone> = {
  [SubscriptionStatus.ACTIVE]: "positive",
  [SubscriptionStatus.PAST_DUE]: "warning",
  [SubscriptionStatus.CANCELED]: "negative",
};

const SUBSCRIPTION_STATUS_LABEL: Record<SubscriptionStatus, string> = {
  [SubscriptionStatus.ACTIVE]: "Active",
  [SubscriptionStatus.PAST_DUE]: "Payment past due",
  [SubscriptionStatus.CANCELED]: "Canceled",
};

export function subscriptionStatusTone(status: SubscriptionStatus): StatusTone {
  return SUBSCRIPTION_STATUS_TONE[status];
}

export function subscriptionStatusLabel(status: SubscriptionStatus): string {
  return SUBSCRIPTION_STATUS_LABEL[status];
}

/**
 * Notification `type` is a free-form string in the database and DTOs, not a closed
 * enum, so any module can create new notification types without a migration.
 * `KnownNotificationType` just documents the types the backend emits today.
 */
export const KnownNotificationType = {
  TICKET_ISSUED: "TICKET_ISSUED",
  PAYMENT_DECLINED: "PAYMENT_DECLINED",
  RESERVATION_EXPIRING_SOON: "RESERVATION_EXPIRING_SOON",
  SUBSCRIPTION_RENEWED: "SUBSCRIPTION_RENEWED",
  SUBSCRIPTION_PAYMENT_FAILED: "SUBSCRIPTION_PAYMENT_FAILED",
} as const;

export type NotificationType =
  | (typeof KnownNotificationType)[keyof typeof KnownNotificationType]
  | (string & {});

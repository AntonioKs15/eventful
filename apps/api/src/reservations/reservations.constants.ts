export const RESERVATION_HOLD_MINUTES = 10;
export const MILLISECONDS_PER_MINUTE = 60 * 1000;
export const MAX_GENERAL_ADMISSION_QUANTITY_PER_RESERVATION = 10;
export const RESERVATION_EXPIRY_SWEEP_INTERVAL_MS = 30 * 1000;
export const RESERVATION_EXPIRY_WARNING_WINDOW_MS = 2 * MILLISECONDS_PER_MINUTE;

export function buildReservationExpiry(now: Date = new Date()): Date {
  return new Date(
    now.getTime() + RESERVATION_HOLD_MINUTES * MILLISECONDS_PER_MINUTE,
  );
}

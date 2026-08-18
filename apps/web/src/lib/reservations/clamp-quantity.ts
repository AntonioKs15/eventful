const MIN_QUANTITY = 1;

export function clampQuantity(requested: number, remaining: number): number {
  if (remaining <= 0) {
    return 0;
  }

  return Math.min(Math.max(requested, MIN_QUANTITY), remaining);
}

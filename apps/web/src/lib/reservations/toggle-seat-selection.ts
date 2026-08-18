export interface SelectableSeat {
  id: string;
  isAvailable: boolean;
}

export function toggleSeatSelection(selected: Set<string>, seat: SelectableSeat): Set<string> {
  if (!seat.isAvailable) {
    return selected;
  }

  const next = new Set(selected);
  if (next.has(seat.id)) {
    next.delete(seat.id);
  } else {
    next.add(seat.id);
  }

  return next;
}

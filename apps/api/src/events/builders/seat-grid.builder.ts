const ROW_LABEL_ALPHABET_START = 'A'.charCodeAt(0);
const FIRST_SEAT_NUMBER = 1;

export interface SeatGridEntry {
  rowLabel: string;
  seatNumber: number;
}

export function buildSeatGrid(rows: number, columns: number): SeatGridEntry[] {
  return Array.from({ length: rows }).flatMap((_, rowIndex) =>
    Array.from({ length: columns }).map((_, columnIndex) => ({
      rowLabel: String.fromCharCode(ROW_LABEL_ALPHABET_START + rowIndex),
      seatNumber: columnIndex + FIRST_SEAT_NUMBER,
    })),
  );
}

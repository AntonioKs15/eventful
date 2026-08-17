import { buildSeatGrid } from './seat-grid.builder';

describe('buildSeatGrid', () => {
  it('builds rows labelled A, B, C... with 1-indexed seat numbers per row', () => {
    const seats = buildSeatGrid(2, 3);

    expect(seats).toEqual([
      { rowLabel: 'A', seatNumber: 1 },
      { rowLabel: 'A', seatNumber: 2 },
      { rowLabel: 'A', seatNumber: 3 },
      { rowLabel: 'B', seatNumber: 1 },
      { rowLabel: 'B', seatNumber: 2 },
      { rowLabel: 'B', seatNumber: 3 },
    ]);
  });

  it('produces exactly rows × columns seats', () => {
    const seats = buildSeatGrid(5, 8);

    expect(seats).toHaveLength(40);
  });
});

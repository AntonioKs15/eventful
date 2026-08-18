import { toggleSeatSelection } from "./toggle-seat-selection";

const availableSeat = { id: "seat-1", isAvailable: true };
const takenSeat = { id: "seat-2", isAvailable: false };

describe("toggleSeatSelection", () => {
  it("adds an available, unselected seat to the selection", () => {
    const result = toggleSeatSelection(new Set(), availableSeat);

    expect(result.has("seat-1")).toBe(true);
  });

  it("removes an already-selected seat when clicked again", () => {
    const result = toggleSeatSelection(new Set(["seat-1"]), availableSeat);

    expect(result.has("seat-1")).toBe(false);
  });

  it("never selects a seat that is not available, without calling the API", () => {
    const result = toggleSeatSelection(new Set(), takenSeat);

    expect(result.has("seat-2")).toBe(false);
  });

  it("leaves the rest of the selection untouched when rejecting a taken seat", () => {
    const result = toggleSeatSelection(new Set(["seat-1"]), takenSeat);

    expect(Array.from(result)).toEqual(["seat-1"]);
  });

  it("does not mutate the selection passed in", () => {
    const original = new Set<string>();

    toggleSeatSelection(original, availableSeat);

    expect(original.size).toBe(0);
  });
});

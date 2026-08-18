import { clampQuantity } from "./clamp-quantity";

describe("clampQuantity", () => {
  it("keeps a value within range unchanged", () => {
    expect(clampQuantity(3, 10)).toBe(3);
  });

  it("never goes below 1, even if the requested value is 0 or negative", () => {
    expect(clampQuantity(0, 10)).toBe(1);
    expect(clampQuantity(-5, 10)).toBe(1);
  });

  it("never exceeds the remaining stock", () => {
    expect(clampQuantity(50, 4)).toBe(4);
  });

  it("clamps to 0 when there is no remaining stock, instead of forcing a minimum of 1", () => {
    expect(clampQuantity(1, 0)).toBe(0);
  });
});

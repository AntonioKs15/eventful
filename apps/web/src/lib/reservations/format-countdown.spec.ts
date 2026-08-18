import { formatCountdown } from "./format-countdown";

describe("formatCountdown", () => {
  it("formats whole minutes and seconds as MM:SS", () => {
    expect(formatCountdown(9 * 60 * 1000 + 5 * 1000)).toBe("09:05");
  });

  it("floors partial seconds instead of rounding up", () => {
    expect(formatCountdown(61999)).toBe("01:01");
  });

  it("clamps a negative or expired remainder to 00:00", () => {
    expect(formatCountdown(-500)).toBe("00:00");
    expect(formatCountdown(0)).toBe("00:00");
  });
});

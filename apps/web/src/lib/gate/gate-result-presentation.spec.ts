import { GateValidationResult } from "@eventful/contracts";
import { presentGateResult } from "./gate-result-presentation";

describe("presentGateResult", () => {
  it("presents VALID as a positive outcome", () => {
    expect(presentGateResult(GateValidationResult.VALID).tone).toBe("positive");
  });

  it("presents ALREADY_USED and WRONG_EVENT as warnings, not hard failures", () => {
    expect(presentGateResult(GateValidationResult.ALREADY_USED).tone).toBe("warning");
    expect(presentGateResult(GateValidationResult.WRONG_EVENT).tone).toBe("warning");
  });

  it("presents NOT_FOUND as a negative outcome", () => {
    expect(presentGateResult(GateValidationResult.NOT_FOUND).tone).toBe("negative");
  });

  it("gives every one of the four outcomes a distinct, non-empty label", () => {
    const results = Object.values(GateValidationResult);
    const labels = results.map((result) => presentGateResult(result).label);

    expect(new Set(labels).size).toBe(results.length);
    labels.forEach((label) => expect(label.length).toBeGreaterThan(0));
  });
});

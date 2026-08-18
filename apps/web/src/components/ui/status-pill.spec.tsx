import { render, screen } from "@testing-library/react";
import { StatusPill, StatusTone } from "./status-pill";

const TONE_TO_CLASS: Record<StatusTone, string> = {
  neutral: "bg-surface-700",
  positive: "bg-positive/20",
  warning: "bg-accent/20",
  negative: "bg-negative/20",
};

describe("StatusPill", () => {
  it.each(Object.entries(TONE_TO_CLASS) as [StatusTone, string][])(
    "renders the %s tone with its matching background class",
    (tone, expectedClass) => {
      render(<StatusPill tone={tone} label="Confirmed" />);

      expect(screen.getByText("Confirmed")).toHaveClass(expectedClass);
    },
  );

  it("renders the given label as its text content", () => {
    render(<StatusPill tone="positive" label="Checked in" />);

    expect(screen.getByText("Checked in")).toBeInTheDocument();
  });
});

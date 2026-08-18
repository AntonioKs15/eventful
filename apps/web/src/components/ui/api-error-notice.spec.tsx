import { render, screen } from "@testing-library/react";
import { ErrorCode } from "@eventful/contracts";
import { ApiClientError } from "@/lib/api/api-error";
import { ApiErrorNotice } from "./api-error-notice";

describe("ApiErrorNotice", () => {
  it("renders nothing when there is no error", () => {
    const { container } = render(<ApiErrorNotice error={null} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("renders the API-provided message for an ApiClientError", () => {
    const error = new ApiClientError(ErrorCode.SEAT_ALREADY_TAKEN, "That seat was just taken.");

    render(<ApiErrorNotice error={error} />);

    expect(screen.getByRole("alert")).toHaveTextContent("That seat was just taken.");
  });

  it("renders a generic fallback message for a non-API error", () => {
    render(<ApiErrorNotice error={new Error("network exploded")} />);

    expect(screen.getByRole("alert")).toHaveTextContent("Something went wrong. Please try again.");
  });
});

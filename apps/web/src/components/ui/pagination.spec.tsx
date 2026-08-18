import { fireEvent, render, screen } from "@testing-library/react";
import { PaginationMeta } from "@eventful/contracts";
import { Pagination } from "./pagination";

function buildMeta(overrides: Partial<PaginationMeta>): PaginationMeta {
  return { page: 1, pageSize: 20, total: 60, totalPages: 3, ...overrides };
}

describe("Pagination", () => {
  it("renders nothing when there is only one page", () => {
    const { container } = render(
      <Pagination meta={buildMeta({ totalPages: 1 })} onPageChange={vi.fn()} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("shows the current page and total pages", () => {
    render(<Pagination meta={buildMeta({ page: 2 })} onPageChange={vi.fn()} />);

    expect(screen.getByText("Page 2 of 3")).toBeInTheDocument();
  });

  it("disables Previous on the first page and Next on the last page", () => {
    render(<Pagination meta={buildMeta({ page: 1 })} onPageChange={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next" })).toBeEnabled();
  });

  it("enables both buttons on a middle page", () => {
    render(<Pagination meta={buildMeta({ page: 2 })} onPageChange={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Previous" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Next" })).toBeEnabled();
  });

  it("calls onPageChange with page - 1 when Previous is clicked", () => {
    const onPageChange = vi.fn();
    render(<Pagination meta={buildMeta({ page: 2 })} onPageChange={onPageChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Previous" }));

    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it("calls onPageChange with page + 1 when Next is clicked", () => {
    const onPageChange = vi.fn();
    render(<Pagination meta={buildMeta({ page: 2 })} onPageChange={onPageChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    expect(onPageChange).toHaveBeenCalledWith(3);
  });
});

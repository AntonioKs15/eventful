import { PaginationMeta } from "@eventful/contracts";

const MIN_PAGE = 1;

export function Pagination({
  meta,
  onPageChange,
}: {
  meta: PaginationMeta;
  onPageChange: (page: number) => void;
}) {
  if (meta.totalPages <= 1) {
    return null;
  }

  return (
    <div className="flex items-center justify-center gap-4 py-6">
      <button
        type="button"
        disabled={meta.page <= MIN_PAGE}
        onClick={() => onPageChange(meta.page - 1)}
        className="focus-ring rounded-full border border-surface-700 px-4 py-1.5 text-xs text-foreground transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-40"
      >
        Previous
      </button>
      <span className="font-ticket text-xs text-surface-500">
        Page {meta.page} of {meta.totalPages}
      </span>
      <button
        type="button"
        disabled={meta.page >= meta.totalPages}
        onClick={() => onPageChange(meta.page + 1)}
        className="focus-ring rounded-full border border-surface-700 px-4 py-1.5 text-xs text-foreground transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-40"
      >
        Next
      </button>
    </div>
  );
}

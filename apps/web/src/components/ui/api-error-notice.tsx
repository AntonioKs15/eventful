import { ApiClientError } from "@/lib/api/api-error";

const UNEXPECTED_ERROR_MESSAGE = "Something went wrong. Please try again.";

export function ApiErrorNotice({ error }: { error: unknown }) {
  if (!error) {
    return null;
  }

  const message = error instanceof ApiClientError ? error.message : UNEXPECTED_ERROR_MESSAGE;

  return (
    <div role="alert" className="rounded-lg border border-velvet/40 bg-velvet/10 px-4 py-3 text-sm text-paper">
      {message}
    </div>
  );
}

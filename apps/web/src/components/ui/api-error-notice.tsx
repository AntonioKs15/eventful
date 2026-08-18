import { ApiClientError } from "@/lib/api/api-error";

const UNEXPECTED_ERROR_MESSAGE = "Something went wrong. Please try again.";

export function ApiErrorNotice({ error }: { error: unknown }) {
  if (!error) {
    return null;
  }

  const message = error instanceof ApiClientError ? error.message : UNEXPECTED_ERROR_MESSAGE;

  return (
    <div role="alert" className="rounded-lg border border-negative/40 bg-negative/10 px-4 py-3 text-sm text-foreground">
      {message}
    </div>
  );
}

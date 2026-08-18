import { ErrorCode } from "@eventful/contracts";

export class ApiClientError extends Error {
  constructor(
    public readonly code: ErrorCode | "UNKNOWN_ERROR",
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

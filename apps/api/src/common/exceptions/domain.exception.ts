import { ErrorCode } from '@eventful/contracts';

export abstract class DomainException extends Error {
  protected constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

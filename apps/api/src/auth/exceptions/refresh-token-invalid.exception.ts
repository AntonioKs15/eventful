import { ErrorCode } from '@eventful/contracts';
import { DomainException } from '../../common/exceptions/domain.exception';

export class RefreshTokenInvalidException extends DomainException {
  constructor() {
    super(
      ErrorCode.REFRESH_TOKEN_INVALID,
      'Your session has expired. Please log in again.',
    );
  }
}

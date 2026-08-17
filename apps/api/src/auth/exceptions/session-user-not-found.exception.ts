import { ErrorCode } from '@eventful/contracts';
import { DomainException } from '../../common/exceptions/domain.exception';

export class SessionUserNotFoundException extends DomainException {
  constructor() {
    super(
      ErrorCode.UNAUTHORIZED,
      'Your account could not be found. Please log in again.',
    );
  }
}

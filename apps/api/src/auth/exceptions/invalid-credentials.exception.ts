import { ErrorCode } from '@eventful/contracts';
import { DomainException } from '../../common/exceptions/domain.exception';

export class InvalidCredentialsException extends DomainException {
  constructor() {
    super(ErrorCode.INVALID_CREDENTIALS, 'Invalid email or password.');
  }
}

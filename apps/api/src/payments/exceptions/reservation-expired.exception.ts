import { ErrorCode } from '@eventful/contracts';
import { DomainException } from '../../common/exceptions/domain.exception';

export class ReservationExpiredException extends DomainException {
  constructor() {
    super(
      ErrorCode.RESERVATION_EXPIRED,
      'This reservation hold has expired. Please start checkout again.',
    );
  }
}

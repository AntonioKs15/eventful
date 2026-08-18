import { ErrorCode } from '@eventful/contracts';
import { DomainException } from '../../common/exceptions/domain.exception';

export class ReservationNotPendingException extends DomainException {
  constructor() {
    super(
      ErrorCode.RESERVATION_NOT_PENDING,
      'This reservation is no longer awaiting payment.',
    );
  }
}

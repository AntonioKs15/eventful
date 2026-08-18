import { ErrorCode } from '@eventful/contracts';
import { DomainException } from '../../common/exceptions/domain.exception';

export class ReservationNotFoundException extends DomainException {
  constructor() {
    super(
      ErrorCode.RESERVATION_NOT_FOUND,
      'This reservation could not be found.',
    );
  }
}

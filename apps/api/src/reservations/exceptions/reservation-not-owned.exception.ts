import { ErrorCode } from '@eventful/contracts';
import { DomainException } from '../../common/exceptions/domain.exception';

export class ReservationNotOwnedException extends DomainException {
  constructor() {
    super(
      ErrorCode.RESERVATION_NOT_OWNED,
      'This reservation does not belong to you.',
    );
  }
}

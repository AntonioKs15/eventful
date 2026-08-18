import { ErrorCode } from '@eventful/contracts';
import { DomainException } from '../../common/exceptions/domain.exception';

export class SeatNotFoundException extends DomainException {
  constructor() {
    super(
      ErrorCode.SEAT_NOT_FOUND,
      'One or more selected seats do not belong to this event.',
    );
  }
}

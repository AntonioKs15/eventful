import { ErrorCode } from '@eventful/contracts';
import { DomainException } from '../../common/exceptions/domain.exception';

export class SeatAlreadyTakenException extends DomainException {
  constructor() {
    super(ErrorCode.SEAT_ALREADY_TAKEN, 'This seat has already been reserved.');
  }
}

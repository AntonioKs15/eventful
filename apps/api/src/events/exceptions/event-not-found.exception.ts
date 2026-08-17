import { ErrorCode } from '@eventful/contracts';
import { DomainException } from '../../common/exceptions/domain.exception';

export class EventNotFoundException extends DomainException {
  constructor() {
    super(ErrorCode.EVENT_NOT_FOUND, 'This event could not be found.');
  }
}

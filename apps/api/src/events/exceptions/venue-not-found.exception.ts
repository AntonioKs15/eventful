import { ErrorCode } from '@eventful/contracts';
import { DomainException } from '../../common/exceptions/domain.exception';

export class VenueNotFoundException extends DomainException {
  constructor() {
    super(ErrorCode.VENUE_NOT_FOUND, 'This venue could not be found.');
  }
}

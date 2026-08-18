import { ErrorCode } from '@eventful/contracts';
import { DomainException } from '../../common/exceptions/domain.exception';

export class ReviewNotFoundException extends DomainException {
  constructor() {
    super(ErrorCode.REVIEW_NOT_FOUND, 'This review could not be found.');
  }
}

import { ErrorCode } from '@eventful/contracts';
import { DomainException } from '../../common/exceptions/domain.exception';

export class ReviewNotEligibleException extends DomainException {
  constructor() {
    super(
      ErrorCode.REVIEW_NOT_ELIGIBLE,
      'Only customers holding a ticket for this movie can leave a review.',
    );
  }
}

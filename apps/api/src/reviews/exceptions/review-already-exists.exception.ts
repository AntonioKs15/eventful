import { ErrorCode } from '@eventful/contracts';
import { DomainException } from '../../common/exceptions/domain.exception';

export class ReviewAlreadyExistsException extends DomainException {
  constructor() {
    super(
      ErrorCode.REVIEW_ALREADY_EXISTS,
      'You have already reviewed this movie.',
    );
  }
}

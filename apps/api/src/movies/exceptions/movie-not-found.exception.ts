import { ErrorCode } from '@eventful/contracts';
import { DomainException } from '../../common/exceptions/domain.exception';

export class MovieNotFoundException extends DomainException {
  constructor() {
    super(ErrorCode.MOVIE_NOT_FOUND, 'This movie could not be found.');
  }
}

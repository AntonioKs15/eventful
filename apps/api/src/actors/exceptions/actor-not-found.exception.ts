import { ErrorCode } from '@eventful/contracts';
import { DomainException } from '../../common/exceptions/domain.exception';

export class ActorNotFoundException extends DomainException {
  constructor() {
    super(ErrorCode.ACTOR_NOT_FOUND, 'This actor could not be found.');
  }
}

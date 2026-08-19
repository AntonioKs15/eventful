import { ErrorCode } from '@eventful/contracts';
import { DomainException } from '../../common/exceptions/domain.exception';

export class SubscriptionAlreadyActiveException extends DomainException {
  constructor() {
    super(
      ErrorCode.SUBSCRIPTION_ALREADY_ACTIVE,
      'This account already has an active subscription.',
    );
  }
}

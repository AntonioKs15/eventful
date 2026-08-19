import { ErrorCode } from '@eventful/contracts';
import { DomainException } from '../../common/exceptions/domain.exception';

export class SubscriptionNotActiveException extends DomainException {
  constructor() {
    super(
      ErrorCode.SUBSCRIPTION_NOT_ACTIVE,
      'An active subscription is required to redeem a free ticket.',
    );
  }
}

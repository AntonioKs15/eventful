import { ErrorCode } from '@eventful/contracts';
import { DomainException } from '../../common/exceptions/domain.exception';

export class SubscriptionNotFoundException extends DomainException {
  constructor() {
    super(
      ErrorCode.SUBSCRIPTION_NOT_FOUND,
      'No subscription was found for this account.',
    );
  }
}

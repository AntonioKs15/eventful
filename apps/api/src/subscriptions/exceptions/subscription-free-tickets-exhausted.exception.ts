import { ErrorCode } from '@eventful/contracts';
import { DomainException } from '../../common/exceptions/domain.exception';

export class SubscriptionFreeTicketsExhaustedException extends DomainException {
  constructor() {
    super(
      ErrorCode.SUBSCRIPTION_FREE_TICKETS_EXHAUSTED,
      "You've used all of your free tickets for this billing cycle.",
    );
  }
}

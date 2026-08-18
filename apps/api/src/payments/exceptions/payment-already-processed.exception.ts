import { ErrorCode } from '@eventful/contracts';
import { DomainException } from '../../common/exceptions/domain.exception';

export class PaymentAlreadyProcessedException extends DomainException {
  constructor() {
    super(
      ErrorCode.PAYMENT_ALREADY_PROCESSED,
      'This reservation has already been paid for.',
    );
  }
}

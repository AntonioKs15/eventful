import { ErrorCode } from '@eventful/contracts';
import { DomainException } from '../../common/exceptions/domain.exception';

export class NotificationNotFoundException extends DomainException {
  constructor() {
    super(
      ErrorCode.NOTIFICATION_NOT_FOUND,
      'This notification could not be found.',
    );
  }
}

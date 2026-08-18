import { ErrorCode } from '@eventful/contracts';
import { DomainException } from '../../common/exceptions/domain.exception';

export class InsufficientCapacityException extends DomainException {
  constructor() {
    super(
      ErrorCode.INSUFFICIENT_CAPACITY,
      'Not enough tickets are available for the requested quantity.',
    );
  }
}

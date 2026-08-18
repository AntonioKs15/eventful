import { ErrorCode } from '@eventful/contracts';
import { DomainException } from '../../common/exceptions/domain.exception';

export class TicketNotFoundException extends DomainException {
  constructor() {
    super(ErrorCode.TICKET_NOT_FOUND, 'This ticket could not be found.');
  }
}

import { ErrorCode } from '@eventful/contracts';
import { DomainException } from '../../common/exceptions/domain.exception';

export class CatalogProviderUnavailableException extends DomainException {
  constructor() {
    super(
      ErrorCode.CATALOG_PROVIDER_UNAVAILABLE,
      'The external event catalog is temporarily unavailable. You can still create an event manually.',
    );
  }
}

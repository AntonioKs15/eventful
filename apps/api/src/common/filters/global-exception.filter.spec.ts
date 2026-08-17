import {
  ArgumentsHost,
  BadRequestException,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { ErrorCode } from '@eventful/contracts';
import { DomainException } from '../exceptions/domain.exception';
import { ERROR_HTTP_STATUS_MAP } from '../exceptions/error-http-status.map';
import { GlobalExceptionFilter } from './global-exception.filter';

class SeatAlreadyTakenTestException extends DomainException {
  constructor() {
    super(
      ErrorCode.SEAT_ALREADY_TAKEN,
      'This seat has already been reserved.',
      {
        seatId: 'seat-1',
      },
    );
  }
}

function createMockHost(requestId: string) {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const response = { status };
  const request = { id: requestId };

  const host = {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => request,
    }),
  } as unknown as ArgumentsHost;

  return { host, status, json };
}

function createLogger() {
  return {
    setContext: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  } as unknown as ConstructorParameters<typeof GlobalExceptionFilter>[0];
}

describe('GlobalExceptionFilter', () => {
  it('maps a DomainException to its ErrorCode, HTTP status, and requestId', () => {
    const filter = new GlobalExceptionFilter(createLogger());
    const { host, status, json } = createMockHost('req-1');

    filter.catch(new SeatAlreadyTakenTestException(), host);

    expect(status).toHaveBeenCalledWith(
      ERROR_HTTP_STATUS_MAP[ErrorCode.SEAT_ALREADY_TAKEN],
    );
    expect(json).toHaveBeenCalledWith({
      error: {
        code: ErrorCode.SEAT_ALREADY_TAKEN,
        message: 'This seat has already been reserved.',
        details: { seatId: 'seat-1', requestId: 'req-1' },
      },
    });
  });

  it('maps a validation BadRequestException to VALIDATION_FAILED with a 400 status', () => {
    const filter = new GlobalExceptionFilter(createLogger());
    const { host, status, json } = createMockHost('req-2');

    filter.catch(new BadRequestException(['email must be an email']), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    const [payload] = json.mock.calls[0] as [{ error: { code: ErrorCode } }];
    expect(payload.error.code).toBe(ErrorCode.VALIDATION_FAILED);
  });

  it('maps a generic UnauthorizedException to ErrorCode.UNAUTHORIZED, not INTERNAL_ERROR', () => {
    const filter = new GlobalExceptionFilter(createLogger());
    const { host, status, json } = createMockHost('req-3');

    filter.catch(new UnauthorizedException(), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
    const [payload] = json.mock.calls[0] as [{ error: { code: ErrorCode } }];
    expect(payload.error.code).toBe(ErrorCode.UNAUTHORIZED);
  });

  it('never leaks the raw error message for an unexpected, non-HTTP exception', () => {
    const filter = new GlobalExceptionFilter(createLogger());
    const { host, status, json } = createMockHost('req-4');

    filter.catch(new Error('leaked database password: hunter2'), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    const [payload] = json.mock.calls[0] as [
      { error: { code: ErrorCode; message: string } },
    ];
    expect(payload.error.code).toBe(ErrorCode.INTERNAL_ERROR);
    expect(payload.error.message).not.toContain('hunter2');
  });
});

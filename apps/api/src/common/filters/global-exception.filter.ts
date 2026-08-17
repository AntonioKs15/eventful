import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { PinoLogger } from 'nestjs-pino';
import { ApiErrorResponse, ErrorCode } from '@eventful/contracts';
import { DomainException } from '../exceptions/domain.exception';
import { ERROR_HTTP_STATUS_MAP } from '../exceptions/error-http-status.map';

interface RequestWithId extends Request {
  id: string;
}

const HTTP_STATUS_FALLBACK_ERROR_CODE: Partial<Record<number, ErrorCode>> = {
  [HttpStatus.BAD_REQUEST]: ErrorCode.VALIDATION_FAILED,
  [HttpStatus.UNAUTHORIZED]: ErrorCode.UNAUTHORIZED,
  [HttpStatus.FORBIDDEN]: ErrorCode.FORBIDDEN,
  [HttpStatus.NOT_FOUND]: ErrorCode.RESOURCE_NOT_FOUND,
};

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(GlobalExceptionFilter.name);
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const httpContext = host.switchToHttp();
    const response = httpContext.getResponse<Response>();
    const request = httpContext.getRequest<RequestWithId>();

    if (exception instanceof DomainException) {
      this.sendDomainException(response, request, exception);
      return;
    }

    if (exception instanceof BadRequestException) {
      this.sendValidationException(response, request, exception);
      return;
    }

    if (exception instanceof HttpException) {
      this.sendHttpException(response, request, exception);
      return;
    }

    this.sendUnexpectedError(response, request, exception);
  }

  private sendDomainException(
    response: Response,
    request: RequestWithId,
    exception: DomainException,
  ): void {
    this.respond(response, ERROR_HTTP_STATUS_MAP[exception.code], {
      error: {
        code: exception.code,
        message: exception.message,
        details: {
          ...toDetailsObject(exception.details),
          requestId: request.id,
        },
      },
    });
  }

  private sendValidationException(
    response: Response,
    request: RequestWithId,
    exception: BadRequestException,
  ): void {
    const body = exception.getResponse();
    this.respond(response, HttpStatus.BAD_REQUEST, {
      error: {
        code: ErrorCode.VALIDATION_FAILED,
        message: 'One or more fields are invalid.',
        details: { ...toDetailsObject(body), requestId: request.id },
      },
    });
  }

  private sendHttpException(
    response: Response,
    request: RequestWithId,
    exception: HttpException,
  ): void {
    this.logger.warn(
      { err: exception, requestId: request.id },
      exception.message,
    );
    const status = exception.getStatus();
    this.respond(response, status, {
      error: {
        code:
          HTTP_STATUS_FALLBACK_ERROR_CODE[status] ?? ErrorCode.INTERNAL_ERROR,
        message: exception.message,
        details: { requestId: request.id },
      },
    });
  }

  private sendUnexpectedError(
    response: Response,
    request: RequestWithId,
    exception: unknown,
  ): void {
    this.logger.error(
      { err: exception, requestId: request.id },
      'Unhandled exception',
    );
    this.respond(response, HttpStatus.INTERNAL_SERVER_ERROR, {
      error: {
        code: ErrorCode.INTERNAL_ERROR,
        message: 'Something went wrong. Please try again.',
        details: { requestId: request.id },
      },
    });
  }

  private respond(
    response: Response,
    status: number,
    body: ApiErrorResponse,
  ): void {
    response.status(status).json(body);
  }
}

function toDetailsObject(value: unknown): Record<string, unknown> {
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return { info: value };
}

import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedRequestUser } from '../strategies/jwt-access.strategy';

interface RequestWithAuthenticatedUser {
  user: AuthenticatedRequestUser;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedRequestUser => {
    const request = context
      .switchToHttp()
      .getRequest<RequestWithAuthenticatedUser>();
    return request.user;
  },
);

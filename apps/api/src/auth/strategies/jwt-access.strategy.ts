import { Inject, Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserRole } from '@eventful/contracts';
import { authConfig } from '../../config/auth.config';
import type { AuthConfig } from '../../config/auth.config';

export interface JwtAccessPayload {
  sub: string;
  role: UserRole;
}

export interface AuthenticatedRequestUser {
  userId: string;
  role: UserRole;
}

@Injectable()
export class JwtAccessStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(@Inject(authConfig.KEY) config: AuthConfig) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.jwtAccessSecret,
    });
  }

  validate(payload: JwtAccessPayload): AuthenticatedRequestUser {
    return { userId: payload.sub, role: payload.role };
  }
}

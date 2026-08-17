import { CookieOptions, Response } from 'express';
import { NodeEnvironment } from '../../config/node-environment.enum';
import { MILLISECONDS_PER_DAY } from './time.constants';

export const REFRESH_TOKEN_COOKIE_NAME = 'refresh_token';

function buildCookieOptions(
  nodeEnv: NodeEnvironment,
  maxAge?: number,
): CookieOptions {
  const isProduction = nodeEnv === NodeEnvironment.PRODUCTION;

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path: '/',
    ...(maxAge !== undefined ? { maxAge } : {}),
  };
}

export function setRefreshTokenCookie(
  response: Response,
  nodeEnv: NodeEnvironment,
  rawToken: string,
  expiresInDays: number,
): void {
  response.cookie(
    REFRESH_TOKEN_COOKIE_NAME,
    rawToken,
    buildCookieOptions(nodeEnv, expiresInDays * MILLISECONDS_PER_DAY),
  );
}

export function clearRefreshTokenCookie(
  response: Response,
  nodeEnv: NodeEnvironment,
): void {
  response.clearCookie(REFRESH_TOKEN_COOKIE_NAME, buildCookieOptions(nodeEnv));
}

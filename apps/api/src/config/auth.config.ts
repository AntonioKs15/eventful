import { registerAs } from '@nestjs/config';

export interface AuthConfig {
  jwtAccessSecret: string;
  jwtAccessExpiresIn: string;
  refreshTokenExpiresInDays: number;
  qrHmacSecret: string;
}

export const authConfig = registerAs('auth', (): AuthConfig => ({
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET as string,
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN as string,
  refreshTokenExpiresInDays: Number(process.env.REFRESH_TOKEN_EXPIRES_IN_DAYS),
  qrHmacSecret: process.env.QR_HMAC_SECRET as string,
}));

import { createHash, randomBytes } from 'node:crypto';

const REFRESH_TOKEN_BYTE_LENGTH = 32;

export function generateOpaqueToken(): string {
  return randomBytes(REFRESH_TOKEN_BYTE_LENGTH).toString('hex');
}

export function hashOpaqueToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex');
}

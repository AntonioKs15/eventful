import { createHmac, timingSafeEqual } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { authConfig } from '../config/auth.config';
import type { AuthConfig } from '../config/auth.config';

const PAYLOAD_SEPARATOR = '.';
const PAYLOAD_PART_COUNT = 2;

export interface QrPayload {
  ticketId: string;
  signature: string;
}

@Injectable()
export class QrService {
  constructor(@Inject(authConfig.KEY) private readonly config: AuthConfig) {}

  sign(ticketId: string): string {
    return createHmac('sha256', this.config.qrHmacSecret)
      .update(ticketId)
      .digest('hex');
  }

  verify(ticketId: string, signature: string): boolean {
    const expected = this.sign(ticketId);
    const expectedBuffer = Buffer.from(expected);
    const signatureBuffer = Buffer.from(signature);

    if (expectedBuffer.length !== signatureBuffer.length) {
      return false;
    }

    return timingSafeEqual(expectedBuffer, signatureBuffer);
  }

  buildPayload(ticketId: string): string {
    return `${ticketId}${PAYLOAD_SEPARATOR}${this.sign(ticketId)}`;
  }

  parsePayload(payload: string): QrPayload | null {
    const parts = payload.split(PAYLOAD_SEPARATOR);
    if (parts.length !== PAYLOAD_PART_COUNT) {
      return null;
    }

    const [ticketId, signature] = parts;
    if (!ticketId || !signature) {
      return null;
    }

    return { ticketId, signature };
  }
}

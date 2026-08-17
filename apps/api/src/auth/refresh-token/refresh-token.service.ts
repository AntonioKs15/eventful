import { Inject, Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { authConfig } from '../../config/auth.config';
import type { AuthConfig } from '../../config/auth.config';
import { PrismaService } from '../../prisma/prisma.service';
import { RefreshTokenInvalidException } from '../exceptions/refresh-token-invalid.exception';
import { MILLISECONDS_PER_DAY } from '../security/time.constants';
import {
  generateOpaqueToken,
  hashOpaqueToken,
} from '../security/token-hasher.util';

export interface RotatedRefreshToken {
  userId: string;
}

@Injectable()
export class RefreshTokenService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: PinoLogger,
    @Inject(authConfig.KEY) private readonly config: AuthConfig,
  ) {
    this.logger.setContext(RefreshTokenService.name);
  }

  async issue(userId: string): Promise<string> {
    const rawToken = generateOpaqueToken();
    const tokenHash = hashOpaqueToken(rawToken);
    const expiresAt = new Date(
      Date.now() + this.config.refreshTokenExpiresInDays * MILLISECONDS_PER_DAY,
    );

    try {
      await this.prisma.refreshToken.create({
        data: { userId, tokenHash, expiresAt },
      });
    } catch (error) {
      this.logger.error({ err: error }, 'Failed to persist refresh token');
      throw error;
    } finally {
      this.logger.debug('Refresh token issuance completed');
    }

    return rawToken;
  }

  async rotate(rawToken: string): Promise<RotatedRefreshToken> {
    const tokenHash = hashOpaqueToken(rawToken);
    const record = await this.findByHash(tokenHash);

    if (!record) {
      throw new RefreshTokenInvalidException();
    }

    if (record.revokedAt) {
      await this.revokeAllForUser(record.userId);
      throw new RefreshTokenInvalidException();
    }

    if (record.expiresAt < new Date()) {
      throw new RefreshTokenInvalidException();
    }

    await this.revokeById(record.id);

    return { userId: record.userId };
  }

  async revoke(rawToken: string): Promise<void> {
    const tokenHash = hashOpaqueToken(rawToken);
    const record = await this.findByHash(tokenHash);

    if (!record || record.revokedAt) {
      return;
    }

    await this.revokeById(record.id);
  }

  private async findByHash(tokenHash: string) {
    try {
      return await this.prisma.refreshToken.findUnique({
        where: { tokenHash },
      });
    } catch (error) {
      this.logger.error({ err: error }, 'Failed to look up refresh token');
      throw error;
    } finally {
      this.logger.debug('Refresh token lookup completed');
    }
  }

  private async revokeById(id: string): Promise<void> {
    try {
      await this.prisma.refreshToken.update({
        where: { id },
        data: { revokedAt: new Date() },
      });
    } catch (error) {
      this.logger.error({ err: error }, 'Failed to revoke refresh token');
      throw error;
    } finally {
      this.logger.debug('Refresh token revocation completed');
    }
  }

  private async revokeAllForUser(userId: string): Promise<void> {
    try {
      await this.prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    } catch (error) {
      this.logger.error(
        { err: error },
        'Failed to revoke refresh token family',
      );
      throw error;
    } finally {
      this.logger.debug('Refresh token family revocation completed');
    }
  }
}

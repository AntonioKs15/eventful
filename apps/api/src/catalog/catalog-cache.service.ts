import { Injectable } from '@nestjs/common';
import { CatalogProvider, Prisma } from '@prisma/client';
import { PinoLogger } from 'nestjs-pino';
import { PrismaService } from '../prisma/prisma.service';
import { CATALOG_CACHE_TTL_MS } from './catalog.constants';

@Injectable()
export class CatalogCacheService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(CatalogCacheService.name);
  }

  async get(provider: CatalogProvider, queryKey: string): Promise<unknown> {
    try {
      const record = await this.prisma.externalCatalogCache.findUnique({
        where: {
          provider_queryKey: { provider, queryKey },
        },
      });

      if (!record || record.expiresAt < new Date()) {
        return null;
      }

      return record.payload;
    } catch (error) {
      this.logger.error(
        { err: error },
        'Failed to read from the catalog cache',
      );
      throw error;
    } finally {
      this.logger.debug('Catalog cache lookup completed');
    }
  }

  async store(
    provider: CatalogProvider,
    queryKey: string,
    payload: unknown,
  ): Promise<void> {
    const expiresAt = new Date(Date.now() + CATALOG_CACHE_TTL_MS);
    const jsonPayload = payload as Prisma.InputJsonValue;

    try {
      await this.prisma.externalCatalogCache.upsert({
        where: {
          provider_queryKey: { provider, queryKey },
        },
        update: { payload: jsonPayload, expiresAt },
        create: {
          provider,
          queryKey,
          payload: jsonPayload,
          expiresAt,
        },
      });
    } catch (error) {
      this.logger.error({ err: error }, 'Failed to write to the catalog cache');
      throw error;
    } finally {
      this.logger.debug('Catalog cache write completed');
    }
  }
}

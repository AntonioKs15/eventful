import { CatalogProvider } from '@prisma/client';
import { CatalogCacheService } from './catalog-cache.service';

function createMockPrisma() {
  return {
    externalCatalogCache: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
  };
}

function createMockLogger() {
  return {
    setContext: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
}

describe('CatalogCacheService', () => {
  describe('get', () => {
    it('returns null on a cache miss', async () => {
      const prisma = createMockPrisma();
      prisma.externalCatalogCache.findUnique.mockResolvedValue(null);
      const service = new CatalogCacheService(
        prisma as never,
        createMockLogger() as never,
      );

      const result = await service.get('keyword=jazz');

      expect(result).toBeNull();
    });

    it('returns null when the cached entry has expired', async () => {
      const prisma = createMockPrisma();
      prisma.externalCatalogCache.findUnique.mockResolvedValue({
        payload: { hello: 'world' },
        expiresAt: new Date(Date.now() - 1000),
      });
      const service = new CatalogCacheService(
        prisma as never,
        createMockLogger() as never,
      );

      const result = await service.get('keyword=jazz');

      expect(result).toBeNull();
    });

    it('returns the payload when the cached entry is still fresh', async () => {
      const prisma = createMockPrisma();
      const payload = { events: ['a', 'b'] };
      prisma.externalCatalogCache.findUnique.mockResolvedValue({
        payload,
        expiresAt: new Date(Date.now() + 1000 * 60),
      });
      const service = new CatalogCacheService(
        prisma as never,
        createMockLogger() as never,
      );

      const result = await service.get('keyword=jazz');

      expect(result).toEqual(payload);
    });

    it('looks the entry up by the Ticketmaster provider and the exact query key', async () => {
      const prisma = createMockPrisma();
      prisma.externalCatalogCache.findUnique.mockResolvedValue(null);
      const service = new CatalogCacheService(
        prisma as never,
        createMockLogger() as never,
      );

      await service.get('keyword=jazz&city=sp');

      expect(prisma.externalCatalogCache.findUnique).toHaveBeenCalledWith({
        where: {
          provider_queryKey: {
            provider: CatalogProvider.TICKETMASTER,
            queryKey: 'keyword=jazz&city=sp',
          },
        },
      });
    });
  });

  describe('store', () => {
    it('upserts the payload with a future expiry', async () => {
      const prisma = createMockPrisma();
      prisma.externalCatalogCache.upsert.mockResolvedValue({});
      const service = new CatalogCacheService(
        prisma as never,
        createMockLogger() as never,
      );

      await service.store('keyword=jazz', { events: [] });

      expect(prisma.externalCatalogCache.upsert).toHaveBeenCalledTimes(1);
      const call = prisma.externalCatalogCache.upsert.mock.calls[0][0];
      expect(call.where).toEqual({
        provider_queryKey: {
          provider: CatalogProvider.TICKETMASTER,
          queryKey: 'keyword=jazz',
        },
      });
      expect(call.create.expiresAt.getTime()).toBeGreaterThan(Date.now());
      expect(call.update.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });
  });
});

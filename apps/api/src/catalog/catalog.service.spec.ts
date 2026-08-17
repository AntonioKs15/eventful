import { CatalogProviderUnavailableException } from './exceptions/catalog-provider-unavailable.exception';
import { CatalogService } from './catalog.service';

function createMockLogger() {
  return {
    setContext: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
}

const rawPayload = {
  page: { totalElements: 1 },
  _embedded: {
    events: [
      {
        id: 'evt-1',
        name: 'Sample Show',
        dates: { start: { localDate: '2027-01-01' } },
      },
    ],
  },
};

function createService() {
  const cache = { get: jest.fn(), store: jest.fn() };
  const client = { search: jest.fn() };
  const service = new CatalogService(
    cache as never,
    client as never,
    createMockLogger() as never,
  );
  return { service, cache, client };
}

describe('CatalogService', () => {
  it('returns cached results without calling the Ticketmaster client', async () => {
    const { service, cache, client } = createService();
    cache.get.mockResolvedValue(rawPayload);

    const result = await service.search({ page: 1, pageSize: 20 });

    expect(client.search).not.toHaveBeenCalled();
    expect(result.data).toHaveLength(1);
    expect(result.data[0].externalId).toBe('evt-1');
    expect(result.meta).toEqual({
      page: 1,
      pageSize: 20,
      total: 1,
      totalPages: 1,
    });
  });

  it('calls the client and caches the result on a cache miss', async () => {
    const { service, cache, client } = createService();
    cache.get.mockResolvedValue(null);
    client.search.mockResolvedValue(rawPayload);

    const result = await service.search({
      page: 1,
      pageSize: 20,
      keyword: 'jazz',
    });

    expect(client.search).toHaveBeenCalledWith({
      page: 1,
      pageSize: 20,
      keyword: 'jazz',
    });
    expect(cache.store).toHaveBeenCalledWith(expect.any(String), rawPayload);
    expect(result.data[0].title).toBe('Sample Show');
  });

  it('returns an empty page instead of throwing when Ticketmaster has no results', async () => {
    const { service, cache } = createService();
    cache.get.mockResolvedValue({
      page: { totalElements: 0 },
      _embedded: undefined,
    });

    const result = await service.search({ page: 1, pageSize: 20 });

    expect(result.data).toEqual([]);
    expect(result.meta.total).toBe(0);
  });

  it('does not cache anything when the client call fails', async () => {
    const { service, cache, client } = createService();
    cache.get.mockResolvedValue(null);
    client.search.mockRejectedValue(new CatalogProviderUnavailableException());

    await expect(
      service.search({ page: 1, pageSize: 20 }),
    ).rejects.toBeInstanceOf(CatalogProviderUnavailableException);
    expect(cache.store).not.toHaveBeenCalled();
  });
});

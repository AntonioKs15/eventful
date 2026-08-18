import { CatalogProviderUnavailableException } from './exceptions/catalog-provider-unavailable.exception';
import { TmdbClient } from './tmdb.client';

function createMockLogger() {
  return {
    setContext: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
}

function createClient(apiKey: string | undefined) {
  const config = { ticketmasterApiKey: undefined, tmdbApiKey: apiKey };
  return new TmdbClient(config, createMockLogger() as never);
}

describe('TmdbClient', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('rejects immediately when no API key is configured, without calling fetch', async () => {
    const fetchSpy = jest.fn();
    global.fetch = fetchSpy as never;
    const client = createClient(undefined);

    await expect(
      client.search({ page: 1, pageSize: 20 }),
    ).rejects.toBeInstanceOf(CatalogProviderUnavailableException);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('hits the search endpoint with the query when a keyword is given', async () => {
    const fetchSpy = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ results: [] }),
    });
    global.fetch = fetchSpy as never;
    const client = createClient('test-key');

    await client.search({ page: 2, pageSize: 20, keyword: 'panther' });

    const calledUrl = new URL(fetchSpy.mock.calls[0][0] as string);
    expect(calledUrl.pathname).toBe('/3/search/movie');
    expect(calledUrl.searchParams.get('api_key')).toBe('test-key');
    expect(calledUrl.searchParams.get('page')).toBe('2');
    expect(calledUrl.searchParams.get('query')).toBe('panther');
  });

  it('falls back to the popular-movies endpoint when no keyword is given', async () => {
    const fetchSpy = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ results: [] }),
    });
    global.fetch = fetchSpy as never;
    const client = createClient('test-key');

    await client.search({ page: 1, pageSize: 20 });

    const calledUrl = new URL(fetchSpy.mock.calls[0][0] as string);
    expect(calledUrl.pathname).toBe('/3/movie/popular');
  });

  it('returns the parsed JSON body on a successful response', async () => {
    const payload = { results: [{ id: 1 }] };
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(payload),
    }) as never;
    const client = createClient('test-key');

    await expect(client.search({ page: 1, pageSize: 20 })).resolves.toEqual(
      payload,
    );
  });

  it('wraps a non-ok HTTP response in CatalogProviderUnavailableException', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue({ ok: false, status: 500 }) as never;
    const client = createClient('test-key');

    await expect(
      client.search({ page: 1, pageSize: 20 }),
    ).rejects.toBeInstanceOf(CatalogProviderUnavailableException);
  });

  it('wraps a network failure in CatalogProviderUnavailableException', async () => {
    global.fetch = jest
      .fn()
      .mockRejectedValue(new Error('network down')) as never;
    const client = createClient('test-key');

    await expect(
      client.search({ page: 1, pageSize: 20 }),
    ).rejects.toBeInstanceOf(CatalogProviderUnavailableException);
  });
});

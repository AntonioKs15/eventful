import { CatalogProviderUnavailableException } from './exceptions/catalog-provider-unavailable.exception';
import { TicketmasterClient } from './ticketmaster.client';

function createMockLogger() {
  return {
    setContext: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
}

function createClient(apiKey: string | undefined) {
  const config = { ticketmasterApiKey: apiKey };
  return new TicketmasterClient(config, createMockLogger() as never);
}

describe('TicketmasterClient', () => {
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

  it('translates a 1-indexed page and the search filters into the Ticketmaster query string', async () => {
    const fetchSpy = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ _embedded: { events: [] } }),
    });
    global.fetch = fetchSpy as never;
    const client = createClient('test-key');

    await client.search({
      page: 2,
      pageSize: 10,
      keyword: 'jazz',
      city: 'São Paulo',
    });

    const calledUrl = new URL(fetchSpy.mock.calls[0][0] as string);
    expect(calledUrl.searchParams.get('apikey')).toBe('test-key');
    expect(calledUrl.searchParams.get('page')).toBe('1');
    expect(calledUrl.searchParams.get('size')).toBe('10');
    expect(calledUrl.searchParams.get('keyword')).toBe('jazz');
    expect(calledUrl.searchParams.get('city')).toBe('São Paulo');
  });

  it('returns the parsed JSON body on a successful response', async () => {
    const payload = { _embedded: { events: [{ id: '1' }] } };
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

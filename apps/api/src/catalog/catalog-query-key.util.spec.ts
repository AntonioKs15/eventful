import { buildCatalogQueryKey } from './catalog-query-key.util';

describe('buildCatalogQueryKey', () => {
  it('produces the same key regardless of property insertion order', () => {
    const keyA = buildCatalogQueryKey({
      page: 1,
      pageSize: 20,
      keyword: 'jazz',
      city: 'SP',
    });
    const keyB = buildCatalogQueryKey({
      city: 'SP',
      keyword: 'jazz',
      pageSize: 20,
      page: 1,
    });

    expect(keyA).toBe(keyB);
  });

  it('produces different keys for different search parameters', () => {
    const keyA = buildCatalogQueryKey({
      page: 1,
      pageSize: 20,
      keyword: 'jazz',
    });
    const keyB = buildCatalogQueryKey({
      page: 1,
      pageSize: 20,
      keyword: 'rock',
    });

    expect(keyA).not.toBe(keyB);
  });

  it('omits undefined optional filters instead of embedding the literal "undefined"', () => {
    const key = buildCatalogQueryKey({
      page: 1,
      pageSize: 20,
      keyword: undefined,
      city: undefined,
    });

    expect(key).not.toContain('undefined');
  });
});

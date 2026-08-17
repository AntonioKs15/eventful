export interface CatalogSearchParams {
  page: number;
  pageSize: number;
  keyword?: string;
  city?: string;
}

export function buildCatalogQueryKey(params: CatalogSearchParams): string {
  const entries = Object.entries(params)
    .filter(
      ([, value]) => value !== undefined && value !== null && value !== '',
    )
    .sort(([keyA], [keyB]) => keyA.localeCompare(keyB));

  return entries.map(([key, value]) => `${key}=${String(value)}`).join('&');
}

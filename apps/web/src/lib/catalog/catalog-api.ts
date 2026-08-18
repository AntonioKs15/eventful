import { PaginatedResult } from "@eventful/contracts";
import { apiRequest } from "../api/api-client";

export interface CatalogEventSummary {
  externalId: string;
  title: string;
  startDate: string | null;
  startTime: string | null;
  venueExternalId: string | null;
  venueName: string | null;
  venueCity: string | null;
  imageUrl: string | null;
  minPriceCents: number | null;
  maxPriceCents: number | null;
  genre: string | null;
}

export function searchCatalog(
  keyword: string,
  city: string,
): Promise<PaginatedResult<CatalogEventSummary>> {
  return apiRequest("/catalog/search", {
    query: { keyword: keyword || undefined, city: city || undefined, page: 1, pageSize: 6 },
  });
}

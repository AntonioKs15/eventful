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

export interface CatalogMovieSummary {
  externalId: string;
  title: string;
  synopsis: string;
  releaseDate: string | null;
  posterImageUrl: string | null;
  backdropImageUrl: string | null;
  genres: string[];
}

export function searchMovieCatalog(
  keyword: string,
): Promise<PaginatedResult<CatalogMovieSummary>> {
  return apiRequest("/catalog/movies/search", {
    query: { keyword: keyword || undefined, page: 1, pageSize: 6 },
  });
}

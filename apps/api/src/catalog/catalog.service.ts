import { Injectable } from '@nestjs/common';
import { CatalogProvider } from '@prisma/client';
import { PinoLogger } from 'nestjs-pino';
import { buildPaginationMeta, PaginatedResult } from '@eventful/contracts';
import { CatalogCacheService } from './catalog-cache.service';
import {
  buildCatalogQueryKey,
  CatalogSearchParams,
} from './catalog-query-key.util';
import {
  CatalogEventSummary,
  mapTicketmasterEventToSummary,
} from './catalog.mapper';
import { CatalogMovieSummary, mapTmdbMovieToSummary } from './tmdb.mapper';
import { TicketmasterClient } from './ticketmaster.client';
import { TmdbClient } from './tmdb.client';

interface TicketmasterSearchPayload {
  page?: { totalElements?: number };
  _embedded?: { events?: unknown[] };
}

interface TmdbSearchPayload {
  results?: unknown[];
  total_results?: number;
}

@Injectable()
export class CatalogService {
  constructor(
    private readonly cache: CatalogCacheService,
    private readonly ticketmasterClient: TicketmasterClient,
    private readonly tmdbClient: TmdbClient,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(CatalogService.name);
  }

  async search(
    params: CatalogSearchParams,
  ): Promise<PaginatedResult<CatalogEventSummary>> {
    const queryKey = buildCatalogQueryKey(params);
    const cached = await this.cache.get(CatalogProvider.TICKETMASTER, queryKey);
    const payload = (cached ??
      (await this.fetchAndCacheTicketmaster(queryKey, params)) ??
      {}) as TicketmasterSearchPayload;

    const data = (payload._embedded?.events ?? []).map(
      mapTicketmasterEventToSummary,
    );
    const total = payload.page?.totalElements ?? 0;

    return {
      data,
      meta: buildPaginationMeta(params.page, params.pageSize, total),
    };
  }

  async searchMovies(
    params: CatalogSearchParams,
  ): Promise<PaginatedResult<CatalogMovieSummary>> {
    const queryKey = buildCatalogQueryKey(params);
    const cached = await this.cache.get(CatalogProvider.TMDB, queryKey);
    const payload = (cached ??
      (await this.fetchAndCacheTmdb(queryKey, params)) ??
      {}) as TmdbSearchPayload;

    const data = (payload.results ?? []).map(mapTmdbMovieToSummary);
    const total = payload.total_results ?? data.length;

    return {
      data,
      meta: buildPaginationMeta(params.page, params.pageSize, total),
    };
  }

  private async fetchAndCacheTicketmaster(
    queryKey: string,
    params: CatalogSearchParams,
  ): Promise<TicketmasterSearchPayload> {
    const payload = (await this.ticketmasterClient.search(
      params,
    )) as TicketmasterSearchPayload;
    await this.cache.store(CatalogProvider.TICKETMASTER, queryKey, payload);
    return payload;
  }

  private async fetchAndCacheTmdb(
    queryKey: string,
    params: CatalogSearchParams,
  ): Promise<TmdbSearchPayload> {
    const payload = (await this.tmdbClient.search(params)) as TmdbSearchPayload;
    await this.cache.store(CatalogProvider.TMDB, queryKey, payload);
    return payload;
  }
}

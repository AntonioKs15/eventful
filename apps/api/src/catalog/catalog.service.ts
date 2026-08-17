import { Injectable } from '@nestjs/common';
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
import { TicketmasterClient } from './ticketmaster.client';

interface TicketmasterSearchPayload {
  page?: { totalElements?: number };
  _embedded?: { events?: unknown[] };
}

@Injectable()
export class CatalogService {
  constructor(
    private readonly cache: CatalogCacheService,
    private readonly client: TicketmasterClient,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(CatalogService.name);
  }

  async search(
    params: CatalogSearchParams,
  ): Promise<PaginatedResult<CatalogEventSummary>> {
    const queryKey = buildCatalogQueryKey(params);
    const cached = await this.cache.get(queryKey);
    const payload = (cached ??
      (await this.fetchAndCache(queryKey, params)) ??
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

  private async fetchAndCache(
    queryKey: string,
    params: CatalogSearchParams,
  ): Promise<TicketmasterSearchPayload> {
    const payload = (await this.client.search(
      params,
    )) as TicketmasterSearchPayload;
    await this.cache.store(queryKey, payload);
    return payload;
  }
}

import { Inject, Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { catalogConfig } from '../config/catalog.config';
import type { CatalogConfig } from '../config/catalog.config';
import { CatalogSearchParams } from './catalog-query-key.util';
import { CatalogProviderUnavailableException } from './exceptions/catalog-provider-unavailable.exception';

const TICKETMASTER_BASE_URL =
  'https://app.ticketmaster.com/discovery/v2/events.json';
const TICKETMASTER_PAGE_INDEX_OFFSET = 1;

@Injectable()
export class TicketmasterClient {
  constructor(
    @Inject(catalogConfig.KEY) private readonly config: CatalogConfig,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(TicketmasterClient.name);
  }

  async search(params: CatalogSearchParams): Promise<unknown> {
    if (!this.config.ticketmasterApiKey) {
      throw new CatalogProviderUnavailableException();
    }

    const url = this.buildUrl(params, this.config.ticketmasterApiKey);

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(
          `Ticketmaster responded with status ${response.status}`,
        );
      }
      return await response.json();
    } catch (error) {
      this.logger.error(
        { err: error },
        'Ticketmaster Discovery API request failed',
      );
      throw new CatalogProviderUnavailableException();
    } finally {
      this.logger.debug('Ticketmaster Discovery API request completed');
    }
  }

  private buildUrl(params: CatalogSearchParams, apiKey: string): string {
    const searchParams = new URLSearchParams({
      apikey: apiKey,
      page: String(params.page - TICKETMASTER_PAGE_INDEX_OFFSET),
      size: String(params.pageSize),
    });

    if (params.keyword) {
      searchParams.set('keyword', params.keyword);
    }
    if (params.city) {
      searchParams.set('city', params.city);
    }

    return `${TICKETMASTER_BASE_URL}?${searchParams.toString()}`;
  }
}

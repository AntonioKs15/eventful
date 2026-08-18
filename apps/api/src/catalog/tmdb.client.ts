import { Inject, Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { catalogConfig } from '../config/catalog.config';
import type { CatalogConfig } from '../config/catalog.config';
import { CatalogSearchParams } from './catalog-query-key.util';
import { CatalogProviderUnavailableException } from './exceptions/catalog-provider-unavailable.exception';

const TMDB_SEARCH_URL = 'https://api.themoviedb.org/3/search/movie';
const TMDB_POPULAR_URL = 'https://api.themoviedb.org/3/movie/popular';

@Injectable()
export class TmdbClient {
  constructor(
    @Inject(catalogConfig.KEY) private readonly config: CatalogConfig,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(TmdbClient.name);
  }

  async search(params: CatalogSearchParams): Promise<unknown> {
    if (!this.config.tmdbApiKey) {
      throw new CatalogProviderUnavailableException(
        'The external movie catalog is temporarily unavailable. You can still create a movie manually.',
      );
    }

    const url = this.buildUrl(params, this.config.tmdbApiKey);

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`TMDb responded with status ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      this.logger.error({ err: error }, 'TMDb API request failed');
      throw new CatalogProviderUnavailableException(
        'The external movie catalog is temporarily unavailable. You can still create a movie manually.',
      );
    } finally {
      this.logger.debug('TMDb API request completed');
    }
  }

  private buildUrl(params: CatalogSearchParams, apiKey: string): string {
    const searchParams = new URLSearchParams({
      api_key: apiKey,
      page: String(params.page),
      language: 'en-US',
    });

    if (params.keyword) {
      searchParams.set('query', params.keyword);
      searchParams.set('include_adult', 'false');
      return `${TMDB_SEARCH_URL}?${searchParams.toString()}`;
    }

    return `${TMDB_POPULAR_URL}?${searchParams.toString()}`;
  }
}

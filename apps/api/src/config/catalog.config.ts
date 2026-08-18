import { registerAs } from '@nestjs/config';

export interface CatalogConfig {
  ticketmasterApiKey: string | undefined;
  tmdbApiKey: string | undefined;
}

export const catalogConfig = registerAs('catalog', (): CatalogConfig => ({
  ticketmasterApiKey: process.env.TICKETMASTER_API_KEY,
  tmdbApiKey: process.env.TMDB_API_KEY,
}));

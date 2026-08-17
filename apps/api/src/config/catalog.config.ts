import { registerAs } from '@nestjs/config';

export interface CatalogConfig {
  ticketmasterApiKey: string | undefined;
}

export const catalogConfig = registerAs('catalog', (): CatalogConfig => ({
  ticketmasterApiKey: process.env.TICKETMASTER_API_KEY,
}));

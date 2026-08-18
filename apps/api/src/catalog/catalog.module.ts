import { Module } from '@nestjs/common';
import { CatalogCacheService } from './catalog-cache.service';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';
import { TicketmasterClient } from './ticketmaster.client';
import { TmdbClient } from './tmdb.client';

@Module({
  controllers: [CatalogController],
  providers: [
    CatalogService,
    CatalogCacheService,
    TicketmasterClient,
    TmdbClient,
  ],
  exports: [CatalogService],
})
export class CatalogModule {}

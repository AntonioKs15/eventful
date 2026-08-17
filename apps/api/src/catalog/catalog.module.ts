import { Module } from '@nestjs/common';
import { CatalogCacheService } from './catalog-cache.service';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';
import { TicketmasterClient } from './ticketmaster.client';

@Module({
  controllers: [CatalogController],
  providers: [CatalogService, CatalogCacheService, TicketmasterClient],
  exports: [CatalogService],
})
export class CatalogModule {}

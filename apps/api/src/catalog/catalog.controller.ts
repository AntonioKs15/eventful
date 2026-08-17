import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PaginatedResult, UserRole } from '@eventful/contracts';
import { Roles } from '../auth/decorators/roles.decorator';
import { CatalogService } from './catalog.service';
import { CatalogSearchQueryDto } from './dto/catalog-search-query.dto';
import { CatalogEventSummary } from './catalog.mapper';

@ApiTags('catalog')
@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Roles(UserRole.ORGANIZER)
  @Get('search')
  @ApiOperation({
    summary:
      'Searches the Ticketmaster Discovery catalog for the organizer to build an event from.',
  })
  search(
    @Query() query: CatalogSearchQueryDto,
  ): Promise<PaginatedResult<CatalogEventSummary>> {
    return this.catalogService.search(query);
  }
}

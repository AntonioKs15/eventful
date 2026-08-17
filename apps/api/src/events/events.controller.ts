import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Event } from '@prisma/client';
import { PaginatedResult, UserRole } from '@eventful/contracts';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthenticatedRequestUser } from '../auth/strategies/jwt-access.strategy';
import { CreateEventDto } from './dto/create-event.dto';
import { ListEventsQueryDto } from './dto/list-events-query.dto';
import { EventsService } from './events.service';

@ApiTags('events')
@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Roles(UserRole.ORGANIZER)
  @Post()
  @ApiOperation({ summary: 'Creates a new event as a draft.' })
  create(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Body() body: CreateEventDto,
  ): Promise<Event> {
    return this.eventsService.createEvent(user.userId, body);
  }

  @Public()
  @Get()
  @ApiOperation({
    summary: 'Lists published events, paginated and filterable.',
  })
  listPublished(
    @Query() query: ListEventsQueryDto,
  ): Promise<PaginatedResult<Event>> {
    return this.eventsService.listPublished(query);
  }

  @Roles(UserRole.ORGANIZER)
  @Get('mine')
  @ApiOperation({ summary: "Lists the authenticated organizer's own events." })
  listMine(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Query() query: ListEventsQueryDto,
  ): Promise<PaginatedResult<Event>> {
    return this.eventsService.listMine(user.userId, query);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Returns a single published event.' })
  findOne(@Param('id') id: string): Promise<Event> {
    return this.eventsService.findPublishedById(id);
  }

  @Roles(UserRole.ORGANIZER)
  @Patch(':id/publish')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Publishes a draft event owned by the authenticated organizer.',
  })
  publish(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('id') id: string,
  ): Promise<Event> {
    return this.eventsService.publish(user.userId, id);
  }
}

import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Actor } from '@prisma/client';
import { PaginatedResult, UserRole } from '@eventful/contracts';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { ActorsService } from './actors.service';
import { CreateActorDto } from './dto/create-actor.dto';
import { ListActorsQueryDto } from './dto/list-actors-query.dto';
import { UpdateActorDto } from './dto/update-actor.dto';

@ApiTags('actors')
@Controller('actors')
export class ActorsController {
  constructor(private readonly actorsService: ActorsService) {}

  @Roles(UserRole.ORGANIZER)
  @Post()
  @ApiOperation({ summary: 'Creates a new actor in the shared catalog.' })
  create(@Body() body: CreateActorDto): Promise<Actor> {
    return this.actorsService.create(body);
  }

  @Roles(UserRole.ORGANIZER)
  @Patch(':id')
  @ApiOperation({ summary: 'Updates an actor in the shared catalog.' })
  update(
    @Param('id') id: string,
    @Body() body: UpdateActorDto,
  ): Promise<Actor> {
    return this.actorsService.update(id, body);
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'Lists actors, paginated and searchable by name.' })
  list(@Query() query: ListActorsQueryDto): Promise<PaginatedResult<Actor>> {
    return this.actorsService.list(query);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Returns an actor and their filmography.' })
  findOne(@Param('id') id: string) {
    return this.actorsService.findById(id);
  }
}

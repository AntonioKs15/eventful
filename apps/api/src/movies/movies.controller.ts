import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Event, Movie, MovieActor, Review } from '@prisma/client';
import {
  PaginatedResult,
  PAGINATION_DEFAULTS,
  UserRole,
} from '@eventful/contracts';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { EventsService } from '../events/events.service';
import { ListEventsQueryDto } from '../events/dto/list-events-query.dto';
import { ReviewsService } from '../reviews/reviews.service';
import { AttachCastDto } from './dto/attach-cast.dto';
import { CreateMovieDto } from './dto/create-movie.dto';
import { ListMoviesQueryDto } from './dto/list-movies-query.dto';
import { UpdateMovieDto } from './dto/update-movie.dto';
import { MovieDetail, MoviesService } from './movies.service';

@ApiTags('movies')
@Controller('movies')
export class MoviesController {
  constructor(
    private readonly moviesService: MoviesService,
    private readonly eventsService: EventsService,
    private readonly reviewsService: ReviewsService,
  ) {}

  @Roles(UserRole.ORGANIZER)
  @Post()
  @ApiOperation({ summary: 'Creates a new movie in the shared catalog.' })
  create(@Body() body: CreateMovieDto): Promise<Movie> {
    return this.moviesService.create(body);
  }

  @Roles(UserRole.ORGANIZER)
  @Patch(':id')
  @ApiOperation({ summary: 'Updates a movie in the shared catalog.' })
  update(
    @Param('id') id: string,
    @Body() body: UpdateMovieDto,
  ): Promise<Movie> {
    return this.moviesService.update(id, body);
  }

  @Public()
  @Get()
  @ApiOperation({
    summary: 'Lists movies, paginated and filterable by status/search.',
  })
  list(@Query() query: ListMoviesQueryDto): Promise<PaginatedResult<Movie>> {
    return this.moviesService.list(query);
  }

  @Public()
  @Get(':id')
  @ApiOperation({
    summary: 'Returns a movie with its cast and aggregate review stats.',
  })
  findOne(@Param('id') id: string): Promise<MovieDetail> {
    return this.moviesService.findById(id);
  }

  @Public()
  @Get(':id/showtimes')
  @ApiOperation({ summary: "Lists a movie's published showtimes." })
  getShowtimes(
    @Param('id') id: string,
    @Query() query: ListEventsQueryDto,
  ): Promise<PaginatedResult<Event>> {
    return this.eventsService.listPublished({ ...query, movieId: id });
  }

  @Public()
  @Get(':id/reviews')
  @ApiOperation({ summary: "Lists a movie's reviews." })
  getReviews(
    @Param('id') id: string,
    @Query('page') page = PAGINATION_DEFAULTS.PAGE,
    @Query('pageSize') pageSize = PAGINATION_DEFAULTS.PAGE_SIZE,
  ): Promise<PaginatedResult<Review & { user: { name: string } }>> {
    return this.reviewsService.listForMovie(id, Number(page), Number(pageSize));
  }

  @Roles(UserRole.ORGANIZER)
  @Post(':id/cast')
  @ApiOperation({ summary: 'Attaches or updates a cast member on a movie.' })
  attachCast(
    @Param('id') id: string,
    @Body() body: AttachCastDto,
  ): Promise<MovieActor> {
    return this.moviesService.attachCast(id, body);
  }

  @Roles(UserRole.ORGANIZER)
  @Delete(':id/cast/:actorId')
  @ApiOperation({ summary: 'Removes a cast member from a movie.' })
  detachCast(
    @Param('id') id: string,
    @Param('actorId') actorId: string,
  ): Promise<void> {
    return this.moviesService.detachCast(id, actorId);
  }
}

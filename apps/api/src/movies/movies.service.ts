import { Injectable } from '@nestjs/common';
import { Movie, MovieActor, Prisma } from '@prisma/client';
import { PinoLogger } from 'nestjs-pino';
import {
  buildPaginationMeta,
  MovieStatus,
  PaginatedResult,
} from '@eventful/contracts';
import { PrismaService } from '../prisma/prisma.service';
import { ActorsService } from '../actors/actors.service';
import { AttachCastDto } from './dto/attach-cast.dto';
import { CreateMovieDto } from './dto/create-movie.dto';
import { ListMoviesQueryDto } from './dto/list-movies-query.dto';
import { UpdateMovieDto } from './dto/update-movie.dto';
import { MovieNotFoundException } from './exceptions/movie-not-found.exception';

const MOVIE_CAST_INCLUDE = {
  cast: {
    include: { actor: true },
    orderBy: { billingOrder: 'asc' },
  },
} satisfies Prisma.MovieInclude;

type MovieWithCast = Prisma.MovieGetPayload<{
  include: typeof MOVIE_CAST_INCLUDE;
}>;

export interface MovieDetail extends MovieWithCast {
  averageRating: number | null;
  reviewCount: number;
}

@Injectable()
export class MoviesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly actorsService: ActorsService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(MoviesService.name);
  }

  async create(dto: CreateMovieDto): Promise<Movie> {
    try {
      return await this.prisma.movie.create({
        data: { ...dto, status: dto.status ?? MovieStatus.COMING_SOON },
      });
    } catch (error) {
      this.logger.error({ err: error }, 'Failed to create movie');
      throw error;
    } finally {
      this.logger.debug('Movie creation completed');
    }
  }

  async update(movieId: string, dto: UpdateMovieDto): Promise<Movie> {
    await this.findByIdOrThrow(movieId);

    try {
      return await this.prisma.movie.update({
        where: { id: movieId },
        data: dto,
      });
    } catch (error) {
      this.logger.error({ err: error }, 'Failed to update movie');
      throw error;
    } finally {
      this.logger.debug('Movie update completed');
    }
  }

  async list(query: ListMoviesQueryDto): Promise<PaginatedResult<Movie>> {
    const where: Prisma.MovieWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? { title: { contains: query.search, mode: 'insensitive' } }
        : {}),
    };

    try {
      const [data, total] = await Promise.all([
        this.prisma.movie.findMany({
          where,
          orderBy: { releaseDate: 'desc' },
          skip: (query.page - 1) * query.pageSize,
          take: query.pageSize,
        }),
        this.prisma.movie.count({ where }),
      ]);

      return {
        data,
        meta: buildPaginationMeta(query.page, query.pageSize, total),
      };
    } catch (error) {
      this.logger.error({ err: error }, 'Failed to list movies');
      throw error;
    } finally {
      this.logger.debug('Movie listing completed');
    }
  }

  async findById(movieId: string): Promise<MovieDetail> {
    const movie = await this.findWithCastOrThrow(movieId);

    const aggregate = await this.prisma.review.aggregate({
      where: { movieId },
      _avg: { rating: true },
      _count: { rating: true },
    });

    return {
      ...movie,
      averageRating: aggregate._avg.rating,
      reviewCount: aggregate._count.rating,
    };
  }

  async attachCast(movieId: string, dto: AttachCastDto): Promise<MovieActor> {
    await this.findByIdOrThrow(movieId);
    await this.actorsService.findById(dto.actorId);

    try {
      return await this.prisma.movieActor.upsert({
        where: { movieId_actorId: { movieId, actorId: dto.actorId } },
        create: {
          movieId,
          actorId: dto.actorId,
          characterName: dto.characterName,
          billingOrder: dto.billingOrder,
        },
        update: {
          characterName: dto.characterName,
          billingOrder: dto.billingOrder,
        },
      });
    } catch (error) {
      this.logger.error({ err: error }, 'Failed to attach cast member');
      throw error;
    } finally {
      this.logger.debug('Cast attachment completed');
    }
  }

  async detachCast(movieId: string, actorId: string): Promise<void> {
    try {
      await this.prisma.movieActor.deleteMany({ where: { movieId, actorId } });
    } catch (error) {
      this.logger.error({ err: error }, 'Failed to detach cast member');
      throw error;
    } finally {
      this.logger.debug('Cast detachment completed');
    }
  }

  private async findByIdOrThrow(movieId: string): Promise<Movie> {
    const movie = await this.prisma.movie.findUnique({
      where: { id: movieId },
    });
    if (!movie) {
      throw new MovieNotFoundException();
    }
    return movie;
  }

  private async findWithCastOrThrow(movieId: string): Promise<MovieWithCast> {
    let movie: MovieWithCast | null;

    try {
      movie = await this.prisma.movie.findUnique({
        where: { id: movieId },
        include: MOVIE_CAST_INCLUDE,
      });
    } catch (error) {
      this.logger.error({ err: error }, 'Failed to look up movie');
      throw error;
    } finally {
      this.logger.debug('Movie lookup completed');
    }

    if (!movie) {
      throw new MovieNotFoundException();
    }

    return movie;
  }
}

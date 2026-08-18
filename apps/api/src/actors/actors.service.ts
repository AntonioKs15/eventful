import { Injectable } from '@nestjs/common';
import { Actor, Prisma } from '@prisma/client';
import { PinoLogger } from 'nestjs-pino';
import { buildPaginationMeta, PaginatedResult } from '@eventful/contracts';
import { PrismaService } from '../prisma/prisma.service';
import { CreateActorDto } from './dto/create-actor.dto';
import { ListActorsQueryDto } from './dto/list-actors-query.dto';
import { UpdateActorDto } from './dto/update-actor.dto';
import { ActorNotFoundException } from './exceptions/actor-not-found.exception';

const ACTOR_DETAIL_INCLUDE = {
  filmography: {
    include: { movie: true },
    orderBy: { movie: { releaseDate: 'desc' } },
  },
} satisfies Prisma.ActorInclude;

type ActorWithFilmography = Prisma.ActorGetPayload<{
  include: typeof ACTOR_DETAIL_INCLUDE;
}>;

@Injectable()
export class ActorsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(ActorsService.name);
  }

  async create(dto: CreateActorDto): Promise<Actor> {
    try {
      return await this.prisma.actor.create({ data: dto });
    } catch (error) {
      this.logger.error({ err: error }, 'Failed to create actor');
      throw error;
    } finally {
      this.logger.debug('Actor creation completed');
    }
  }

  async update(actorId: string, dto: UpdateActorDto): Promise<Actor> {
    await this.findByIdOrThrow(actorId);

    try {
      return await this.prisma.actor.update({
        where: { id: actorId },
        data: dto,
      });
    } catch (error) {
      this.logger.error({ err: error }, 'Failed to update actor');
      throw error;
    } finally {
      this.logger.debug('Actor update completed');
    }
  }

  async list(query: ListActorsQueryDto): Promise<PaginatedResult<Actor>> {
    const where: Prisma.ActorWhereInput = query.search
      ? { name: { contains: query.search, mode: 'insensitive' } }
      : {};

    try {
      const [data, total] = await Promise.all([
        this.prisma.actor.findMany({
          where,
          orderBy: { name: 'asc' },
          skip: (query.page - 1) * query.pageSize,
          take: query.pageSize,
        }),
        this.prisma.actor.count({ where }),
      ]);

      return {
        data,
        meta: buildPaginationMeta(query.page, query.pageSize, total),
      };
    } catch (error) {
      this.logger.error({ err: error }, 'Failed to list actors');
      throw error;
    } finally {
      this.logger.debug('Actor listing completed');
    }
  }

  async findById(actorId: string): Promise<ActorWithFilmography> {
    let actor: ActorWithFilmography | null;

    try {
      actor = await this.prisma.actor.findUnique({
        where: { id: actorId },
        include: ACTOR_DETAIL_INCLUDE,
      });
    } catch (error) {
      this.logger.error({ err: error }, 'Failed to look up actor');
      throw error;
    } finally {
      this.logger.debug('Actor lookup completed');
    }

    if (!actor) {
      throw new ActorNotFoundException();
    }

    return actor;
  }

  private async findByIdOrThrow(actorId: string): Promise<Actor> {
    const actor = await this.prisma.actor.findUnique({
      where: { id: actorId },
    });
    if (!actor) {
      throw new ActorNotFoundException();
    }
    return actor;
  }
}

import { ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma, Review } from '@prisma/client';
import { PinoLogger } from 'nestjs-pino';
import {
  buildPaginationMeta,
  PaginatedResult,
  TicketStatus,
} from '@eventful/contracts';
import { PrismaService } from '../prisma/prisma.service';
import { MovieNotFoundException } from '../movies/exceptions/movie-not-found.exception';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { ReviewAlreadyExistsException } from './exceptions/review-already-exists.exception';
import { ReviewNotEligibleException } from './exceptions/review-not-eligible.exception';
import { ReviewNotFoundException } from './exceptions/review-not-found.exception';

function isUniqueConstraintViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}

@Injectable()
export class ReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(ReviewsService.name);
  }

  async create(userId: string, dto: CreateReviewDto): Promise<Review> {
    const movie = await this.prisma.movie.findUnique({
      where: { id: dto.movieId },
    });
    if (!movie) {
      throw new MovieNotFoundException();
    }

    await this.assertEligible(userId, dto.movieId);

    try {
      return await this.prisma.review.create({
        data: {
          movieId: dto.movieId,
          userId,
          rating: dto.rating,
          comment: dto.comment,
        },
      });
    } catch (error) {
      if (isUniqueConstraintViolation(error)) {
        throw new ReviewAlreadyExistsException();
      }
      this.logger.error({ err: error }, 'Failed to create review');
      throw error;
    } finally {
      this.logger.debug('Review creation completed');
    }
  }

  async update(
    userId: string,
    reviewId: string,
    dto: UpdateReviewDto,
  ): Promise<Review> {
    const review = await this.findOwnedOrThrow(userId, reviewId);

    try {
      return await this.prisma.review.update({
        where: { id: review.id },
        data: dto,
      });
    } catch (error) {
      this.logger.error({ err: error }, 'Failed to update review');
      throw error;
    } finally {
      this.logger.debug('Review update completed');
    }
  }

  async remove(userId: string, reviewId: string): Promise<void> {
    const review = await this.findOwnedOrThrow(userId, reviewId);

    try {
      await this.prisma.review.delete({ where: { id: review.id } });
    } catch (error) {
      this.logger.error({ err: error }, 'Failed to delete review');
      throw error;
    } finally {
      this.logger.debug('Review deletion completed');
    }
  }

  async listForMovie(
    movieId: string,
    page: number,
    pageSize: number,
  ): Promise<PaginatedResult<Review & { user: { name: string } }>> {
    const where: Prisma.ReviewWhereInput = { movieId };

    try {
      const [data, total] = await Promise.all([
        this.prisma.review.findMany({
          where,
          include: { user: { select: { name: true } } },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        this.prisma.review.count({ where }),
      ]);

      return { data, meta: buildPaginationMeta(page, pageSize, total) };
    } catch (error) {
      this.logger.error({ err: error }, 'Failed to list movie reviews');
      throw error;
    } finally {
      this.logger.debug('Movie review listing completed');
    }
  }

  private async assertEligible(userId: string, movieId: string): Promise<void> {
    const ticket = await this.prisma.ticket.findFirst({
      where: {
        customerId: userId,
        status: { in: [TicketStatus.ISSUED, TicketStatus.USED] },
        event: { movieId },
      },
      select: { id: true },
    });

    if (!ticket) {
      throw new ReviewNotEligibleException();
    }
  }

  private async findOwnedOrThrow(
    userId: string,
    reviewId: string,
  ): Promise<Review> {
    let review: Review | null;

    try {
      review = await this.prisma.review.findUnique({ where: { id: reviewId } });
    } catch (error) {
      this.logger.error({ err: error }, 'Failed to look up review');
      throw error;
    } finally {
      this.logger.debug('Review lookup completed');
    }

    if (!review) {
      throw new ReviewNotFoundException();
    }

    if (review.userId !== userId) {
      throw new ForbiddenException();
    }

    return review;
  }
}

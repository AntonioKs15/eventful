import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Review } from '@prisma/client';
import { UserRole } from '@eventful/contracts';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthenticatedRequestUser } from '../auth/strategies/jwt-access.strategy';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { ReviewsService } from './reviews.service';

@ApiTags('reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Roles(UserRole.CUSTOMER)
  @Post()
  @ApiOperation({
    summary: 'Creates a review for a movie the customer holds a ticket for.',
  })
  create(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Body() body: CreateReviewDto,
  ): Promise<Review> {
    return this.reviewsService.create(user.userId, body);
  }

  @Roles(UserRole.CUSTOMER)
  @Patch(':id')
  @ApiOperation({ summary: "Updates the authenticated customer's own review." })
  update(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('id') id: string,
    @Body() body: UpdateReviewDto,
  ): Promise<Review> {
    return this.reviewsService.update(user.userId, id, body);
  }

  @Roles(UserRole.CUSTOMER)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Deletes the authenticated customer's own review." })
  remove(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('id') id: string,
  ): Promise<void> {
    return this.reviewsService.remove(user.userId, id);
  }
}

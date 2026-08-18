import { Module } from '@nestjs/common';
import { ActorsModule } from '../actors/actors.module';
import { EventsModule } from '../events/events.module';
import { ReviewsModule } from '../reviews/reviews.module';
import { MoviesController } from './movies.controller';
import { MoviesService } from './movies.service';

@Module({
  imports: [ActorsModule, EventsModule, ReviewsModule],
  controllers: [MoviesController],
  providers: [MoviesService],
  exports: [MoviesService],
})
export class MoviesModule {}

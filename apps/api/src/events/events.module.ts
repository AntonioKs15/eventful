import { Module } from '@nestjs/common';
import { VenuesModule } from '../venues/venues.module';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';

@Module({
  imports: [VenuesModule],
  controllers: [EventsController],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}

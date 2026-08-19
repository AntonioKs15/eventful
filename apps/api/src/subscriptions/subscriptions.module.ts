import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { stripeClientProvider } from './stripe-client.provider';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';

@Module({
  imports: [NotificationsModule],
  controllers: [SubscriptionsController],
  providers: [stripeClientProvider, SubscriptionsService],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}

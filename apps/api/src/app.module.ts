import { randomUUID } from 'node:crypto';
import type { IncomingMessage } from 'node:http';
import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { LoggerModule } from 'nestjs-pino';
import { ActorsModule } from './actors/actors.module';
import { AuthModule } from './auth/auth.module';
import { CatalogModule } from './catalog/catalog.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { AppConfig } from './config/app.config';
import { configurationFactories } from './config/configuration';
import { NodeEnvironment } from './config/node-environment.enum';
import { validateEnvironment } from './config/env.validation';
import { EventsModule } from './events/events.module';
import { GateModule } from './gate/gate.module';
import { HealthModule } from './health/health.module';
import { MoviesModule } from './movies/movies.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PaymentsModule } from './payments/payments.module';
import { PrismaModule } from './prisma/prisma.module';
import { ReservationsModule } from './reservations/reservations.module';
import { ReviewsModule } from './reviews/reviews.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { TicketsModule } from './tickets/tickets.module';
import { VenuesModule } from './venues/venues.module';

function resolveRequestId(request: IncomingMessage): string {
  const header = request.headers['x-request-id'];
  if (Array.isArray(header)) {
    return header[0] ?? randomUUID();
  }
  return header ?? randomUUID();
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: configurationFactories,
      validate: validateEnvironment,
    }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const appConfig = configService.get<AppConfig>('app');
        const isDevelopment =
          appConfig?.nodeEnv === NodeEnvironment.DEVELOPMENT;

        return {
          pinoHttp: {
            genReqId: resolveRequestId,
            transport: isDevelopment ? { target: 'pino-pretty' } : undefined,
          },
        };
      },
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    CatalogModule,
    VenuesModule,
    EventsModule,
    ReservationsModule,
    TicketsModule,
    SubscriptionsModule,
    PaymentsModule,
    GateModule,
    HealthModule,
    ActorsModule,
    MoviesModule,
    ReviewsModule,
    NotificationsModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
})
export class AppModule {}

import { Module } from '@nestjs/common';
import { ReservationExpiryScheduler } from './reservation-expiry.scheduler';
import { ReservationsController } from './reservations.controller';
import { ReservationsService } from './reservations.service';
import { AllocationStrategyFactory } from './strategies/allocation-strategy.factory';
import { GeneralAdmissionAllocationStrategy } from './strategies/general-admission-allocation.strategy';
import { SeatedAllocationStrategy } from './strategies/seated-allocation.strategy';

@Module({
  controllers: [ReservationsController],
  providers: [
    ReservationsService,
    ReservationExpiryScheduler,
    AllocationStrategyFactory,
    SeatedAllocationStrategy,
    GeneralAdmissionAllocationStrategy,
  ],
  exports: [ReservationsService, AllocationStrategyFactory],
})
export class ReservationsModule {}

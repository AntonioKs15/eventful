import { Injectable } from '@nestjs/common';
import { EventLayoutType } from '@eventful/contracts';
import { AllocationStrategy } from './allocation-strategy.interface';
import { GeneralAdmissionAllocationStrategy } from './general-admission-allocation.strategy';
import { SeatedAllocationStrategy } from './seated-allocation.strategy';

@Injectable()
export class AllocationStrategyFactory {
  private readonly strategies: Record<EventLayoutType, AllocationStrategy>;

  constructor(
    seatedAllocationStrategy: SeatedAllocationStrategy,
    generalAdmissionAllocationStrategy: GeneralAdmissionAllocationStrategy,
  ) {
    this.strategies = {
      [EventLayoutType.SEATED]: seatedAllocationStrategy,
      [EventLayoutType.GENERAL_ADMISSION]: generalAdmissionAllocationStrategy,
    };
  }

  for(layoutType: EventLayoutType): AllocationStrategy {
    return this.strategies[layoutType];
  }
}

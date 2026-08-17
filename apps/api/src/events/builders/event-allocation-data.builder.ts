import { Prisma } from '@prisma/client';
import { EventLayoutType } from '@eventful/contracts';
import { CreateEventDto } from '../dto/create-event.dto';
import { buildSeatGrid } from './seat-grid.builder';

type AllocationData = Pick<
  Prisma.EventCreateInput,
  'seatMap' | 'generalAdmissionPool'
>;

const ALLOCATION_DATA_BUILDERS: Record<
  EventLayoutType,
  (dto: CreateEventDto) => AllocationData
> = {
  [EventLayoutType.SEATED]: (dto) => ({
    seatMap: {
      create: {
        rows: dto.seatMap!.rows,
        columns: dto.seatMap!.columns,
        seats: {
          create: buildSeatGrid(dto.seatMap!.rows, dto.seatMap!.columns),
        },
      },
    },
  }),
  [EventLayoutType.GENERAL_ADMISSION]: (dto) => ({
    generalAdmissionPool: { create: { capacity: dto.capacity, sold: 0 } },
  }),
};

export function buildEventAllocationData(dto: CreateEventDto): AllocationData {
  return ALLOCATION_DATA_BUILDERS[dto.layoutType](dto);
}

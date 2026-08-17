import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinDate,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { EventLayoutType } from '@eventful/contracts';
import { CreateEventSeatMapDto } from './create-event-seat-map.dto';
import { CreateEventVenueDto } from './create-event-venue.dto';

const TITLE_MAX_LENGTH = 200;
const DESCRIPTION_MAX_LENGTH = 2000;

export class CreateEventDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(TITLE_MAX_LENGTH)
  title!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(DESCRIPTION_MAX_LENGTH)
  description!: string;

  @ApiProperty()
  @Type(() => Date)
  @IsDate()
  @MinDate(() => new Date())
  startsAt!: Date;

  @ApiProperty()
  @IsInt()
  @Min(1)
  capacity!: number;

  @ApiProperty()
  @IsInt()
  @Min(0)
  priceCents!: number;

  @ApiProperty({ enum: EventLayoutType })
  @IsEnum(EventLayoutType)
  layoutType!: EventLayoutType;

  @ApiProperty({ type: CreateEventVenueDto })
  @ValidateNested()
  @Type(() => CreateEventVenueDto)
  venue!: CreateEventVenueDto;

  @ApiPropertyOptional({ type: CreateEventSeatMapDto })
  @ValidateIf(
    (event: CreateEventDto) => event.layoutType === EventLayoutType.SEATED,
  )
  @ValidateNested()
  @Type(() => CreateEventSeatMapDto)
  seatMap?: CreateEventSeatMapDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  catalogSourceId?: string;
}

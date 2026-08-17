import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class CreateEventSeatMapDto {
  @ApiProperty()
  @IsInt()
  @Min(1)
  rows!: number;

  @ApiProperty()
  @IsInt()
  @Min(1)
  columns!: number;
}

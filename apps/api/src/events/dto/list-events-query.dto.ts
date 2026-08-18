import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { EventSortBy, PAGINATION_DEFAULTS } from '@eventful/contracts';

export class ListEventsQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  movieId?: string;

  @ApiPropertyOptional({ enum: EventSortBy, default: EventSortBy.STARTS_AT })
  @IsOptional()
  @IsEnum(EventSortBy)
  sortBy: EventSortBy = EventSortBy.STARTS_AT;

  @ApiPropertyOptional({ default: PAGINATION_DEFAULTS.PAGE })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = PAGINATION_DEFAULTS.PAGE;

  @ApiPropertyOptional({ default: PAGINATION_DEFAULTS.PAGE_SIZE })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(PAGINATION_DEFAULTS.MAX_PAGE_SIZE)
  pageSize: number = PAGINATION_DEFAULTS.PAGE_SIZE;
}

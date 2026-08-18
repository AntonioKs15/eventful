import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsDate,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
} from 'class-validator';
import { MovieStatus } from '@eventful/contracts';

const TITLE_MAX_LENGTH = 200;
const SYNOPSIS_MAX_LENGTH = 4000;
const RATING_LABEL_MAX_LENGTH = 10;

export class CreateMovieDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(TITLE_MAX_LENGTH)
  title!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(SYNOPSIS_MAX_LENGTH)
  synopsis!: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  durationMinutes!: number;

  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  genres!: string[];

  @ApiProperty()
  @Type(() => Date)
  @IsDate()
  releaseDate!: Date;

  @ApiProperty()
  @IsUrl()
  posterImageUrl!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  backdropImageUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  trailerUrl?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(RATING_LABEL_MAX_LENGTH)
  ratingLabel!: string;

  @ApiPropertyOptional({ enum: MovieStatus, default: MovieStatus.COMING_SOON })
  @IsOptional()
  @IsEnum(MovieStatus)
  status: MovieStatus = MovieStatus.COMING_SOON;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  catalogSourceId?: string;
}

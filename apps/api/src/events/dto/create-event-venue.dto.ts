import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, ValidateIf } from 'class-validator';

export class CreateEventVenueDto {
  @ApiPropertyOptional({ description: 'Reuse an existing venue by id.' })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiPropertyOptional()
  @ValidateIf((venue: CreateEventVenueDto) => !venue.id)
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional()
  @ValidateIf((venue: CreateEventVenueDto) => !venue.id)
  @IsString()
  @IsNotEmpty()
  city?: string;

  @ApiPropertyOptional()
  @ValidateIf((venue: CreateEventVenueDto) => !venue.id)
  @IsString()
  @IsNotEmpty()
  address?: string;

  @ApiPropertyOptional({
    description: 'Ticketmaster venue id, when sourced from the catalog.',
  })
  @IsOptional()
  @IsString()
  externalId?: string;
}

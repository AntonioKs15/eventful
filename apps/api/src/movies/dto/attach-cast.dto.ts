import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class AttachCastDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  actorId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  characterName!: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  billingOrder: number = 0;
}

import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RedeemFreeTicketDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  reservationId!: string;
}

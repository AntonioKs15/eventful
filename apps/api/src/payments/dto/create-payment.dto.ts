import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { PaymentOutcome } from '@eventful/contracts';

export class CreatePaymentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  reservationId!: string;

  @ApiProperty({ enum: PaymentOutcome })
  @IsEnum(PaymentOutcome)
  outcome!: PaymentOutcome;
}

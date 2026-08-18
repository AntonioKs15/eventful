import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ValidateTicketDto {
  @ApiProperty({
    description: 'The id of the event this gate device is currently checking.',
  })
  @IsString()
  @IsNotEmpty()
  eventId!: string;

  @ApiProperty({
    description:
      'The QR payload, either decoded from the camera or typed manually — both converge on this field.',
  })
  @IsString()
  @IsNotEmpty()
  payload!: string;
}

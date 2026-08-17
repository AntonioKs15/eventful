import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

const MIN_PASSWORD_LENGTH = 8;

export class LoginDto {
  @ApiProperty({ example: 'organizer@eventful.test' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'change-me-please' })
  @IsString()
  @MinLength(MIN_PASSWORD_LENGTH)
  password!: string;
}

import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  Max,
  Min,
  MinLength,
  validateSync,
} from 'class-validator';
import { NodeEnvironment } from './node-environment.enum';

const MIN_PORT = 1;
const MAX_PORT = 65535;
const MIN_SECRET_LENGTH = 16;
const JWT_DURATION_PATTERN = /^\d+[smhd]$/;

class EnvironmentVariables {
  @IsEnum(NodeEnvironment)
  NODE_ENV!: NodeEnvironment;

  @IsInt()
  @Min(MIN_PORT)
  @Max(MAX_PORT)
  PORT!: number;

  @IsUrl({ require_tld: false })
  CORS_ORIGIN!: string;

  @IsString()
  @MinLength(1)
  DATABASE_URL!: string;

  @IsString()
  @MinLength(MIN_SECRET_LENGTH)
  JWT_ACCESS_SECRET!: string;

  @IsString()
  @Matches(JWT_DURATION_PATTERN)
  JWT_ACCESS_EXPIRES_IN!: string;

  @IsInt()
  @Min(1)
  REFRESH_TOKEN_EXPIRES_IN_DAYS!: number;

  @IsString()
  @MinLength(MIN_SECRET_LENGTH)
  QR_HMAC_SECRET!: string;

  @IsOptional()
  @IsString()
  TICKETMASTER_API_KEY?: string;

  @IsOptional()
  @IsString()
  TMDB_API_KEY?: string;
}

export function validateEnvironment(
  config: Record<string, unknown>,
): EnvironmentVariables {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }

  return validatedConfig;
}

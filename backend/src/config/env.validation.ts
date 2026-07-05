import { plainToInstance } from 'class-transformer';
import {
  IsNumber,
  IsOptional,
  IsString,
  IsNotEmpty,
  validateSync,
} from 'class-validator';

class EnvironmentValidator {
  @IsString()
  @IsNotEmpty()
  DATABASE_URL!: string;

  @IsString()
  @IsNotEmpty()
  JWT_SECRET!: string;

  @IsString()
  @IsNotEmpty()
  REDIS_URL!: string;

  @IsString()
  @IsNotEmpty()
  NODE_ENV!: string;

  @IsString()
  JWT_EXPIRES_IN!: string;

  // ─── File upload (MVP) ───────────────────────────────────────────────
  // These are intentionally optional so existing .env files without the
  // upload variables continue to boot. The runtime layers provide
  // sensible defaults when the values are absent.

  @IsOptional()
  @IsString()
  UPLOAD_LOCAL_PATH?: string;

  @IsOptional()
  @IsString()
  UPLOAD_LOCAL_URL_PREFIX?: string;

  @IsOptional()
  @IsNumber()
  UPLOAD_MAX_FILE_SIZE?: number;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentValidator, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(`Environment validation failed: ${errors.toString()}`);
  }

  return validatedConfig;
}
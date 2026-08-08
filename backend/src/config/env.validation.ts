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
  ADMIN_JWT_SECRET!: string;

  @IsString()
  @IsNotEmpty()
  REDIS_URL!: string;

  @IsString()
  @IsNotEmpty()
  NODE_ENV!: string;

  @IsString()
  JWT_EXPIRES_IN!: string;

  // File upload values remain optional; runtime layers provide defaults.
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

const MIN_SECRET_LENGTH = 32;
const PLACEHOLDER_SECRETS = new Set([
  'change-me',
  'change-me-to-a-256-bit-random-secret-key',
  'change-me-to-a-different-admin-secret',
  'replace-me',
  'replace-with-strong-admin-jwt-secret',
  'replace-with-strong-random-jwt-secret',
  'password',
]);

function validateJwtSecret(name: string, value: unknown): void {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${name} is required`);
  }

  const trimmed = value.trim();
  if (trimmed.length < MIN_SECRET_LENGTH) {
    throw new Error(`${name} must be at least ${MIN_SECRET_LENGTH} characters long`);
  }

  if (PLACEHOLDER_SECRETS.has(trimmed.toLowerCase())) {
    throw new Error(`${name} must not use a placeholder value`);
  }
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

  validateJwtSecret('JWT_SECRET', validatedConfig.JWT_SECRET);
  validateJwtSecret('ADMIN_JWT_SECRET', validatedConfig.ADMIN_JWT_SECRET);

  return validatedConfig;
}
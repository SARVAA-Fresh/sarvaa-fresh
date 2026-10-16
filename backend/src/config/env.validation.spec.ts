import 'reflect-metadata';
import { validate } from './env.validation';

describe('environment validation', () => {
  const validConfig = {
    DATABASE_URL: 'postgresql://user:password@localhost:5432/sarvaa_fresh',
    JWT_SECRET: 'a'.repeat(32),
    ADMIN_JWT_SECRET: 'b'.repeat(32),
    NODE_ENV: 'test',
    JWT_EXPIRES_IN: '7d',
  };

  it('accepts configuration without REDIS_URL', () => {
    expect(validate(validConfig).REDIS_URL).toBeUndefined();
  });

  it.each(['redis://localhost:6379', 'redis://redis:6379'])(
    'continues to accept configured REDIS_URL %s',
    (redisUrl) => {
      expect(validate({ ...validConfig, REDIS_URL: redisUrl }).REDIS_URL).toBe(
        redisUrl,
      );
    },
  );

  it('rejects a configured empty REDIS_URL', () => {
    expect(() => validate({ ...validConfig, REDIS_URL: '' })).toThrow(
      'Environment validation failed',
    );
  });

  it('defaults order notifications to disabled', () => {
    expect(validate(validConfig).ORDER_NOTIFICATIONS_ENABLED).toBe('false');
  });

  it.each(['true', 'false'])(
    'accepts ORDER_NOTIFICATIONS_ENABLED=%s',
    (enabled) => {
      expect(
        validate({
          ...validConfig,
          ORDER_NOTIFICATIONS_ENABLED: enabled,
        }).ORDER_NOTIFICATIONS_ENABLED,
      ).toBe(enabled);
    },
  );

  it('rejects invalid ORDER_NOTIFICATIONS_ENABLED values', () => {
    expect(() =>
      validate({
        ...validConfig,
        ORDER_NOTIFICATIONS_ENABLED: 'treu',
      }),
    ).toThrow('Environment validation failed');
  });
});

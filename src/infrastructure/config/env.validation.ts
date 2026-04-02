import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().port().default(3000),
  GLOBAL_PREFIX: Joi.string().default('api'),
  CORS_ORIGINS: Joi.string()
    .custom((value: string, helpers) => {
      const origins = value
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean);

      if (origins.length === 0) {
        return helpers.error('any.invalid');
      }

      for (const origin of origins) {
        if (origin === '*') {
          continue;
        }
        try {
          const parsed = new URL(origin);
          if (!['http:', 'https:'].includes(parsed.protocol)) {
            return helpers.error('any.invalid');
          }
        } catch {
          return helpers.error('any.invalid');
        }
      }

      return value;
    })
    .default('http://localhost:3000'),
  TRUST_PROXY: Joi.boolean().truthy('true').falsy('false').default(false),
  ENABLE_SNAPSHOT: Joi.boolean()
    .truthy('true')
    .falsy('false')
    .default(false),
  THROTTLE_TTL_MS: Joi.number().integer().min(1000).default(60000),
  THROTTLE_LIMIT: Joi.number().integer().min(1).default(100),
  API_TOKEN: Joi.when('NODE_ENV', {
    is: 'production',
    then: Joi.string().min(32).required(),
    otherwise: Joi.string().min(16).default('dev-local-api-token-change-me'),
  }),
  OTEL_ENABLED: Joi.boolean().truthy('true').falsy('false').default(false),
  OTEL_EXPORTER_OTLP_ENDPOINT: Joi.string().uri().allow('').optional(),
  LOG_LEVEL: Joi.string().valid('fatal', 'error', 'warn', 'info', 'debug', 'trace').default('info'),
  METRICS_TOKEN: Joi.when('NODE_ENV', {
    is: 'production',
    then: Joi.string().min(32).required(),
    otherwise: Joi.string().min(32).allow('').optional(),
  }),
  CACHE_DEFAULT_TTL_SEC: Joi.number().integer().min(1).max(86_400).default(60),
  CACHE_MAX_ITEMS: Joi.number().integer().min(100).max(1_000_000).default(10_000),
  MAIL_ENABLED: Joi.boolean().truthy('true').falsy('false').default(false),
  MAIL_HOST: Joi.string().hostname().default('localhost'),
  MAIL_PORT: Joi.number().port().default(587),
  MAIL_SECURE: Joi.boolean().truthy('true').falsy('false').default(false),
  MAIL_USER: Joi.string().allow('').default(''),
  MAIL_PASSWORD: Joi.string().allow('').default(''),
  MAIL_DEFAULT_FROM: Joi.string().email({ tlds: { allow: false } }).allow('').default(''),
  MAIL_VERIFY_ON_STARTUP: Joi.boolean().truthy('true').falsy('false').default(false),
  MAIL_POOL: Joi.boolean().truthy('true').falsy('false').default(true),
  MAIL_MAX_CONNECTIONS: Joi.number().integer().min(1).max(50).default(5),
  MAIL_MAX_MESSAGES: Joi.number().integer().min(1).max(1000).default(100),
  MAIL_CONNECTION_TIMEOUT_MS: Joi.number().integer().min(1000).default(10000),
  MAIL_GREETING_TIMEOUT_MS: Joi.number().integer().min(1000).default(10000),
  MAIL_SOCKET_TIMEOUT_MS: Joi.number().integer().min(1000).default(15000),
  MAIL_REQUIRE_TLS: Joi.boolean().truthy('true').falsy('false').default(true),
  MAIL_REJECT_UNAUTHORIZED: Joi.boolean()
    .truthy('true')
    .falsy('false')
    .default(true),
  MAIL_QUEUE_ENABLED: Joi.boolean().truthy('true').falsy('false').default(true),
  MAIL_QUEUE_POLL_INTERVAL_MS: Joi.number().integer().min(100).default(1000),
  MAIL_QUEUE_BATCH_SIZE: Joi.number().integer().min(1).max(500).default(20),
  MAIL_QUEUE_CONCURRENCY: Joi.number().integer().min(1).max(100).default(5),
  MAIL_MAX_ATTEMPTS: Joi.number().integer().min(1).max(20).default(3),
  MAIL_RETRY_BASE_DELAY_MS: Joi.number().integer().min(1000).default(10000),
  MAIL_IDEMPOTENCY_TTL_SEC: Joi.number().integer().min(60).default(3600),
  MAIL_TEMPLATE_CACHE_TTL_SEC: Joi.number().integer().min(10).default(300),
  MAIL_WEBHOOK_SECRET: Joi.string().min(16).allow('').optional(),
  DB_HOST: Joi.string().hostname().default('localhost'),
  DB_PORT: Joi.number().port().default(5432),
  DB_USERNAME: Joi.when('NODE_ENV', {
    is: 'production',
    then: Joi.string().min(1).invalid('postgres', 'admin', 'root').required(),
    otherwise: Joi.string().default('postgres'),
  }),
  DB_PASSWORD: Joi.when('NODE_ENV', {
    is: 'production',
    then: Joi.string()
      .min(12)
      .invalid('postgres', 'password', '12345678', 'changeme123')
      .required(),
    otherwise: Joi.string().allow('').default('postgres'),
  }),
  DB_NAME: Joi.string().default('postgres'),
  DB_SSL: Joi.boolean().truthy('true').falsy('false').default(false),
  DB_SSL_REJECT_UNAUTHORIZED: Joi.boolean()
    .truthy('true')
    .falsy('false')
    .default(true),
  DB_SSL_CA: Joi.string().allow('').optional(),
  DB_RETRY_ATTEMPTS: Joi.number().integer().min(1).default(5),
  DB_RETRY_DELAY_MS: Joi.number().integer().min(100).default(3000),
}).custom((value, helpers) => {
  if (value.MAIL_ENABLED && value.NODE_ENV === 'production') {
    if (!value.MAIL_DEFAULT_FROM) {
      return helpers.error('any.invalid');
    }
    if (!value.MAIL_USER || !value.MAIL_PASSWORD) {
      return helpers.error('any.invalid');
    }
    if (!value.MAIL_HOST) {
      return helpers.error('any.invalid');
    }
  }

  return value;
});

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
  OTEL_ENABLED: Joi.boolean().truthy('true').falsy('false').default(false),
  OTEL_EXPORTER_OTLP_ENDPOINT: Joi.string().uri().allow('').optional(),
  LOG_LEVEL: Joi.string().valid('fatal', 'error', 'warn', 'info', 'debug', 'trace').default('info'),
  METRICS_TOKEN: Joi.when('NODE_ENV', {
    is: 'production',
    then: Joi.string().min(32).required(),
    otherwise: Joi.string().min(32).allow('').optional(),
  }),
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
});

export default () => ({
  app: {
    nodeEnv: process.env.NODE_ENV ?? 'development',
    port: parseInt(process.env.PORT ?? '3000', 10),
    globalPrefix: process.env.GLOBAL_PREFIX ?? 'api',
    corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:3000')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    trustProxy: process.env.TRUST_PROXY === 'true',
    snapshotEnabled: process.env.ENABLE_SNAPSHOT === 'true',
  },
  security: {
    throttleTtlMs: parseInt(process.env.THROTTLE_TTL_MS ?? '60000', 10),
    throttleLimit: parseInt(process.env.THROTTLE_LIMIT ?? '100', 10),
  },
  observability: {
    otelEnabled: process.env.OTEL_ENABLED === 'true',
    otelExporterEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
    logLevel: process.env.LOG_LEVEL ?? 'info',
    metricsToken: process.env.METRICS_TOKEN || undefined,
  },
  database: {
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    username: process.env.DB_USERNAME ?? '',
    password: process.env.DB_PASSWORD ?? '',
    name: process.env.DB_NAME ?? 'postgres',
    ssl: process.env.DB_SSL === 'true',
    sslRejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false',
    sslCa: process.env.DB_SSL_CA,
    retryAttempts: parseInt(process.env.DB_RETRY_ATTEMPTS ?? '5', 10),
    retryDelayMs: parseInt(process.env.DB_RETRY_DELAY_MS ?? '3000', 10),
  },
});

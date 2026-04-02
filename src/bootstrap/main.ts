import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { AppModule } from './app.module';
import { startTracing } from '../modules/observability/infrastructure/tracing';
import {
  createCorrelationIdMiddleware,
  createApiTokenMiddleware,
  createCsrfValidationMiddleware,
  createMetricsAuthMiddleware,
} from '../infrastructure/middleware';
import { createPinoHttpConfig } from '../infrastructure/middleware/pino-logger.config';
import { setupSwaggerDocumentation } from '../infrastructure/middleware/swagger-setup';
import { setupApplication } from '../infrastructure/middleware/app-setup';
import { APP_CONSTANTS, ConfigurationException } from '../shared';

/**
 * Main bootstrap function for the NestJS application.
 * Orchestrates application setup including:
 * - Tracing/observability
 * - Configuration loading
 * - Middleware setup
 * - API documentation
 * - Graceful shutdown
 */
async function bootstrap() {
  const shutdownTracing = await startTracing();

  const isSnapshotEnabled = determineSnapshotMode();
  const app = await NestFactory.create(AppModule, { snapshot: isSnapshotEnabled });

  const configService = app.get(ConfigService);
  const config = loadConfiguration(configService);

  // Apply core application setup
  setupApplication(app, {
    port: config.port,
    globalPrefix: config.globalPrefix,
    trustProxy: config.trustProxy,
    nodeEnv: config.nodeEnv,
    corsOrigins: config.corsOrigins,
  });

  // Apply middleware in order
  app.use(createCorrelationIdMiddleware());
  app.use(pinoHttp(createPinoHttpConfig(config.logLevel)));

  // API documentation (if enabled)
  if (config.scalarEnabled) {
    setupSwaggerDocumentation(app, {
      port: config.port,
      globalPrefix: config.globalPrefix,
      apiVersion: config.apiVersion,
    });
  }

  // Security middleware
  app.use(createApiTokenMiddleware(config.apiToken));
  app.use(/\/metrics$/, createMetricsAuthMiddleware(config.metricsToken, config.isProduction));
  app.use(cookieParser());
  app.use(createCsrfValidationMiddleware());
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'same-site' } }));

  await app.listen(config.port);

  // Graceful shutdown
  const gracefulShutdown = async () => {
    await shutdownTracing();
  };

  process.on('SIGINT', () => void gracefulShutdown());
  process.on('SIGTERM', () => void gracefulShutdown());
}

/**
 * Determines if snapshot mode should be enabled based on environment.
 */
function determineSnapshotMode(): boolean {
  const nodeEnv = process.env.NODE_ENV ?? APP_CONSTANTS.DEFAULTS.NODE_ENV;
  const isEnabled = (process.env.ENABLE_SNAPSHOT ?? 'false') === 'true';
  return isEnabled && nodeEnv !== 'production';
}

/**
 * Loads all configuration values from ConfigService.
 * Validates required configuration is present.
 */
function loadConfiguration(configService: ConfigService) {
  const nodeEnv = configService.get<string>('app.nodeEnv', APP_CONSTANTS.DEFAULTS.NODE_ENV);
  const port = configService.get<number>('app.port', APP_CONSTANTS.DEFAULTS.PORT);
  const globalPrefix = configService.get<string>('app.globalPrefix', 'api');
  const corsOriginsRaw = configService.get<string[]>(
    'app.corsOrigins',
  ) ?? [...APP_CONSTANTS.DEFAULTS.CORS_ORIGINS];
  const trustProxy = configService.get<boolean>('app.trustProxy', false);
  const logLevel = configService.get<string>(
    'observability.logLevel',
    APP_CONSTANTS.DEFAULTS.LOG_LEVEL,
  );
  const metricsToken = configService.get<string | undefined>('observability.metricsToken');
  const apiToken = configService.get<string>('security.apiToken', '');
  const apiVersion = process.env.npm_package_version ?? '0.1.0';

  // Remove wildcard from CORS origins for safer configuration
  const corsOrigins = (corsOriginsRaw || []).filter((origin) => origin !== APP_CONSTANTS.CORS.WILDCARD);

  // Validate required API token
  if (!apiToken) {
    throw new ConfigurationException('API_TOKEN');
  }

  const scalarEnabled = isScalarEnabled(configService, nodeEnv);

  return {
    nodeEnv,
    isProduction: nodeEnv === 'production',
    port,
    globalPrefix,
    corsOrigins,
    corsOriginsRaw,
    trustProxy,
    logLevel,
    metricsToken,
    scalarEnabled,
    apiToken,
    apiVersion,
  };
}

/**
 * Determines if Swagger/Scalar UI should be enabled.
 * Checks environment variables or defaults to enabled in non-production.
 */
function isScalarEnabled(configService: ConfigService, nodeEnv: string): boolean {
  const scalarFlag = process.env.SCALAR_ENABLED ?? process.env.SWAGGER_ENABLED ?? '';
  const isExplicitlyEnabled =
    scalarFlag.toLowerCase() === APP_CONSTANTS.FEATURES.SCALAR_ENABLED_VALUE_TRUE ||
    scalarFlag.toLowerCase() === APP_CONSTANTS.FEATURES.SCALAR_ENABLED_VALUE_ONE;

  return isExplicitlyEnabled || nodeEnv !== 'production';
}

bootstrap();

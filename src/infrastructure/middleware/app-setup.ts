import type { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { APP_CONSTANTS } from '../../shared/constants';
import {
  ConfigurationException,
  CorsConfigurationException,
} from '../../shared/exceptions';

interface AppSetupOptions {
  port: number;
  globalPrefix: string;
  trustProxy: boolean;
  nodeEnv: string;
  corsOrigins: string[];
}

/**
 * Applies core application setup:
 * - Global prefix
 * - Shutdown hooks
 * - Trust proxy settings
 * - Disable x-powered-by header
 * - Global validation pipes
 * - CORS configuration
 */
export function setupApplication(
  app: INestApplication,
  options: AppSetupOptions,
): void {
  const { port, globalPrefix, trustProxy, nodeEnv, corsOrigins } = options;

  validateConfiguration(nodeEnv, corsOrigins);

  app.enableShutdownHooks();
  app.setGlobalPrefix(globalPrefix);

  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.disable('x-powered-by');
  expressApp.set('trust proxy', trustProxy);

  setupGlobalValidationPipe(app);
  setupCors(app, corsOrigins);
}

/**
 * Validates that required configuration is set properly.
 */
function validateConfiguration(nodeEnv: string, corsOrigins: string[]): void {
  if (nodeEnv === 'production' && corsOrigins.includes(APP_CONSTANTS.CORS.WILDCARD)) {
    throw new CorsConfigurationException(
      APP_CONSTANTS.ERROR_MESSAGES.CORS_WILDCARD_IN_PRODUCTION,
    );
  }
}

/**
 * Configures global validation pipe with strict settings.
 */
function setupGlobalValidationPipe(app: INestApplication): void {
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
}

/**
 * Configures CORS with allowed origins and methods.
 */
function setupCors(app: INestApplication, corsOrigins: string[]): void {
  app.enableCors({
    origin: corsOrigins,
    credentials: APP_CONSTANTS.CORS.CREDENTIALS,
    methods: APP_CONSTANTS.HTTP_METHODS.ALLOWED,
    allowedHeaders: Object.values(APP_CONSTANTS.HEADERS),
    exposedHeaders: [APP_CONSTANTS.HEADERS.CORRELATION_ID],
  });
}

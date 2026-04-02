import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import type { Request, Response } from 'express';
import helmet from 'helmet';
import { randomUUID, timingSafeEqual } from 'node:crypto';
import pinoHttp from 'pino-http';
import { AppModule } from './app.module';
import { startTracing } from './observability/tracing';

async function bootstrap() {
  const shutdownTracing = await startTracing();

  const nodeEnv = process.env.NODE_ENV ?? 'development';
  const snapshotEnabled =
    (process.env.ENABLE_SNAPSHOT ?? 'false') === 'true' && nodeEnv !== 'production';

  const app = await NestFactory.create(AppModule, {
    snapshot: snapshotEnabled,
  });

  const configService = app.get(ConfigService);
  const runtimeNodeEnv = configService.get<string>('app.nodeEnv', 'development');
  const port = configService.get<number>('app.port', 3000);
  const globalPrefix = configService.get<string>('app.globalPrefix', 'api');
  const corsOriginsRaw = configService.get<string[]>('app.corsOrigins', [
    'http://localhost:3000',
  ]);
  const corsOrigins = corsOriginsRaw.filter((origin) => origin !== '*');
  const trustProxy = configService.get<boolean>('app.trustProxy', false);
  const logLevel = configService.get<string>('observability.logLevel', 'info');
  const metricsToken = configService.get<string | undefined>('observability.metricsToken');
  const apiToken = configService.get<string>('security.apiToken', '');

  if (!apiToken) {
    throw new Error('API_TOKEN is required.');
  }

  if (runtimeNodeEnv === 'production' && corsOriginsRaw.includes('*')) {
    throw new Error('CORS_ORIGINS must not contain * in production');
  }

  app.enableShutdownHooks();
  app.setGlobalPrefix(globalPrefix);

  const expressInstance = app.getHttpAdapter().getInstance();
  expressInstance.disable('x-powered-by');
  expressInstance.set('trust proxy', trustProxy);

  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  app.use((req: Request, res: Response, next) => {
    const incoming = req.header('x-correlation-id');
    req.correlationId =
      incoming && uuidRegex.test(incoming.trim()) ? incoming.trim() : randomUUID();
    res.setHeader('x-correlation-id', req.correlationId);
    next();
  });

  app.use(
    pinoHttp({
      level: logLevel,
      customProps: (req) => ({
        correlationId: (req as Request).correlationId,
      }),
      serializers: {
        req: (req) => ({
          id: (req as Request).correlationId,
          method: req.method,
          url: req.path,
        }),
        res: (res) => ({
          statusCode: res.statusCode,
        }),
      },
    }),
  );

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'x-api-token',
      'x-csrf-token',
      'x-correlation-id',
    ],
    exposedHeaders: ['x-correlation-id'],
  });

  app.use((req: Request, res: Response, next) => {
    const directToken = req.header('x-api-token')?.trim();
    const authorization = req.header('authorization')?.trim();
    const bearerPrefix = 'Bearer ';
    const bearerToken =
      authorization && authorization.startsWith(bearerPrefix)
        ? authorization.slice(bearerPrefix.length).trim()
        : undefined;

    const candidate = directToken || bearerToken;
    const isValid =
      !!candidate &&
      candidate.length === apiToken.length &&
      timingSafeEqual(Buffer.from(candidate, 'utf8'), Buffer.from(apiToken, 'utf8'));

    if (!isValid) {
      res.status(401).json({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Invalid API token',
      });
      return;
    }

    next();
  });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.use(/\/metrics$/, (req: Request, res: Response, next) => {
    if (metricsToken) {
      const auth = req.headers.authorization;
      const expected = `Bearer ${metricsToken}`;
      const isValid =
        !!auth &&
        auth.length === expected.length &&
        timingSafeEqual(Buffer.from(auth), Buffer.from(expected));

      if (!isValid) {
        res.status(401).json({ statusCode: 401, message: 'Unauthorized' });
        return;
      }
    } else if (runtimeNodeEnv === 'production') {
      res.status(403).json({ statusCode: 403, message: 'Forbidden' });
      return;
    }

    next();
  });

  app.use(cookieParser());

  app.use((req: Request, res: Response, next) => {
    const safeMethod = ['GET', 'HEAD', 'OPTIONS'].includes(req.method.toUpperCase());

    if (safeMethod) {
      next();
      return;
    }

    const cookieToken = req.cookies?.['XSRF-TOKEN'];
    const headerToken = req.header('x-csrf-token');

    if (!cookieToken || !headerToken || cookieToken.length !== headerToken.length) {
      res.status(403).json({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Invalid CSRF token',
      });
      return;
    }

    const isValid = timingSafeEqual(
      Buffer.from(cookieToken, 'utf8'),
      Buffer.from(headerToken, 'utf8'),
    );

    if (!isValid) {
      res.status(403).json({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Invalid CSRF token',
      });
      return;
    }

    next();
  });

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'same-site' },
    }),
  );

  await app.listen(port);

  const gracefulShutdown = async () => {
    await shutdownTracing();
  };

  process.on('SIGINT', () => void gracefulShutdown());
  process.on('SIGTERM', () => void gracefulShutdown());
}

bootstrap();

import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';
import type { Express } from 'express';
import type { Request, Response } from 'express';

interface SwaggerSetupOptions {
  port: number;
  globalPrefix: string;
  apiVersion: string;
}

/**
 * Configures OpenAPI/Swagger documentation endpoints.
 * Generates OpenAPI schema and serves it via Scalar UI.
 */
export function setupSwaggerDocumentation(
  app: INestApplication,
  options: SwaggerSetupOptions,
): void {
  const { port, globalPrefix, apiVersion } = options;

  const openApiConfig = new DocumentBuilder()
    .setTitle('PrimeNestArch API')
    .setDescription(
      'PrimeNestArch backend API reference with security, health, CSRF, and mail audit operations.',
    )
    .setVersion(apiVersion)
    .addServer(`http://localhost:${port}/${globalPrefix}`, 'Local development')
    .addApiKey(
      {
        type: 'apiKey',
        in: 'header',
        name: 'x-api-token',
        description: 'Primary API token header used by all protected routes.',
      },
      'api-token',
    )
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'API token',
        description: 'Alternative to x-api-token. Send the same API token as Bearer.',
      },
      'api-token-bearer',
    )
    .addTag('Health', 'Operational liveness and readiness endpoints.')
    .addTag('Security', 'Security bootstrap endpoints such as CSRF token retrieval.')
    .addTag('Mail', 'Mail audit, retry, and template preview operations.')
    .build();

  const document = SwaggerModule.createDocument(app, openApiConfig, {
    operationIdFactory: (controllerKey: string, methodKey: string) =>
      `${controllerKey.replace(/Controller$/, '')}_${methodKey}`,
  });

  const expressApp = app.getHttpAdapter().getInstance() as Express;

  // Serve OpenAPI schema
  expressApp.get(
    `/${globalPrefix}/openapi.json`,
    (_req: Request, res: Response) => {
      res.json(document);
    },
  );

  // Serve Scalar UI
  expressApp.use(
    `/${globalPrefix}/docs`,
    apiReference({
      content: document,
      theme: 'purple',
      pageTitle: 'PrimeNestArch API Reference',
      defaultHttpClient: {
        targetKey: 'js',
        clientKey: 'fetch',
      },
      hiddenClients: [],
      showOperationId: true,
      defaultOpenAllTags: true,
      expandAllResponses: true,
      pathRouting: {
        basePath: `/${globalPrefix}/docs`,
      },
    }),
  );
}

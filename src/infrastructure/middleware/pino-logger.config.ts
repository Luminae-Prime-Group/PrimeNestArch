import type { Request } from 'express';

/**
 * Creates the Pino HTTP logger configuration.
 * Includes custom properties (correlationId) and serializers for request/response logging.
 */
export function createPinoHttpConfig(logLevel: string) {
  return {
    level: logLevel,
    customProps: (req: any) => ({
      correlationId: (req as Request).correlationId,
    }),
    serializers: {
      req: (req: any) => ({
        id: (req as Request).correlationId,
        method: req.method,
        url: req.originalUrl ?? req.url ?? req.path,
      }),
      res: (res: any) => ({
        statusCode: res.statusCode,
      }),
    },
  };
}

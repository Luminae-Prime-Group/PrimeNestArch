import type { Request, Response, NextFunction } from 'express';
import { timingSafeEqual } from 'node:crypto';

/**
 * Middleware that validates metrics endpoint authorization.
 * In production, metrics token must be provided via Bearer token.
 * In development, metrics endpoint is accessible without authentication (if no token configured).
 */
export function createMetricsAuthMiddleware(
  metricsToken: string | undefined,
  isProduction: boolean,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!metricsToken) {
      if (isProduction) {
        res.status(403).json({ statusCode: 403, message: 'Forbidden' });
        return;
      }
      next();
      return;
    }

    const authorizationHeader = req.headers.authorization;
    if (!authorizationHeader) {
      res.status(401).json({ statusCode: 401, message: 'Unauthorized' });
      return;
    }

    const expectedToken = `Bearer ${metricsToken}`;
    const isValid = validateTokenSafely(authorizationHeader, expectedToken);

    if (!isValid) {
      res.status(401).json({ statusCode: 401, message: 'Unauthorized' });
      return;
    }

    next();
  };
}

/**
 * Validates token using constant-time comparison.
 */
function validateTokenSafely(candidate: string, expected: string): boolean {
  if (candidate.length !== expected.length) {
    return false;
  }

  try {
    return timingSafeEqual(Buffer.from(candidate), Buffer.from(expected));
  } catch {
    return false;
  }
}

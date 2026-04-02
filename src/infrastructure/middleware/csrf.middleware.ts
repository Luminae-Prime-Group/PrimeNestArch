import type { Request, Response, NextFunction } from 'express';
import { timingSafeEqual } from 'node:crypto';

/**
 * Middleware that applies CSRF token validation for non-safe HTTP methods.
 * Safe methods (GET, HEAD, OPTIONS) are allowed without CSRF validation.
 * Token is expected in both:
 * - Cookie: XSRF-TOKEN
 * - Header: x-csrf-token
 */
export function createCsrfValidationMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    if (isMailWebhookRequest(req)) {
      next();
      return;
    }

    const isSafeMethod = ['GET', 'HEAD', 'OPTIONS'].includes(
      req.method.toUpperCase(),
    );

    if (isSafeMethod) {
      next();
      return;
    }

    const cookieToken = req.cookies?.['XSRF-TOKEN'];
    const headerToken = req.header('x-csrf-token');

    if (isInvalidCsrfToken(cookieToken, headerToken)) {
      res.status(403).json({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Invalid CSRF token',
      });
      return;
    }

    next();
  };
}

function isMailWebhookRequest(req: Request): boolean {
  const url = req.originalUrl ?? req.url;
  return req.method.toUpperCase() === 'POST' && url.includes('/mail/webhooks/delivery');
}

/**
 * Validates that cookie and header CSRF tokens match.
 * Returns true if tokens are invalid or missing.
 */
function isInvalidCsrfToken(
  cookieToken: string | undefined,
  headerToken: string | undefined,
): boolean {
  if (!cookieToken || !headerToken) {
    return true;
  }

  if (cookieToken.length !== headerToken.length) {
    return true;
  }

  try {
    return !timingSafeEqual(
      Buffer.from(cookieToken, 'utf8'),
      Buffer.from(headerToken, 'utf8'),
    );
  } catch {
    return true;
  }
}

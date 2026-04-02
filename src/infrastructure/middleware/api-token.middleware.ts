import type { Request, Response, NextFunction } from 'express';
import { timingSafeEqual } from 'node:crypto';
import { APP_CONSTANTS } from '../../shared/constants';

/**
 * Middleware that validates API token from either:
 * - x-api-token header directly
 * - Authorization Bearer header
 * Uses constant-time comparison to prevent timing attacks.
 */
export function createApiTokenMiddleware(apiToken: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const directTokenRaw = req.header(APP_CONSTANTS.HEADERS.API_TOKEN);
    const authorizationRaw = req.header(APP_CONSTANTS.HEADERS.AUTHORIZATION);
    
    const directToken = typeof directTokenRaw === 'string' ? directTokenRaw.trim() : undefined;
    const authorizationHeader = typeof authorizationRaw === 'string' ? authorizationRaw.trim() : undefined;

    const bearerToken = extractBearerToken(authorizationHeader);
    const candidateToken = directToken || bearerToken;

    const isValid = validateTokenSafely(candidateToken, apiToken);

    if (!isValid) {
      res.status(401).json({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Invalid API token',
      });
      return;
    }

    next();
  };
}

/**
 * Extracts bearer token from Authorization header.
 * Expected format: "Bearer <token>"
 */
function extractBearerToken(authHeader: string | undefined): string | undefined {
  if (!authHeader) return undefined;

  const bearerPrefix = 'Bearer ';
  return authHeader.startsWith(bearerPrefix)
    ? authHeader.slice(bearerPrefix.length).trim()
    : undefined;
}

/**
 * Validates token using constant-time comparison.
 * Prevents timing attacks by comparing buffers of equal length.
 */
function validateTokenSafely(candidate: string | undefined, expected: string): boolean {
  if (!candidate || candidate.length !== expected.length) {
    return false;
  }

  try {
    return timingSafeEqual(
      Buffer.from(candidate, 'utf8'),
      Buffer.from(expected, 'utf8'),
    );
  } catch {
    return false;
  }
}

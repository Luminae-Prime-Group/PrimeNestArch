import type { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'node:crypto';
import { APP_CONSTANTS } from '../../shared/constants';

/**
 * Middleware that ensures every request has a valid correlation ID.
 * Uses an incoming correlation ID if valid, otherwise generates a new UUID.
 */
export function createCorrelationIdMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    const incomingId = req.header(APP_CONSTANTS.HEADERS.CORRELATION_ID);
    const normalizedId = typeof incomingId === 'string' ? incomingId : undefined;
    const isValidUUID =
      normalizedId && APP_CONSTANTS.PATTERNS.UUID.test(normalizedId.trim());

    req.correlationId = isValidUUID ? normalizedId!.trim() : randomUUID();
    res.setHeader(APP_CONSTANTS.HEADERS.CORRELATION_ID, req.correlationId);

    next();
  };
}

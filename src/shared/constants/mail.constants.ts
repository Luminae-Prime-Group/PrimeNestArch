/**
 * Mail service constants
 * Centralized configuration values for mail processing
 */

export const MAIL_CONSTANTS = {
  // Default configuration
  DEFAULTS: {
    MAX_ATTEMPTS: 3,
    PRIORITY: 'normal',
    IDEMPOTENCY_TTL_SEC: 3600,
    RATE_LIMIT_WINDOW_SEC: 60,
    RATE_LIMIT_MAX: 10,
  },

  // Retry mechanism
  RETRY: {
    BASE_DELAY_MS: 10000,
  },

  // Cache keys
  CACHE_KEYS: {
    IDEMPOTENCY_PREFIX: 'mail:idempotency:',
    RATE_LIMIT_PREFIX: 'mail:ratelimit:',
    TEMPLATE_PREFIX: 'mail:template:',
  },

  // Batch processing
  BATCH_PROCESSING: {
    DEFAULT_BATCH_SIZE: 10,
    CLAIM_LOCK_TYPE: 'pessimistic_partial_write',
  },

  // Priority orders
  PRIORITY_ORDER: {
    HIGH: 0,
    NORMAL: 1,
    LOW: 2,
  },

  // Error messages
  ERROR_MESSAGES: {
    SERVICE_DISABLED: 'Mail service is disabled. Set MAIL_ENABLED=true to enqueue emails.',
    SENDER_NOT_CONFIGURED: 'Mail sender is not configured. Set MAIL_DEFAULT_FROM.',
    NO_CONTENT_PROVIDED: 'At least one content format must be provided: text or html.',
    RATE_LIMIT_EXCEEDED: (recipient: string, count: number, windowSec: number) =>
      `Rate limit exceeded for recipient "${recipient}": ${count} emails sent in last ${windowSec}s.`,
    CANNOT_RETRY_MAIL: (id: string, currentStatus: string) =>
      `Cannot retry mail "${id}": current status is "${currentStatus}". Only FAILED mails can be retried.`,
    MAIL_DELIVERY_FAILURE: 'Unknown mail delivery failure',
  },

  // Logging
  LOGGING: {
    RETRY_LOG_FORMAT: (id: string, backoffMs: number) =>
      `mail job ${id} failed; retry in ${backoffMs}ms`,
  },
} as const;

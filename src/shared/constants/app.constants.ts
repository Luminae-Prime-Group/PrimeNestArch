/**
 * Application-level constants
 * Centralized to avoid magic strings and numbers throughout the codebase
 */

export const APP_CONSTANTS = {
  // Headers
  HEADERS: {
    CORRELATION_ID: 'x-correlation-id',
    CSRF_TOKEN: 'x-csrf-token',
    API_TOKEN: 'x-api-token',
    CONTENT_TYPE: 'Content-Type',
    AUTHORIZATION: 'Authorization',
  },

  // Default values
  DEFAULTS: {
    PORT: 3000,
    NODE_ENV: 'development',
    CORS_ORIGINS: ['http://localhost:3000'],
    LOG_LEVEL: 'info',
  },

  // HTTP Methods
  HTTP_METHODS: {
    ALLOWED: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  },

  // Patterns and validation
  PATTERNS: {
    UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  },

  // CORS configuration
  CORS: {
    CREDENTIALS: true,
    WILDCARD: '*',
  },

  // Security
  SECURITY: {
    DISABLE_POWERED_BY_HEADER: true,
  },

  // Feature flags
  FEATURES: {
    SCALAR_ENABLED_VALUE_TRUE: 'true',
    SCALAR_ENABLED_VALUE_ONE: '1',
  },

  // Error messages
  ERROR_MESSAGES: {
    API_TOKEN_REQUIRED: 'API_TOKEN is required.',
    CORS_WILDCARD_IN_PRODUCTION: 'CORS_ORIGINS must not contain * in production',
    INVALID_CORRELATION_ID: 'Invalid correlation ID format',
  },
} as const;

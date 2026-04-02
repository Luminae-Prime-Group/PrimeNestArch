import { BadRequestException, InternalServerErrorException } from '@nestjs/common';

/**
 * Exception raised when mail service is disabled
 */
export class MailServiceDisabledException extends BadRequestException {
  constructor() {
    super('Mail service is disabled. Enable it in configuration to enqueue emails.');
  }
}

/**
 * Exception raised when mail sender configuration is missing
 */
export class MailSenderNotConfiguredException extends BadRequestException {
  constructor() {
    super('Mail sender is not configured. Set MAIL_DEFAULT_FROM in environment.');
  }
}

/**
 * Exception raised when mail content is missing
 */
export class MailContentRequiredException extends BadRequestException {
  constructor() {
    super('At least one content format must be provided: text or html.');
  }
}

/**
 * Exception raised when rate limit is exceeded
 */
export class MailRateLimitExceededException extends BadRequestException {
  constructor(recipient: string, count: number, windowSec: number) {
    super(
      `Rate limit exceeded for recipient "${recipient}": ${count} emails sent in last ${windowSec}s.`,
    );
  }
}

/**
 * Exception raised when trying to retry a mail that is not in FAILED status
 */
export class MailRetryInvalidStatusException extends BadRequestException {
  constructor(id: string, currentStatus: string) {
    super(
      `Cannot retry mail "${id}": current status is "${currentStatus}". Only FAILED mails can be retried.`,
    );
  }
}

/**
 * Exception raised when a mail delivery operation fails
 */
export class MailDeliveryException extends InternalServerErrorException {
  constructor(message: string, cause?: Error) {
    super(message);
    this.cause = cause;
  }
}

/**
 * Exception raised when required configuration is missing
 */
export class ConfigurationException extends InternalServerErrorException {
  constructor(configKey: string) {
    super(`Required configuration "${configKey}" is not set.`);
  }
}

/**
 * Exception raised when CORS is misconfigured
 */
export class CorsConfigurationException extends BadRequestException {
  constructor(message: string) {
    super(message);
  }
}

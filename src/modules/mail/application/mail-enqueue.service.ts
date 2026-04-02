import { Injectable } from '@nestjs/common';
import { MailAuditLogEntity } from '../entities/mail-audit-log.entity';
import { type MailDispatchOptions } from '../mail.types';
import { MailValidationService } from './mail-validation.service';
import { MailIdempotencyService } from './mail-idempotency.service';
import { MailRateLimitService } from './mail-rate-limit.service';
import { MailAuditService } from './mail-audit.service';
import { MailRetryService } from './mail-retry.service';

/**
 * Orchestrates the mail enqueue process by coordinating with specialized services.
 * Responsibilities:
 * - Validates mail dispatch options
 * - Checks idempotency
 * - Enforces rate limiting
 * - Creates audit records
 * - Manages retry operations
 */
@Injectable()
export class MailEnqueueService {
  constructor(
    private readonly validationService: MailValidationService,
    private readonly idempotencyService: MailIdempotencyService,
    private readonly rateLimitService: MailRateLimitService,
    private readonly auditService: MailAuditService,
    private readonly retryService: MailRetryService,
  ) {}

  /**
   * Enqueues a mail for sending.
   * Performs validation, idempotency check, rate limiting, and persistence.
   */
  async enqueue(options: MailDispatchOptions): Promise<MailAuditLogEntity> {
    // Validation phase
    this.validationService.validateServiceEnabled();
    this.validationService.validateContentProvided(options.text, options.html);
    const fromAddress = this.validationService.validateAndResolveSender(options.from);
    const recipients = this.validationService.normalizeRecipients(options.to);
    const maxAttempts = this.validationService.resolveMaxAttempts(options.maxAttempts);
    const normalizedAttachments = this.validationService.normalizeAttachments(
      options.attachments,
    );

    // Idempotency check phase
    if (options.idempotencyKey) {
      const existing = await this.idempotencyService.findByIdempotencyKey(
        options.idempotencyKey,
      );
      if (existing) {
        return existing;
      }
    }

    // Rate limiting phase
    await this.rateLimitService.enforceLimit(options, recipients);

    // Persistence phase
    const created = await this.auditService.createAuditLog(
      options,
      fromAddress,
      recipients,
      maxAttempts,
      normalizedAttachments,
    );

    // Cache idempotency key
    if (options.idempotencyKey) {
      await this.idempotencyService.cacheMail(options.idempotencyKey, created.id);
    }

    // Publish event
    this.auditService.publishQueued(created);

    return created;
  }

  /**
   * Retries a failed mail
   */
  async requeue(id: string): Promise<MailAuditLogEntity> {
    return this.retryService.requeue(id);
  }
}

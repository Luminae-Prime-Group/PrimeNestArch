import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { hostname } from 'node:os';
import type { SentMessageInfo } from 'nodemailer';
import { MailAuditLogEntity, MailAuditStatus } from '../entities/mail-audit-log.entity';
import { MAIL_CONSTANTS } from '../../../shared/constants';

/**
 * Manages state transitions for mail jobs.
 * Handles marking jobs as sent or failed with appropriate retry logic.
 */
@Injectable()
export class MailJobStateService {
  private readonly logger = new Logger(MailJobStateService.name);
  private readonly nodeName = hostname();

  constructor(
    @InjectRepository(MailAuditLogEntity)
    private readonly repo: Repository<MailAuditLogEntity>,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Marks a mail as successfully sent
   */
  async markAsSent(
    id: string,
    info: SentMessageInfo,
  ): Promise<MailAuditLogEntity> {
    const currentAttempt = await this.repo.findOneOrFail({ where: { id } });
    const nextAttempt = currentAttempt.attempts + 1;

    await this.repo.update(id, {
      status: MailAuditStatus.SENT,
      attempts: nextAttempt,
      sentAt: new Date(),
      providerMessageId: info.messageId ?? null,
      lastError: null,
      lockedAt: null,
      processingNode: this.nodeName,
    });

    return this.repo.findOneOrFail({ where: { id } });
  }

  /**
   * Marks a mail as failed and schedules retry if applicable.
   * Uses exponential backoff for retry delays.
   */
  async markAsFailure(
    item: MailAuditLogEntity,
    error: unknown,
  ): Promise<MailAuditLogEntity> {
    const nextAttempt = item.attempts + 1;
    const shouldRetry = nextAttempt < item.maxAttempts;

    const errorMessage = extractErrorMessage(error);
    const nextAttemptAt = shouldRetry
      ? this.calculateNextRetryTime(nextAttempt)
      : null;

    await this.repo.update(item.id, {
      status: shouldRetry ? MailAuditStatus.PENDING : MailAuditStatus.FAILED,
      attempts: nextAttempt,
      nextAttemptAt,
      failedAt: shouldRetry ? null : new Date(),
      lastError: errorMessage,
      lockedAt: null,
      processingNode: this.nodeName,
    });

    const updated = await this.repo.findOneOrFail({ where: { id: item.id } });

    if (shouldRetry) {
      const backoffMs = this.calculateBackoff(nextAttempt);
      this.logger.warn(
        MAIL_CONSTANTS.LOGGING.RETRY_LOG_FORMAT(item.id, backoffMs),
      );
    }

    return updated;
  }

  private calculateNextRetryTime(attemptNumber: number): Date {
    const backoffMs = this.calculateBackoff(attemptNumber);
    return new Date(Date.now() + backoffMs);
  }

  private calculateBackoff(attemptNumber: number): number {
    const retryBaseDelayMs = this.configService.get(
      'mail.retryBaseDelayMs',
      MAIL_CONSTANTS.RETRY.BASE_DELAY_MS,
    );
    return retryBaseDelayMs * attemptNumber;
  }
}

/**
 * Extracts user-friendly error message from unknown error
 */
function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return MAIL_CONSTANTS.ERROR_MESSAGES.MAIL_DELIVERY_FAILURE;
}

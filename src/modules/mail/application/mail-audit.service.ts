import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MailAuditLogEntity, MailAuditStatus, MailPriority as MailPriorityEnum } from '../entities/mail-audit-log.entity';
import { MAIL_EVENTS, type MailEventPayload } from '../mail.events';
import type { MailDispatchOptions } from '../mail.types';

/**
 * Handles mail audit log persistence and event emission.
 * Single responsibility: Store mail audit records and publish events.
 */
@Injectable()
export class MailAuditService {
  constructor(
    @InjectRepository(MailAuditLogEntity)
    private readonly repo: Repository<MailAuditLogEntity>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Creates and persists a new mail audit record
   */
  async createAuditLog(
    options: MailDispatchOptions,
    fromAddress: string,
    recipients: string[],
    maxAttempts: number,
    normalizedAttachments: Array<{ filename: string; contentType: string }> | null,
  ): Promise<MailAuditLogEntity> {
    const audit = this.repo.create({
      correlationId: options.correlationId ?? null,
      idempotencyKey: options.idempotencyKey ?? null,
      status: MailAuditStatus.PENDING,
      priority: (options.priority ?? 'normal') as MailPriorityEnum,
      toRecipients: recipients,
      ccRecipients: options.cc ? (Array.isArray(options.cc) ? options.cc : [options.cc]) : null,
      bccRecipients: options.bcc ? (Array.isArray(options.bcc) ? options.bcc : [options.bcc]) : null,
      fromAddress,
      subject: options.subject,
      textBody: options.text ?? null,
      htmlBody: options.html ?? null,
      replyTo: options.replyTo ?? null,
      metadata: options.metadata ?? null,
      attachments: normalizedAttachments,
      attempts: 0,
      maxAttempts,
      nextAttemptAt: options.scheduledAt ?? new Date(),
    });

    return this.repo.save(audit) as Promise<MailAuditLogEntity>;
  }

  /**
   * Publishes mail queued event
   */
  publishQueued(entity: MailAuditLogEntity): void {
    this.emitEvent(MAIL_EVENTS.QUEUED, entity);
  }

  private emitEvent(eventName: string, entity: MailAuditLogEntity): void {
    const payload: MailEventPayload = {
      id: entity.id,
      correlationId: entity.correlationId,
      idempotencyKey: entity.idempotencyKey,
      status: entity.status,
      attempts: entity.attempts,
      subject: entity.subject,
      to: entity.toRecipients,
    };
    this.eventEmitter.emit(eventName, payload);
  }
}

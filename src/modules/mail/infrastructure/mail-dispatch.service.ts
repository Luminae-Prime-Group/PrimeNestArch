import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Inject } from '@nestjs/common';
import type { Transporter } from 'nodemailer';
import { MAIL_TRANSPORTER } from '../mail.constants';
import { MailAuditLogEntity } from '../entities/mail-audit-log.entity';
import { MAIL_EVENTS, type MailEventPayload } from '../mail.events';
import { MailJobClaimService } from './mail-job-claim.service';
import { MailJobStateService } from './mail-job-state.service';

/**
 * Orchestrates mail dispatch process.
 * Coordinates job claiming, email sending, and state management.
 * Single responsibility: Send emails and update their status.
 */
@Injectable()
export class MailDispatchService {
  private readonly logger = new Logger(MailDispatchService.name);

  constructor(
    @InjectRepository(MailAuditLogEntity)
    private readonly repo: Repository<MailAuditLogEntity>,
    @Inject(MAIL_TRANSPORTER)
    private readonly transporter: Transporter,
    private readonly jobClaimService: MailJobClaimService,
    private readonly jobStateService: MailJobStateService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Claims pending jobs for processing
   */
  async claimPendingJobs(batchSize: number): Promise<MailAuditLogEntity[]> {
    const jobs = await this.jobClaimService.claimPending(batchSize);

    for (const job of jobs) {
      this.emitProcessingEvent(job);
    }

    return jobs;
  }

  /**
   * Processes a single mail job by sending email and updating state
   */
  async processJob(item: MailAuditLogEntity): Promise<void> {
    try {
      const result = await this.transporter.sendMail({
        from: item.fromAddress,
        to: item.toRecipients,
        cc: item.ccRecipients ?? undefined,
        bcc: item.bccRecipients ?? undefined,
        subject: item.subject,
        text: item.textBody ?? undefined,
        html: item.htmlBody ?? undefined,
        replyTo: item.replyTo ?? undefined,
      });

      const updated = await this.jobStateService.markAsSent(item.id, result);
      this.emitSentEvent(updated);
    } catch (error) {
      const updated = await this.jobStateService.markAsFailure(item, error);
      this.emitFailureEvent(updated);
    }
  }

  private emitProcessingEvent(entity: MailAuditLogEntity): void {
    this.emitEvent(MAIL_EVENTS.PROCESSING, entity);
  }

  private emitSentEvent(entity: MailAuditLogEntity): void {
    this.emitEvent(MAIL_EVENTS.SENT, entity);
  }

  private emitFailureEvent(entity: MailAuditLogEntity): void {
    this.emitEvent(MAIL_EVENTS.FAILED, entity);
  }

  private emitEvent(
    eventName: string,
    entity: MailAuditLogEntity,
    error?: string,
  ): void {
    const payload: MailEventPayload = {
      id: entity.id,
      correlationId: entity.correlationId,
      idempotencyKey: entity.idempotencyKey,
      status: entity.status,
      attempts: entity.attempts,
      subject: entity.subject,
      to: entity.toRecipients,
      error: error ?? entity.lastError,
    };
    this.eventEmitter.emit(eventName, payload);
  }
}

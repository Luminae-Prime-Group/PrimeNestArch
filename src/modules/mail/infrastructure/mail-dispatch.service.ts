import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { Inject } from '@nestjs/common';
import { hostname } from 'node:os';
import type { SentMessageInfo, Transporter } from 'nodemailer';
import { DataSource, Repository } from 'typeorm';
import { MAIL_TRANSPORTER } from '../mail.constants';
import { MailAuditLogEntity, MailAuditStatus } from '../entities/mail-audit-log.entity';
import { MAIL_EVENTS, type MailEventPayload } from '../mail.events';

@Injectable()
export class MailDispatchService {
  private readonly logger = new Logger(MailDispatchService.name);
  private readonly nodeName = hostname();

  constructor(
    @InjectRepository(MailAuditLogEntity)
    private readonly repo: Repository<MailAuditLogEntity>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @Inject(MAIL_TRANSPORTER)
    private readonly transporter: Transporter,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Claims pending jobs using SELECT FOR UPDATE SKIP LOCKED to ensure safe
   * concurrent processing across multiple worker instances.
   */
  async claimPendingJobs(batchSize: number): Promise<MailAuditLogEntity[]> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const candidates = await queryRunner.manager
        .createQueryBuilder(MailAuditLogEntity, 'audit')
        .where('audit.status = :status', { status: MailAuditStatus.PENDING })
        .andWhere('(audit.nextAttemptAt IS NULL OR audit.nextAttemptAt <= :now)', {
          now: new Date(),
        })
        .orderBy(
          "CASE audit.priority WHEN 'high' THEN 0 WHEN 'normal' THEN 1 ELSE 2 END",
          'ASC',
        )
        .addOrderBy('audit.nextAttemptAt', 'ASC')
        .take(batchSize)
        .setLock('pessimistic_partial_write') // FOR UPDATE SKIP LOCKED
        .getMany();

      if (candidates.length === 0) {
        await queryRunner.rollbackTransaction();
        return [];
      }

      const ids = candidates.map((c) => c.id);
      await queryRunner.manager
        .createQueryBuilder()
        .update(MailAuditLogEntity)
        .set({
          status: MailAuditStatus.PROCESSING,
          lockedAt: new Date(),
          processingNode: this.nodeName,
        })
        .where('id IN (:...ids)', { ids })
        .execute();

      await queryRunner.commitTransaction();

      for (const c of candidates) {
        c.status = MailAuditStatus.PROCESSING;
        c.lockedAt = new Date();
        c.processingNode = this.nodeName;
        this.emit(MAIL_EVENTS.PROCESSING, c);
      }

      return candidates;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

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
      await this.markAsSent(item.id, result);
    } catch (error) {
      await this.markAsFailure(item, error);
    }
  }

  async markAsSent(id: string, info: SentMessageInfo): Promise<void> {
    const audit = await this.repo.findOneOrFail({ where: { id } });
    const attempts = audit.attempts + 1;

    await this.repo.update(id, {
      status: MailAuditStatus.SENT,
      attempts,
      sentAt: new Date(),
      providerMessageId: info.messageId ?? null,
      lastError: null,
      lockedAt: null,
      processingNode: this.nodeName,
    });

    const updated = await this.repo.findOneOrFail({ where: { id } });
    this.emit(MAIL_EVENTS.SENT, updated);
  }

  async markAsFailure(item: MailAuditLogEntity, error: unknown): Promise<void> {
    const attempts = item.attempts + 1;
    const shouldRetry = attempts < item.maxAttempts;
    const retryBaseDelayMs = this.configService.get<number>('mail.retryBaseDelayMs', 10000);
    const backoffMs = retryBaseDelayMs * attempts;
    const errorMessage = error instanceof Error ? error.message : 'Unknown mail delivery failure';

    await this.repo.update(item.id, {
      status: shouldRetry ? MailAuditStatus.PENDING : MailAuditStatus.FAILED,
      attempts,
      nextAttemptAt: shouldRetry ? new Date(Date.now() + backoffMs) : null,
      failedAt: shouldRetry ? null : new Date(),
      lastError: errorMessage,
      lockedAt: null,
      processingNode: this.nodeName,
    });

    const updated = await this.repo.findOneOrFail({ where: { id: item.id } });
    if (shouldRetry) {
      this.logger.warn(`mail job ${item.id} failed; retry in ${backoffMs}ms`);
    }
    this.emit(MAIL_EVENTS.FAILED, updated, errorMessage);
  }

  private emit(eventName: string, entity: MailAuditLogEntity, error?: string): void {
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

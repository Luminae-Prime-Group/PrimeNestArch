import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import type { Cache } from 'cache-manager';
import { Repository } from 'typeorm';
import { MailAuditLogEntity, MailAuditStatus, MailPriority as MailPriorityEnum } from '../entities/mail-audit-log.entity';
import { MAIL_EVENTS, type MailEventPayload } from '../mail.events';
import { type MailDispatchOptions, type MailSendOptions } from '../mail.types';

@Injectable()
export class MailEnqueueService {
  constructor(
    @InjectRepository(MailAuditLogEntity)
    private readonly repo: Repository<MailAuditLogEntity>,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async enqueue(options: MailDispatchOptions): Promise<MailAuditLogEntity> {
    const enabled = this.configService.get<boolean>('mail.enabled', false);
    if (!enabled) {
      throw new Error('Mail service is disabled. Set MAIL_ENABLED=true to enqueue emails.');
    }

    const defaultFrom = this.configService.get<string>('mail.defaultFrom', '');
    const fromAddress = options.from ?? defaultFrom;
    if (!fromAddress) {
      throw new Error('Mail sender is not configured. Set MAIL_DEFAULT_FROM.');
    }

    if (!options.text && !options.html) {
      throw new Error('At least one content format must be provided: text or html.');
    }

    await this.enforceRateLimit(options);

    if (options.idempotencyKey) {
      const existing = await this.findIdempotent(options.idempotencyKey);
      if (existing) {
        return existing;
      }
    }

    const maxAttemptsDefault = this.configService.get<number>('mail.maxAttempts', 3);

    const audit = this.repo.create({
      correlationId: options.correlationId ?? null,
      idempotencyKey: options.idempotencyKey ?? null,
      status: MailAuditStatus.PENDING,
      priority: (options.priority ?? 'normal') as MailPriorityEnum,
      toRecipients: this.normalizeRecipients(options.to),
      ccRecipients: options.cc ? this.normalizeRecipients(options.cc) : null,
      bccRecipients: options.bcc ? this.normalizeRecipients(options.bcc) : null,
      fromAddress,
      subject: options.subject,
      textBody: options.text ?? null,
      htmlBody: options.html ?? null,
      replyTo: options.replyTo ?? null,
      metadata: options.metadata ?? null,
      attachments:
        options.attachments?.map((a) => ({
          filename: a.filename,
          contentType: a.contentType,
        })) ?? null,
      attempts: 0,
      maxAttempts: options.maxAttempts ?? maxAttemptsDefault,
      nextAttemptAt: new Date(),
    });

    const created = await this.repo.save(audit) as MailAuditLogEntity;

    if (options.idempotencyKey) {
      const ttl = this.configService.get<number>('mail.idempotencyTtlSec', 3600);
      await this.cacheManager.set(
        this.idempotencyCacheKey(options.idempotencyKey),
        created.id,
        ttl,
      );
    }

    this.emit(MAIL_EVENTS.QUEUED, created);
    return created;
  }

  async requeue(id: string): Promise<MailAuditLogEntity> {
    const entity = await this.repo.findOneOrFail({ where: { id } });

    if (entity.status !== MailAuditStatus.FAILED) {
      throw new Error(
        `Cannot retry mail "${id}": current status is "${entity.status}". Only FAILED mails can be retried.`,
      );
    }

    await this.repo.update(id, {
      status: MailAuditStatus.PENDING,
      maxAttempts: entity.attempts + 1,
      nextAttemptAt: new Date(),
      lockedAt: null,
      processingNode: null,
      lastError: null,
    });

    return this.repo.findOneOrFail({ where: { id } });
  }

  private async findIdempotent(key: string): Promise<MailAuditLogEntity | null> {
    const cachedId = await this.cacheManager.get<string>(this.idempotencyCacheKey(key));
    if (cachedId) {
      const existing = await this.repo.findOne({ where: { id: cachedId } });
      if (existing) {
        return existing;
      }
    }
    return this.repo.findOne({ where: { idempotencyKey: key } });
  }

  private async enforceRateLimit(options: MailDispatchOptions): Promise<void> {
    const rateLimitEnabled = this.configService.get<boolean>('mail.rateLimitEnabled', false);
    if (!rateLimitEnabled) {
      return;
    }

    const windowSec = this.configService.get<number>('mail.rateLimitWindowSec', 60);
    const maxPerWindow = this.configService.get<number>('mail.rateLimitMax', 10);
    const recipients = this.normalizeRecipients(options.to);

    for (const recipient of recipients) {
      const cacheKey = `mail:ratelimit:${recipient}`;
      const count = (await this.cacheManager.get<number>(cacheKey)) ?? 0;
      if (count >= maxPerWindow) {
        throw new Error(
          `Rate limit exceeded for recipient "${recipient}": ${count} emails sent in last ${windowSec}s.`,
        );
      }
      await this.cacheManager.set(cacheKey, count + 1, windowSec);
    }
  }

  private normalizeRecipients(input: MailSendOptions['to']): string[] {
    return Array.isArray(input) ? input : [input];
  }

  private idempotencyCacheKey(key: string): string {
    return `mail:idempotency:${key}`;
  }

  private emit(eventName: string, entity: MailAuditLogEntity): void {
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

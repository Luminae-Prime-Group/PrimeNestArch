import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash } from 'node:crypto';
import { hostname } from 'node:os';
import type { Cache } from 'cache-manager';
import type { SentMessageInfo, Transporter } from 'nodemailer';
import { Brackets, Repository } from 'typeorm';
import { MAIL_TRANSPORTER } from './mail.constants';
import { MailAuditLogEntity, MailAuditStatus } from './entities/mail-audit-log.entity';
import { MAIL_EVENTS, type MailEventPayload } from './mail.events';
import {
  type MailDispatchOptions,
  type MailSendOptions,
  type MailAuditQueryOptions,
  type MailAuditView,
  type PaginatedMailAuditResponse,
} from './mail.types';

@Injectable()
export class MailQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MailQueueService.name);
  private readonly nodeName = hostname();
  private intervalRef?: NodeJS.Timeout;
  private isTickRunning = false;

  constructor(
    @InjectRepository(MailAuditLogEntity)
    private readonly auditRepository: Repository<MailAuditLogEntity>,
    @Inject(MAIL_TRANSPORTER)
    private readonly transporter: Transporter,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async onModuleInit(): Promise<void> {
    const queueEnabled = this.configService.get<boolean>('mail.queueEnabled', true);
    const mailEnabled = this.configService.get<boolean>('mail.enabled', false);

    if (!queueEnabled || !mailEnabled) {
      return;
    }

    const intervalMs = this.configService.get<number>('mail.queuePollIntervalMs', 1000);
    this.intervalRef = setInterval(() => {
      void this.tick().catch((error: unknown) => {
        const message = error instanceof Error ? error.message : 'unknown queue tick error';
        this.logger.error(`mail queue tick failed: ${message}`);
      });
    }, intervalMs);
  }

  async onModuleDestroy(): Promise<void> {
    if (this.intervalRef) {
      clearInterval(this.intervalRef);
    }
  }

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

    if (options.idempotencyKey) {
      const cachedId = await this.cacheManager.get<string>(this.getIdempotencyCacheKey(options.idempotencyKey));
      if (cachedId) {
        const existing = await this.auditRepository.findOne({ where: { id: cachedId } });
        if (existing) {
          return existing;
        }
      }

      const existingByKey = await this.auditRepository.findOne({
        where: { idempotencyKey: options.idempotencyKey },
      });

      if (existingByKey) {
        return existingByKey;
      }
    }

    const maxAttemptsDefault = this.configService.get<number>('mail.maxAttempts', 3);

    const audit = this.auditRepository.create({
      correlationId: options.correlationId ?? null,
      idempotencyKey: options.idempotencyKey ?? null,
      status: MailAuditStatus.PENDING,
      toRecipients: this.normalizeRecipients(options.to),
      ccRecipients: options.cc ? this.normalizeRecipients(options.cc) : null,
      bccRecipients: options.bcc ? this.normalizeRecipients(options.bcc) : null,
      fromAddress,
      subject: options.subject,
      textBody: options.text ?? null,
      htmlBody: options.html ?? null,
      replyTo: options.replyTo ?? null,
      metadata: options.metadata ?? null,
      attachments: options.attachments?.map((item) => ({
        filename: item.filename,
        contentType: item.contentType,
      })) ?? null,
      attempts: 0,
      maxAttempts: options.maxAttempts ?? maxAttemptsDefault,
      nextAttemptAt: new Date(),
    });

    const created = await this.auditRepository.save(audit);

    if (options.idempotencyKey) {
      const ttl = this.configService.get<number>('mail.idempotencyTtlSec', 3600);
      await this.cacheManager.set(this.getIdempotencyCacheKey(options.idempotencyKey), created.id, ttl);
    }

    this.emit(MAIL_EVENTS.QUEUED, created);

    return created;
  }

  async renderTemplateCached(
    template: string,
    context: Record<string, string | number | boolean>,
  ): Promise<string> {
    const key = this.getTemplateCacheKey(template, context);
    const cached = await this.cacheManager.get<string>(key);

    if (cached) {
      return cached;
    }

    const rendered = template.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_match, token: string) => {
      const value = context[token];
      return value === undefined ? '' : String(value);
    });

    const ttl = this.configService.get<number>('mail.templateCacheTtlSec', 300);
    await this.cacheManager.set(key, rendered, ttl);

    return rendered;
  }

  async getAuditById(id: string, includeContent = false): Promise<MailAuditLogEntity | null> {
    const entity = await this.auditRepository.findOne({ where: { id } });
    if (!entity || includeContent) {
      return entity;
    }

    return this.maskAuditContent(entity);
  }

  async listRecent(limit = 50): Promise<MailAuditLogEntity[]> {
    return this.auditRepository.find({
      order: { createdAt: 'DESC' },
      take: Math.min(limit, 200),
    });
  }

  async searchAudit(options: MailAuditQueryOptions): Promise<PaginatedMailAuditResponse> {
    const page = Math.max(1, options.page);
    const limit = Math.min(Math.max(1, options.limit), 100);

    const queryBuilder = this.auditRepository.createQueryBuilder('audit');
    this.applySearchFilters(queryBuilder, options);

    queryBuilder
      .orderBy(`audit.${options.sortBy}`, options.sortOrder)
      .skip((page - 1) * limit)
      .take(limit);

    const [entities, total] = await queryBuilder.getManyAndCount();
    const items = entities.map((entity) => this.toAuditView(entity, options.includeContent));

    return {
      items,
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  private async tick(): Promise<void> {
    if (this.isTickRunning) {
      return;
    }

    this.isTickRunning = true;

    try {
      const queueEnabled = this.configService.get<boolean>('mail.queueEnabled', true);
      if (!queueEnabled) {
        return;
      }

      const batchSize = this.configService.get<number>('mail.queueBatchSize', 20);
      const candidates = await this.auditRepository.find({
        where: {
          status: MailAuditStatus.PENDING,
        },
        order: {
          createdAt: 'ASC',
        },
        take: batchSize,
      });

      const now = new Date();
      const readyCandidates = candidates.filter(
        (item) => !item.nextAttemptAt || item.nextAttemptAt.getTime() <= now.getTime(),
      );

      const claimed: MailAuditLogEntity[] = [];
      for (const candidate of readyCandidates) {
        const claimResult = await this.auditRepository.update(
          { id: candidate.id, status: MailAuditStatus.PENDING },
          {
            status: MailAuditStatus.PROCESSING,
            lockedAt: new Date(),
            processingNode: this.nodeName,
          },
        );

        if (claimResult.affected === 1) {
          candidate.status = MailAuditStatus.PROCESSING;
          candidate.lockedAt = new Date();
          candidate.processingNode = this.nodeName;
          claimed.push(candidate);
          this.emit(MAIL_EVENTS.PROCESSING, candidate);
        }
      }

      if (claimed.length === 0) {
        return;
      }

      const concurrency = this.configService.get<number>('mail.queueConcurrency', 5);
      await this.runWithConcurrency(claimed, Math.max(1, concurrency), async (item) => {
        await this.processJob(item);
      });
    } finally {
      this.isTickRunning = false;
    }
  }

  private async processJob(item: MailAuditLogEntity): Promise<void> {
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

  private async markAsSent(id: string, info: SentMessageInfo): Promise<void> {
    const audit = await this.auditRepository.findOneOrFail({ where: { id } });
    const attempts = audit.attempts + 1;

    await this.auditRepository.update(
      { id },
      {
        status: MailAuditStatus.SENT,
        attempts,
        sentAt: new Date(),
        providerMessageId: info.messageId ?? null,
        lastError: null,
        lockedAt: null,
        processingNode: this.nodeName,
      },
    );

    const updated = await this.auditRepository.findOneOrFail({ where: { id } });
    this.emit(MAIL_EVENTS.SENT, updated);
  }

  private async markAsFailure(item: MailAuditLogEntity, error: unknown): Promise<void> {
    const attempts = item.attempts + 1;
    const maxAttempts = item.maxAttempts;
    const shouldRetry = attempts < maxAttempts;

    const retryBaseDelayMs = this.configService.get<number>('mail.retryBaseDelayMs', 10000);
    const backoffMs = retryBaseDelayMs * attempts;
    const nextAttempt = new Date(Date.now() + backoffMs);
    const errorMessage = error instanceof Error ? error.message : 'Unknown mail delivery failure';

    await this.auditRepository.update(
      { id: item.id },
      {
        status: shouldRetry ? MailAuditStatus.PENDING : MailAuditStatus.FAILED,
        attempts,
        nextAttemptAt: shouldRetry ? nextAttempt : null,
        failedAt: shouldRetry ? null : new Date(),
        lastError: errorMessage,
        lockedAt: null,
        processingNode: this.nodeName,
      },
    );

    const updated = await this.auditRepository.findOneOrFail({ where: { id: item.id } });

    if (shouldRetry) {
      this.logger.warn(`mail job ${item.id} failed; retry scheduled in ${backoffMs}ms`);
    }

    this.emit(MAIL_EVENTS.FAILED, updated, errorMessage);
  }

  private async runWithConcurrency<T>(
    items: T[],
    concurrency: number,
    worker: (item: T) => Promise<void>,
  ): Promise<void> {
    const queue = [...items];
    const runners: Promise<void>[] = [];

    const run = async () => {
      while (queue.length > 0) {
        const item = queue.shift();
        if (!item) {
          return;
        }
        await worker(item);
      }
    };

    for (let i = 0; i < concurrency; i += 1) {
      runners.push(run());
    }

    await Promise.allSettled(runners);
  }

  private normalizeRecipients(input: MailSendOptions['to']): string[] {
    return Array.isArray(input) ? input : [input];
  }

  private applySearchFilters(
    queryBuilder: ReturnType<Repository<MailAuditLogEntity>['createQueryBuilder']>,
    options: MailAuditQueryOptions,
  ): void {
    if (options.status) {
      queryBuilder.andWhere('audit.status = :status', { status: options.status });
    }

    if (options.correlationId) {
      queryBuilder.andWhere('audit.correlationId = :correlationId', {
        correlationId: options.correlationId,
      });
    }

    if (options.idempotencyKey) {
      queryBuilder.andWhere('audit.idempotencyKey = :idempotencyKey', {
        idempotencyKey: options.idempotencyKey,
      });
    }

    if (options.subject) {
      queryBuilder.andWhere('audit.subject ILIKE :subject', {
        subject: `%${options.subject}%`,
      });
    }

    if (options.recipient) {
      queryBuilder.andWhere(
        new Brackets((qb) => {
          qb.where('audit.toRecipients::text ILIKE :recipient', {
            recipient: `%${options.recipient}%`,
          })
            .orWhere('audit.ccRecipients::text ILIKE :recipient', {
              recipient: `%${options.recipient}%`,
            })
            .orWhere('audit.bccRecipients::text ILIKE :recipient', {
              recipient: `%${options.recipient}%`,
            });
        }),
      );
    }

    if (options.fromDate) {
      queryBuilder.andWhere('audit.createdAt >= :fromDate', { fromDate: options.fromDate });
    }

    if (options.toDate) {
      queryBuilder.andWhere('audit.createdAt <= :toDate', { toDate: options.toDate });
    }
  }

  private toAuditView(entity: MailAuditLogEntity, includeContent: boolean): MailAuditView {
    if (includeContent) {
      return entity;
    }

    return {
      ...entity,
      textBody: null,
      htmlBody: null,
    };
  }

  private maskAuditContent(entity: MailAuditLogEntity): MailAuditLogEntity {
    const masked = this.auditRepository.create({
      ...entity,
      textBody: null,
      htmlBody: null,
    });

    return masked;
  }

  private getIdempotencyCacheKey(idempotencyKey: string): string {
    return `mail:idempotency:${idempotencyKey}`;
  }

  private getTemplateCacheKey(
    template: string,
    context: Record<string, string | number | boolean>,
  ): string {
    const digest = createHash('sha256')
      .update(template)
      .update(JSON.stringify(context))
      .digest('hex');

    return `mail:template:${digest}`;
  }

  private emit(eventName: string, entity: MailAuditLogEntity, error?: string) {
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

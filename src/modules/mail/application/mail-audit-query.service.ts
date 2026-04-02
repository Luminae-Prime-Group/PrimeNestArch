import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { MailAuditLogEntity } from '../entities/mail-audit-log.entity';
import {
  type MailAuditQueryOptions,
  type MailAuditView,
  type PaginatedMailAuditResponse,
} from '../mail.types';

@Injectable()
export class MailAuditQueryService {
  constructor(
    @InjectRepository(MailAuditLogEntity)
    private readonly repo: Repository<MailAuditLogEntity>,
  ) {}

  async findById(id: string, includeContent = false): Promise<MailAuditLogEntity | null> {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity || includeContent) {
      return entity;
    }
    return this.repo.create({ ...entity, textBody: null, htmlBody: null });
  }

  async listRecent(limit = 50): Promise<MailAuditLogEntity[]> {
    return this.repo.find({
      order: { createdAt: 'DESC' },
      take: Math.min(limit, 200),
    });
  }

  async search(options: MailAuditQueryOptions): Promise<PaginatedMailAuditResponse> {
    const page = Math.max(1, options.page);
    const limit = Math.min(Math.max(1, options.limit), 100);

    const qb = this.repo.createQueryBuilder('audit');
    this.applyFilters(qb, options);
    qb.orderBy(`audit.${options.sortBy}`, options.sortOrder)
      .skip((page - 1) * limit)
      .take(limit);

    const [entities, total] = await qb.getManyAndCount();
    const items = entities.map((e) => this.toView(e, options.includeContent));

    return {
      items,
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  toView(entity: MailAuditLogEntity, includeContent: boolean): MailAuditView {
    if (includeContent) {
      return entity;
    }
    return { ...entity, textBody: null, htmlBody: null };
  }

  private applyFilters(
    qb: ReturnType<Repository<MailAuditLogEntity>['createQueryBuilder']>,
    opts: MailAuditQueryOptions,
  ): void {
    if (opts.status) {
      qb.andWhere('audit.status = :status', { status: opts.status });
    }
    if (opts.priority) {
      qb.andWhere('audit.priority = :priority', { priority: opts.priority });
    }
    if (opts.correlationId) {
      qb.andWhere('audit.correlationId = :correlationId', {
        correlationId: opts.correlationId,
      });
    }
    if (opts.idempotencyKey) {
      qb.andWhere('audit.idempotencyKey = :idempotencyKey', {
        idempotencyKey: opts.idempotencyKey,
      });
    }
    if (opts.subject) {
      qb.andWhere('audit.subject ILIKE :subject', { subject: `%${opts.subject}%` });
    }
    if (opts.recipient) {
      qb.andWhere(
        new Brackets((qb2) => {
          qb2
            .where('audit.toRecipients::text ILIKE :recipient', {
              recipient: `%${opts.recipient}%`,
            })
            .orWhere('audit.ccRecipients::text ILIKE :recipient', {
              recipient: `%${opts.recipient}%`,
            })
            .orWhere('audit.bccRecipients::text ILIKE :recipient', {
              recipient: `%${opts.recipient}%`,
            });
        }),
      );
    }
    if (opts.fromDate) {
      qb.andWhere('audit.createdAt >= :fromDate', { fromDate: opts.fromDate });
    }
    if (opts.toDate) {
      qb.andWhere('audit.createdAt <= :toDate', { toDate: opts.toDate });
    }
  }
}

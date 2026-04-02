import { Injectable } from '@nestjs/common';
import { MailQueueService } from './mail.queue.service';
import { type MailAuditLogEntity } from './entities/mail-audit-log.entity';
import {
  type MailDispatchOptions,
  type MailTemplateDispatchOptions,
  type MailAuditQueryOptions,
  type PaginatedMailAuditResponse,
} from './mail.types';

@Injectable()
export class MailService {
  constructor(private readonly mailQueueService: MailQueueService) {}

  async sendAsync(options: MailDispatchOptions): Promise<MailAuditLogEntity> {
    return this.mailQueueService.enqueue(options);
  }

  async sendTemplateAsync(options: MailTemplateDispatchOptions): Promise<MailAuditLogEntity> {
    const renderedHtml = await this.mailQueueService.renderTemplateCached(
      options.template,
      options.context ?? {},
    );

    return this.mailQueueService.enqueue({
      to: options.to,
      subject: options.subject,
      html: renderedHtml,
      cc: options.cc,
      bcc: options.bcc,
      replyTo: options.replyTo,
      from: options.from,
      attachments: options.attachments,
      correlationId: options.correlationId,
      idempotencyKey: options.idempotencyKey,
      metadata: options.metadata,
      maxAttempts: options.maxAttempts,
    });
  }

  async findAuditById(id: string, includeContent = false): Promise<MailAuditLogEntity | null> {
    return this.mailQueueService.getAuditById(id, includeContent);
  }

  async listRecentAudit(limit = 50): Promise<MailAuditLogEntity[]> {
    return this.mailQueueService.listRecent(limit);
  }

  async searchAudit(options: MailAuditQueryOptions): Promise<PaginatedMailAuditResponse> {
    return this.mailQueueService.searchAudit(options);
  }
}

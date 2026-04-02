import { Injectable } from '@nestjs/common';
import { MailEnqueueService } from './application/mail-enqueue.service';
import { MailAuditQueryService } from './application/mail-audit-query.service';
import { MailSuppressionService } from './application/mail-suppression.service';
import { MailWebhookService, type MailDeliveryWebhookInput } from './application/mail-webhook.service';
import { MailTemplateService } from './infrastructure/mail-template.service';
import { type MailAuditLogEntity } from './entities/mail-audit-log.entity';
import { MailSuppressionEntity } from './entities/mail-suppression.entity';
import {
  type MailDispatchOptions,
  type MailTemplateDispatchOptions,
  type MailAuditQueryOptions,
  type PaginatedMailAuditResponse,
} from './mail.types';

@Injectable()
export class MailService {
  constructor(
    private readonly enqueueService: MailEnqueueService,
    private readonly auditQueryService: MailAuditQueryService,
    private readonly templateService: MailTemplateService,
    private readonly suppressionService: MailSuppressionService,
    private readonly webhookService: MailWebhookService,
  ) {}

  async sendAsync(options: MailDispatchOptions): Promise<MailAuditLogEntity> {
    return this.enqueueService.enqueue(options);
  }

  async scheduleAsync(options: MailDispatchOptions): Promise<MailAuditLogEntity> {
    return this.enqueueService.enqueue(options);
  }

  async suppressRecipient(email: string, reason?: string, source?: string): Promise<MailSuppressionEntity> {
    return this.suppressionService.suppress(email, reason, source);
  }

  async unsuppressRecipient(email: string): Promise<{ updated: boolean }> {
    return this.suppressionService.unsuppress(email);
  }

  async listSuppressed(limit = 100): Promise<MailSuppressionEntity[]> {
    return this.suppressionService.listActive(limit);
  }

  async processDeliveryWebhook(input: MailDeliveryWebhookInput): Promise<MailAuditLogEntity> {
    return this.webhookService.processDeliveryEvent(input);
  }

  async sendTemplateAsync(options: MailTemplateDispatchOptions): Promise<MailAuditLogEntity> {
    const renderedHtml = await this.templateService.renderCached(
      options.template,
      options.context ?? {},
    );
    return this.enqueueService.enqueue({
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
      priority: options.priority,
    });
  }

  async retryFailed(id: string): Promise<MailAuditLogEntity> {
    return this.enqueueService.requeue(id);
  }

  previewTemplate(
    template: string,
    context: Record<string, unknown>,
  ): { html: string } {
    const html = this.templateService.render(template, context);
    return { html };
  }

  async findAuditById(id: string, includeContent = false): Promise<MailAuditLogEntity | null> {
    return this.auditQueryService.findById(id, includeContent);
  }

  async listRecentAudit(limit = 50): Promise<MailAuditLogEntity[]> {
    return this.auditQueryService.listRecent(limit);
  }

  async searchAudit(options: MailAuditQueryOptions): Promise<PaginatedMailAuditResponse> {
    return this.auditQueryService.search(options);
  }
}

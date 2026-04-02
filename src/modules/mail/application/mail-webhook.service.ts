import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MailAuditLogEntity, MailAuditStatus } from '../entities/mail-audit-log.entity';

export type MailDeliveryWebhookInput = {
  event: 'delivered' | 'bounced' | 'complained' | 'failed' | 'opened' | 'clicked';
  auditId?: string;
  providerMessageId?: string;
  error?: string;
};

@Injectable()
export class MailWebhookService {
  constructor(
    @InjectRepository(MailAuditLogEntity)
    private readonly repo: Repository<MailAuditLogEntity>,
  ) {}

  async processDeliveryEvent(input: MailDeliveryWebhookInput): Promise<MailAuditLogEntity> {
    if (!input.auditId && !input.providerMessageId) {
      throw new BadRequestException('Either auditId or providerMessageId must be provided.');
    }

    const entity = await this.findTarget(input.auditId, input.providerMessageId);
    if (!entity) {
      throw new NotFoundException('Mail audit log was not found for webhook payload.');
    }

    if (input.event === 'delivered') {
      await this.repo.update(entity.id, {
        status: MailAuditStatus.SENT,
        sentAt: new Date(),
        failedAt: null,
        lastError: null,
      });
      return this.repo.findOneOrFail({ where: { id: entity.id } });
    }

    if (input.event === 'bounced' || input.event === 'complained' || input.event === 'failed') {
      await this.repo.update(entity.id, {
        status: MailAuditStatus.FAILED,
        failedAt: new Date(),
        lastError: input.error ?? `Webhook reported ${input.event}`,
      });
      return this.repo.findOneOrFail({ where: { id: entity.id } });
    }

    return entity;
  }

  private async findTarget(auditId?: string, providerMessageId?: string) {
    if (auditId) {
      return this.repo.findOne({ where: { id: auditId } });
    }
    if (providerMessageId) {
      return this.repo.findOne({ where: { providerMessageId } });
    }
    return null;
  }
}
import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MailAuditLogEntity } from './entities/mail-audit-log.entity';
import { MailSuppressionEntity } from './entities/mail-suppression.entity';
import { MailAuditQueryService } from './application/mail-audit-query.service';
import { MailEnqueueService } from './application/mail-enqueue.service';
import { MailValidationService } from './application/mail-validation.service';
import { MailIdempotencyService } from './application/mail-idempotency.service';
import { MailRateLimitService } from './application/mail-rate-limit.service';
import { MailAuditService } from './application/mail-audit.service';
import { MailRetryService } from './application/mail-retry.service';
import { MailSuppressionService } from './application/mail-suppression.service';
import { MailWebhookService } from './application/mail-webhook.service';
import { MailDispatchService } from './infrastructure/mail-dispatch.service';
import { MailJobClaimService } from './infrastructure/mail-job-claim.service';
import { MailJobStateService } from './infrastructure/mail-job-state.service';
import { MailTemplateService } from './infrastructure/mail-template.service';
import { MailAuditController } from './presentation/mail-audit.controller';
import { MailListener } from './mail.listener';
import { mailTransporterProvider } from './mail.provider';
import { MailQueueService } from './mail.queue.service';
import { MailService } from './mail.service';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([MailAuditLogEntity, MailSuppressionEntity])],
  controllers: [MailAuditController],
  providers: [
    mailTransporterProvider,
    MailTemplateService,
    MailValidationService,
    MailIdempotencyService,
    MailRateLimitService,
    MailAuditService,
    MailRetryService,
    MailSuppressionService,
    MailWebhookService,
    MailEnqueueService,
    MailAuditQueryService,
    MailJobClaimService,
    MailJobStateService,
    MailDispatchService,
    MailQueueService,
    MailService,
    MailListener,
  ],
  exports: [MailService],
})
export class MailModule {}

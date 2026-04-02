import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MailAuditLogEntity } from './entities/mail-audit-log.entity';
import { MailAuditQueryService } from './application/mail-audit-query.service';
import { MailEnqueueService } from './application/mail-enqueue.service';
import { MailDispatchService } from './infrastructure/mail-dispatch.service';
import { MailTemplateService } from './infrastructure/mail-template.service';
import { MailAuditController } from './presentation/mail-audit.controller';
import { MailListener } from './mail.listener';
import { mailTransporterProvider } from './mail.provider';
import { MailQueueService } from './mail.queue.service';
import { MailService } from './mail.service';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([MailAuditLogEntity])],
  controllers: [MailAuditController],
  providers: [
    mailTransporterProvider,
    MailTemplateService,
    MailEnqueueService,
    MailAuditQueryService,
    MailDispatchService,
    MailQueueService,
    MailService,
    MailListener,
  ],
  exports: [MailService],
})
export class MailModule {}

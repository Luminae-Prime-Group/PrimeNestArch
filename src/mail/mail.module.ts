import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MailAuditLogEntity } from './entities/mail-audit-log.entity';
import { MailAuditController } from './mail-audit.controller';
import { MailListener } from './mail.listener';
import { mailTransporterProvider } from './mail.provider';
import { MailQueueService } from './mail.queue.service';
import { MailService } from './mail.service';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([MailAuditLogEntity])],
  controllers: [MailAuditController],
  providers: [mailTransporterProvider, MailQueueService, MailService, MailListener],
  exports: [MailService, MailQueueService],
})
export class MailModule {}

import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { MailService } from './mail.service';
import { MailAuditQueryDto } from './dto/mail-audit-query.dto';

@Controller('mail/audit')
export class MailAuditController {
  constructor(private readonly mailService: MailService) {}

  @Get()
  async list(@Query() query: MailAuditQueryDto) {
    return this.mailService.searchAudit({
      status: query.status,
      correlationId: query.correlationId,
      idempotencyKey: query.idempotencyKey,
      recipient: query.recipient,
      subject: query.subject,
      fromDate: query.fromDate ? new Date(query.fromDate) : undefined,
      toDate: query.toDate ? new Date(query.toDate) : undefined,
      page: query.page,
      limit: query.limit,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder.toUpperCase() as 'ASC' | 'DESC',
      includeContent: query.includeContent,
    });
  }

  @Get(':id')
  async detail(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query('includeContent') includeContent?: string,
  ) {
    const include = includeContent === 'true';
    return this.mailService.findAuditById(id, include);
  }
}

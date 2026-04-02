import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { MailService } from '../mail.service';
import { MailAuditQueryDto } from '../dto/mail-audit-query.dto';
import { MailPreviewDto } from '../dto/mail-preview.dto';

@ApiTags('Mail')
@Controller('mail')
export class MailAuditController {
  constructor(
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
  ) {}

  @ApiOperation({ summary: 'Search and list mail audit logs' })
  @ApiQuery({ name: 'status', required: false, enum: ['pending', 'processing', 'sent', 'failed'] })
  @ApiQuery({ name: 'priority', required: false, enum: ['high', 'normal', 'low'] })
  @ApiQuery({ name: 'correlationId', required: false, type: String })
  @ApiQuery({ name: 'recipient', required: false, type: String })
  @ApiQuery({ name: 'subject', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'] })
  @ApiQuery({ name: 'includeContent', required: false, type: Boolean })
  @Get('audit')
  async list(@Query() query: MailAuditQueryDto) {
    return this.mailService.searchAudit({
      status: query.status,
      priority: query.priority,
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

  @ApiOperation({ summary: 'Get mail audit log by ID' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiQuery({ name: 'includeContent', required: false, type: Boolean })
  @Get('audit/:id')
  async detail(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query('includeContent') includeContent?: string,
  ) {
    const include = includeContent === 'true';
    return this.mailService.findAuditById(id, include);
  }

  @ApiOperation({ summary: 'Retry a FAILED mail by re-enqueuing it' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @Post('audit/:id/retry')
  async retry(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.mailService.retryFailed(id);
  }

  @ApiOperation({
    summary: 'Preview a Handlebars mail template (non-production only)',
    description:
      'Renders the Handlebars template with the given context and returns sanitized HTML. ' +
      'Only available when NODE_ENV is not "production".',
  })
  @ApiBody({ type: MailPreviewDto })
  @Post('preview')
  preview(@Body() dto: MailPreviewDto) {
    const nodeEnv = this.configService.get<string>('app.nodeEnv', 'development');
    if (nodeEnv === 'production') {
      throw new NotFoundException();
    }
    return this.mailService.previewTemplate(dto.template, dto.context ?? {});
  }
}

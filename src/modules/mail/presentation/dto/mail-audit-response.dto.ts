import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MailAuditStatus, MailPriority } from '../../entities/mail-audit-log.entity';

export class MailAuditViewDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiPropertyOptional({ nullable: true })
  correlationId?: string | null;

  @ApiPropertyOptional({ nullable: true })
  idempotencyKey?: string | null;

  @ApiProperty({ enum: MailAuditStatus })
  status!: MailAuditStatus;

  @ApiProperty({ enum: MailPriority })
  priority!: MailPriority;

  @ApiProperty({ type: [String] })
  toRecipients!: string[];

  @ApiPropertyOptional({ type: [String], nullable: true })
  ccRecipients?: string[] | null;

  @ApiPropertyOptional({ type: [String], nullable: true })
  bccRecipients?: string[] | null;

  @ApiProperty()
  fromAddress!: string;

  @ApiProperty()
  subject!: string;

  @ApiPropertyOptional({ nullable: true })
  textBody?: string | null;

  @ApiPropertyOptional({ nullable: true })
  htmlBody?: string | null;

  @ApiPropertyOptional({ nullable: true, additionalProperties: true })
  metadata?: Record<string, string | number | boolean> | null;

  @ApiPropertyOptional({ nullable: true })
  replyTo?: string | null;

  @ApiProperty()
  attempts!: number;

  @ApiProperty()
  maxAttempts!: number;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  nextAttemptAt?: Date | null;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  lockedAt?: Date | null;

  @ApiPropertyOptional({ nullable: true })
  processingNode?: string | null;

  @ApiPropertyOptional({ nullable: true })
  providerMessageId?: string | null;

  @ApiPropertyOptional({ nullable: true })
  lastError?: string | null;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  sentAt?: Date | null;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  failedAt?: Date | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}

export class PaginatedMailAuditResponseDto {
  @ApiProperty({ type: [MailAuditViewDto] })
  items!: MailAuditViewDto[];

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 42 })
  total!: number;

  @ApiProperty({ example: 3 })
  totalPages!: number;
}

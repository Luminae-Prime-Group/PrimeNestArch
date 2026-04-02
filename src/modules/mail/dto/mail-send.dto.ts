import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsEmail,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { MailPriority } from '../entities/mail-audit-log.entity';

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item));
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    return [value];
  }
  return [];
}

export class MailAttachmentDto {
  @ApiProperty({ example: 'invoice.pdf' })
  @IsString()
  filename!: string;

  @ApiProperty({
    example: 'base64-or-plain-content',
    description: 'Attachment content (plain text or base64 string).',
  })
  @IsString()
  content!: string;

  @ApiPropertyOptional({ example: 'application/pdf' })
  @IsOptional()
  @IsString()
  contentType?: string;
}

export class MailSendDto {
  @ApiProperty({
    type: [String],
    example: ['user@example.com'],
    description: 'Primary recipients. Accepts a single string or an array of strings.',
  })
  @Transform(({ value }) => toStringArray(value))
  @IsArray()
  @ArrayNotEmpty()
  @IsEmail({}, { each: true })
  to!: string[];

  @ApiProperty({ example: 'Welcome to PrimeNestArch' })
  @IsString()
  subject!: string;

  @ApiPropertyOptional({ example: 'Hello from PrimeNestArch' })
  @IsOptional()
  @IsString()
  text?: string;

  @ApiPropertyOptional({ example: '<h1>Hello from PrimeNestArch</h1>' })
  @IsOptional()
  @IsString()
  html?: string;

  @ApiPropertyOptional({ type: [String], example: ['cc@example.com'] })
  @Transform(({ value }) => (value === undefined ? undefined : toStringArray(value)))
  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  cc?: string[];

  @ApiPropertyOptional({ type: [String], example: ['bcc@example.com'] })
  @Transform(({ value }) => (value === undefined ? undefined : toStringArray(value)))
  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  bcc?: string[];

  @ApiPropertyOptional({ example: 'reply@example.com' })
  @IsOptional()
  @IsEmail()
  replyTo?: string;

  @ApiPropertyOptional({ example: 'no-reply@example.com' })
  @IsOptional()
  @IsEmail()
  from?: string;

  @ApiPropertyOptional({ type: [MailAttachmentDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MailAttachmentDto)
  attachments?: MailAttachmentDto[];

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  correlationId?: string;

  @ApiPropertyOptional({ example: 'send-user-1234-welcome' })
  @IsOptional()
  @IsString()
  idempotencyKey?: string;

  @ApiPropertyOptional({ additionalProperties: true, example: { tenantId: 'acme', campaign: 'welcome' } })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, string | number | boolean>;

  @ApiPropertyOptional({ minimum: 1, maximum: 10, example: 3 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  maxAttempts?: number;

  @ApiPropertyOptional({ enum: MailPriority, example: MailPriority.NORMAL })
  @IsOptional()
  @IsEnum(MailPriority)
  priority?: MailPriority;
}
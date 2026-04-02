import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { MailAuditStatus, MailPriority } from '../entities/mail-audit-log.entity';

export class MailAuditQueryDto {
  @ApiPropertyOptional({ enum: MailAuditStatus, description: 'Filter by delivery lifecycle status.' })
  @IsOptional()
  @IsEnum(MailAuditStatus)
  status?: MailAuditStatus;

  @ApiPropertyOptional({ enum: MailPriority, description: 'Filter by queue priority.' })
  @IsOptional()
  @IsEnum(MailPriority)
  priority?: MailPriority;

  @ApiPropertyOptional({ description: 'Filter by correlation ID propagated across the request flow.' })
  @IsOptional()
  @IsString()
  correlationId?: string;

  @ApiPropertyOptional({ description: 'Filter by idempotency key used when enqueuing mail.' })
  @IsOptional()
  @IsString()
  idempotencyKey?: string;

  @ApiPropertyOptional({ description: 'Filter by matching any recipient across to/cc/bcc.' })
  @IsOptional()
  @IsString()
  recipient?: string;

  @ApiPropertyOptional({ description: 'Case-insensitive subject filter.' })
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiPropertyOptional({ type: String, format: 'date-time', description: 'Created-at lower bound.' })
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional({ type: String, format: 'date-time', description: 'Created-at upper bound.' })
  @IsOptional()
  @IsDateString()
  toDate?: string;

  @ApiPropertyOptional({ example: 1, minimum: 1 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ example: 20, minimum: 1, maximum: 100 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;

  @ApiPropertyOptional({
    enum: ['createdAt', 'updatedAt', 'nextAttemptAt', 'attempts', 'sentAt', 'failedAt'],
  })
  @IsOptional()
  @IsIn(['createdAt', 'updatedAt', 'nextAttemptAt', 'attempts', 'sentAt', 'failedAt'])
  sortBy: 'createdAt' | 'updatedAt' | 'nextAttemptAt' | 'attempts' | 'sentAt' | 'failedAt' =
    'createdAt';

  @ApiPropertyOptional({ enum: ['ASC', 'DESC', 'asc', 'desc'] })
  @IsOptional()
  @IsIn(['ASC', 'DESC', 'asc', 'desc'])
  sortOrder: 'ASC' | 'DESC' | 'asc' | 'desc' = 'DESC';

  @ApiPropertyOptional({
    type: Boolean,
    description: 'When true, returns full text/html content instead of masking bodies.',
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  includeContent = false;
}

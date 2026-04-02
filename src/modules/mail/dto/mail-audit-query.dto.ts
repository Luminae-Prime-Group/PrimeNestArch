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
  @IsOptional()
  @IsEnum(MailAuditStatus)
  status?: MailAuditStatus;

  @IsOptional()
  @IsEnum(MailPriority)
  priority?: MailPriority;

  @IsOptional()
  @IsString()
  correlationId?: string;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;

  @IsOptional()
  @IsString()
  recipient?: string;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  page = 1;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;

  @IsOptional()
  @IsIn(['createdAt', 'updatedAt', 'nextAttemptAt', 'attempts', 'sentAt', 'failedAt'])
  sortBy: 'createdAt' | 'updatedAt' | 'nextAttemptAt' | 'attempts' | 'sentAt' | 'failedAt' =
    'createdAt';

  @IsOptional()
  @IsIn(['ASC', 'DESC', 'asc', 'desc'])
  sortOrder: 'ASC' | 'DESC' | 'asc' | 'desc' = 'DESC';

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  includeContent = false;
}

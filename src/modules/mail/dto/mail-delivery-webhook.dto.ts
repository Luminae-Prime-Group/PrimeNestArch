import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator';

export class MailDeliveryWebhookDto {
  @ApiProperty({ enum: ['delivered', 'bounced', 'complained', 'failed', 'opened', 'clicked'] })
  @IsIn(['delivered', 'bounced', 'complained', 'failed', 'opened', 'clicked'])
  event!: 'delivered' | 'bounced' | 'complained' | 'failed' | 'opened' | 'clicked';

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  auditId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  providerMessageId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  error?: string;
}
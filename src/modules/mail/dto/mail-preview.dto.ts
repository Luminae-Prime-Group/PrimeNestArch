import { IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class MailPreviewDto {
  @IsString()
  @IsNotEmpty()
  template!: string;

  @IsOptional()
  @IsObject()
  context?: Record<string, unknown>;
}

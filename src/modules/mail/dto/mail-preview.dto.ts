import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class MailPreviewDto {
  @ApiProperty({
    example: '<h1>Hello {{name}}</h1>{{#if active}}<p>Your account is active.</p>{{/if}}',
    description: 'Handlebars template used to generate the preview HTML.',
  })
  @IsString()
  @IsNotEmpty()
  template!: string;

  @ApiPropertyOptional({
    description: 'Context object passed to the Handlebars renderer.',
    additionalProperties: true,
    example: { name: 'Giovani', active: true },
  })
  @IsOptional()
  @IsObject()
  context?: Record<string, unknown>;
}

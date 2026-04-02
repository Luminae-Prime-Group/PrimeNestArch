import { ApiProperty } from '@nestjs/swagger';
import { IsDateString } from 'class-validator';
import { MailSendDto } from './mail-send.dto';

export class MailScheduleDto extends MailSendDto {
  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2026-04-02T22:30:00.000Z',
    description: 'Datetime in the future when the email should be dispatched.',
  })
  @IsDateString()
  scheduledFor!: string;
}
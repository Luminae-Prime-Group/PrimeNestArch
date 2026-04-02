import { ApiProperty } from '@nestjs/swagger';

export class HealthStatusResponseDto {
  @ApiProperty({ example: 'ok', description: 'Operational status for the endpoint.' })
  status!: 'ok' | 'error';
}

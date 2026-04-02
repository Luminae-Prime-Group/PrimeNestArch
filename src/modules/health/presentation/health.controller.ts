import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiSecurity,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { HealthCheckService, TypeOrmHealthIndicator } from '@nestjs/terminus';
import { HealthStatusResponseDto } from './dto/health-status-response.dto';

@ApiTags('Health')
@ApiSecurity('api-token')
@ApiBearerAuth('api-token-bearer')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: TypeOrmHealthIndicator,
  ) {}

  @ApiOperation({
    summary: 'Liveness probe',
    description: 'Cheap process-level health check used to confirm the API process is up.',
  })
  @ApiOkResponse({ type: HealthStatusResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid API token.' })
  @Get('live')
  liveness() {
    return { status: 'ok' };
  }

  @ApiOperation({
    summary: 'Readiness probe',
    description: 'Checks dependencies required to serve traffic, including database connectivity.',
  })
  @ApiOkResponse({ type: HealthStatusResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid API token.' })
  @ApiServiceUnavailableResponse({
    description: 'Application is running but not ready to serve traffic.',
    type: HealthStatusResponseDto,
  })
  @Get('ready')
  async readiness() {
    try {
      await this.health.check([
        async () => this.db.pingCheck('database', { timeout: 3000 }),
      ]);
      return { status: 'ok' };
    } catch {
      // Swallow terminus HealthCheckError to avoid leaking DB host/port/reason
      throw new ServiceUnavailableException({ status: 'error' });
    }
  }
}

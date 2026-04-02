import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { HealthCheckService, TypeOrmHealthIndicator } from '@nestjs/terminus';

@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: TypeOrmHealthIndicator,
  ) {}

  @Get('live')
  liveness() {
    return { status: 'ok' };
  }

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

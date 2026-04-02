import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TerminusModule } from '@nestjs/terminus';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import configuration from './config/configuration';
import { envValidationSchema } from './config/env.validation';
import { HealthController } from './health/health.controller';
import { MailModule } from './mail/mail.module';
import { CsrfController } from './security/csrf.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema: envValidationSchema,
      expandVariables: true,
    }),
    CacheModule.register({
      isGlobal: true,
      ttl: 60_000,
      max: 10_000,
    }),
    EventEmitterModule.forRoot({
      wildcard: false,
      maxListeners: 50,
      delimiter: '.',
      verboseMemoryLeak: true,
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('database.host', 'localhost'),
        port: configService.get<number>('database.port', 5432),
        username: configService.get<string>('database.username', 'postgres'),
        password: configService.get<string>('database.password', 'postgres'),
        database: configService.get<string>('database.name', 'postgres'),
        ssl: configService.get<boolean>('database.ssl', false)
          ? {
              rejectUnauthorized: configService.get<boolean>(
                'database.sslRejectUnauthorized',
                true,
              ),
              ca: configService.get<string | undefined>('database.sslCa'),
            }
          : false,
        autoLoadEntities: true,
        synchronize: false,
        retryAttempts: configService.get<number>('database.retryAttempts', 5),
        retryDelay: configService.get<number>('database.retryDelayMs', 3000),
      }),
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => [
        {
          ttl: configService.get<number>('security.throttleTtlMs', 60000),
          limit: configService.get<number>('security.throttleLimit', 100),
        },
      ],
    }),
    PrometheusModule.register({
      defaultMetrics: {
        enabled: true,
      },
      path: 'metrics',
    }),
    MailModule,
    TerminusModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [CsrfController, HealthController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import configuration from './config/configuration';
import { envValidationSchema } from './config/env.validation';
import { CsrfController } from './security/csrf.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema: envValidationSchema,
      expandVariables: true,
    }),
    ScheduleModule.forRoot(),
  ],
  controllers: [CsrfController],
})
export class AppModule {}

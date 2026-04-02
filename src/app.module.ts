import { Module } from '@nestjs/common';
import { CsrfController } from './security/csrf.controller';

@Module({
  imports: [],
  controllers: [CsrfController],
})
export class AppModule {}

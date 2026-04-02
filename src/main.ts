import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import csurf from 'csurf';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { CsrfExceptionFilter } from './security/csrf-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  app.use(cookieParser());
  app.use(
    csurf({
      cookie: {
        key: '_csrf',
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      },
    }),
  );
  app.useGlobalFilters(new CsrfExceptionFilter());
  app.use(helmet());
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();

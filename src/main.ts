import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import csurf from 'csurf';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { CsrfExceptionFilter } from './security/csrf-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    snapshot: true,
  });
  const configService = app.get(ConfigService);
  const nodeEnv = configService.get<string>('app.nodeEnv', 'development');
  const port = configService.get<number>('app.port', 3000);
  const corsOrigin = configService.get<string>('app.corsOrigin', '*');

  app.enableCors({
    origin: corsOrigin,
  });
  app.use(cookieParser());
  app.use(
    csurf({
      cookie: {
        key: '_csrf',
        httpOnly: true,
        sameSite: 'lax',
        secure: nodeEnv === 'production',
      },
    }),
  );
  app.useGlobalFilters(new CsrfExceptionFilter());
  app.use(helmet());
  await app.listen(port);
}
bootstrap();

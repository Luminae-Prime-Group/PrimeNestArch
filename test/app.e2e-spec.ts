import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';

jest.setTimeout(30000);

describe('System e2e', () => {
  let app: INestApplication | undefined;
  let apiToken = '';

  const getHttpServer = () => {
    if (!app) {
      throw new Error('Test application is not initialized');
    }
    return app.getHttpServer();
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();

    const configService = app.get(ConfigService);
    const globalPrefix = configService.get<string>('app.globalPrefix', 'api');
    apiToken = configService.get<string>('security.apiToken', '');

    app.setGlobalPrefix(globalPrefix);
    app.use(cookieParser());

    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('GET /api/health/live should return liveness payload', async () => {
    const response = await request(getHttpServer())
      .get('/api/health/live')
      .set('x-api-token', apiToken)
      .expect(200);

    expect(response.body.status).toBe('ok');
    expect(response.body.info).toBeUndefined();
  });

  it('GET /api/health/ready should return readiness status', async () => {
    const response = await request(getHttpServer())
      .get('/api/health/ready')
      .set('x-api-token', apiToken)
      .expect(200);

    expect(response.body.status).toBe('ok');
  });

  it('GET /api/csrf/token should set csrf cookies', async () => {
    const response = await request(getHttpServer())
      .get('/api/csrf/token')
      .set('x-api-token', apiToken)
      .expect(200);

    expect(response.body.csrfToken).toBeDefined();
    expect(response.headers['set-cookie']).toBeDefined();
  });
});

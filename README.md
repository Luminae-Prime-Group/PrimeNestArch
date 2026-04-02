# PrimeNestArch

Opinionated NestJS 11 backend boilerplate with layered modular architecture, security baseline, observability, and automated tests — by [Luminae Prime Group](https://github.com/Luminae-Prime-Group).

## Features

- NestJS 11 + SWC build pipeline
- PostgreSQL with TypeORM
- Config validation with Joi
- Structured logs with correlation id (`x-correlation-id`)
- OpenTelemetry tracing toggle (`OTEL_ENABLED`)
- Prometheus metrics endpoint (`/metrics`)
- SMTP mail module with full DB audit, async queue, events, cache, and concurrency controls
- Formal health/readiness endpoints (`/api/health/live`, `/api/health/ready`)
- Helmet + CSRF + CORS allowlist
- Global request validation and throttling
- Task scheduling module enabled
- Docker and Docker Compose support
- CI workflow, SAST, secret scanning, and security policy gate

## Architecture

The project follows a layered modular structure designed for scale.

- `src/bootstrap`: composition root and app startup
- `src/modules`: business modules split by layers (`application`, `domain`, `infrastructure`, `presentation`)
- `src/infrastructure`: cross-module technical adapters (config, database, cache, messaging)
- `src/shared`: shared contracts, constants, exceptions, and utilities
- `src/interfaces`: transport channels (`http`, `events`, `workers`, `cli`)
- `src/tests`: test architecture folders (`unit`, `integration`, `contract`, `e2e`)

Detailed architecture guide: `docs/architecture/README.md`
Migration roadmap: `docs/architecture/migration-plan.md`

## Quick Start

1. Install dependencies:

```bash
npm install
```

2. Create local environment file:

```bash
cp .env.development.example .env
```

3. Start PostgreSQL:

```bash
docker compose up -d postgres
```

4. Run migrations:

```bash
npm run migration:run
```

5. Start API in development:

```bash
npm run start:dev
```

API base URL: `http://localhost:3000/api`

## Environment Profiles

- `.env.development.example`
- `.env.test.example`
- `.env.production.example`

## Database Scripts

- `npm run migration:generate`
- `npm run migration:run`
- `npm run migration:revert`

## Security Baseline

- Global API token required on every route (`x-api-token` or `Authorization: Bearer <token>`)
- Disable `x-powered-by`
- Global `ValidationPipe` (`transform`, `whitelist`, `forbidNonWhitelisted`)
- Global throttling (`@nestjs/throttler`)
- CSRF cookie strategy enabled
- `synchronize=false` in TypeORM

## Observability

- Metrics: `GET /metrics`
- Liveness: `GET /api/health/live`
- Readiness: `GET /api/health/ready`
- Correlation ID header propagated in requests/responses
- Tracing can be enabled through `OTEL_ENABLED=true`

Example authenticated request:

```bash
curl -H "x-api-token: $API_TOKEN" http://localhost:3000/api/health/live
```

## Mail Module

- Provider: `MailService` (global module)
- Full DB audit trail in `mail_audit_logs` for each message lifecycle
- Async queue processor with configurable polling, batch size, and concurrency
- Retry strategy with backoff and max attempts (`MAIL_MAX_ATTEMPTS`, `MAIL_RETRY_BASE_DELAY_MS`)
- Idempotency support with cache (`MAIL_IDEMPOTENCY_TTL_SEC`)
- Template rendering cache (`MAIL_TEMPLATE_CACHE_TTL_SEC`)
- Domain events: queued, processing, sent, failed
- SMTP transport with pooling (`MAIL_POOL`) and connection limits
- Startup verification toggle (`MAIL_VERIFY_ON_STARTUP`)

Example service usage:

```ts
import { Injectable } from '@nestjs/common';
import { MailService } from './modules/mail/mail.service';

@Injectable()
export class ExampleNotifierService {
	constructor(private readonly mailService: MailService) {}

	async sendWelcomeEmail(email: string, name: string) {
		await this.mailService.sendTemplateAsync({
			to: email,
			subject: 'Welcome to PrimeNestArch',
			template: '<h1>Ola, {{name}}!</h1><p>Sua conta foi criada com sucesso.</p>',
			context: { name },
			correlationId: 'user-signup-flow',
			idempotencyKey: `welcome-${email}`,
			metadata: { channel: 'onboarding', feature: 'signup' },
			maxAttempts: 5,
		});
	}
}
```

## CI

GitHub Actions now enforces:

- Lint + build
- Unit and e2e tests
- Security gate (`audit-ci`) failing on any high/critical vulnerability
- Secret scanning with Gitleaks
- CodeQL SAST workflow

## Contributing

See `CONTRIBUTING.md`.

## Security Reporting

See `SECURITY.md`.

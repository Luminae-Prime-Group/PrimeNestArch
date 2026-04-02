# PontoPrimeBackend

Secure and scalable NestJS starter focused on practical onboarding for open-source contributors.

## Features

- NestJS 11 + SWC build pipeline
- PostgreSQL with TypeORM
- Config validation with Joi
- Structured logs with correlation id (`x-correlation-id`)
- OpenTelemetry tracing toggle (`OTEL_ENABLED`)
- Prometheus metrics endpoint (`/metrics`)
- Formal health/readiness endpoints (`/api/health/live`, `/api/health/ready`)
- Helmet + CSRF + CORS allowlist
- Global request validation and throttling
- Task scheduling module enabled
- Docker and Docker Compose support
- CI workflow, SAST, secret scanning, and security policy gate

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

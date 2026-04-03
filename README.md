# PontoPrimeBackend

Backend em NestJS 11 com arquitetura modular em camadas, baseline de seguranca, observabilidade e um modulo de e-mail orientado a fila, auditoria e integracoes operacionais.

## Visao Geral

O projeto foi organizado para crescer sem concentrar regra de negocio em controllers ou providers monoliticos. Hoje a base entrega:

- NestJS 11 com pipeline de build padrao do Nest
- PostgreSQL com TypeORM e migracoes versionadas
- Validacao de configuracao com Joi
- Seguranca com API token, CSRF, Helmet, CORS controlado e throttling global
- Observabilidade com logs estruturados, correlation id, metricas Prometheus e toggle de OpenTelemetry
- Modulo de e-mail com envio assíncrono, templates, auditoria, retry, fila, webhook de entrega e suppression list
- Testes automatizados unitarios, de integracao e e2e

## Estrutura do Projeto

- `src/main.ts`: ponto de entrada da aplicacao
- `src/bootstrap`: composicao da aplicacao e bootstrap principal
- `src/modules`: modulos de negocio separados por camadas (`application`, `domain`, `infrastructure`, `presentation`)
- `src/infrastructure`: adaptadores tecnicos compartilhados, como config, banco, cache, monitoramento e seguranca
- `src/shared`: constantes, contratos, excecoes e utilitarios compartilhados
- `src/interfaces`: pontos de integracao por canal (`http`, `events`, `workers`, `cli`)
- `tests` e `test`: suites automatizadas por tipo de validacao

Documentacao complementar:

- Guia de arquitetura: `docs/architecture/README.md`
- Plano de migracao: `docs/architecture/migration-plan.md`

## Principais Funcionalidades

### Plataforma

- Prefixo global configuravel via `GLOBAL_PREFIX` (padrao: `api`)
- Health checks de liveness e readiness
- Documentacao OpenAPI em `/api/openapi.json`
- Interface Scalar em `/api/docs`
- Suporte a Docker e Docker Compose

### Seguranca

- Autenticacao por `x-api-token` ou `Authorization: Bearer <token>`
- Middleware de CSRF para rotas mutaveis
- `ValidationPipe` global com `transform`, `whitelist` e `forbidNonWhitelisted`
- Rate limiting global com `@nestjs/throttler`
- Hardening basico via Helmet e `x-powered-by` desabilitado

### Observabilidade

- Correlation id em request/response
- Logs estruturados com `pino-http`
- Endpoint de metricas Prometheus em `/metrics`
- Tracing opcional com `OTEL_ENABLED=true`

### Modulo de E-mail

- Envio assincrono com fila interna e controle de concorrencia
- Envio direto com conteudo `text` e/ou `html`
- Envio por template com Handlebars e cache de renderizacao
- Agendamento de envio futuro com persistencia em auditoria
- Auditoria completa do ciclo do e-mail em banco
- Retry com backoff configuravel
- Idempotencia por chave com cache
- Webhook de entrega para atualizar status do envio
- Suppression list para bloquear destinatarios opt-out ou invalidados
- Preview de template fora de ambiente de producao

## Setup Rapido

1. Instale as dependencias:

```bash
npm install
```

2. Crie o arquivo de ambiente local:

```bash
cp .env.development.example .env
```

3. Suba o banco PostgreSQL:

```bash
docker compose up -d postgres
```

4. Execute as migracoes:

```bash
npm run migration:run
```

5. Inicie a aplicacao em desenvolvimento:

```bash
npm run start:dev
```

Base da API: `http://localhost:3000/api`

## Perfis de Ambiente

- `.env.example`
- `.env.development.example`
- `.env.test.example`
- `.env.production.example`

## Scripts Principais

### Aplicacao

- `npm run build`
- `npm run start`
- `npm run start:dev`
- `npm run start:debug`
- `npm run start:prod`

### Qualidade

- `npm run lint`
- `npm run lint:check`
- `npm run format`
- `npm run security:audit`

### Testes

- `npm test`
- `npm run test:watch`
- `npm run test:cov`
- `npm run test:debug`
- `npm run test:e2e`

### Banco de Dados

- `npm run migration:generate`
- `npm run migration:run`
- `npm run migration:revert`
- `npm run db:setup`

## Variaveis de Ambiente Relevantes

### Aplicacao

- `NODE_ENV`
- `PORT`
- `GLOBAL_PREFIX`
- `CORS_ORIGINS`
- `TRUST_PROXY`

### Seguranca e observabilidade

- `API_TOKEN`
- `THROTTLE_TTL_MS`
- `THROTTLE_LIMIT`
- `LOG_LEVEL`
- `METRICS_TOKEN`
- `OTEL_ENABLED`
- `OTEL_EXPORTER_OTLP_ENDPOINT`

### Banco de dados

- `DB_HOST`
- `DB_PORT`
- `DB_USERNAME`
- `DB_PASSWORD`
- `DB_NAME`
- `DB_SSL`

### E-mail

- `MAIL_ENABLED`
- `MAIL_HOST`
- `MAIL_PORT`
- `MAIL_USER`
- `MAIL_PASSWORD`
- `MAIL_DEFAULT_FROM`
- `MAIL_VERIFY_ON_STARTUP`
- `MAIL_QUEUE_ENABLED`
- `MAIL_QUEUE_POLL_INTERVAL_MS`
- `MAIL_QUEUE_BATCH_SIZE`
- `MAIL_QUEUE_CONCURRENCY`
- `MAIL_MAX_ATTEMPTS`
- `MAIL_RETRY_BASE_DELAY_MS`
- `MAIL_IDEMPOTENCY_TTL_SEC`
- `MAIL_TEMPLATE_CACHE_TTL_SEC`
- `MAIL_WEBHOOK_SECRET`

## Endpoints Operacionais

- `GET /api/health/live`
- `GET /api/health/ready`
- `GET /metrics`
- `GET /api/openapi.json`
- `GET /api/docs`

Exemplo de chamada autenticada:

```bash
curl -H "x-api-token: $API_TOKEN" http://localhost:3000/api/health/live
```

## Endpoints do Modulo de E-mail

- `GET /api/mail/audit`
- `GET /api/mail/audit/:id`
- `POST /api/mail/audit/:id/retry`
- `POST /api/mail/send`
- `POST /api/mail/send-template`
- `POST /api/mail/schedule`
- `POST /api/mail/suppression`
- `POST /api/mail/suppression/:email/remove`
- `GET /api/mail/suppression`
- `POST /api/mail/webhooks/delivery`
- `POST /api/mail/preview`

## Exemplos de Payload (E-mail)

### Envio direto

```bash
curl -X POST http://localhost:3000/api/mail/send \
	-H "content-type: application/json" \
	-H "x-api-token: $API_TOKEN" \
	-H "x-csrf-token: $CSRF_TOKEN" \
	-d '{
		"to": ["user@example.com"],
		"subject": "Bem-vindo",
		"text": "Sua conta foi criada com sucesso.",
		"idempotencyKey": "mail-welcome-user-123",
		"priority": "normal"
	}'
```

### Envio por template

```bash
curl -X POST http://localhost:3000/api/mail/send-template \
	-H "content-type: application/json" \
	-H "x-api-token: $API_TOKEN" \
	-H "x-csrf-token: $CSRF_TOKEN" \
	-d '{
		"to": ["user@example.com"],
		"subject": "Ativacao de conta",
		"template": "<h1>Ola, {{name}}</h1><p>Sua conta esta ativa.</p>",
		"context": {"name": "Giovani"},
		"priority": "high"
	}'
```

### Agendamento de envio

```bash
curl -X POST http://localhost:3000/api/mail/schedule \
	-H "content-type: application/json" \
	-H "x-api-token: $API_TOKEN" \
	-H "x-csrf-token: $CSRF_TOKEN" \
	-d '{
		"to": ["user@example.com"],
		"subject": "Comunicado agendado",
		"html": "<p>Mensagem para envio futuro.</p>",
		"scheduledFor": "2026-04-02T22:30:00.000Z"
	}'
```

### Adicionar destinatario na suppression list

```bash
curl -X POST http://localhost:3000/api/mail/suppression \
	-H "content-type: application/json" \
	-H "x-api-token: $API_TOKEN" \
	-H "x-csrf-token: $CSRF_TOKEN" \
	-d '{
		"email": "user@example.com",
		"reason": "User clicked unsubscribe",
		"source": "user"
	}'
```

### Webhook de entrega

```bash
curl -X POST http://localhost:3000/api/mail/webhooks/delivery \
	-H "content-type: application/json" \
	-H "x-mail-webhook-secret: $MAIL_WEBHOOK_SECRET" \
	-d '{
		"event": "delivered",
		"providerMessageId": "provider-msg-123"
	}'
```

## Exemplo de Uso do MailService

```ts
import { Injectable } from '@nestjs/common';
import { MailService } from './src/modules/mail/mail.service';

@Injectable()
export class ExampleNotifierService {
	constructor(private readonly mailService: MailService) {}

	async sendWelcomeEmail(email: string, name: string) {
		await this.mailService.sendTemplateAsync({
			to: email,
			subject: 'Bem-vindo ao PontoPrimeBackend',
			template: '<h1>Ola, {{name}}!</h1><p>Sua conta foi criada com sucesso.</p>',
			context: { name },
			correlationId: 'user-signup-flow',
			idempotencyKey: `welcome-${email}`,
			metadata: { canal: 'onboarding', feature: 'signup' },
			maxAttempts: 5,
			priority: 'high',
		});
	}
}
```

## Pipeline e Qualidade

O projeto possui base preparada para:

- build e lint automatizados
- execucao de testes
- auditoria de dependencias com `audit-ci`
- politicas de seguranca documentadas no repositorio

## Contribuicao

Consulte `CONTRIBUTING.md`.

## Seguranca

Consulte `SECURITY.md` e `SECURITY_UPGRADE_PLAN.md`.

# Architecture Guide

This document describes the current architecture, the rules to keep it healthy, and practical examples for creating new features in a scalable way.

## Goals

- Scale the codebase with predictable boundaries.
- Reduce coupling between business rules and framework adapters.
- Improve testability and change safety.
- Keep delivery speed high without sacrificing maintainability.

## Current Structure

```text
src/
	bootstrap/         # application composition and startup
	core/              # cross-module abstractions and policies
	shared/            # shared kernel (contracts, constants, exceptions, utils)
	modules/           # business modules
		<module>/
			application/   # use cases and orchestration
			domain/        # business entities, value objects, policies
			infrastructure/# providers, persistence, external adapters (module-local)
			presentation/  # controllers, DTOs, presenters/view models
	infrastructure/    # cross-module technical adapters (db, config, cache, etc.)
	interfaces/        # transport/entrypoint channels (http/events/workers/cli)
	tests/             # architecture-oriented test folders (unit/integration/contract/e2e)
```

## Responsibilities by Layer

### `domain`

- Contains pure business logic.
- Must not depend on NestJS, TypeORM, or transport details.
- Prefer value objects and explicit invariants.

### `application`

- Coordinates use cases and workflows.
- Depends on contracts/interfaces, not concrete adapters.
- Handles transaction-like orchestration decisions.

### `infrastructure`

- Implements contracts used by `application`.
- Contains integration with DB, cache, SMTP, queues, providers.
- Should be replaceable without changing business rules.

### `presentation`

- Maps input/output from transport to use case models.
- Validation and serialization live here.
- Should stay thin; no business decision logic.

## How to Add a New Feature

1. Create `src/modules/<feature>/application` use case service(s).
2. Model core rules in `src/modules/<feature>/domain`.
3. Add repository/provider adapter(s) in `src/modules/<feature>/infrastructure`.
4. Expose endpoint/handler in `src/modules/<feature>/presentation`.
5. Wire module dependencies in bootstrap/composition root.

## Example Concepts

### Example 1: New domain concept (`TimesheetPolicy`)

- Place in `src/modules/<feature>/domain/timesheet.policy.ts`.
- Keep it framework-free and deterministic.
- Test as pure unit (no Nest container).

### Example 2: New use case (`ApproveTimesheetUseCase`)

- Place in `src/modules/<feature>/application/approve-timesheet.use-case.ts`.
- Inject contracts like `TimesheetRepository` and `EventPublisher`.
- Cover orchestration rules with unit tests and mocks.

### Example 3: New API route (`POST /timesheets/:id/approve`)

- Controller in `src/modules/<feature>/presentation`.
- Validate DTO in presentation.
- Call the use case and map response DTO.

## Architecture Maintenance Rules

- New business logic must start in `domain` or `application`, not controller/provider.
- Avoid imports crossing module boundaries via implementation files.
- Share only stable primitives in `src/shared`.
- Keep `bootstrap` focused on composition, not business logic.
- If a file grows beyond one responsibility, split by use case/adapter.

## Benefits of This Model

- Lower regression risk through clear boundaries.
- Easier onboarding (where to put each concern is explicit).
- Better parallel work across teams/modules.
- Faster tests by isolating domain/application logic.
- Easier technology replacement (infra adapters are isolated).

## Anti-patterns to Avoid

- Fat controllers with business decisions.
- Domain classes depending on ORM decorators.
- Global utils replacing explicit contracts.
- Cross-module imports of concrete infrastructure services.

## Decision Checklist (Before Merge)

- Does this change add business rules? If yes, is it in `domain/application`?
- Does this change call external systems? If yes, is it in `infrastructure`?
- Does this change expose transport contract? If yes, is it in `presentation/interfaces`?
- Are tests placed at the right level (unit/integration/contract/e2e)?

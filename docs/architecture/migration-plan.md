# Migration Plan

## Current state (already done)

- Structural relocation to layered folders is complete.
- Bootstrap and main wrappers are in place for compatibility.
- Infrastructure config/database and module folders are established.

## Next target

Consolidate behavior by enforcing layer boundaries and reducing legacy coupling.

## Phase 1: Contract-first application layer

- Define module contracts (repositories/providers/publishers) in shared or module-level contracts.
- Refactor use cases to depend on contracts only.
- Keep Nest and TypeORM details outside `domain` and `application`.

## Phase 2: Domain purity

- Move business invariants/policies from services/controllers to `domain`.
- Introduce value objects for critical primitives.
- Ensure domain unit tests run without Nest container.

## Phase 3: Infrastructure hardening

- Make adapters explicit and swappable.
- Centralize resilience concerns (retry, timeout, circuit breaker style) in infra adapters.
- Keep persistence mappings/versioning encapsulated.

## Phase 4: Interface segregation

- Keep HTTP concerns in presentation/interfaces only.
- Isolate event/worker/cli handlers into `src/interfaces/*`.
- Avoid leaking transport DTOs into domain/application.

## Phase 5: Test architecture alignment

- Unit tests: domain + application rules.
- Integration tests: infrastructure adapter behavior.
- Contract tests: boundary compatibility between modules/adapters.
- E2E tests: critical business flows only.

## Definition of done per module

- Domain has no framework/ORM dependency.
- Application orchestrates use cases through contracts.
- Infrastructure contains concrete external IO concerns only.
- Presentation maps transport DTOs and responses only.
- Tests cover unit + integration paths for each critical use case.

# Architecture Blueprint

This project now includes a scalable folder scaffold without changing existing source files.

## Principles

- Keep current runtime stable.
- Evolve by migration, not rewrite.
- Isolate business rules from framework details.
- Separate contracts, infrastructure, and interfaces.

## Top-level structure

- `src/bootstrap`: app startup and composition root.
- `src/core`: cross-cutting business abstractions.
- `src/shared`: shared kernel, utilities, contracts, constants, exceptions.
- `src/modules`: business modules with layered boundaries.
- `src/infrastructure`: adapters (database, cache, security, monitoring, messaging, mail).
- `src/interfaces`: delivery mechanisms (http, events, workers, cli).
- `src/tests`: unit, integration, contract, and e2e support.

## Module shape

Each module follows:

- `application`: use cases and orchestration.
- `domain`: entities/value objects/policies/domain services.
- `infrastructure`: persistence/provider adapters.
- `presentation`: controllers/dto/view models.

## Migration approach

1. Keep all existing files working in-place.
2. Move one feature at a time to `src/modules/<feature>`.
3. Keep backward-compatible exports during transition.
4. Move shared helpers to `src/shared` only when reused by 2+ modules.
5. Keep infra implementations in `src/infrastructure` and depend on contracts from `application/domain`.

## Governance

- New features should start in `src/modules`.
- Existing directories can be migrated gradually.
- Prefer one architectural PR per module to reduce risk.

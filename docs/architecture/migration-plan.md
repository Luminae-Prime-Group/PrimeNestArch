# Migration Plan (Non-breaking)

## Current state

The current implementation remains valid and untouched.

## Target state

Converge to layered modules under `src/modules` and dedicated adapters under `src/infrastructure`.

## Phase 1: New code policy

- Add only new use cases to `src/modules/<module>/application`.
- Keep controllers in module `presentation`.
- Keep external provider code in `infrastructure`.

## Phase 2: Incremental extraction

- Extract mail domain logic to `src/modules/mail/domain`.
- Keep current mail APIs operational while introducing facades.
- Move shared DTO validation utilities into `src/shared`.

## Phase 3: Interface segregation

- Introduce explicit contracts in `src/shared/contracts`.
- Depend on contracts from application/domain; wire adapters in bootstrap.

## Phase 4: Test stratification

- Unit tests near module layers.
- Integration tests under `src/tests/integration`.
- Contract tests under `src/tests/contract`.

## Definition of done per migrated module

- No direct framework dependency in `domain`.
- `application` coordinates use cases through contracts.
- `infrastructure` contains all external IO details.
- `presentation` maps transport details to use cases.

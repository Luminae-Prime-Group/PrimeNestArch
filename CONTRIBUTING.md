# Contributing

Thank you for contributing.

## Development Flow

1. Fork and create a branch from `main`.
2. Keep commits atomic and use Conventional Commits.
3. Run checks before opening a PR:

```bash
npm run lint:check
npm run build
npm test
```

4. If your change touches persistence, include migration files.
5. Open a PR with context, risk analysis, and test evidence.

## Code Standards

- TypeScript strictness and explicit types when needed
- No hardcoded secrets
- Validate all environment variables
- Prefer secure defaults

## Architecture Rules

- Keep business logic in `src/modules/<module>/domain` and `src/modules/<module>/application`.
- Keep controllers/DTOs in `presentation`.
- Keep external adapters in `infrastructure`.
- Avoid importing concrete infrastructure classes directly into domain/application.
- Promote shared code to `src/shared` only when reused by more than one module.

## Where to Create New Files

- New use case: `src/modules/<module>/application`.
- New domain policy/entity/value object: `src/modules/<module>/domain`.
- New DB/provider adapter: `src/modules/<module>/infrastructure` or `src/infrastructure`.
- New HTTP endpoint/DTO: `src/modules/<module>/presentation`.
- New cross-module contract: `src/shared/contracts`.

## Pull Request Checklist

- Explain why the chosen layer is correct for each new file.
- Include unit/integration/e2e evidence for affected behavior.
- If architecture boundaries changed, update `docs/architecture/README.md`.

## Commit Convention

Examples:

- `feat(auth): add refresh token rotation`
- `fix(database): handle transaction rollback`
- `chore(ci): add npm audit step`

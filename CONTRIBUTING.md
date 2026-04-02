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

## Commit Convention

Examples:

- `feat(auth): add refresh token rotation`
- `fix(database): handle transaction rollback`
- `chore(ci): add npm audit step`

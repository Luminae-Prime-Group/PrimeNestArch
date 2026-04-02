# Security Policy

## Supported Versions

Only the latest `main` branch is actively supported.

## Reporting a Vulnerability

Please do not open public issues for security vulnerabilities.

Send a private report with:

- Description and impact
- Reproduction steps
- Affected versions/commit hash
- Suggested fix (optional)

Contact channel: open a private GitHub Security Advisory in this repository (Security tab).

We will acknowledge receipt within 72 hours and provide an initial triage timeline.

## Security Requirements

- No secrets in source control
- Keep dependencies up to date
- Use HTTPS in production
- Keep DB TLS validation enabled (`DB_SSL_REJECT_UNAUTHORIZED=true`)

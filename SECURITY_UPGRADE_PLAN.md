# Security Upgrade Plan

This file tracks dependency security posture and remediation policy.

## Current status

- No high or critical advisories are allowlisted.
- CI fails on any new high/critical advisory.

## Plan

1. Evaluate latest compatible Nest 11 patch releases monthly.
2. Upgrade the Nest dependency chain as soon as patched transitive versions are available.
3. Keep `audit-ci.jsonc` free of allowlists whenever possible.
4. Keep CI failing for any new high/critical vulnerability.

## Ownership

- Security owner: maintainers
- Review cadence: monthly, and immediately after `npm audit` changes

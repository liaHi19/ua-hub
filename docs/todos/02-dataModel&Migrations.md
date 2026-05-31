# Prisma + Neon PostgreSQL Setup

## Overview

The full Phase-1 Prisma schema (incl. auth, contact, lifecycle, notifications, account-deletion, contact messages) is migrated to Neon with invariants documented.

## Requirements

- Use Neon PostgreSQL (serverless)
- Create initial schema based on data models in `@standards/database-schema` (this will evolve)
- Include Auth models
- Add appropriate indexes and cascade deletes

- **Keep:** `endsAt?`, `region` non-null, `cancelledAt` + `cancellationNote`, `@@unique([postcode, nameNormalized])`, `@@index([startsAt, status])`.
- Store datetimes UTC; first migration via `prisma migrate dev`.

## References

- Initial data models: `@standards/database-schema`
- Database standards: `@standards/coding-standards.md`
- Prisma docs: https://prisma.io/docs (Prisma 7 has breaking changes - fetch latest)

## Notes

We will have a development branch that we work on that will be in DATABASE_URL and then we will have a production branch. So we ALWAYS create migrations and never push directly unless specified.

IMPORTANT! Use Prisma 7, which has some breaking changes. Read the entire upgrade guide at https://www.prisma.io/docs/orm/more/upgrade-guides/upgrading-versions/upgrading-to-prisma-7 to get a good idea of the changes.

You can also look at the setup guide here - https://www.prisma.io/docs/getting-started/prisma-orm/quickstart/prisma-postgres

## 9. Acceptance — all must pass

- [ ] Migration applies to Neon.
- [ ] Prisma client generates.
- [ ] Invariants written down.
- [ ] Schema review passes.

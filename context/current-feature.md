# Current Feature

## Prisma + Neon PostgreSQL — Data Model & Migrations

Stand up the full Phase-1 Prisma schema (auth, contact, lifecycle, notifications,
account-deletion, contact messages) and migrate it to Neon, with invariants documented.

## Status

### Done

- Prisma 7 + Neon adapter installed; `prisma.config.ts` (datasource URL moved out of
  schema per Prisma 7), loads `.env.local`, prefers direct URL for migrations.
- Full Phase-1 `prisma/schema.prisma` from `@standards/database-schema`, with `onDelete`
  rules (Restrict on `Event.createdBy`; SetNull on venue/org/event; Cascade on
  `Notification.user`).
- Prisma client singleton at `src/lib/prisma.ts` via the Neon driver adapter; generated
  client in `src/generated/prisma` (gitignored, `postinstall` + build regenerate it).
- Initial migration `20260602054113_init` created and applied to the Neon dev branch.
- Invariants documented in `docs/data-model-invariants.md`.
- `pnpm` scripts: `db:generate`, `db:migrate`, `db:migrate:deploy`, `db:migrate:status`,
  `db:studio`. Typecheck + lint clean.

### Remaining (owner — needs credentials)

- Optional: add a direct/unpooled `DIRECT_URL` to `.env.local` (+ `.env.example`) so future
  migrations avoid the Neon pooler. Initial migration was applied over the pooler without issue.
- Run `prisma migrate deploy` against the production Neon branch at deploy time.

## Goals

- Use Neon PostgreSQL (serverless), accessed via `@prisma/adapter-neon`.
- Create the initial schema from the data models in `@standards/database-schema` (will evolve).
- Include Auth models.
- Add appropriate indexes and cascade deletes.
- **Keep:** `endsAt?`, `region` non-null, `cancelledAt` + `cancellationNote`,
  `@@unique([postcode, nameNormalized])`, `@@index([startsAt, status])`.
- Store all datetimes in UTC.
- First migration via `prisma migrate dev`.

## Acceptance — all must pass

- [x] Migration applies to Neon.
- [x] Prisma client generates.
- [x] Invariants written down. (`docs/data-model-invariants.md`)
- [x] Schema review passes. (`prisma validate`; typecheck + lint clean)

## Notes

- **Migrations only.** A `dev` Neon branch is in `DATABASE_URL`; production is a separate
  branch. ALWAYS create migrations, never `db push` / push directly unless specified.
- **Prisma 7** has breaking changes — follow the upgrade guide
  (https://www.prisma.io/docs/orm/more/upgrade-guides/upgrading-versions/upgrading-to-prisma-7)
  and setup guide
  (https://www.prisma.io/docs/getting-started/prisma-orm/quickstart/prisma-postgres).
- `package.json` is `"type": "module"` (required by Prisma 7's ESM-only client).
- Per coding standards: use `prisma migrate dev` (not `db push`); run `prisma migrate status`
  before committing; production runs `prisma migrate deploy` before app start.

## References

- Initial data models: `@standards/database-schema`
- Database standards: `@standards/coding-standards.md`
- Source todo: `@docs/todos/02-dataModel&Migrations.md`

## History

| Session | Focus                  | Key deliverables                                                                                                                                                                               |
| ------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1       | Scaffold, i18n & Fonts | next-intl `/en`+`/uk` routing via `proxy.ts`; self-hosted Noto Serif (Cyrillic verified) + Inter; Tailwind v4 + shadcn/ui; `.env.example`. Code complete; deploy + provisioning pending owner. |
| 2       | Data Model & Migrations | Prisma 7 + Neon schema; `prisma.config.ts` (datasource moved out of schema); client singleton via Neon adapter; initial migration `init` applied to Neon dev; invariants documented. Typecheck + lint clean. |

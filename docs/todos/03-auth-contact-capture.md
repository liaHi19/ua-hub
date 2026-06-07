# Session 3 — Authentication (Email + Password) + Contact Capture — Overview

Source: [docs/prd/main.md](../prd/main.md) §"Session 3". **Depends on:** 1 (scaffold + i18n), 2 (Prisma schema — `User`, `EmailVerificationToken`, `PasswordResetToken` already migrated).

Session 3 is large, so it's split into **three dependency-ordered sub-todos**. Build them in order; each is independently testable.

| #   | Sub-todo                                                                   | Delivers                                                                                                       | Depends on |
| --- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ---------- |
| 03a | [Auth Foundation & Session](03a-auth-foundation.md)                        | Auth.js v5 spike, deps/env, split edge/Node config, JWT + role, server-side guards, first-admin bootstrap      | 1, 2       |
| 03b | [Registration, Sign-in & Contact Capture](03b-registration-signin.md)      | `/auth/register` (+ admin-only contact capture), localized `/auth/signin`, register→sign-in e2e, no enumeration | 03a        |
| 03c | [Email Verification & Password Reset (deferred)](03c-verification-reset.md) | verify + forgot/reset token flows, gated off behind `AUTH_EMAIL_ENABLED`                                       | 03a, 03b   |

**Goal (session-level):** A user registers (capturing admin-only contact data) and signs in with email + password (JWT session); the `USER`/`ADMIN` role is assignable and the first admin is bootstrapped; verification + reset flows are **built but their email sending/enforcement is gated off** until the domain is live (Session 13).

**Decisions (confirmed with owner):**

- **Auth engine:** Auth.js v5 (`next-auth@beta`), **spike compatibility first** with a `jose` fallback (03a §1).
- **Auth routing:** pages **localized** under `src/app/[locale]/auth/*` (03b).
- **Code layout:** domain logic in **`src/features/auth` + `src/features/users`** per [architecture.md](../../.claude/standards/architecture.md) — the first `features/` module in the tree (Session 1 used `src/actions`; note the divergence so later sessions stay consistent).

## Session-level acceptance (the PRD's six — spread across the sub-todos)

- [ ] Register → password sign-in works end-to-end. *(03b)*
- [ ] Passwords hashed (never plaintext); JWT session persists. *(03a engine + 03b)*
- [ ] Protected route rejects anonymous. *(03a)*
- [ ] Sign-in / register / forgot responses don't reveal whether an email exists. *(03b register/signin + 03c forgot)*
- [ ] Verification + reset exist behind the deferral flag. *(03c)*
- [ ] Registration blocks without name + surname + ≥1 contact channel. *(03b)*

## Workflow (per [.claude/standards/ai-intergration.md](../../.claude/standards/ai-intergration.md))

- Update [context/current-feature.md](../../context/current-feature.md) before coding; branch per sub-todo (or one `feature/session-3-auth` branch — your call).
- `pnpm typecheck` + `pnpm lint` + `pnpm build` green before any commit; ask before committing; conventional commits; **no AI attribution** ([CLAUDE.md](../../CLAUDE.md)).
- Mark each sub-todo done + add a History row in `current-feature.md`.

## Global gotchas (apply across 03a–03c)

- **Auth.js v5 maturity on Next 16 / React 19** — the 03a §1 spike is non-optional; keep the `jose` fallback ready.
- **Edge vs Node** — `bcryptjs` + Prisma are Node-only; keep them in `auth.ts`, never in `auth.config.ts` or [proxy.ts](../../src/proxy.ts). **Do not add auth to `proxy.ts`** (it stays next-intl-only).
- **`messengerUrl` validation** — `lib/clean-url.ts` is formally a **Session 6** deliverable; add a minimal `https://`-only check now. `messengerUrl` is `https://` only, not `http://`.
- **ESM** — project is ESM per [CLAUDE.md](../../CLAUDE.md); use ESM + `tsx` for any scripts. (Confirm `package.json` `"type": "module"` is present before adding scripts.)
- **`features/` is new** — co-locate server actions in the feature module; keep the convention consistent.
- **`git push` / `WebFetch`** require approval ([.claude/settings.json](../../.claude/settings.json)).

## Out of scope for all of Session 3

Profile / account-delete / admin-delete-user / `/contact` → Session 9; org + admin CRUD → Session 5; submit form + uploads + `lib/clean-url.ts` → Session 6; notification fan-out → Session 8; **actual email send + verification enforcement → Session 13**.

# Current Feature: Session 3c — Email Verification & Password Reset (Deferred)

## Status

In Progress

## Goals

- Verification + password-reset flows are fully **built** and run end-to-end in dev.
- All external email sending sits behind `AUTH_EMAIL_ENABLED` (off) — **no external mail sent** pre-domain (domain goes live in Session 13).
- `PasswordResetToken`: random token, **stored hashed at rest**, short expiry (~1h), **single-use** (deleted on consume); reset re-hashes with `bcryptjs`.
- `EmailVerificationToken`: sets `User.emailVerified` on confirm; longer expiry (~24h), single-use.
- `forgot-password` is **non-enumerating** — same generic "if an account exists, a reset link was sent" regardless of whether the email exists.
- Sign-in is **not** blocked on an unverified email (enforcement deferred to Session 13).
- Pages localized under `[locale]`; `/uk` vs `/en` chrome verified.

## Notes

Source: [docs/todos/03c-verification-reset.md](../docs/todos/03c-verification-reset.md); parent [Session 3 overview](../docs/todos/03-auth-contact-capture.md). **Depends on:** [03a](../docs/todos/03a-auth-foundation.md) (engine), [03b](../docs/todos/03b-registration-signin.md) (users exist to verify / reset) — both merged.

**Password login stays the working path.** This session builds verify + reset but keeps them dormant behind the deferral gate.

### 0. Workflow wrapper

- Branch `feature/session-3c-verify-reset`; update [context/current-feature.md](../context/current-feature.md); `pnpm typecheck` / `lint` / `build` green before commit; no AI attribution.

### 1. Password reset — `/auth/forgot-password` + `/auth/reset-password`

- Issue/consume `PasswordResetToken`: random token, **store hashed at rest**, short expiry (~1h), **single-use** (delete on consume); reset re-hashes the password with `bcryptjs`.
- `forgot-password` always returns the same generic "if an account exists, a reset link was sent" message — regardless of whether the email exists (no enumeration).

### 2. Email verification — `/auth/verify`

- Issue/consume `EmailVerificationToken`: set `User.emailVerified` on confirm; longer expiry (~24h), single-use.

### 3. Deferral gate

- Wrap the **send step** in `AUTH_EMAIL_ENABLED` (off → no external mail; dev: log the link / no-op). Reuse this exact gate in Sessions 8 & 13.
- **No enforcement yet** — do **not** block unverified users from signing in. Never silently mark all emails verified in production.

### 4. i18n

- Add EN/UK keys for the verify / forgot-password / reset-password pages + messages to [messages/en.json](../messages/en.json) + `uk.json`; verify `/uk` vs `/en`.

### Out of scope

- Actual email send + verification enforcement → Session 13 (flip `AUTH_EMAIL_ENABLED` on with the verified-domain sender).

## Decisions

- **`(auth)` route group, no `/auth/` segment.** Pages live at `src/app/[locale]/(auth)/{forgot-password,reset-password,verify}` → `/{locale}/forgot-password` etc., matching 03b's URL-invisible group (the spec's `/auth/...` paths were pre-03b).
- **Tokens hashed at rest with SHA-256, not bcrypt.** [src/lib/tokens.ts](../src/lib/tokens.ts): a 32-byte random value is the raw token (in the emailed link); only its SHA-256 digest is stored in `{Email,Password}…Token.token` (`@unique`). SHA-256 is deterministic (so we can look the record up on consume) and fine for high-entropy values; bcrypt stays reserved for low-entropy passwords. Reset TTL ~1h, verify TTL ~24h.
- **Single-use, atomic consume.** Reset and verify each `$transaction([update, delete])` so the token is destroyed as the password/`emailVerified` is written. Expired tokens are also deleted on lookup.
- **Deferral gate in [src/lib/email.ts](../src/lib/email.ts).** `sendEmail` no-ops (dev: logs the link) when `AUTH_EMAIL_ENABLED !== "true"`; when on, it throws (no provider until Session 13) rather than silently dropping prod mail. Single switch reused by Sessions 8 & 13.
- **Verification is a confirm-button POST, not a bare GET.** The project's own architecture lists Telegram/WhatsApp/Signal link-preview crawlers as clients; a GET-consumes-token `/verify` would let a prefetch burn the single-use token. The page renders a form; the token is only consumed on human submit (`verifyEmailAction`).
- **Verification issued at registration**, best-effort + non-blocking (wrapped in try/catch around `issueEmailVerification`), behind the gate — never breaks register, never enforced at sign-in.
- **Non-enumerating `forgot-password`.** `forgotPasswordAction` always returns generic `{ success: true }`; work happens only for a real non-deleted user and all failures are swallowed.
- **Shared password rule** extracted to `passwordField` in [schemas.ts](../src/features/users/schemas.ts), reused by register + reset.

## Owner steps (need credentials / local env — not done in code)

- **Add `AUTH_EMAIL_ENABLED` to `.env.example` and keep it unset/`false`** until Session 13. (Env files are permission-blocked from edits here.) Optional: `AUTH_URL` / `NEXTAUTH_URL` is used to build absolute links in emails; defaults to `http://localhost:3000` in dev.
- No DB migration needed — `EmailVerificationToken` / `PasswordResetToken` tables already exist (Session 2).

### Gotchas

- The deferral flag must not leak mail pre-domain; it's the single switch Sessions 8/13 flip on.
- Pages are localized under `[locale]` — same Auth.js `pages` ↔ next-intl interplay as [03b](../docs/todos/03b-registration-signin.md).
- Note the URL question: 03b moved auth pages into a URL-invisible `(auth)` group (`/{locale}/signin`, no `/auth/` segment). The 03c spec lists `/auth/forgot-password`, `/auth/reset-password`, `/auth/verify` — decide at start whether to keep them inside `(auth)` (→ `/{locale}/forgot-password` …) for consistency with 03b.

## Acceptance — all must pass

_Code-complete; typecheck + lint + build green. Runtime e2e (dev) pending owner, same as 03b._

- [x] Verification + reset flows exist and run behind `AUTH_EMAIL_ENABLED` with **no external mail sent** pre-domain.
- [x] `forgot-password` response is non-enumerating.
- [x] Sign-in is **not** blocked on an unverified email (enforcement deferred to Session 13).
- [x] `PasswordResetToken` stored hashed, short expiry, single-use; reset re-hashes password.
- [x] `EmailVerificationToken` sets `User.emailVerified`, longer expiry, single-use.
- [x] `/uk` vs `/en` chrome renders correctly for verify / forgot-password / reset-password.

## References

- [docs/todos/03c-verification-reset.md](../docs/todos/03c-verification-reset.md)
- [docs/prd/main.md](../docs/prd/main.md) §"Session 3"
- [docs/data-model-invariants.md](../docs/data-model-invariants.md)

## History

| Session | Focus                   | Key deliverables                                                                                                                                                                                             |
| ------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1       | Scaffold, i18n & Fonts  | next-intl `/en`+`/uk` routing via `proxy.ts`; self-hosted Noto Serif (Cyrillic verified) + Inter; Tailwind v4 + shadcn/ui; `.env.example`. Code complete; deploy + provisioning pending owner.               |
| 2       | Data Model & Migrations | Prisma 7 + Neon schema; `prisma.config.ts` (datasource moved out of schema); client singleton via Neon adapter; initial migration `init` applied to Neon dev; invariants documented. Typecheck + lint clean. |
| 3a      | Auth Foundation         | Auth.js v5 JWT credentials foundation, guards & first-admin bootstrap (merged via PR #1).                                                                                                                    |
| 3b      | Registration, Sign-in & Contact Capture | Zod schemas (i18n-keyed) + server actions (`registerAction`/`signInAction`): bcrypt hash, non-enumerating responses, ≥1-contact-channel + `https://`-messenger rules, open-redirect-guarded `callbackUrl`. Localized `(auth)` route group → `/{locale}/signin` + `/register` (no `/auth/` segment); `EN`/`UK` `Auth` message catalogs; shadcn `Input`/`Label`. Typecheck + lint + build green; runtime register→sign-in e2e pending. |

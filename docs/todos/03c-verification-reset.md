# Session 3c — Email Verification & Password Reset (Deferred) — TODO

Source: [docs/prd/main.md](../prd/main.md) §"Session 3"; parent [Session 3 overview](03-auth-contact-capture.md). **Depends on:** [03a](03a-auth-foundation.md) (engine), [03b](03b-registration-signin.md) (users exist to verify / reset).

**Goal:** Verification + password-reset flows are fully **built**, but their email sending and enforcement sit behind `AUTH_EMAIL_ENABLED` (off) until the domain is live (Session 13). Password login stays the working path.

**Definition of done = every box in [§5 Acceptance](#5-acceptance).**

## 0. Workflow wrapper

- [ ] Branch `feature/session-3c-verify-reset`; update [context/current-feature.md](../../context/current-feature.md); `pnpm typecheck`/`lint`/`build` green before commit; no AI attribution.

## 1. Password reset — `/auth/forgot-password` + `/auth/reset-password`

- [ ] Issue/consume `PasswordResetToken`: random token, **store hashed at rest**, short expiry (~1h), **single-use** (delete on consume); reset re-hashes the password with `bcryptjs`.
- [ ] `forgot-password` always returns the same generic "if an account exists, a reset link was sent" message — regardless of whether the email exists (no enumeration).

## 2. Email verification — `/auth/verify`

- [ ] Issue/consume `EmailVerificationToken`: set `User.emailVerified` on confirm; longer expiry (~24h), single-use.

## 3. Deferral gate

- [ ] Wrap the **send step** in `AUTH_EMAIL_ENABLED` (off → no external mail; dev: log the link / no-op). Reuse this exact gate in Sessions 8 & 13.
- [ ] **No enforcement yet** — do **not** block unverified users from signing in. Never silently mark all emails verified in production.

## 4. i18n

- [ ] Add EN/UK keys for the verify / forgot-password / reset-password pages + messages to [messages/en.json](../../messages/en.json) + `uk.json`; verify `/uk` vs `/en`.

## 5. Acceptance

- [ ] Verification + reset flows exist and run behind `AUTH_EMAIL_ENABLED` with **no external mail sent** pre-domain.
- [ ] `forgot-password` response is non-enumerating.
- [ ] Sign-in is **not** blocked on an unverified email (enforcement deferred to Session 13).

## Out of scope

- Actual email send + verification enforcement → Session 13 (flip `AUTH_EMAIL_ENABLED` on with the verified-domain sender).

## Gotchas

- The deferral flag must not leak mail pre-domain; it's the single switch Sessions 8/13 flip on.
- Pages are localized under `[locale]` — same Auth.js `pages` ↔ next-intl interplay as [03b](03b-registration-signin.md).

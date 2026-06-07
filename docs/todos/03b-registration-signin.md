# Session 3b — Registration, Sign-in & Contact Capture — TODO

Source: [docs/prd/main.md](../prd/main.md) §"Session 3"; parent [Session 3 overview](03-auth-contact-capture.md). **Depends on:** [03a](03a-auth-foundation.md) (engine, guards, session).

**Goal:** The credentials loop — a user registers (capturing admin-only contact data) and signs in via localized pages; register → sign-in works end-to-end; responses don't leak whether an email exists.

**Definition of done = every box in [§4 Acceptance](#4-acceptance).**

## 0. Workflow wrapper

- [ ] Branch `feature/session-3b-register-signin`; update [context/current-feature.md](../../context/current-feature.md); `pnpm typecheck`/`lint`/`build` green before commit; no AI attribution.

## 1. Registration + contact capture — `/register`

- [ ] Zod schema (`src/features/users/`): `email` (format), `password` (min length + basic strength), `firstName` **required**, `lastName` **required**, `phone?`, `messengerUrl?`; refine enforcing **≥1 of `{phone, messengerUrl}`** and `messengerUrl` **`https://` only**.
- [ ] Server action: hash the password (`bcryptjs`), create `User` (`role: USER`, `emailVerified: null`), return the `{ success, data, error }` shape (coding standard).
- [ ] **Non-enumerating response** — never reveal whether an email already exists (generic copy + field-level errors; see Gotchas for the pre-email caveat).
- [ ] On success: establish the session (`signIn("credentials", …)`) or redirect to `/signin`.
- [ ] Contact data (`firstName` / `lastName` / `phone` / `messengerUrl`) is **admin-only — never rendered publicly** ([data-model-invariants.md](../data-model-invariants.md)); add a UI note "for admin verification, not shown publicly".

## 2. Sign-in — `/signin`

- [ ] Credentials form → `signIn`; on failure show a **generic "invalid email or password"** (no enumeration); on success redirect to `callbackUrl` or `/`.
- [ ] **CSRF:** Auth.js covers its own POST routes; Next.js Server Actions are origin-checked by the framework; no bearer / `Authorization` path is implemented (cookie JWT only).

## 3. Localized pages + i18n

- [ ] Pages in the `(auth)` route group at `src/app/[locale]/(auth)/{signin,register}` → `/en/signin`, `/uk/register` (group folder is URL-invisible — **no `/auth/` segment**); forms in `src/components/auth/`.
- [ ] Auth.js `pages: { signIn: "/signin" }`; keep post-auth redirects locale-aware (preserve the active `/en`|`/uk` prefix via the [i18n navigation helpers](../../src/i18n/navigation.ts)).
- [ ] Add EN/UK keys for auth chrome + validation/error messages to [messages/en.json](../../messages/en.json) + `uk.json` (UK assistant-drafted now; native review Week 3). Verify `/uk/signin` Ukrainian, `/en` English.

## 4. Acceptance

- [ ] Register → password sign-in works end-to-end.
- [ ] Passwords hashed (never plaintext); the JWT session persists across requests.
- [ ] Registration blocked without first name + surname + ≥1 contact channel (phone or `https://` messenger URL).
- [ ] Register / sign-in responses don't reveal whether an email exists.
- [ ] `/uk/{signin,register}` renders Ukrainian chrome; `/en/{signin,register}` English.

## Out of scope

- Verification / reset token flows → [03c](03c-verification-reset.md). Profile edit / account delete → Session 9.

## Gotchas

- `messengerUrl` is `https://`-only; `lib/clean-url.ts` is a **Session 6** deliverable → add a minimal check now (Zod refine or a tiny `lib/validate-url.ts`).
- Fully masking "email already exists" depends on the verify email (Session 13); pre-domain keep generic copy + note the limitation.
- Locale-prefixed auth pages must agree with the Auth.js `pages` config + the next-intl proxy (`proxy.ts`) — test `/uk/signin` explicitly.

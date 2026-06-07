# Current Feature: Session 3b — Registration, Sign-in & Contact Capture

## Status

In Progress

## Goals

- The credentials loop: a user registers (capturing admin-only contact data) and signs in via localized pages; register → sign-in works end-to-end.
- Responses never leak whether an email already exists (non-enumerating).
- Passwords hashed (never plaintext); JWT session persists across requests.
- Registration blocked without first name + surname + ≥1 contact channel (phone or `https://` messenger URL).
- `/uk/{signin,register}` renders Ukrainian chrome; `/en/{signin,register}` renders English.

## Notes

Source: [docs/todos/03b-registration-signin.md](../docs/todos/03b-registration-signin.md); parent [Session 3 overview](../docs/todos/03-auth-contact-capture.md). **Depends on:** 03a (auth foundation — engine, guards, session), already merged.

### 1. Registration + contact capture — `/register`

- Zod schema (`src/features/users/`): `email` (format), `password` (min length + basic strength), `firstName` **required**, `lastName` **required**, `phone?`, `messengerUrl?`; refine enforcing **≥1 of `{phone, messengerUrl}`** and `messengerUrl` **`https://` only**.
- Server action: hash password (`bcryptjs`), create `User` (`role: USER`, `emailVerified: null`), return `{ success, data, error }` shape (coding standard).
- **Non-enumerating response** — never reveal whether an email already exists.
- On success: establish session (`signIn("credentials", …)`) or redirect to `/signin`.
- Contact data (`firstName`/`lastName`/`phone`/`messengerUrl`) is **admin-only — never rendered publicly**; add UI note "for admin verification, not shown publicly".

### 2. Sign-in — `/signin`

- Credentials form → `signIn`; on failure show **generic "invalid email or password"**; on success redirect to `callbackUrl` or `/`.
- CSRF: Auth.js covers its own POST routes; Server Actions are origin-checked by the framework; cookie JWT only (no bearer path).

### 3. Localized pages + i18n

- Pages in the `(auth)` route group at `src/app/[locale]/(auth)/{signin,register}` → `/en/signin`, `/uk/register` (group folder is URL-invisible, so **no `/auth/` segment**); forms in `src/components/auth/`.
- Auth.js `pages: { signIn: "/signin" }`; keep post-auth redirects locale-aware via i18n navigation helpers.
- Add EN/UK keys for auth chrome + validation/error messages to `messages/en.json` + `uk.json`.

### Out of scope

- Verification / reset token flows → 03c. Profile edit / account delete → Session 9.

### Gotchas

- `messengerUrl` is `https://`-only; `lib/clean-url.ts` is a Session 6 deliverable → add a minimal check now (Zod refine or tiny `lib/validate-url.ts`).
- Fully masking "email already exists" depends on verify email (Session 13); pre-domain keep generic copy + note the limitation.
- Locale-prefixed auth pages must agree with Auth.js `pages` config + the next-intl proxy (`proxy.ts`) — test `/uk/signin` explicitly.

## Decisions

- **Zod messages as i18n keys.** Schemas in [src/features/users/schemas.ts](../src/features/users/schemas.ts) emit stable keys (e.g. `passwordWeak`); server actions translate them via `getTranslations("Auth.errors")` so EN/UK validation copy lives in the catalogs, not in code.
- **Session established on register.** `registerAction` calls `signIn("credentials", { redirectTo: "/${locale}" })` after `user.create`, so register → signed-in is one step (satisfies the end-to-end goal). On `AuthError` it falls back to a generic message.
- **Non-enumeration.** Any `user.create` failure (incl. P2002 email collision) returns one generic `registrationFailed` message; sign-in failures return one generic `invalidCredentials`. Full duplicate-masking deferred to Session 13 (email verify) — noted in code.
- **`https://`-only messenger check** via minimal [src/lib/validate-url.ts](../src/lib/validate-url.ts) (`isHttpsUrl`); full `lib/clean-url.ts` remains a Session 6 deliverable.
- **Open-redirect guard.** `signInAction` only honors path-relative same-origin `callbackUrl`s (must start with `/`, not `//`); otherwise defaults to `/${locale}`.
- **`(auth)` route group.** Pages live in a URL-invisible `(auth)` group with a shared layout, so URLs are `/{locale}/signin` and `/{locale}/register` (no `/auth/` segment). Auth.js `pages.signIn` and `guards.ts` redirect targets updated from `/auth/signin` → `/signin` to match.
- **Password strength:** min 8 chars + at least one letter and one digit (basic; richer policy out of scope).
- Added shadcn-style [Input](../src/components/ui/input.tsx) + [Label](../src/components/ui/label.tsx) primitives to match the existing `button.tsx` convention.

### Files

- Schemas: [src/features/users/schemas.ts](../src/features/users/schemas.ts)
- Server actions: [src/actions/auth.ts](../src/actions/auth.ts)
- Forms: [src/components/auth/RegisterForm.tsx](../src/components/auth/RegisterForm.tsx), [SignInForm.tsx](../src/components/auth/SignInForm.tsx)
- Pages: [src/app/[locale]/(auth)/register/page.tsx](<../src/app/[locale]/(auth)/register/page.tsx>), [signin/page.tsx](<../src/app/[locale]/(auth)/signin/page.tsx>), shared [layout.tsx](<../src/app/[locale]/(auth)/layout.tsx>)
- i18n keys: `Auth` namespace in [messages/en.json](../messages/en.json) + [messages/uk.json](../messages/uk.json)

## First-admin bootstrap

## Owner steps (need credentials — not done in code)

## Acceptance — all must pass

- [ ] Register → password sign-in works end-to-end.
- [ ] Passwords hashed (never plaintext); the JWT session persists across requests.
- [ ] Registration blocked without first name + surname + ≥1 contact channel (phone or `https://` messenger URL).
- [ ] Register / sign-in responses don't reveal whether an email exists.
- [ ] `/uk/{signin,register}` renders Ukrainian chrome; `/en/{signin,register}` English.

## References

- [docs/todos/03b-registration-signin.md](../docs/todos/03b-registration-signin.md)
- [docs/prd/main.md](../docs/prd/main.md) §"Session 3"
- [docs/data-model-invariants.md](../docs/data-model-invariants.md)

## History

| Session | Focus                   | Key deliverables                                                                                                                                                                                             |
| ------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1       | Scaffold, i18n & Fonts  | next-intl `/en`+`/uk` routing via `proxy.ts`; self-hosted Noto Serif (Cyrillic verified) + Inter; Tailwind v4 + shadcn/ui; `.env.example`. Code complete; deploy + provisioning pending owner.               |
| 2       | Data Model & Migrations | Prisma 7 + Neon schema; `prisma.config.ts` (datasource moved out of schema); client singleton via Neon adapter; initial migration `init` applied to Neon dev; invariants documented. Typecheck + lint clean. |
| 3a      | Auth Foundation         | Auth.js v5 JWT credentials foundation, guards & first-admin bootstrap (merged via PR #1).                                                                                                                    |
| 3b      | Registration, Sign-in & Contact Capture | Zod schemas (i18n-keyed) + server actions (`registerAction`/`signInAction`): bcrypt hash, non-enumerating responses, ≥1-contact-channel + `https://`-messenger rules, open-redirect-guarded `callbackUrl`. Localized `(auth)` route group → `/{locale}/signin` + `/register` (no `/auth/` segment); `EN`/`UK` `Auth` message catalogs; shadcn `Input`/`Label`. Typecheck + lint + build green; runtime register→sign-in e2e pending. |

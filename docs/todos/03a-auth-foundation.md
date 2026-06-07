# Session 3a — Auth Foundation & Session — TODO

Source: [docs/prd/main.md](../prd/main.md) §"Session 3"; parent [Session 3 overview](03-auth-contact-capture.md). **Depends on:** 1 (scaffold + i18n), 2 (Prisma schema).

**Goal:** Auth.js v5 (or the `jose` fallback) stands up a JWT credentials session that stamps `id` + `role`, with reusable server-side guards and a bootstrapped first admin — and a protected route rejects anonymous requests. No registration/sign-in UI yet (that's [03b](03b-registration-signin.md)).

**Definition of done = every box in [§6 Acceptance](#6-acceptance).**

## 0. Workflow wrapper (per [ai-intergration.md](../../.claude/standards/ai-intergration.md))

- [ ] Branch `feature/session-3a-auth-foundation` off `dev`; update [context/current-feature.md](../../context/current-feature.md).
- [ ] `pnpm typecheck` + `pnpm lint` + `pnpm build` green before commit; ask before committing; no AI attribution.

## 1. Spike — Auth.js v5 on Next 16 / React 19 (do this FIRST)

- [ ] `pnpm add next-auth@beta`; stand up a throwaway Credentials + JWT session; confirm `auth()` / `signIn` / `signOut` + the `[...nextauth]` route work under Turbopack and `pnpm build`.
- [ ] **If incompatible:** pin a known-good beta, or fall back to hand-rolled Credentials + [`jose`](https://github.com/panva/jose) JWT cookie session (same `authorize` logic + guards). Record the decision in `current-feature.md`.

## 2. Dependencies & environment

- [ ] `pnpm add next-auth@beta zod bcryptjs` + `pnpm add -D @types/bcryptjs`. (`bcryptjs` = pure JS, no native build to break on Vercel; `argon2` acceptable.)
- [ ] `npx auth secret` → `AUTH_SECRET` in `.env.local`; mirror to `.env.example` (name only) + Vercel (all environments).
- [ ] Add `AUTH_EMAIL_ENABLED=false` (`.env.local` + `.env.example` + Vercel) — the deferral switch [03c](03c-verification-reset.md) and Sessions 8/13 reuse. Default **off**.

## 3. Auth.js core — split config (edge-safe vs Node)

> **Why split:** Prisma 7 + Neon adapter and `bcryptjs` run **Node-only**. Keep DB/hash work out of any edge-evaluated config. See [src/lib/prisma.ts](../../src/lib/prisma.ts).

- [ ] `src/features/auth/auth.config.ts` — edge-safe: `pages`, `session: { strategy: "jwt" }`, `callbacks` (`jwt`/`session` stamp `id` + `role`). **No Prisma, no bcrypt here.**
- [ ] `src/features/auth/auth.ts` — Node: spreads the config, adds the **Credentials** provider whose `authorize` looks up the user via [Prisma](../../src/lib/prisma.ts), rejects soft-deleted users (`deletedAt != null`), verifies the hash with `bcryptjs`. Exports `handlers`, `auth`, `signIn`, `signOut`.
- [ ] `src/app/api/auth/[...nextauth]/route.ts` — re-export `handlers` (`/api/*` not localized — already excluded by [proxy.ts](../../src/proxy.ts)).
- [ ] `next-auth.d.ts` — type `session.user.role` + `id` (no `any` — coding standard).
- [ ] Add `<SessionProvider>` to the root layout **only if** a client component needs `useSession`; prefer `auth()` in server components.

## 4. Authorization helpers + protected-route proof

- [ ] `src/features/auth/guards.ts` — `requireUser()` / `requireAdmin()` built on `auth()`; anon → `/auth/signin?callbackUrl=…`, non-admin → 403/home. Enforced at the **service/page layer**, not in `proxy.ts` (per [architecture.md](../../.claude/standards/architecture.md)).
- [ ] **Do NOT add auth to [proxy.ts](../../src/proxy.ts)** — it stays next-intl-only (Prisma can't run on edge).
- [ ] Prove rejection with a minimal guarded surface — `GET /api/me` (401 anon; `{ id, role }` authed) or a tiny guarded page. Real protected pages arrive in Sessions 6/8.

## 5. Roles — bootstrap the first admin

- [ ] Promote the owner's account to `ADMIN`: simplest = flip `role` in Prisma Studio (`pnpm db:studio`); or a one-off `scripts/set-admin.ts` (run via `pnpm dlx tsx`) that sets `role = ADMIN` by email. **No public self-elevation path.** Document how it was done.

## 6. Acceptance

- [ ] A protected route / guard rejects an anonymous request.
- [ ] Signing in a seeded user yields a JWT session that persists and carries `id` + `role` (full register→sign-in e2e lands in [03b](03b-registration-signin.md)).
- [ ] `pnpm typecheck` + `pnpm lint` + `pnpm build` green.

## Out of scope

- Registration / sign-in UI → [03b](03b-registration-signin.md); token flows → [03c](03c-verification-reset.md).

## Gotchas

- The §1 spike is non-optional; keep the `jose` fallback ready.
- `bcryptjs` + Prisma are Node-only — keep in `auth.ts`, never `auth.config.ts` / `proxy.ts`.

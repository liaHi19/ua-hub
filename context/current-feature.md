# Current Feature: Auth Foundation & Session (Session 3a)

## Auth.js v5 (JWT credentials) — foundation, guards & first admin

Stand up an Auth.js v5 (or `jose` fallback) JWT credentials session that stamps
`id` + `role`, with reusable server-side guards, a bootstrapped first admin, and a
protected route that rejects anonymous requests. No registration/sign-in UI yet
(that's 03b).

## Status

In Progress

## Goals

- **Spike first:** confirm Auth.js v5 (`next-auth@beta`) works on Next 16 / React 19
  under Turbopack + `pnpm build`. If incompatible, fall back to hand-rolled
  Credentials + `jose` JWT cookie session — record the decision here.
- Split config: `auth.config.ts` (edge-safe — `pages`, JWT strategy, `jwt`/`session`
  callbacks stamping `id` + `role`; **no Prisma/bcrypt**) vs `auth.ts` (Node —
  Credentials provider whose `authorize` looks up the user via Prisma, rejects
  soft-deleted users, verifies hash with `bcryptjs`; exports `handlers/auth/signIn/signOut`).
- `src/app/api/auth/[...nextauth]/route.ts` re-exports `handlers`.
- `next-auth.d.ts` types `session.user.role` + `id` (no `any`).
- Authorization helpers `requireUser()` / `requireAdmin()` in `src/features/auth/guards.ts`,
  enforced at the service/page layer — **not** in `proxy.ts` (Prisma can't run on edge).
- Prove rejection with a minimal guarded surface (`GET /api/me`: 401 anon; `{ id, role }` authed).
- Bootstrap the first admin (flip `role` in Prisma Studio or a one-off `scripts/set-admin.ts`);
  no public self-elevation path. Document how it was done.
- `pnpm typecheck` + `pnpm lint` + `pnpm build` green before commit.

## Notes

- **Branch:** `feature/session-3a-auth-foundation` off `dev`. Ask before committing; no AI attribution.
- **Dependencies:** `pnpm add next-auth@beta zod bcryptjs` + `-D @types/bcryptjs`
  (`bcryptjs` = pure JS, no native build; `argon2` acceptable).
- **Env:** `npx auth secret` → `AUTH_SECRET` in `.env.local`; mirror name to `.env.example`
  + Vercel (all envs). Add `AUTH_EMAIL_ENABLED=false` (the deferral switch reused by 03c +
  Sessions 8/13) — default **off**.
- **Edge/Node split is critical:** Prisma 7 + Neon adapter and `bcryptjs` are Node-only.
  Keep DB/hash work out of `auth.config.ts` and `proxy.ts`.
- **`proxy.ts` stays next-intl-only** — do NOT add auth to it.
- `<SessionProvider>` in root layout only if a client component needs `useSession`;
  prefer `auth()` in server components.
- The §1 spike is non-optional; keep the `jose` fallback ready.

## Decisions

- **Spike result — Auth.js v5 stays.** `next-auth@5.0.0-beta.31` works on Next 16.2.6 /
  React 19.2.4 under Turbopack; `pnpm typecheck` + `lint` + `build` all green. The `jose`
  fallback is **not** needed.
- **JWT type augmentation:** `next-auth.d.ts` augments `Session` (merges cleanly) and
  `next-auth/jwt`'s `JWT`. In this beta, `JWT extends Record<string, unknown>` and the
  re-export from `@auth/core/jwt` (not resolvable at the project root) means the callback's
  `token` is seen as `unknown`-valued — so the `session` callback narrows `token.id`/`token.role`
  with explicit casts (no `any`). See [src/features/auth/auth.config.ts](../src/features/auth/auth.config.ts).
- **`bcryptjs` types:** dropped the deprecated `@types/bcryptjs` stub — `bcryptjs@3` ships its
  own types.

## First-admin bootstrap

No public self-elevation path. Promote/seed the owner's admin from the CLI (needs
`DATABASE_URL` in `.env.local`):

```bash
pnpm dlx tsx scripts/set-admin.ts <email> [password]
```

- Existing user → role set to `ADMIN`.
- No such user **and** a password given → creates a verified `ADMIN` (seeds a sign-in-able
  account before the 03b registration UI). Alternatively flip `role` in `pnpm db:studio`.

## Owner steps (need credentials — not done in code)

- [ ] `npx auth secret` → writes `AUTH_SECRET` to `.env.local`; mirror to Vercel (all envs).
      Without it `auth()` throws at runtime, so the 401 proof + sign-in can't be exercised yet.
- [ ] Add `AUTH_EMAIL_ENABLED=false` to `.env.local` + Vercel (name already in `.env.example`).
- [ ] Run `pnpm dlx tsx scripts/set-admin.ts <email> <password>` to seed the first admin, then
      verify `GET /api/me` (401 anon → `{ id, role }` after sign-in via `POST /api/auth/...`).

## Acceptance — all must pass

- [ ] A protected route / guard rejects an anonymous request. _(code in place: `GET /api/me`
      + `getAuthedUser()`; runtime verification pending `AUTH_SECRET` — owner step above.)_
- [ ] Signing in a seeded user yields a JWT session that persists and carries `id` + `role`
      (full register→sign-in e2e lands in 03b). _(pending `AUTH_SECRET` + seeded admin.)_
- [x] `pnpm typecheck` + `pnpm lint` + `pnpm build` green.

## Out of scope

- Registration / sign-in UI → 03b; token flows (verification/reset) → 03c.

## References

- Source todo: `@docs/todos/03a-auth-foundation.md`
- Parent overview: `@docs/todos/03-auth-contact-capture.md`
- Architecture: `@standards/architecture.md`
- Coding/DB standards: `@standards/coding-standards.md`, `@standards/database-schema.md`

## History

| Session | Focus                  | Key deliverables                                                                                                                                                                               |
| ------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1       | Scaffold, i18n & Fonts | next-intl `/en`+`/uk` routing via `proxy.ts`; self-hosted Noto Serif (Cyrillic verified) + Inter; Tailwind v4 + shadcn/ui; `.env.example`. Code complete; deploy + provisioning pending owner. |
| 2       | Data Model & Migrations | Prisma 7 + Neon schema; `prisma.config.ts` (datasource moved out of schema); client singleton via Neon adapter; initial migration `init` applied to Neon dev; invariants documented. Typecheck + lint clean. |

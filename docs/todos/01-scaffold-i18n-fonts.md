# Session 1 — Project Scaffold, i18n & Fonts — TODO

Source: [docs/prd/main.md](../prd/main.md) §"Session 1". **Depends on:** nothing (first session).

**Goal:** Next.js app boots locally and deploys a placeholder to the Vercel default URL, with all external accounts provisioned, locale routing live (`/en` default, `/uk`), and Noto Serif self-hosted for Cyrillic.

**Definition of done = every box in [§9 Acceptance](#9-acceptance--all-must-pass) is checked.**

---

## 0. Workflow wrapper (per [.claude/standards/ai-intergration.md](../../.claude/standards/ai-intergration.md))

- [ ] Write this session into [context/current-feature.md](../../context/current-feature.md) (Status / Goals / Notes) before coding.
- [ ] `git init` at the repo root, then create branch `feature/session-1-scaffold`.
- [ ] `pnpm build` passes before any commit; ask before committing; conventional commits (`feat:`/`chore:`), no AI attribution.
- [ ] On completion, mark done + add a row to the History table in `current-feature.md`.

## 1. Provision external accounts (no custom domain this session)

- [ ] **Vercel** — create the project (Hobby tier). Note the assigned `*.vercel.app` URL.
- [ ] **Neon** — create the Postgres project; copy the connection string into `DATABASE_URL`. (Prisma wiring is Session 2 — just store the string now.)
- [ ] **Resend** — create the account + API key → `RESEND_API_KEY`. **Do NOT do DNS/domain verification** (deferred to Session 13); sending stays off until then.
- [ ] **Vercel Blob** — create a store, region `iad1` → `BLOB_READ_WRITE_TOKEN`.
- [ ] **Sentry** — create the project → DSN (see §7).

## 2. Scaffold the Next.js app

> ⚠️ **Gotcha:** `create-next-app` refuses a non-empty directory, and this repo already has `docs/`, `context/`, `.claude/`, `CLAUDE.md`. Scaffold into a temp dir and merge, don't run it in place.

- [ ] `pnpm create next-app@latest ua-hub-scaffold` with: **TypeScript ✔, App Router ✔, `src/` dir ✔, ESLint ✔, Tailwind ✔, import alias `@/*` ✔**.
- [ ] Move the generated app (`src/`, `public/`, `next.config.*`, `tsconfig.json`, `package.json`, `postcss.config.*`, `eslint.config.*`, `.gitignore`, etc.) into the repo root; keep existing `docs/`, `context/`, `.claude/`, `CLAUDE.md`, `.claudeignore`. Delete the temp dir.
- [ ] Confirm **Next.js 16** + React in `package.json`; TypeScript **strict** in `tsconfig.json` (coding standard).
- [ ] Reconcile layout to the `src/{app,components,actions,types,lib}/` convention (coding standard) — the PRD's `app/`/`lib/`/`components/` means `src/app`, `src/lib`, `src/components`.
- [ ] Merge `.gitignore` so `.env*`, `node_modules`, `.next` are ignored (matches [.claudeignore](../../.claudeignore)).
- [ ] `pnpm install` then `pnpm dev` → default page renders.

## 3. Tailwind v4 + shadcn/ui

- [ ] Confirm **Tailwind v4** (CSS-based): `@import "tailwindcss";` in `src/app/globals.css`, `@tailwindcss/postcss` in postcss config. **Do NOT create `tailwind.config.*`** (v3 only — coding standard).
- [ ] `pnpm dlx shadcn@latest init` → confirm `components.json`; add one component (`button`) and render it to prove the pipeline.
- [ ] *(optional, base palette)* add brand tokens via `@theme` in `globals.css` — cream `#FFF8EC`, navy `#1B2A41`, terracotta `#C46A4A` (full OG palette is Session 12). Dark-mode-first per coding standard.

## 4. next-intl — locale routing (`/en` default, `/uk`)

- [ ] `pnpm add next-intl`.
- [ ] `src/i18n/routing.ts` — locales `['en','uk']`, `defaultLocale: 'en'`, URL-prefixed.
- [ ] `src/i18n/request.ts` — load the per-request message catalog.
- [ ] `middleware.ts` — next-intl locale middleware with a matcher that **excludes `/api`, `/admin`, `/_next`, static assets** (only public pages are localized).
- [ ] Move pages under `src/app/[locale]/` (`layout.tsx` + `page.tsx`); wrap with `NextIntlClientProvider`.
- [ ] `messages/en.json` + `messages/uk.json` — seed a handful of chrome keys (e.g. site title, nav, home heading). Ukrainian strings can be assistant-drafted now; native review lands in Week 3.
- [ ] Verify `/` → redirects to `/en`; `/uk` renders Ukrainian chrome; English is the fallback locale.

## 5. Fonts — Noto Serif (titles) + Inter (body/UI)

- [ ] Download **Noto Serif** with **Cyrillic + Latin** subsets (SIL OFL) into `public/fonts/`; commit the `OFL.txt` license alongside.
- [ ] Load Noto Serif via `next/font/local`; load **Inter** (Cyrillic-capable) via `next/font/google` for body/UI.
- [ ] Apply Noto Serif to headings/titles; expose both as CSS vars in the root layout.
- [ ] **Verify Cyrillic** renders with a Ukrainian sample (e.g. "Вечір української поезії") — no tofu/fallback glyphs.

## 6. Env & config

- [ ] `.env.local` (gitignored) with: `DATABASE_URL`, `RESEND_API_KEY`, `BLOB_READ_WRITE_TOKEN`, `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN`. (`AUTH_SECRET` arrives in Session 3.)
- [ ] Commit a `.env.example` documenting the required keys (names only, no values).
- [ ] Mirror every var into **Vercel → Project → Settings → Environment Variables**.

## 7. Sentry (provision only this session)

- [ ] Install `@sentry/nextjs` and run `pnpm dlx @sentry/wizard@latest -i nextjs`, **or** just store the DSN in env now.
- [ ] Full instrumentation + "receiving data" verification is **Session 13** — this session only needs the account + DSN wired.

## 8. Deploy placeholder to Vercel

- [ ] Create a GitHub repo and push `feature/...` → main (or use `vercel` CLI). *(Note: `git push` prompts for approval per settings.)*
- [ ] Vercel build settings: install `pnpm install`, build `pnpm build`.
- [ ] Set the env vars (§6) in Vercel.
- [ ] Trigger a deploy → confirm the `*.vercel.app` URL loads and `/uk` works on the deployed URL.

## 9. Acceptance — all must pass

- [ ] `pnpm dev` serves a page.
- [ ] `/` redirects to `/en`; `/uk` serves Ukrainian chrome.
- [ ] Noto Serif renders Cyrillic correctly.
- [ ] Placeholder deploy is live on the Vercel default URL.

---

## Out of scope / deferred (do NOT do here)

- **Custom domain + Resend DNS verification** → Session 13.
- **Prisma schema + migrations** → Session 2 (Neon is only *provisioned* now).
- **Auth / `AUTH_SECRET` / login** → Session 3.
- **Full Sentry verification, Analytics, Cron, legal pages** → Session 13.
- Real content surfaces (list, event detail, OG card) → Sessions 10–12.

## Gotchas

- `create-next-app` won't run in this non-empty repo → scaffold-then-merge (§2).
- Tailwind **v4** uses CSS config — creating `tailwind.config.*` silently does nothing and signals a v3 mindset.
- The locale middleware matcher **must** exclude `/api` and `/admin` (those surfaces stay un-localized, English-only).
- Keep Ukrainian message values present (even if assistant-drafted) so `/uk` isn't empty; English fallback covers gaps.
- `git push` and `WebFetch` require approval (see [.claude/settings.json](../../.claude/settings.json)).

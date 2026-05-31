# UAHub

A platform connecting people with events, organizations, and services offered by Ukrainians.

## Context Files

Read the following to get the full context of the project:

- @standards/coding-standards.md
- @standards/ai-interaction.md
- @context/project-overview.md
- @context/current-feature.md

## Stack

- **Next.js 16** with App Router (`src/app/`)
- **React 19**, **TypeScript 5**, **Tailwind CSS 4**
- **Prisma 7** + **Neon Postgres** (serverless) via `@prisma/adapter-neon`
- Turbopack is the default bundler for both `dev` and `build` — no `--turbopack` flag needed
- Tailwind v4 uses `@import "tailwindcss"` in CSS (not `@tailwind` directives)
- `package.json` has `"type": "module"` (required by Prisma 7's ESM-only client)

## Architecture

App Router only — no Pages Router. Routes live under `src/app/`:

- `layout.tsx` — root layout with Geist font variables and base body styles
- `page.tsx` — root route (`/`)
- `globals.css` — global styles imported in root layout

Add new routes by creating `page.tsx` inside a new folder under `src/app/`. Shared UI wrapping multiple routes goes in a `layout.tsx` at the appropriate level.

## Key v16 differences from prior versions

- `middleware.ts` is deprecated — use `proxy.ts` instead
- `experimental.turbopack` config moves to top-level `turbopack` in `next.config.ts`
- If you add a custom `webpack` config, `next build` will fail unless you pass `--webpack`; Turbopack config is separate
- ESLint is run via `eslint` CLI directly, not `next lint`

## Additional documents

Read corresponding file before start work with this part of the project:

- `@standards/architecture.md` - general architecture, layers, patterns.
  Read when: start building a new feature or refactoring

- `@standards/database-schema.md` - schema of models, relationships between models, rules for work with Prisma and Neon.
  Read when: changes in prisma schemas or migrations

# UA Hub — Build PRD (Session-by-Session)

A moderated cross-city directory of Ukrainian community events in the UK, built by the Bristol-Odesa Association. This is the build plan: **13 dependency-ordered sessions**, each a self-contained slice you can build and test before moving on. It stands on its own — deeper product rationale lives in `design.md`, but you don't need that file to execute this plan.

## How to read this

- **Sessions are logical units, not calendar slots.** Each session is a coherent, independently testable slice of work, ordered so that every session depends only on earlier ones.
- **No fixed cadence.** Run the 13 sessions at whatever evening pace is realistic — the logical ordering holds regardless of calendar speed.
- **Scope = scaffold → production deploy.** Seeding, quiet launch, and buffer follow the deploy session (see _Post-Deploy_); later phases are a roadmap pointer (Appendix A).
- **Each session block uses a fixed template:** **Goal / Depends on / Scope / Acceptance / Risk.**
- **i18n is cross-cutting.** The `next-intl` foundation (locale proxy in `proxy.ts`, `/[locale]` routing, EN default) lands in Session 1; each public-surface session then translates its static strings and resolves content locale. There is no standalone i18n session.
- **Key decisions baked into this plan:**
  - No custom domain at start; email + password auth.
  - User contact data captured at registration; owners self-serve their own events.
  - Two-way notifications; user account management + a contact-the-admin channel.
  - Opt-in per-event public contact.
  - EN/UK UI i18n via URL-prefixed locales; Noto Serif for Cyrillic + Latin.

## Session map

| #   | Session                                                 | Goal                                                                                                         | Depends on    |
| --- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------- |
| 1   | Project Scaffold, i18n & Fonts                          | App boots + placeholder deploy on the Vercel default URL; next-intl + Noto Serif wired; accounts provisioned | —             |
| 2   | Data Model & Migrations                                 | Full Phase-1 Prisma schema migrated to Neon                                                                  | 1             |
| 3   | Authentication (Email + Password) + Contact Capture     | Register + password sign-in (JWT); verification/reset built, email deferred                                  | 1, 2          |
| 4   | Postcode & City Resolution                              | Postcode → `{city, region, lat, lng}` with tests                                                             | 1             |
| 5   | Organization Admin CRUD                                 | Admin manages orgs + verification                                                                            | 2, 3          |
| 6   | Submit Form & Image Upload (+ Owner Edit-While-Pending) | User submits a PENDING event (incl. opt-in public contact); owner edits it while pending                     | 2, 3, 4, 5    |
| 7   | Admin Moderation Queue                                  | Admin approve/reject/edit/cancel/soft-delete; sees submitter contact                                         | 5, 6          |
| 8   | Owner Event Management & Notifications                  | `/my/events` + two-way in-app/email notifications                                                            | 2, 3, 6, 7    |
| 9   | User Account & Admin Contact                            | Profile edit, account self-delete (events kept), admin delete-user, contact-the-admin                        | 2, 3, 6, 7, 8 |
| 10  | Public Filterable List (`/`)                            | URL-stateful filterable list of approved events; translated chrome + UK-first content                        | 2, 7          |
| 11  | Event Detail & Org Pages + Metadata                     | Detail + org pages + opt-in public contact + language-aware content/metadata; no PII leak                    | 2, 10         |
| 12  | OG Card (Critical Path)                                 | Designed share card verified across five clients                                                             | 11            |
| 13  | Observability, Cron, Legal Pages & Production Deploy    | Live, monitored; email enabled when the domain is live                                                       | all           |

---

## Sessions

> **Convention:** a label with a colon (e.g. **Goal:**) is followed by its value on the same line. A label without a colon (**Scope**, **Acceptance**) heads the bullet list beneath it.

### Session 1 — Project Scaffold, i18n & Fonts

**Goal:** A Next.js app boots locally and deploys a placeholder to the Vercel default URL, with all external accounts provisioned, locale routing live, and the Cyrillic-capable font self-hosted.

**Depends on:** none.

**Scope**

- `create-next-app` (Next.js 16 App Router + TypeScript); Tailwind + shadcn/ui; base layout (`app/`, `lib/`, `components/`).
- **next-intl** — locale proxy (`proxy.ts`) + `/[locale]` routing (`/en` default, `/uk`) and EN/UK message-catalog scaffolding (grown per surface).
- **Self-host Noto Serif** (Cyrillic + Latin, SIL OFL) in `/public/fonts/`.
- `git init` + `.gitignore`.
- Provision Vercel, Neon, Resend, Vercel Blob; `.env.local` + Vercel env scaffolding; accept Blob region `iad1`.
- **No custom domain yet** — deploy to `*.vercel.app`; no Resend DNS verification (picked up in Session 13).

**Acceptance**

- `pnpm dev` serves a page.
- `/` redirects to `/en`; `/uk` serves Ukrainian chrome.
- Noto Serif renders Cyrillic.
- Placeholder deploy live on the Vercel default URL.

**Risk:** none material yet.

### Session 2 — Data Model & Migrations

**Goal:** The full Phase-1 Prisma schema (incl. auth, contact, lifecycle, notifications, account-deletion, contact messages) is migrated to Neon with invariants documented.

**Depends on:** 1.

**Scope**

- Prisma + Neon.
- **Enums:** `Role` / `EventType` / `Status` (single definition — drop the duplicate `Status`) + `NotificationType`.
- **Models:**
  - `Organization`.
  - `User` (+ `passwordHash`, `emailVerified DateTime?`, `firstName`/`lastName`, `phone`, `messengerUrl`, `contactVerifiedAt DateTime?`, `emailNotificationsEnabled`, `deletedAt DateTime?`).
  - `Venue`.
  - `Event` (+ `deletedAt DateTime?`, `publicContactEmail String?`, `publicContactMessenger String?`).
  - `Notification`, `EmailVerificationToken`, `PasswordResetToken`, `ContactMessage`.
- **Keep:** `endsAt?`, `region` non-null, `cancelledAt` + `cancellationNote`, `@@unique([postcode, nameNormalized])`, `@@index([startsAt, status])`.
- Store datetimes UTC; first migration via `prisma migrate dev`.
- Document invariants as code comments; migration discipline (no destructive migrations in month 1).

**Acceptance**

- Migration applies to Neon.
- Prisma client generates.
- Invariants written down.
- Schema review passes.

**Risk:** schema is costly to change once data exists — get enums and invariants right now (`eventType` is expensive to backfill). Don't denormalize `Event.city` yet; revisit only if the dataset grows past ~10k events.

### Session 3 — Authentication (Email + Password) + Contact Capture

**Goal:** A user registers (with contact data) and signs in with email + password (JWT session); admin role assignable; verification + reset flows built but emails deferred until the domain is live.

**Depends on:** 1, 2.

**Scope**

- Auth.js v5 **Credentials provider** + **JWT** session strategy.
- **Routes:** `/auth/register` (hash via bcrypt/argon2), `/auth/signin`, `/auth/forgot-password`, `/auth/reset-password`, `/auth/verify`.
- CSRF on state-changing routes; **no bearer path**; no account enumeration.
- Role gating helper (`USER`/`ADMIN`); bootstrap the first admin.
- **Email flows deferred:** verification + reset implemented but sending/enforcement gated off until Session 13 (no domain/sender yet)
- **Registration captures contact:** first name + surname (required) plus phone and/or messenger link (≥1 contact channel required; `messengerUrl` scheme-validated), so the admin can verify/contact submitters. Contact data is admin-only.

**Acceptance**

- Register → password sign-in works end-to-end.
- Passwords hashed (never plaintext); JWT session persists.
- Protected route rejects anonymous.
- Sign-in/register/forgot responses don't reveal whether an email exists.
- Verification + reset exist behind the deferral flag.
- Registration blocks without name + surname + ≥1 contact channel.

**Risk:** verification/reset emails can't send pre-domain → keep behind a flag, rely on password login; flip on in Session 13. Never silently mark all emails verified in production.

### Session 4 — Postcode & City Resolution

**Goal:** A postcode resolves to canonical `{city, region, lat, lng}`, with tests.

**Depends on:** 1.

**Scope**

- `/api/postcode/[code]` edge proxy to postcodes.io; `Cache-Control: public, s-maxage=2592000`; 3s timeout.
- `lib/normalize-postcode.ts` (`BS16QT` → `BS1 6QT`).
- `lib/resolve-city.ts` (`admin_district` → canonical city; London boroughs → "London", Greater Manchester → "Manchester").
- **Tests:** unit tests for `normalizePostcode` (~10 cases) + city-resolver fixtures (Bristol / London N1 / Manchester / Glasgow).

**Acceptance**

- Proxy returns cached city/region/lat-lng.
- Failed lookup → clear error (no free-text fallback).
- Postcode + city-resolver tests green.

**Risk:** the city-mapping table is data-driven and needs upkeep as districts appear. First real-code commit of the project.

### Session 5 — Organization Admin CRUD

**Goal:** Admin can create, edit, list, soft-delete organizations and toggle verification.

**Depends on:** 2, 3.

**Scope**

- `/admin/orgs` — create (`slug` / `nameEn` / optional `nameUk` / `website` / `logoUrl` / `isVerified`); list; soft-delete.
- `/admin/orgs/[id]` — edit + verification toggle.
- Admin-only guard reusing Session 3 gating.

**Acceptance**

- Admin manages org rows.
- Non-admin blocked.
- `isVerified` is display-only (no auto-approve logic).

### Session 6 — Submit Form & Image Upload (+ Owner Edit-While-Pending)

**Goal:** An authenticated user submits a complete `PENDING` event, and can edit it (reusing the form) while it is still pending.

**Depends on:** 2, 3, 4, 5.

**Scope**

- `/submit` (auth-gated).
- Searchable Organization dropdown (pick existing **or** leave blank + `organizerName`).
- Debounced (400ms) postcode lookup with read-only city/region.
- Venue picker scoped to city + inline "Add new venue" with `upsert` dedup + "Did you mean …?".
- Online toggle (hides venue UI, shows `onlineUrl`).
- Optional `externalUrl` with scheme allowlist + `lib/clean-url.ts` tracking strip.
- **Optional opt-in public contact** — `publicContactEmail` (format-validated) and/or `publicContactMessenger` (scheme-validated via `lib/clean-url.ts`); shown publicly on the event page, separate from the admin-only account contact, with a clear "this will be public" warning at submit.
- **Required** `eventType` radio (no default).
- Image upload via `/api/uploads/sign` signed Blob URL (file-type sniff jpg/png/webp, EXIF strip via `sharp`, max 4000×4000 / 5MB).
- Rate limit 5/24h; server-side enforcement of all six invariants.
- **Owner edit:** `/events/[id]/edit` reuses the form, guarded to `createdById == current user && status == PENDING` (after approval → admin-only).

**Acceptance**

- Submit yields a `PENDING` event.
- Bad postcode blocks submission.
- Invalid `externalUrl` scheme rejected; tracking params stripped.
- Missing `eventType` blocks submit.
- Oversized/non-image upload rejected.
- Invalid `publicContactMessenger` scheme or malformed `publicContactEmail` rejected.
- 6th submission in 24h blocked.
- Owner can edit own pending event but not an approved one (or another user's).

**Risk:** **highest-effort session.** Venue picker + org-attach are the spikes; fallback = free-text organizer name, defer dropdown polish.

### Session 7 — Admin Moderation Queue

**Goal:** Admin approves/rejects, attaches to an org, edits, soft-cancels, soft-deletes events, hand-creates venues, and sees submitter contact.

**Depends on:** 5, 6.

**Scope**

- `/admin` pending queue; approve/reject POST routes (set `approvedAt`); attach-to-org dropdown at approval.
- `/admin/events/[id]/edit` — reschedule, typo fix, cancel (`cancelledAt` + `cancellationNote`), soft-delete (`deletedAt`).
- `/admin/venues/new` escape hatch (BFPO, `GIR 0AA`, brand-new postcodes).
- Admin visits `externalUrl` **and reviews any opt-in public contact** (`publicContactEmail`/`publicContactMessenger`) during review, per playbook.
- Each pending item shows the submitter's contact (first name, surname, phone, messenger) — **admin-only, never public** — with a "mark contact verified" action (`contactVerifiedAt`).
- Admin actions emit owner notifications via the Session 8 layer.

**Acceptance**

- Approve → `APPROVED` + public; reject hides it.
- Cancel shows a "Cancelled" badge while staying listed.
- Soft-delete removes it from public surfaces.
- Admin can create a venue bypassing postcode lookup.
- Submitter contact is visible to the admin and markable verified.

### Session 8 — Owner Event Management & Notifications

**Goal:** Owners manage their events from one place, and a two-way in-app + email notification system connects owner and admin actions (email deferred until the domain is live).

**Depends on:** 2 (Notification + lifecycle schema), 3 (auth/user), 6 (owner actions), 7 (admin actions).

**Scope**

- `/my/events` dashboard — the signed-in user's events with status, edit-if-pending, **cancel**, **delete** actions.
- Owner cancel (`cancelledAt`) + soft-delete (`deletedAt`) endpoints scoped to own events.
- **Notification layer** — create `Notification` rows on:
  - owner cancel/delete of an **APPROVED** event → admin;
  - admin approve/reject/edit/cancel/delete → owner.
- In-app UI (bell + `/notifications` list, mark-as-read) works immediately.
- **Email send via Resend wired but gated off until Session 13** (records `emailedAt` when sent).
- `emailNotificationsEnabled` flag respected (default on); user-facing settings toggle UI deferred to a later phase.

**Acceptance**

- Owner can cancel/delete only their own events.
- Cancel/delete of an APPROVED event creates an admin notification.
- Each admin action on an event creates an owner notification.
- In-app notifications render + mark read.
- Email send stays off pre-domain (no external mail), on post-domain.
- Withdrawing a PENDING event creates no admin notification.

**Risk:** notification fan-out + the email-deferral flag must not leak email pre-domain; keep emit logic in one place reused by Sessions 6/7 actions.

### Session 9 — User Account & Admin Contact

**Goal:** A signed-in user manages their own account (view/edit profile, delete account — with their events retained); the admin can delete users and read messages; anyone can see the operator's contact and message the admin.

**Depends on:** 2 (`User.deletedAt` + `ContactMessage` schema), 3 (auth/user), 6 (events exist — to prove retention), 7 (admin area), 8 (admin-alert pattern).

**Scope**

- **`/profile`** — view + edit own info (`firstName`, `lastName`, `phone`, `messengerUrl`; an email change re-triggers verification once enforcement is live).
  - **Delete-account** → `DELETE /api/account` performs **soft-delete + anonymize**: clear `passwordHash`, scrub `email` to a non-identifying placeholder (frees it for re-registration), clear names / `phone` / `messengerUrl` / `contactVerifiedAt`, set `deletedAt`, invalidate sessions. The user's `Event` rows are **retained** (the `createdBy` link is preserved, pointing at the anonymized tombstone).
- **`/admin/users`** — admin lists users, views contact, and **deletes any user** (`DELETE /api/admin/users/[id]`, same soft-delete + anonymize path, events retained).
- **`/contact`** — public page showing the operator's contact details (pending Open Question 1) + a message form; `POST /api/contact` stores a `ContactMessage` and alerts the admin. Add light spam protection (reuse the rate-limit pattern / honeypot).
- **`/admin/messages`** — admin inbox for `ContactMessage`s with an unread count (`readAt`); admin alerted in-app immediately; email-to-admin deferred until the domain is live.

**Acceptance**

- A user edits their own profile but not another's.
- Deleting one's own account anonymizes the user, blocks further login, and **leaves their events intact** (PENDING stay reviewable, APPROVED stay public).
- The admin can delete any user with the same retention guarantee.
- `/contact` shows operator contact and accepts a message that appears unread in `/admin/messages` with **no email sent pre-domain**.
- None of these surfaces expose user PII publicly.

**Risk:** anonymization must be complete (no PII residue) and must never orphan/cascade-delete events; freeing the unique `email` requires the scrub. Contact form is an unauthenticated write surface — rate-limit it.

### Session 10 — Public Filterable List (`/`)

**Goal:** The home page is a URL-stateful, filterable list of approved events — the product's differentiator.

**Depends on:** 2, 7 (needs approved events to render meaningfully).

**Scope**

- `/` lists `APPROVED`, non-deleted events sorted `startsAt` asc.
- City chips (active cities + "All UK").
- Date chips ("This week" = today+6d rolling, "This month" = today+30d, "All upcoming") via `lib/date-ranges.ts`.
- Format chips (All / In person / Online); default view "Everything".
- URL state `?city=&when=&format=` (preserved across the `/en` & `/uk` locale prefixes).
- City slug normalization (kebab-case) in `proxy.ts` with separate display labels.
- **Translated chrome** (next-intl) + **content-locale resolution** via `lib/pick-locale-field.ts` (UK-first with per-field English fallback).
- Empty states; exclude past + soft-deleted by default.

**Acceptance**

- Each filter narrows results correctly.
- Online events appear only under "Online", never a city chip.
- Soft-deleted/non-approved/past excluded.
- Every filtered view is a shareable URL; `?city=manchester&when=this-week` deep-links correctly.
- `/uk` renders Ukrainian chrome and UK-first event content (per-field English fallback); `/en` renders English.

### Session 11 — Event Detail & Org Pages + Metadata

**Goal:** Shareable detail + org pages render with correct, language-aware social metadata; no PII leaks.

**Depends on:** 2, 10.

**Scope**

- `/events/[id]` server component with server-side `where: { status: 'APPROVED', deletedAt: null }`; 404 on missing/non-approved/deleted.
- "Event has passed" badge for past events (no 404); "Cancelled" badge.
- Title + description via content-locale resolution (`lib/pick-locale-field.ts`: UK-first, per-field English fallback); plain text `\n` → `<br>` only.
- Display event times in `Europe/London`; label online events "(UK time)".
- `externalUrl` anchor `rel="noopener noreferrer nofollow" target="_blank"` showing hostname inline.
- **Opt-in public-contact block:** `publicContactMessenger` as a "Message organizer" button (`rel="noopener noreferrer nofollow"`) + `publicContactEmail` as `mailto:`; rendered only when the submitter provided it.
- `/orgs/[slug]` public page listing that org's approved events + verification badge.
- `generateMetadata` (og:title language-aware, og:description ~200 chars, og:image = uploaded poster else `/api/og/[id]`, og:locale + alternate).
- Telegram-share button (city in URL); cuid URLs canonical (no slugs); APPROVED-only filter test.

**Acceptance**

- Non-approved/missing/deleted 404s; past event shows badge not 404.
- Description renders no HTML/markdown.
- `/uk` shows UK-first content with per-field English fallback; `/en` shows English.
- Opt-in public contact renders only when provided and never exposes the admin-only account contact.
- Org page lists only approved events.
- APPROVED-only access test green.
- **No admin-only submitter PII (account phone/messenger/name) appears on any public page.**

### Session 12 — OG Card (Critical Path)

**Goal:** Sharing any event link produces a designed preview card that looks better than a hand-typed Telegram post, verified across five clients.

**Depends on:** 11 (metadata wiring + approved-only access).

**Scope**

- `/api/og/[id]` implementing the card spec (1200×630, cream `#FFF8EC`, navy `#1B2A41`, terracotta/gold accent, type glyph, date block, bilingual stacking with UK-on-top when `titleUk` present, inline 📅/📍, footer strip, "Cancelled" badge).
- **Noto Serif (Cyrillic + Latin, SIL OFL) self-hosted in `/public/fonts/`, inlined in the handler** (no edge Google Fonts fetch) — verify Ukrainian rendering.
- Cache `public, max-age=86400, s-maxage=604800`.
- Playwright OG snapshot test with a checked-in reference PNG.
- Cross-client matrix (iOS / Android / desktop Telegram, WhatsApp, Signal) with screenshots.

**Acceptance**

- Card renders correct bilingual layout.
- Cyrillic displays correctly.
- OG snapshot test green (non-negotiable).
- All five clients screenshot acceptably.

**Risk:** **highest-risk session** — allocate a half-day for Cyrillic font rendering. Font licensing is resolved (Noto Serif, SIL OFL — free commercial use). The footer domain label tracks the live host (Vercel default URL until the custom domain attaches in Session 13).

### Session 13 — Observability, Cron, Legal Pages & Production Deploy

**Goal:** The app is live in production, monitored, with policy pages, automated admin notifications, and email enabled (when the domain is live).

**Depends on:** all prior sessions.

**Scope**

- Vercel Analytics (cross-city click-through is the wedge metric).
- Nightly Vercel Cron admin email when pending > 0; nightly cron to reset the rate-limit counter.
- Code of Conduct page with explicit image-content policy (translated EN/UK).
- Moderation playbook doc (incl. `externalUrl` **and opt-in public-contact** review steps).
- `prisma migrate deploy` in the Vercel build command.
- **Domain + email — _when the domain is available_:**
  - acquire custom domain + complete Resend DNS verification (deferred from Session 1);
  - switch Resend to the verified-domain sender;
  - enable the deferred verification + forgot-password + notification + contact-message email sending/enforcement (from Sessions 3, 8, 9).
- Final production deploy.

**Acceptance**

- Production site live (on the custom domain if acquired, otherwise the Vercel default URL — fully functional either way).
- Analytics receiving data.
- A forced "pending > 0" state triggers the nightly email.
- Code of Conduct page reachable.
- Build runs `migrate deploy` (never `db push`).
- _Note:_ once the domain is verified, Resend sends verification/reset/notification/contact email to external users; until then those emails are limited to the owner's inbox via the test sender; in-app notifications and the contact inbox work throughout.

---

## Post-Deploy note

After the deploy session:

1. **Seed** — create 3+ Organization rows (set `isVerified` for known orgs) and enter 20+ events across **≥3 UK cities**, each attached to its org, bilingual where available.
2. **Quiet launch** — post into a few trusted Telegram groups; share an event link **and** a filtered-list link **and** an org-page link; fix what breaks within hours.
3. **Wider launch** — once the quiet launch holds, share into the broader Bristol / UK Ukrainian groups.
4. **Buffer** — if discovery is happening, polish (card, missing UK fields, city-list normalization, RSS/iCal); if not, don't add features — talk to organizers and diagnose.

The custom domain + Resend verified sender (Session 13) should be live **before the wider launch** so links are branded and email reaches external users; the Vercel default `*.vercel.app` URL is acceptable for the quiet launch. **Three wedge metrics:** a link forwarded between cities, a click into a non-home city, a click into an org page.

## Appendix A — Later-phase roadmap (pointers)

- **Org self-service:** "claim your org" via domain proof, `OrgMember` invites, org-owner self-edit, verified-org auto-approve.
- **Notification settings page:** per-user "turn off email notifications" toggle (the `User.emailNotificationsEnabled` field and `/profile` page already exist — UI only).
- **Discovery:** keyword search, map view, "follow a city" email/RSS digest, recurrence (materialize child events on approval), postcode-prefix filtering.
- **Paid tier:** Stripe Pro tier, self-feature paid promotion, Services + Organizations directories.
- **Deferred edge case:** duplicate-event detection — admin rejects manually in MVP.

## Appendix B — Open questions

Still unresolved:

1. **Owner identity / admin contact** — who is the named operator for admin emails and contact replies? **Also a launch dependency** for the `/contact` page content (Session 9).
2. **Domain choice** — `ua-hub.org.uk` (leaning) / `uahub.uk` / `bristol-ua.org.uk` / other?
3. **Seed orgs** — which charities/orgs will agree to seed events before launch?
4. **Image-content policy** — pre-launch stance on poster content (NSFW, political, religious, military-cause fundraisers)?
5. **Time zones** — `Europe/London` for in-person; do online events need timezone support in v1?
6. **Font licensing — RESOLVED:** Noto Serif (SIL Open Font License) covers Cyrillic + Latin and clears commercial use; self-hosted in `/public/fonts/`.
7. **Ukrainian copy — APPROACH SET:** the assistant drafts the `uk` message catalog from the English strings; a native Ukrainian speaker reviews before launch (routing + English fallback work regardless, so `uk` strings can land during Week 3 seeding).

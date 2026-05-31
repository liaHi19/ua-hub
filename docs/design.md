# UA Hub — Design Doc

A moderated community platform for Ukrainians in the UK to discover events. Built by the Bristol-Odesa Association.

## Problem Statement

Ukrainian refugees and the UK Ukrainian community currently rely on Telegram and WhatsApp groups — fragmented by location, run by individual charities, and unsearchable. **Events get lost in group scroll.** Someone scanning a busy WhatsApp group at 9pm cannot find what's happening this weekend, let alone next month.

UA Hub does not replace Telegram. It gives the community a _better way to share into Telegram._

## The Core Insight

**Telegram is siloed. UA Hub is cross-silo.**

A Ukrainian in Bristol is in one or two Telegram groups. They see Bristol events. They do not see what's happening in Manchester, Edinburgh, or London — even when they'd travel for a meaningful event, even when they have family in another city, even when they just want to know what their community is doing.

UA Hub's reason to exist: **one place where you can see all Ukrainian community events across the UK, filtered to what's relevant to you.**

Two complementary functions:

```
  CARD (acquisition)              FILTER (retention + differentiation)
  ──────────────────              ───────────────────────────────────
  Lives in Telegram.              Lives on the site.
  Brings users in.                Is why they come back.
  Beats casual posts on           Beats Telegram by showing what
  visual signal.                  Telegram cannot show: other cities.
```

The card is _how_ people find the product. The filter is _what the product is_. Both matter; they serve different jobs.

This means the `/events` list with city/region filtering — cut in an earlier scope pass — comes back into MVP. It is the differentiator, not a "nice to have."

## Target User & Wedge

**Phase 1 wedge: Events.** Services and Organizations come later. Events are time-sensitive — missing one is a real loss.

**Primary user:** Ukrainian living in the UK, sees an event in their Telegram group, decides whether to go.

**Secondary user:** Charity / NGO / community organizer who currently announces events in Telegram groups and wants a permanent, shareable, searchable home for their listings — and a card that looks better than a hand-typed Telegram post.

## Constraints

- Solo evening project — **2-week ship target**, with Weeks 3-4 for seeding and feedback.
- UK geographic scope. Bilingual UI — English (default) + Ukrainian — via URL-prefixed locales (`next-intl`); Ukrainian event fields per-event.
- Free hosting tier — Vercel Hobby + Neon free + Resend free.
- Community/NGO project. Not commercial. Success = the Ukrainian community in the UK actually uses it.

## Premises

1. **Cross-city discovery is the wedge.** What Telegram cannot do, UA Hub must do well: show events from every UK city in one filterable place.
2. **The OG card is acquisition.** Telegram is the channel that brings users in. Cards must look designed, not auto-generated.
3. **Empty directories are dead.** Launch must include 20+ seeded events from organizations across at least 3 UK cities. A directory of only Bristol events is not a directory.
4. **Moderation is the trust mechanism.** Solo admin reviewing ~5 events/week. 3-day SLA is trivial. No trusted-user tier yet.
5. **Ship narrow, expand from feedback.** Filter dimensions in v1: city + date + online/in-person. No keyword search, no postcode-prefix logic, no map view.

## What Got Cut (and Why)

A scope-reduction pass cut the following from MVP — all defer to post-launch:

| Cut                                                   | Why                                                                                                                                                                   | Defer to                   |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| `OrgMember` model + org self-service onboarding       | Admin creates Organization rows directly in Phase 1. Member invites and "claim your org" flow wait until volume justifies.                                            | Phase 2                    |
| Verified-org auto-approve                             | Solo admin = trivial volume. Verification is a display badge in Phase 1, no auto-approve logic.                                                                       | When volume justifies      |
| `recurrenceRule` + materialization                    | Multi-day sub-project. Most events are one-off.                                                                                                                       | Phase 2                    |
| `postcodePrefix` index                                | Replaced by a simpler `city` enum/string. Postcode logic returns when there are enough events per postcode for it to matter.                                          | Phase 2                    |
| Home page "featured + next 7 days"                    | Replaced by `/events` itself as the home page — the filterable list IS the landing. No need for a separate marketing surface.                                         | Phase 1.5                  |
| `isPro` / `proTier` / `proUntil` / `stripeCustomerId` | Schema for a Phase-3 feature inside a Phase-1 MVP. Premature.                                                                                                         | Phase 3                    |
| ~~`next-intl` UI translation~~ **— now IN v1**        | Public UI is bilingual EN/UK via URL-prefixed locales (all public static strings translated). Only **admin-area** i18n and content keyword-search i18n stay deferred. | Admin i18n → Phase 2       |
| `isFeatured` / `featuredUntil`                        | Solo admin can hardcode for launch week.                                                                                                                              | When home page exists      |
| `imageBlurHash`                                       | Vercel Image handles lazy loading. Premature polish.                                                                                                                  | Skip until someone notices |
| `TRUSTED` role                                        | One trust tier (ADMIN) until volume justifies.                                                                                                                        | Phase 2                    |

_Note (v1 revision): `OrgMember` + org self-service stay cut (Phase 2), but **owner (submitting-user) self-edit while PENDING, plus owner cancel / soft-delete of their own events, are now IN v1** — see A5 and the Notifications section._

The cut list is the most important section of this doc.

## Recommended Stack

**Next.js 16 App Router + TypeScript + Prisma 7 + Neon + Auth.js (email + password, JWT session strategy) + Tailwind + shadcn/ui + next-intl (EN/UK, URL-prefixed locales), deployed on Vercel.**

- Image storage: Vercel Blob
- Email: Resend
- OG images: `@vercel/og`
- UK postcode lookup: **postcodes.io** (free, no API key, no rate limit issues at our volume)
- i18n: **next-intl** — URL-prefixed locales (`/en` default, `/uk`); all public static strings translated, admin UI stays English
- Fonts: **Noto Serif** self-hosted in `/public/fonts/` (Cyrillic + Latin, SIL Open Font License — covers Ukrainian, free commercial use) for titles + the OG card; Inter (Cyrillic-capable) for body/UI

No Stripe. No Supabase. No paid address service.

## Data Model (Phase 1, reduced)

```prisma
enum Role             { USER ADMIN }
enum EventType        { CONCERT GATHERING KIDS LANGUAGE SUPPORT FUNDRAISER OTHER }
enum Status           { PENDING APPROVED REJECTED CANCELLED }
enum NotificationType { EVENT_APPROVED EVENT_REJECTED EVENT_EDITED EVENT_CANCELLED EVENT_DELETED OWNER_CANCELLED OWNER_DELETED }

model Organization {
  id          String   @id @default(cuid())
  slug        String   @unique           // url-safe, e.g. "bristol-odesa"
  nameEn      String
  nameUk      String?
  website     String?
  logoUrl     String?
  isVerified  Boolean  @default(false)   // admin grant; display badge only in Phase 1
  events      Event[]
  createdAt   DateTime @default(now())
  @@index([isVerified])
}

model User {
  id                        String   @id @default(cuid())
  email                     String   @unique
  passwordHash              String                 // bcrypt/argon2; never plaintext
  emailVerified             DateTime?              // set when the verification link is confirmed (enforcement deferred until domain live)
  firstName                 String?
  lastName                  String?
  phone                     String?                // admin-only contact; never rendered publicly
  messengerUrl              String?                // https:// link to Telegram/WhatsApp/Signal; admin-only; scheme-validated
  contactVerifiedAt         DateTime?              // admin marks the submitter's contact as verified
  emailNotificationsEnabled Boolean  @default(true) // future per-user toggle (settings UI = Phase 2)
  deletedAt                 DateTime?              // account soft-delete + PII anonymization; the user's Events are retained
  role                      Role     @default(USER)
  events                    Event[]
  notifications             Notification[]
  createdAt                 DateTime @default(now())
}

model Venue {
  id              String   @id @default(cuid())
  name            String              // e.g. "St Mary Redcliffe Church"
  nameNormalized  String              // lowercase trim, for dedup
  addressLine     String?             // e.g. "12 Redcliffe Way"
  postcode        String              // validated UK postcode
  city            String              // resolved via postcodes.io + city resolver
  region          String              // resolved via postcodes.io ("South West")
  lat             Float?
  lng             Float?
  events          Event[]
  createdAt       DateTime @default(now())
  @@unique([postcode, nameNormalized])  // prevents race-condition duplicates
  @@index([city])
  @@index([postcode])
}

model Event {
  id                String    @id @default(cuid())
  titleEn           String
  titleUk           String?
  descriptionEn     String              // plain text + line breaks only (no markdown, no HTML)
  descriptionUk     String?
  startsAt          DateTime
  endsAt            DateTime?           // nullable — many drop-in events have no defined end
  isOnline          Boolean   @default(false)
  onlineUrl         String?
  externalUrl       String?             // optional "more info" link (organizer's own page, Facebook event, etc.)
  publicContactEmail     String?        // OPT-IN public contact email shown on the event page (distinct from the submitter's private account email)
  publicContactMessenger String?        // OPT-IN public Telegram/WhatsApp/Signal link shown on the event page; https:// only, scheme-validated
  venueId           String?             // null only when isOnline = true
  venue             Venue?    @relation(fields: [venueId], references: [id])
  imageUrl          String?
  eventType         EventType @default(OTHER)
  organizationId    String?
  organization      Organization? @relation(fields: [organizationId], references: [id])
  organizerName     String?             // fallback display label when organizationId is null (individual submitter)
  status            Status    @default(PENDING)
  cancelledAt       DateTime?
  cancellationNote  String?
  deletedAt         DateTime?           // soft-delete by owner or admin; excluded from list + 404 on detail
  createdById       String
  createdBy         User      @relation(fields: [createdById], references: [id])
  notifications     Notification[]
  createdAt         DateTime  @default(now())
  approvedAt        DateTime?
  @@index([startsAt, status])
}

model Notification {
  id        String   @id @default(cuid())
  userId    String                        // recipient
  user      User     @relation(fields: [userId], references: [id])
  type      NotificationType
  eventId   String?
  event     Event?   @relation(fields: [eventId], references: [id])
  readAt    DateTime?                      // in-app read state
  emailedAt DateTime?                      // set once the email is sent (deferred until domain live)
  createdAt DateTime @default(now())
  @@index([userId, readAt])
}

model EmailVerificationToken {
  id        String   @id @default(cuid())
  userId    String
  token     String   @unique
  expires   DateTime
  createdAt DateTime @default(now())
}

model PasswordResetToken {
  id        String   @id @default(cuid())
  userId    String
  token     String   @unique
  expires   DateTime
  createdAt DateTime @default(now())
}

model ContactMessage {
  id         String   @id @default(cuid())
  fromUserId String?                        // loose ref to sender's User (null if logged out or later anonymized)
  fromName   String?
  fromEmail  String                         // reply-to; required so the admin can respond
  body       String
  readAt     DateTime?                       // admin inbox read state
  createdAt  DateTime @default(now())
  @@index([readAt])
}
```

`titleEn` and `descriptionEn` are required. UK fields optional and added per-event when the organizer provides them. `eventType` is required from day one — cheap to add now, expensive to backfill.

**Invariants** (enforced in submit/approve handlers, not just at the DB layer):

- An approved Event has either `venueId` set (in-person) or `isOnline = true` with a non-null `onlineUrl`.
- An approved Event has either `organizationId` set or `organizerName` non-empty (at least one display label exists). When both are set, the Organization name wins on display; `organizerName` is ignored.
- `descriptionEn` is plain text + line breaks only — no markdown, no HTML. Renderer uses `\n` → `<br>` and nothing else.
- `externalUrl` (if present) is `http://` or `https://` only; rejected schemes: `javascript:`, `data:`, `file:`, `vbscript:`, `about:`. Validated server-side on submit.
- City filter joins through `Venue.city`; online events appear only under the "Online" chip, never under any city chip.
- `cancelledAt` is set independently of `status` — admin can mark an APPROVED event as cancelled without rejecting it. The detail page and OG card render a "Cancelled" badge.
- `deletedAt` (soft-delete) excludes an event from all public surfaces and 404s the detail route. Owner or admin may set it.
- User contact data (`firstName`, `lastName`, `phone`, `messengerUrl`) is **admin-only and never rendered on public pages**; the public organizer label stays the `Organization` name or `Event.organizerName`. `messengerUrl` is `https://` only (scheme allowlist, reuse `lib/clean-url.ts`).
- **Per-event public contact is separate and opt-in.** `Event.publicContactEmail` / `Event.publicContactMessenger` are the _only_ submitter-provided contact ever shown publicly, and only when the submitter fills them on submit. They are **never** populated from the admin-only account fields above. `publicContactMessenger` is `https://` only (reuse `lib/clean-url.ts`); `publicContactEmail` is format-validated and rendered as a `mailto:` the submitter knowingly publishes. Admin reviews both at approval.
- Deleting a `User` (self-service or admin) **soft-deletes + anonymizes** the row (clear `passwordHash`; scrub `email`, names, `phone`, `messengerUrl`, `contactVerifiedAt`; set `deletedAt`) — but **the user's `Event` rows are retained**; events never cascade-delete with an account.

## Engineering Decisions (resolved from `/plan-eng-review`)

The eng review surfaced 42 concerns + 6 introduced by `externalUrl`. The schema and rules below resolve them. Items deferred to implementation are tagged _[impl]_.

**Architecture (A1–A8):**

- **A1** Postcode proxy at `/api/postcode/[code]` returns `Cache-Control: public, s-maxage=2592000` (30 days). Edge runtime. _[impl]_
- **A2** Venue dedup via `@@unique([postcode, nameNormalized])`. Submit handler uses Prisma `upsert`. Resolved in schema.
- **A3** `lib/resolve-city.ts` maps postcodes.io `admin_district` → canonical city. London boroughs → "London", Greater Manchester boroughs → "Manchester", etc. First commit of Week 1. _[impl]_
- **A4** Default filter view = "Everything" (in-person + online combined). "All UK in-person", individual city chips, and "Online" are explicit alternatives.
- **A5** Admin can edit any event at `/admin/events/[id]/edit`. The submitting user can edit their own event while it is `PENDING` (reuses the submit form); after approval, content edits are admin-only. The owner can mark their own event cancelled (`cancelledAt`) or soft-delete it (`deletedAt`) at any time. Organization-account self-service (`OrgMember`) remains Phase 2. _[impl]_
- **A6** `Status` includes `CANCELLED`. Plus `Event.cancelledAt` + `cancellationNote` for soft-cancel without losing the event from the directory.
- **A7** Server-side `where: { status: 'APPROVED' }` filter on `/events/[id]` and `/api/og/[id]`. Tested via T3. _[impl]_
- **A8** Per-event **public contact** is opt-in: `Event.publicContactEmail` / `publicContactMessenger`, captured on submit, rendered on the event detail page (messenger as a "Message organizer" button, email as `mailto:`). These are distinct from the admin-only account contact and are never auto-published from it. Messenger reuses the `http(s)` scheme allowlist + `lib/clean-url.ts`; email is format-validated; admin reviews both at approval. _[impl]_

**Internationalization (I1–I3):**

- **I1** UI i18n via **next-intl** with **URL-prefixed locales** — `/en` (default) and `/uk`. Locale middleware resolves/redirects; English is the fallback locale. **All public static strings** (nav, filter chips, submit form, empty states, `/contact`, Code of Conduct) come from message catalogs; the **admin area stays English**. _[impl]_
- **I2** Event **content** follows the viewer's locale via `lib/pick-locale-field.ts`: locale `uk` shows `titleUk`/`descriptionUk` first with **per-field English fallback** (an event missing a UK field shows that field in English); locale `en` always shows English. Applies to list, detail, and org pages. English-only events render in English in either locale. _[impl]_
- **I3** Social metadata is locale-aware: `og:locale` reflects the shared page's locale, `og:locale:alternate` the other. The OG card keeps stacking both languages (UK on top when `titleUk` is present). _[impl]_

**Schema (S1–S8):**

- **S1** `endsAt DateTime?` — nullable for drop-ins.
- **S2** `Venue.region String` non-null (postcode lookup always returns it).
- **S3** Added `cancelledAt`, `cancellationNote`.
- **S4** Per-user submission rate limit: 5 events / 24h. Vercel KV or Neon row counter cleared by nightly cron. _[impl]_
- **S5** `Organization` table is in Phase 1 (admin-managed). `Event.organizationId` is the preferred display source; `organizerName` is the fallback for individual submitters. Admin can re-attach an event to a proper org at approval time. Self-service org onboarding is the only Org-related work deferred to Phase 2.
- **S6** No slugs in MVP. cuid URLs are the canonical share target.
- **S7** Submit form requires explicit `eventType` selection (radio, no silent default). _[impl]_
- **S8** `Event.publicContactEmail` / `publicContactMessenger` added for opt-in public contact (see A8). Nullable; populated only when the submitter chooses to publish, never from account contact. Resolved in schema.

**Security (Sec1–Sec6 + Sec7–Sec12 for `externalUrl` + Sec13 for public contact):**

- **Sec1** Image uploads via signed URLs from `/api/uploads/sign`. Scoped path `uploads/{userId}/{cuid}.{ext}`. Server-side file-type sniff (jpg/png/webp), EXIF strip via `sharp`, max 4000×4000. Pending-event images are not publicly indexable (Blob URL contains cuid; not enumerable, but mention in the privacy note). _[impl]_
- **Sec2** Code of Conduct page with explicit image-content policy. Admin reviews every image before approve. _[impl]_
- **Sec3** Auth.js v5 with JWT session cookies; CSRF on state-changing routes. Passwords hashed (bcrypt/argon2), never plaintext. No bearer-token submit path. _[impl]_
- **Sec4** Description format: plain text + `\n` only. Schema invariant locked above. _[impl]_
- **Sec5** OG image route returns `Cache-Control: public, max-age=86400, s-maxage=604800`. _[impl]_
- **Sec6** Sign-in, registration, and forgot-password responses never reveal whether an email is registered (no account enumeration); generic messaging. Verify Auth.js config. _[impl]_
- **Sec7** _(externalUrl)_ Scheme allowlist: `http://`, `https://`. All others rejected at submit. Schema invariant locked above.
- **Sec8** _(externalUrl)_ Render anchor with `rel="noopener noreferrer nofollow" target="_blank"`. _[impl]_
- **Sec9** _(externalUrl)_ Display the URL's hostname inline (e.g. "More info → facebook.com/events/123") so users see the destination before clicking. _[impl]_
- **Sec10** _(externalUrl)_ No server-side fetch of the URL in MVP. No preview cards, no oEmbed, no link-unfurl. Defers SSRF risk entirely. If Phase 2 adds previews, allowlist schemes + block private IP ranges (RFC 1918, 127/8, 169.254/16, ::1, fc00::/7).
- **Sec11** _(externalUrl)_ Admin reviews the URL during approval (visits it, confirms it's the organizer's own page or a recognisable channel). Phishing / malware mitigation is human, not automated, in MVP. Document in moderation playbook. _[impl]_
- **Sec12** _(externalUrl)_ On submit, strip known tracking params (`utm_*`, `fbclid`, `gclid`, `mc_eid`). Single list in `lib/clean-url.ts`. _[impl]_
- **Sec13** _(public contact)_ `publicContactMessenger` reuses the `http(s)` scheme allowlist + `lib/clean-url.ts`; `publicContactEmail` is format-validated and published as a `mailto:` the submitter opted into (the submit form shows a clear "this will be visible on the event page" warning; its scraping/spam exposure is then the submitter's informed, reviewable choice). Admin reviews both at approval; account-level contact is never auto-published. _[impl]_

**Edge cases (E1–E7):**

- **E1** Time zones: store UTC, display `Europe/London`. Online events show "(UK time)" suffix. No timezone picker in MVP.
- **E2** Date ranges centralized in `lib/date-ranges.ts`. "This week" = today + 6 days (rolling, not calendar). "This month" = today + 30 days. _[impl]_
- **E3** City filter URL slug: lowercase kebab-case (`?city=newcastle-upon-tyne`). Display label is separate (`Newcastle upon Tyne`). Normalization in middleware. _[impl]_
- **E4** Past events at `/events/[id]` render with an "Event has passed" badge, do not 404. Excluded from list view by default. _[impl]_
- **E5** Empty venue list UX: "+ Add a new venue" is the primary action when search returns zero. _[impl]_
- **E6** Admin escape hatch: `/admin/venues/new` allows manual venue creation bypassing the postcode lookup (for BFPO, GIR 0AA, brand-new postcodes). _[impl]_
- **E7** Duplicate-event detection deferred to Phase 2; admin rejects manually in MVP.

**Tests (T1–T5):**

- **T1** OG image snapshot test — Playwright + checked-in reference PNG. Non-negotiable.
- **T2** `normalizePostcode` unit test, ~10 cases.
- **T3** Server-side APPROVED-only filter test for `/events/[id]` and `/api/og/[id]`.
- **T4** City resolver fixture test for Bristol / London (N1) / Manchester / Glasgow.
- **T5** Content-locale resolution test for `lib/pick-locale-field.ts` (UK-first when locale `uk`, per-field English fallback, English-only events unchanged) + a locale-routing smoke test (`/uk` serves Ukrainian chrome, `/` defaults to English).

**Performance (P1–P4):**

- **P1** List query covered by `Event @@index([startsAt, status])` + join to `Venue.city`. Denormalize `Event.city` only if event count exceeds ~10k. Watch-point, not pre-optimization.
- **P2** Postcode proxy edge runtime, 3s function timeout, 30-day edge cache.
- **P3** OG card cached at edge for 7 days (`s-maxage=604800`).
- **P4** **Noto Serif** (Cyrillic + Latin, SIL OFL) self-hosted in `/public/fonts/`. Inline font data in the OG handler. No Google Fonts fetch from the edge function.

**Observability (O1–O3):**

- **O1** Vercel Analytics enabled for page-view tracking (cross-city click-through is the wedge metric).
- **O2** Nightly admin email via Vercel Cron when pending count > 0. Plus a real-time in-app notification (and email once the domain is live) to the admin when an owner cancels or deletes an APPROVED event.
- **O3** Sentry connected before launch. Free tier covers it.

**Deployment (D1–D4):**

- **D1** Domain + Resend DNS verification on Day 1 of Week 1.
- **D2** Vercel Blob default region (`iad1`) accepted for MVP. Revisit if image-heavy.
- **D3** Migrations via `prisma migrate deploy` in Vercel build command. No `db push` to prod.
- **D4** Migration discipline: no destructive migrations in the first month. Rollback = `vercel rollback`.

**Total resolved:** 42 (original review) + 6 (externalUrl security) = **48 concerns** addressed here, plus this revision's additions — **A8 / S8 / Sec13** (opt-in public contact), **I1–I3** (UI + content i18n), **T5**, and the Noto Serif resolution (P4).

## Routes

```
# Public pages are served under a locale prefix: /en (default) and /uk. /admin/* and /api/* are NOT localized.
/                              Filterable list of approved events (= home page)
/events/[id]                   Event detail (OG-optimized — the share target)
/events/[id]/edit              Owner self-edit (own event, PENDING only)
/submit                        Auth-gated submit form
/my/events                     Owner dashboard (edit-if-pending, cancel, delete own events)
/notifications                 In-app notification list (mark-as-read)
/profile                       User account: view/edit own info, delete account
/contact                       Admin/operator contact info + message form (public)
/admin                         Pending queue (ADMIN only)
/admin/orgs                    Organization CRUD (ADMIN only)
/admin/orgs/[id]               Edit org, toggle verification
/admin/events/[id]/edit        Edit any event (ADMIN only)
/admin/venues/new              Manual venue creation (ADMIN only — postcode-lookup escape hatch)
/admin/users                   User list — view contact, delete user (ADMIN only)
/admin/messages                Contact-message inbox (ADMIN only)
/orgs/[slug]                   Public org page (list of that org's events)
/auth/signin                   Email + password sign in
/auth/register                 Create account (email + password + contact fields)
/auth/verify                   Email-verification link target
/auth/forgot-password          Request a password-reset link
/auth/reset-password           Password-reset link target
/api/og/[id]                   Dynamic OG image generation
/api/postcode/[code]           postcodes.io proxy (edge cache)
/api/uploads/sign              Signed Vercel Blob upload URL
/api/events                    POST submit, GET list (city + date + online filters)
/api/events/[id]               PATCH owner edit (PENDING), DELETE soft-delete (own event)
/api/events/[id]/cancel        POST owner cancel (own event)
/api/notifications             GET list
/api/notifications/[id]/read   POST mark read
/api/account                   PATCH edit own profile, DELETE self (soft-delete + anonymize; events retained)
/api/contact                   POST message to admin (stores ContactMessage + alerts admin)
/api/admin/users/[id]          DELETE user (ADMIN only; soft-delete + anonymize; events retained)
/api/admin/events/[id]/approve POST
/api/admin/events/[id]/reject  POST
```

`/` is the filterable list. No separate marketing landing — the list is the landing. A first-time visitor sees: filter chips at the top (city, date range, online/in-person), events sorted by `startsAt` ascending, "Submit an event" CTA in the header.

**Filter behavior:**

- **City filter** is the hero — chips for each city with active events, plus "All UK". Default = "All UK" so the cross-city value is the first impression.
- **Date filter** — chips: "This week", "This month", "All upcoming". Default = "All upcoming".
- **Format filter** — chips: "All", "In person", "Online".
- All filters are URL-state (`?city=manchester&when=this-week`) so any filtered view is shareable into Telegram on its own. A Manchester-only link is itself a useful share.

## Venue + Postcode Lookup

The submit form's location step is the most error-prone part of the flow. Free-text city = typos and duplicates ("London", "london", "Lndon") that break the city filter. The fix:

**Flow:**

```
  Step 1 — User enters postcode:    [ BS1 6QT ]
            ↓
            postcodes.io fetch (debounced 400ms)
            ↓
  Step 2 — Auto-resolved (read-only):
            City:    Bristol
            Region:  South West
            ↓
  Step 3 — Venue picker:
            ┌───────────────────────────────────────┐
            │ Search venues in Bristol... ▾        │
            ├───────────────────────────────────────┤
            │  St Mary Redcliffe Church             │
            │  Bristol-Odesa Community Hub          │
            │  Watershed                            │
            │  ─────────────────────────────        │
            │  + Add a new venue                    │
            └───────────────────────────────────────┘
            ↓
  Step 4 — If "Add new":  [name] [address line (optional)]
                           → Venue row created with the
                             postcodes.io lat/lng cached
```

**Rules:**

- Postcode is normalized server-side (`BS16QT` → `BS1 6QT`) before storage.
- A failed postcodes.io lookup blocks the form — the user gets a clear error ("That postcode isn't recognised. Check it or contact us"). Don't allow free-text city fallback; it would defeat the filter.
- Venue search is scoped to the resolved city to keep dropdowns short.
- Duplicate venue detection: case-insensitive name match within the same postcode. On a match, show "Did you mean [existing venue]?" before creating a duplicate.
- For online events: venue UI is hidden entirely. The form shows an "Online URL" input instead.

**Why postcodes.io and not a paid service:**

| Service         | Cost               | Detail level                   | Fit                              |
| --------------- | ------------------ | ------------------------------ | -------------------------------- |
| postcodes.io    | Free               | Postcode → city/region/lat-lng | Right for venue-based events     |
| getAddress.io   | £0.025/lookup      | Postcode → every flat number   | Overkill — we don't list flat 4B |
| Royal Mail PAF  | Licensed/expensive | Full PAF                       | Overkill                         |
| Ideal Postcodes | £0.02-0.05/lookup  | Full PAF                       | Overkill                         |

You're matching events to venues, not delivering mail. postcodes.io covers it.

## OG Card — The Critical Path

This is what the project is about. Spec:

```
┌────────────────────────────────────────────────────────────┐
│  [type-glyph]                                              │
│                                                            │
│   Вечір української поезії                       ┌───────┐ │
│   Ukrainian Poetry Evening                       │  25   │ │
│                                                  │  MAY  │ │
│   📅  Сб, 25 травня  ·  7:00 pm                  │  Sat  │ │
│   📍  Bristol, BS5  ·  St Mary Redcliffe         └───────┘ │
│                                                            │
│   ─────────────────────────────────────────────────────    │
│   Bristol-Odesa Association                 ua-hub.org.uk  │
└────────────────────────────────────────────────────────────┘
```

**Spec details:**

- Dimensions: `1200 × 630`
- Background: cream `#FFF8EC` (A/B test against pure white in Telegram dark mode before locking)
- Primary text: deep navy `#1B2A41`
- Accent (date block, glyph): one warm tone — terracotta `#C46A4A` or muted gold
- Title font: **Noto Serif** (Cyrillic + Latin, SIL Open Font License — free commercial use), self-hosted in `/public/fonts/` and inlined in the OG handler. Ukrainian rendering verified.
- Body / UI text: Inter (Cyrillic-capable)
- Bilingual stacking: prominent language = the one stored on the event row. If `titleUk` is present, UK is on top, EN as subtitle. If only English, single title, no stack.
- Inline glyphs: 📅 date, 📍 location — small, low-contrast, never the hero.
- Event-type glyph top-left, single color, 24px.
- Footer strip: hairline divider, 16px text, organizer name on left, `ua-hub.org.uk` on right.

**Design direction: information-density first.** Communicate the most decision-relevant info in 1 second. Cultural styling (vyshyvanka borders, etc.) can layer in later once the information layout is locked.

`generateMetadata` on `/events/[id]` returns:

- `og:title` (language-aware)
- `og:description` (first ~200 chars)
- `og:image` — uploaded poster if present, otherwise `/api/og/[id]` rendering the card above
- `og:locale` + `og:locale:alternate`

**Test matrix before launch:** iOS Telegram, Android Telegram, Telegram desktop, WhatsApp, Signal. Screenshot each. Iterate until all five look good.

## Bilingual Strategy (reduced)

- Per-event fields: `titleEn`, `descriptionEn` required; `titleUk`, `descriptionUk` optional.
- **UI is bilingual: English (default) + Ukrainian**, via `next-intl` URL-prefixed locales (`/en`, `/uk`). All public static strings come from message catalogs; the admin area stays English. (See I1.)
- **Event content follows the viewer's locale (I2):** Ukrainian locale shows `titleUk`/`descriptionUk` first with **per-field English fallback**; English locale shows English. English-only events render in English in either locale.
- OG card stacks both languages when present; falls back to single language gracefully. `og:locale` tracks the shared page's locale (I3).

## Trust & Moderation

| Submitter              | Behavior                               |
| ---------------------- | -------------------------------------- |
| Any authenticated user | Pending → admin review (within 3 days) |
| Admin                  | Auto-approve                           |

Submit form shows: _"Reviewed within 3 days."_

Solo admin gets a nightly email with the pending count (skipped if zero). Telegram bot for admin notifications is a Phase-2 nice-to-have.

At review time the admin sees the submitter's contact — first name, surname, `phone`, `messengerUrl` — and a **"mark contact verified"** action (`contactVerifiedAt`). This contact data is admin-only and never shown publicly; the admin uses it to verify identity and reach out.

Separately, a submitter may **opt to publish a per-event public contact** (`publicContactEmail` / `publicContactMessenger`) shown on the event detail page (A8). These are distinct fields from the admin-only account contact above and appear only when the submitter fills them. The admin reviews them at approval (valid scheme/format, not abusive) alongside the `externalUrl` check.

### Notifications

Two-way, in-app + email (email deferred until the domain + Resend sender are live; in-app works immediately):

| Trigger                                                  | Recipient | Channels       |
| -------------------------------------------------------- | --------- | -------------- |
| Owner cancels or **deletes an APPROVED (public) event**  | Admin     | in-app + email |
| Admin **approves / rejects / edits / cancels / deletes** | Owner     | in-app + email |

Withdrawing a still-`PENDING` event is silent (no admin notification). Persisted in the `Notification` model (`readAt` for in-app state, `emailedAt` once mailed). A per-user "turn off email notifications" toggle on a settings page is **Phase 2**; the `User.emailNotificationsEnabled` field (default true) exists now so the toggle is a UI-only addition later.

### Accounts & Contact

- **Profile / account page (`/profile`).** A signed-in user views and edits their own info (first name, surname, `phone`, `messengerUrl`; an email change re-triggers verification once enforcement is live). This page is also the future home of the email-notification toggle.
- **Account deletion (self or admin).** Deleting a user **soft-deletes and anonymizes** the `User` row — clear `passwordHash` (no further login), scrub `email` to a non-identifying placeholder (frees it for re-registration), clear names / `phone` / `messengerUrl` / `contactVerifiedAt`, set `deletedAt`, invalidate sessions. **The user's `Event` rows are retained** (the `createdBy` link is preserved, pointing at the anonymized tombstone), so no events disappear when an account is removed. The user self-serves at `/profile`; the admin can delete any user at `/admin/users`.
- **Contact the admin.** `/contact` shows the operator's contact details (see Open Question 1) and a message form. A submission is stored as a `ContactMessage` and surfaced in the admin inbox (`/admin/messages`) with an unread count; an email to the admin follows once the domain is live (the in-app inbox works immediately).

### Auth & email verification — v1 posture

Auth is **email + password** (Auth.js v5 Credentials provider, JWT session strategy). Email verification is a separate link sent on registration; a forgot-password link handles resets. **Both email flows are implemented in v1, but their email sending + enforcement are deferred until the custom domain + Resend sender are live (see Build Order / D1) — password login needs no email, so it works pre-domain.** Passwords are hashed (bcrypt/argon2); sign-in / registration / forgot-password responses never reveal whether an email is registered.

What v1 deliberately does _not_ add:

- **Disposable-email blocklists** — premature. The realistic v1 spammer can submit 5 events/day (rate limit S4); admin rejects them; the user gives up. Adding a blocklist is friction for legitimate users with privacy-focused email providers (e.g. ProtonMail aliases) and only catches the laziest bad actors.
- **Per-user signup approval** — premature. Adds a second moderation queue and slows down good-faith first-time submitters. Only worth it if real spam appears.
- **Org-domain email verification** — irrelevant in v1 because orgs are admin-created. There is no self-claim flow to attack.

**The stronger verification work belongs in Phase 2 as a prerequisite to org self-service**, not bolted onto v1:

- "Claim your org" requires proving control of the org's website domain (e.g. via DNS TXT record or a one-time email to a `webmaster@` style address).
- Verified-org auto-approve requires a trust mechanism that survives without admin in the loop.
- `OrgMember` invites require email-to-membership binding.

**Trigger to revisit v1 auth early:** if the admin queue starts seeing >2 spam submissions per week from distinct accounts. At that point, evaluate the disposable-email blocklist (~30 min to add). Before that signal, do nothing.

## Phases

**Organizations are first-class from Phase 1.** All launch events come from orgs (Bristol-Odesa and 2+ partner charities). The Org table exists from day one and is admin-managed. What gets deferred is _self-service org onboarding_ — letting a stranger create their own org without admin involvement.

| Phase         | Span        | Goal                                             | Org model status                                          |
| ------------- | ----------- | ------------------------------------------------ | --------------------------------------------------------- |
| **Phase 1**   | Weeks 1–2   | Ship the cross-silo directory + share card       | Org table exists, admin creates rows                      |
| **Phase 1.5** | Weeks 3–4   | Seed across cities, observe, fix, buffer         | (no model change)                                         |
| **Phase 2**   | Post-launch | Self-service org onboarding + retention features | Member invites, claim-your-org, verified-org auto-approve |
| **Phase 3**   | Later       | Monetization                                     | Org-level Pro tier                                        |

## Build Order — 4 Weeks Solo

### Phase 1, Week 1 — Foundation + Org + Submit + Venue

- `create-next-app` + Tailwind + shadcn/ui
- **next-intl** scaffolding: locale middleware, `/[locale]` routing (`/en` default, `/uk`), EN/UK message catalogs (grown per surface), and self-hosted **Noto Serif** fonts in `/public/fonts/`
- Prisma + Neon connection + first migration (User + Organization + Venue + Event + Notification + token tables)
- Auth.js v5 — email + password (Credentials provider, JWT sessions) with registration (collects first name, surname, phone and/or messenger link), email-verification link, and forgot-password link. Email sending (verification + reset) deferred until the domain + Resend sender are live; password login works without it.
- `/admin/orgs` — minimal CRUD: create with `slug`, `nameEn`, optional `nameUk`, `website`, `logoUrl`, `isVerified` toggle. List + edit + soft-delete.
- `/api/postcode/[code]` server route — proxies postcodes.io with edge cache (30-day `s-maxage`)
- `/submit` form (auth-gated):
  - **Organization dropdown** — searchable list of all Organizations. Admin submitters can pick any; regular submitters either pick an existing org or leave blank + fill `organizerName` as the display label (admin can re-attach to a proper org during approval).
  - postcode input with debounced lookup, city/region read-only display
  - venue picker (searchable dropdown scoped to resolved city) + "Add new venue" inline
  - Online-event toggle that hides venue UI and shows onlineUrl input
  - Optional "More info" URL input (`externalUrl`) — scheme-validated, tracking params stripped
  - Optional **public-contact** section (`publicContactEmail` and/or `publicContactMessenger`) — opt-in, shown on the event page; messenger scheme-validated, email format-validated; distinct from the private account contact
  - eventType radio (required, no silent default)
  - Image upload via signed Vercel Blob URL (file-type sniff, EXIF strip, 5MB max)
- `/admin` pending queue + approve/reject + **attach-to-org dropdown** at approval time
- `/admin/events/[id]/edit` — admin-only event edit (covers reschedules, cancellations, soft-delete, typo fixes)
- `/events/[id]/edit` — owner self-edit while the event is `PENDING` (reuses the submit form); `/my/events` owner dashboard to edit (if pending), cancel, or soft-delete own events
- In-app + email notifications (`Notification` model): owner cancel/delete of an APPROVED event notifies the admin; admin approve/reject/edit/cancel/delete notifies the owner. In-app works immediately; email sending deferred until the domain is live.

_Time risk: the venue picker and org-attach flows are the highest-effort pieces of Week 1. If they slip, ship the "type a free-text organizer name" fallback and push the dropdown polish to Week 4._

### Phase 1, Week 2 — Public Surface + OG Card (the differentiator and the hook)

- `/` filterable list — city chips, date chips, online/in-person chips. URL state. Translated chrome (next-intl) + content-locale resolution (`lib/pick-locale-field.ts`).
- `/events/[id]` server component, 404 on missing or non-approved; renders opt-in public contact (A8) + content-locale resolution (UK-first, English fallback)
- `/orgs/[slug]` public org page — list of that org's approved events, plus verification badge
- `/api/og/[id]` route — implement the card spec above
- Cyrillic font rendering verification (allocate a half-day; highest-risk task)
- `generateMetadata` with og:title / description / image / locale
- Cross-client test matrix (iOS/Android/desktop Telegram, WhatsApp, Signal)
- Telegram-share button on detail page (shares with city in the URL)
- Deploy to Vercel + custom domain
- **Real Telegram group test on launch night**

### Phase 1.5, Week 3 — Seed Across Cities + Share + Fix

- Create 3+ Organization rows in `/admin/orgs` (Bristol-Odesa + 2 partner charities). Set `isVerified = true` for known orgs.
- Manually enter 20+ events across **at least 3 UK cities** (Bristol, Manchester, London or whichever orgs you can reach), each attached to its Organization.
- Post into existing Bristol / UK Ukrainian Telegram and WhatsApp groups. Share both an event link _and_ a filtered list link ("see all UA events in the UK this month") _and_ an org page link.
- Watch what happens. Fix what breaks within hours.
- Three metrics:
  1. Does anyone forward a link to another group?
  2. Does anyone click into a city other than their own? (URL params + Vercel Analytics.)
  3. Does anyone click into an org page from a Telegram share?

### Phase 1.5, Week 4 — Buffer (real, not aspirational)

- If discovery is happening: polish the card based on real feedback, add Ukrainian fields where seeded events are missing them, normalize the city list, add a "follow this city" RSS / iCal export.
- If discovery isn't happening: do not add features. Talk to organizers. Find out why they didn't share. The product isn't done — the diagnosis isn't done.

## Success Criteria

**Launch (Week 2):**

- Submit → approve → publish flow works end-to-end
- Sharing an event link into a real Telegram group produces a rich preview card that looks designed, not generated
- The filterable list shows events from **at least 3 UK cities** on launch day
- 20+ events live from at least 3 seed organizations across those cities

**Month 1 post-launch:**

- 5+ external submissions (not seeded)
- 1+ org messages you to thank you / request changes / submit more
- A link gets forwarded between Telegram groups in different cities — the cross-city signal
- At least one user views events for a city they don't live in (URL log evidence)

**Month 3:**

- 50+ approved events across 5+ cities
- Decision: add keyword search, map view, "follow a city" notifications

## Distribution Plan

1. Pre-launch (Week 3): seed 20+ events from known orgs, manually entered with their permission.
2. Launch: post in existing Bristol / UK Ukrainian Telegram and WhatsApp groups with rich-preview event links.
3. Outreach to 5–10 charities — pitch as _"your events get a permanent home; you share the same link as today, but with a better preview."_
4. SEO is not a Phase 1 goal.

## Dependencies

- Vercel account (free Hobby tier)
- Neon account (free tier)
- Resend account (free 3k emails/mo)
- postcodes.io (free public API, no account)
- Domain (~£5/yr — `.org.uk` recommended)

No Stripe. No Supabase. No paid services in v1.

## Phase 2 (post-launch, scope-permitting)

**Org self-service** (the unlock from Phase 1's admin-only org management):

- "Claim your org" flow — known org email domain triggers a claim invite
- `OrgMember` model + member invite links
- Org-owner self-edit on `/orgs/[slug]/edit`
- Verified-org auto-approve logic on event submissions

**Discovery** (built on the now-populated directory):

- Keyword search across event content
- Map view of in-person events
- "Follow a city" — email/RSS digest when new events approved in selected cities
- `next-intl` admin-area translation + deeper content i18n (public UI is already bilingual in v1)
- Recurrence (materialize N child events on approval)
- Postcode-prefix filtering

## Phase 3

- Stripe Pro tier
- Self-feature paid promotion
- Pro perks (analytics, quotas, priority moderation)
- Services and Organizations directories

## Open Questions

1. **Owner identity / contact** — who is the named operator for admin emails and contact form replies? (Now also surfaced on the public `/contact` page, so resolving this is a launch dependency for that page's content.)
2. **Domain choice** — `ua-hub.org.uk` / `uahub.uk` / `bristol-ua.org.uk` / something else?
3. **Seed sources** — which charities/orgs will agree to seed events before launch?
4. **Image moderation** — any pre-launch policy on poster content (NSFW, political)?
5. **Time zones** — `Europe/London` for all in-person events; do online events need timezone support in v1?
6. **Font licensing — RESOLVED:** **Noto Serif** (SIL Open Font License) covers Cyrillic + Latin, clears commercial use on Vercel, self-hosted in `/public/fonts/`.
7. **Ukrainian copy — APPROACH SET:** the assistant drafts the `uk` message catalog from the English strings; a native Ukrainian speaker reviews and corrects before launch. Routing + English fallback work regardless, so the `uk` strings can land during Week 3 seeding.

## The Brief

Before any code, screenshot ten existing Telegram posts about Ukrainian events from real groups. Pin them in a folder. The OG card has to look better than those casual text-and-photo posts at a glance — not better than Eventbrite. The competition is the status quo, not the polished platform.

---

_Reduced from a 4-week-everything design via `/plan-ceo-review` + `/office-hours`. Original schema and route list preserved in git history._

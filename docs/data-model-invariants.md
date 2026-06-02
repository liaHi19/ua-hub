# Data Model Invariants

Phase-1 Prisma schema invariants for UA Hub. The schema lives in
[prisma/schema.prisma](../prisma/schema.prisma); field definitions are sourced from
`standards/database-schema.md`. Some invariants are enforced by the database (FKs,
unique constraints, indexes); the rest **must** be enforced in the submit/approve/
account handlers — the DB cannot express them.

## Enforced at the database layer

- **Unique:** `Organization.slug`, `User.email`, `Venue(postcode, nameNormalized)`,
  `EmailVerificationToken.token`, `PasswordResetToken.token`.
- **Indexes:** `Organization(isVerified)`, `Venue(city)`, `Venue(postcode)`,
  `Event(startsAt, status)`, `Notification(userId, readAt)`, `ContactMessage(readAt)`.
- **Referential actions (`onDelete`):**
  - `Event.createdBy` → **Restrict** — events never cascade-delete with an account.
    A user who owns events cannot be hard-deleted; they must be soft-deleted +
    anonymized instead (see account deletion below).
  - `Event.venue` → **SetNull**, `Event.organization` → **SetNull** — deleting a venue
    or organization orphans the display label, never the event.
  - `Notification.user` → **Cascade** — a user's notifications are removed with the user
    row (notifications hold no PII worth retaining).
  - `Notification.event` → **SetNull** — a notification survives if its event is hard-deleted.
- All datetimes are stored in **UTC** (`TIMESTAMP(3)`); the app is responsible for
  timezone presentation.

## Enforced in application handlers (not expressible in the schema)

- An approved `Event` has either `venueId` set (in-person) **or** `isOnline = true` with a
  non-null `onlineUrl`.
- An approved `Event` has either `organizationId` set **or** a non-empty `organizerName`
  (at least one display label exists). When both are set, the Organization name wins on
  display and `organizerName` is ignored.
- `descriptionEn` (and `descriptionUk`) are **plain text + line breaks only** — no markdown,
  no HTML. The renderer maps `\n` → `<br>` and nothing else.
- `externalUrl`, `onlineUrl`, and `publicContactMessenger`, if present, are `http://` or
  `https://` only. Rejected schemes: `javascript:`, `data:`, `file:`, `vbscript:`, `about:`.
  Validated server-side on submit (reuse `lib/clean-url.ts`). `publicContactMessenger` and
  `User.messengerUrl` are **`https://` only**.
- `publicContactEmail` is format-validated and rendered as a `mailto:` the submitter
  knowingly publishes.
- **Required fields:** `titleEn`, `descriptionEn`, and `eventType` are required from day one.
  UK fields are optional and filled per-event when the organizer provides them.

## Privacy invariants

- User contact data — `firstName`, `lastName`, `phone`, `messengerUrl` — is **admin-only and
  never rendered on public pages**. The public organizer label is the `Organization` name or
  `Event.organizerName`.
- **Per-event public contact is separate and opt-in.** `Event.publicContactEmail` /
  `Event.publicContactMessenger` are the *only* submitter-provided contact ever shown
  publicly, and only when the submitter fills them on submit. They are **never** populated
  from the admin-only account fields above. Admin reviews both at approval.

## Lifecycle invariants

- `cancelledAt` is set independently of `status` — an admin can mark an APPROVED event as
  cancelled without rejecting it. The detail page and OG card render a "Cancelled" badge.
- `deletedAt` (soft-delete) excludes an event from all public surfaces and 404s the detail
  route. Owner or admin may set it.
- **Account deletion** (self-service or admin) **soft-deletes + anonymizes** the `User` row:
  clear `passwordHash`; scrub `email`, names, `phone`, `messengerUrl`, `contactVerifiedAt`;
  set `deletedAt`. The user's `Event` rows are **retained** — events never cascade-delete
  with an account (mirrors the `Restrict` FK above).

## City filtering

- The city filter joins through `Venue.city`. Online events appear only under the "Online"
  chip, never under any city chip.

## Migrations workflow (Prisma 7 + Neon)

- The datasource URL is **not** in `schema.prisma` (Prisma 7 breaking change); connection
  config lives in [prisma.config.ts](../prisma.config.ts), which loads `.env.local` and
  prefers a direct (non-pooled) URL (`DIRECT_URL` / `DATABASE_URL_UNPOOLED`) for migrations,
  falling back to `DATABASE_URL`.
- Always create migrations with `pnpm db:migrate` (`prisma migrate dev`); never `db push`.
- Run `pnpm db:migrate:status` before committing. Production runs `pnpm db:migrate:deploy`.
- The Prisma client is generated to `src/generated/prisma` (gitignored; regenerated via the
  `postinstall` hook and at build time) and instantiated through the Neon driver adapter in
  [src/lib/prisma.ts](../src/lib/prisma.ts).

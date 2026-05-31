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
- **Per-event public contact is separate and opt-in.** `Event.publicContactEmail` / `Event.publicContactMessenger` are the *only* submitter-provided contact ever shown publicly, and only when the submitter fills them on submit. They are **never** populated from the admin-only account fields above. `publicContactMessenger` is `https://` only (reuse `lib/clean-url.ts`); `publicContactEmail` is format-validated and rendered as a `mailto:` the submitter knowingly publishes. Admin reviews both at approval.
- Deleting a `User` (self-service or admin) **soft-deletes + anonymizes** the row (clear `passwordHash`; scrub `email`, names, `phone`, `messengerUrl`, `contactVerifiedAt`; set `deletedAt`) — but **the user's `Event` rows are retained**; events never cascade-delete with an account.

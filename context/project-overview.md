# UA Hub — Technical Architecture

## System Context

UA Hub is a server-rendered web application built on a modular monolith architecture. The platform consists of a Next.js application deployed on Vercel, backed by a Neon PostgreSQL database, with external integrations for storage, email delivery, postcode resolution, monitoring, and analytics.

```text
┌─────────────────────────────────────────────────────────────┐
│                        Client Layer                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Browser (EN/UK)                                            │
│  Telegram WebView                                           │
│  WhatsApp / Signal Link Preview Crawlers                    │
│                                                             │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTPS
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                      Vercel Platform                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Next.js 16 Application                                     │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Presentation Layer                                  │    │
│  │ - Event Directory                                   │    │
│  │ - Event Detail Pages                                │    │
│  │ - Submission Forms                                  │    │
│  │ - Admin Portal                                      │    │
│  │ - Organization Pages                                │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Application Layer                                   │    │
│  │ - Event Service                                     │    │
│  │ - Moderation Service                                │    │
│  │ - Venue Service                                     │    │
│  │ - Organization Service                              │    │
│  │ - Notification Service                              │    │
│  │ - User Service                                      │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ API Layer                                           │    │
│  │ - REST Endpoints                                    │    │
│  │ - Auth Middleware                                   │    │
│  │ - Validation                                        │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
└──────────────────────────┬──────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                  ▼

┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│ Neon Postgres │  │ Vercel Blob   │  │ Resend        │
│ Prisma ORM    │  │ Image Storage │  │ Email         │
└───────────────┘  └───────────────┘  └───────────────┘

        ▼
┌─────────────────────────────────────────┐
│ External Services                        │
├─────────────────────────────────────────┤
│ postcodes.io                             │
│ Sentry                                   │
│ Vercel Analytics                         │
└─────────────────────────────────────────┘
```

---

# Architecture Style

## Modular Monolith

UA Hub is implemented as a single deployable application with clear domain boundaries.

Reasons:

- Small team (solo developer)
- Fast iteration cycle
- Low operational overhead
- Simple deployment model
- No distributed system complexity

All business capabilities are implemented as internal modules rather than independent services.

```text
src/
├── app/
├── components/
├── features/
│   ├── events/
│   ├── organizations/
│   ├── venues/
│   ├── moderation/
│   ├── notifications/
│   ├── auth/
│   └── users/
├── lib/
├── prisma/
└── messages/
```

---

# Logical Architecture

## Presentation Layer

### Responsibilities

- Rendering pages
- Locale selection
- Form handling
- Filter state management
- SEO metadata generation

### Technologies

- Next.js App Router
- React Server Components
- TailwindCSS
- shadcn/ui
- next-intl

### Key Pages

```text
/en
/uk

/events/[id]
/submit
/my/events

/admin
/admin/orgs
/admin/events

/orgs/[slug]
```

---

## Application Layer

Contains business logic.

### Event Service

Responsible for:

- Event creation
- Event updates
- Approval workflow
- Cancellation workflow
- Filtered event retrieval

```text
Create Event
      │
      ▼
Validation
      │
      ▼
PENDING
      │
      ▼
Moderation
      │
 ┌────┴────┐
 ▼         ▼

APPROVED REJECTED
```

---

### Venue Service

Responsibilities:

- Postcode lookup
- Venue creation
- Venue deduplication
- City normalization

```text
Postcode
   │
   ▼
postcodes.io
   │
   ▼
Resolve City
   │
   ▼
Find Existing Venue
   │
 ┌─┴─┐
 │   │
Yes  No
 │   │
 ▼   ▼

Reuse Create
```

---

### Moderation Service

Responsibilities:

- Approval decisions
- Rejection handling
- Verification workflows
- Audit logging

Access restricted to ADMIN role.

---

### Organization Service

Responsibilities:

- Organization CRUD
- Verification badges
- Organization-event relationships

Phase 1:

- Admin managed only

Phase 2:

- Self-service onboarding

---

### Notification Service

Responsibilities:

- Notification persistence
- Email dispatch
- Read-state management

Events generated from moderation actions.

---

### User Service

Responsibilities:

- Registration
- Login
- Profile management
- Soft deletion
- Email verification

---

# Data Architecture

## Database

### Technology

Neon PostgreSQL

### Access Layer

Prisma ORM

```text
Application Service
        │
        ▼
     Prisma
        │
        ▼
Neon PostgreSQL
```

---

## Core Entity Relationships

```text
User
 │
 │ 1:N
 ▼
Event
 │
 ├──────────────┐
 ▼              ▼

Venue      Organization
 │              │
 └──────┬───────┘
        ▼

Notification
```

### Primary Tables

| Table                  | Purpose              |
| ---------------------- | -------------------- |
| User                   | Identity & access    |
| Organization           | Community groups     |
| Venue                  | Normalized locations |
| Event                  | Event directory      |
| Notification           | User notifications   |
| ContactMessage         | Admin inbox          |
| EmailVerificationToken | Verification flow    |
| PasswordResetToken     | Password reset       |

---

# Authentication Architecture

## Auth.js v5

Authentication uses Credentials Provider.

```text
User Login
     │
     ▼
Auth.js
     │
     ▼
Password Validation
     │
     ▼
JWT Session Cookie
     │
     ▼
Protected Routes
```

### Roles

```text
USER
ADMIN
```

Authorization is enforced at:

- Page level
- API route level
- Service level

---

# API Architecture

## Public APIs

```text
GET  /api/events
GET  /api/postcode/[code]
GET  /api/notifications
POST /api/contact
```

## User APIs

```text
POST   /api/events
PATCH  /api/events/[id]
DELETE /api/events/[id]

POST   /api/events/[id]/cancel
PATCH  /api/account
DELETE /api/account
```

## Administrative APIs

```text
POST /api/admin/events/[id]/approve
POST /api/admin/events/[id]/reject

DELETE /api/admin/users/[id]
```

### Validation

All endpoints perform:

- Authentication checks
- Authorization checks
- Schema validation
- Business rule validation

---

# Storage Architecture

## Database Storage

Stores:

- Users
- Events
- Organizations
- Venues
- Notifications

## Blob Storage

Stores:

- Event posters
- Organization logos

Upload flow:

```text
Client
  │
  ▼

Request Upload URL
  │
  ▼

Signed URL
  │
  ▼

Upload Directly
  │
  ▼

Vercel Blob
```

Advantages:

- Application servers avoid large file uploads
- Reduced memory consumption
- Better scalability

---

# Internationalization Architecture

## Routing

```text
/en/events/123
/uk/events/123
```

### Locale Resolution

```text
Requested Locale
        │
        ▼

Field Exists?
        │
    ┌───┴────┐
    ▼        ▼

Yes         No
    │        │
    ▼        ▼

Use UK    Fallback EN
```

### Translation Sources

| Type          | Source            |
| ------------- | ----------------- |
| UI Text       | next-intl catalog |
| Event Content | Event fields      |
| Admin UI      | English only      |

---

# OG Card Architecture

The OG card is a strategic acquisition component.

```text
Telegram Share
       │
       ▼

/events/[id]
       │
       ▼

generateMetadata()
       │
       ▼

Uploaded Image?
       │
 ┌─────┴─────┐
 ▼           ▼

Yes         No
 │           │
 ▼           ▼

Poster    Dynamic OG
               │
               ▼
        /api/og/[id]
```

### Rendering Stack

- @vercel/og
- Noto Serif
- Dynamic event data
- Edge runtime

---

# Caching Strategy

## Event Directory

Server-rendered with database queries.

### Postcode API

```text
Cache-Control:
s-maxage=2592000
```

30-day edge cache.

---

### OG Images

```text
Cache-Control:
max-age=86400
s-maxage=604800
```

1-day browser cache.

7-day edge cache.

---

# Security Architecture

## Input Security

Validation layers:

```text
Client Validation
        │
        ▼
Server Validation
        │
        ▼
Business Rules
        │
        ▼
Database Constraints
```

---

## File Security

Upload process:

```text
Upload
   │
   ▼

File Type Check
   │
   ▼

Dimension Check
   │
   ▼

EXIF Removal
   │
   ▼

Blob Storage
```

---

## URL Security

Allowed:

```text
https://
http://
```

Blocked:

```text
javascript:
data:
file:
vbscript:
about:
```

---

## Content Security

Descriptions stored as:

```text
Plain Text
+ Line Breaks
```

Not supported:

- HTML
- Markdown
- Script tags
- Rich embeds

---

# Observability

## Monitoring

Captures:

- Exceptions
- Failed requests
- Runtime errors

### Vercel Analytics

Tracks:

- Page views
- Filter usage
- Cross-city navigation

### Admin Notifications

Nightly cron:

```text
Pending Events > 0
        │
        ▼
Admin Email
```

---

# Deployment Architecture

## CI/CD

```text
GitHub
   │
   ▼

Vercel Build
   │
   ▼

Prisma Migrate Deploy
   │
   ▼

Production Deploy
```

### Environments

```text
Development
     │
     ▼

Preview
     │
     ▼

Production
```

### Rollback

```text
Vercel Rollback
```

No database rollback expected during MVP unless migration errors occur.

---

# Non-Functional Characteristics

| Attribute       | Strategy                                  |
| --------------- | ----------------------------------------- |
| Availability    | Vercel + Neon managed infrastructure      |
| Scalability     | Serverless horizontal scaling             |
| Performance     | Edge caching, server components           |
| Security        | Moderation + validation + least privilege |
| Maintainability | Modular monolith                          |
| Cost            | Free-tier optimized                       |
| Localization    | English + Ukrainian                       |
| Compliance      | GDPR-conscious data minimization          |

---

# Architecture Summary

UA Hub uses a modern serverless modular-monolith architecture built on:

- Next.js 16
- TypeScript
- Prisma
- Neon PostgreSQL
- Auth.js
- Vercel Blob
- Resend
- next-intl

The design prioritizes rapid delivery, low operational complexity, moderation-driven trust, and highly shareable event content while supporting future evolution into a broader Ukrainian community platform.

# Elpima Surgicals Limited — Enterprise Backend API & Quotation Engine

[![Node.js Version](https://img.shields.io/badge/Node.js-20%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Framework](https://img.shields.io/badge/Framework-Express%204-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![Database](https://img.shields.io/badge/Database-PostgreSQL%20%7C%20Prisma%20ORM-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/)
[![Cache & Queues](https://img.shields.io/badge/Cache%20%26%20Queues-Redis%20%7C%20BullMQ-DC382D?logo=redis&logoColor=white)](https://redis.io/)
[![Real-Time](https://img.shields.io/badge/Real--Time-Server--Sent%20Events%20(SSE)-007ACC)](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)
[![Security](https://img.shields.io/badge/Security-TOTP%202FA%20%7C%20Token%20Rotation-blue?logo=shield)](https://jwt.io/)
[![Tests](https://img.shields.io/badge/Tests-Vitest%20%7C%20Supertest-6E9F18?logo=vitest&logoColor=white)](https://vitest.dev/)

Production-grade, high-resilience REST API, surgical equipment catalog, and interactive WhatsApp Request-for-Quotation (RFQ) engine powering **Elpima Surgicals Limited** (RC-1849204) — medical, hospital, and surgical instrument importers and distributors in Nigeria and West Africa.

---

## 📋 Table of Contents

1. [Problems the Application Solves](#-problems-the-application-solves)
2. [Architectural Design](#-architectural-design)
   - [System Topology & Data Flow](#system-topology--data-flow)
   - [Dual-Process Execution Model](#dual-process-execution-model)
   - [Layered Modular Architecture](#layered-modular-architecture)
   - [Resilient Universal Caching](#resilient-universal-caching)
   - [Real-Time Push Distribution (SSE + Pub/Sub)](#real-time-push-distribution-sse--pubsub)
   - [Security & Session Architecture](#security--session-architecture)
3. [Engineering Tradeoffs & Rationale](#-engineering-tradeoffs--rationale)
   - [1. WhatsApp RFQ Engine vs. Consumer E-Commerce Cart & Checkout](#1-whatsapp-rfq-engine-vs-consumer-e-commerce-cart--checkout)
   - [2. Dynamic RFQ Pricing vs. Fixed Public Catalog Prices](#2-dynamic-rfq-pricing-vs-fixed-public-catalog-prices)
   - [3. Dual-Process (Server + Worker) vs. Monolithic Single Process](#3-dual-process-server--worker-vs-monolithic-single-process)
   - [4. PostgreSQL + Prisma ORM vs. NoSQL / Document Store](#4-postgresql--prisma-orm-vs-nosql--document-store)
   - [5. Redis with Bounded In-Memory Map Fallback vs. Hard Redis Dependency](#5-redis-with-bounded-in-memory-map-fallback-vs-hard-redis-dependency)
   - [6. Server-Sent Events (SSE) vs. WebSockets for Administrative Alerts](#6-server-sent-events-sse-vs-websockets-for-administrative-alerts)
   - [7. Anti-Theft Refresh Token Rotation (with 20s Grace Window) vs. Pure Stateless JWTs](#7-anti-theft-refresh-token-rotation-with-20s-grace-window-vs-pure-stateless-jwts)
   - [8. Point-in-Time Quote Item Snapshotting vs. Pure Foreign Key References](#8-point-in-time-quote-item-snapshotting-vs-pure-foreign-key-references)
   - [9. Nanoid Human-Friendly Reference Codes vs. Auto-Incrementing IDs or UUIDs](#9-nanoid-human-friendly-reference-codes-vs-auto-incrementing-ids-or-uuids)
   - [10. In-Memory / Distributed Concurrency Idempotency Locks vs. DB Pessimistic Locking](#10-in-memory--distributed-concurrency-idempotency-locks-vs-db-pessimistic-locking)
4. [Complete Codebase & Directory Structure](#-complete-codebase--directory-structure)
5. [Data Models & Database Schema](#-data-models--database-schema)
6. [Comprehensive API Route Reference](#-comprehensive-api-route-reference)
   - [Standard Request & Response Envelopes](#standard-request--response-envelopes)
   - [Sample Payloads & Concrete cURL Examples](#sample-payloads--concrete-curl-examples)
   - [Root & Service Directory](#root--service-directory)
   - [Health Check](#health-check)
   - [Authentication & Sessions (15 Endpoints)](#authentication--sessions)
   - [Two-Factor Authentication (TOTP)](#two-factor-authentication-totp)
   - [Products Catalog (7 Endpoints)](#products-catalog)
   - [Categories (5 Endpoints)](#categories)
   - [Specialties (5 Endpoints)](#specialties)
   - [Quotes & WhatsApp RFQ Engine (7 Endpoints)](#quotes--whatsapp-rfq-engine)
   - [Supervising Managers Administration (6 Endpoints)](#supervising-managers-administration)
   - [In-App Notifications & Live SSE (5 Endpoints)](#in-app-notifications--live-sse)
   - [Analytics & Executive Dashboard (1 Endpoint)](#analytics--executive-dashboard)
   - [Audit Logs & Compliance (2 Endpoints)](#audit-logs--compliance)
   - [Store Settings (2 Endpoints)](#store-settings)
   - [Media & File Uploads (2 Endpoints)](#media--file-uploads)
7. [Security & Hardening Standards](#-security--hardening-standards)
8. [Environment Configuration Reference](#-environment-configuration-reference)
9. [Local Development, Docker & Deployment](#-local-development-docker--deployment)

---

## 🏥 Problems the Application Solves

B2B surgical and medical device procurement in emerging markets (particularly Nigeria and West Africa) operates under economic, infrastructural, and regulatory dynamics that break conventional consumer e-commerce platforms:

### 1. Foreign Exchange (FX) Volatility & Dynamic Price Quoting
High-grade surgical instruments (titanium orthopedic implants, laparoscopy towers, electrocautery machines, autoclave sterilizers) are predominantly imported from European, American, and Asian manufacturers. Due to volatile local currency fluctuations (e.g., NGN/USD/EUR exchange shifts), international freight rate adjustments, and import clearing tariffs, **displaying fixed public prices on a website is financially hazardous**. Static prices quickly become inaccurate, leading to broken supplier margins or broken trust with procurement officers. Elpima API replaces fixed checkout prices with an interactive **Quotation & RFQ Engine**, delivering live negotiated pricing tailored to order volumes, hospital facility tiers, and delivery terms.

### 2. High Friction of E-Commerce Checkout in Clinical Institutions
Surgeons, theater nurses, and hospital procurement committees **do not buy laparoscopes or orthopedic drills using a consumer shopping cart with an instant credit card checkout**. Hospital purchases require administrative review, budget justification, proforma invoicing, and management sign-off. Forcing clinical professionals through registration passwords, account verifications, and online debit card checkouts results in near-100% bounce rates. Elpima eliminates this friction by providing a frictionless digital catalog where medical practitioners select items, add quantities and custom requirements, and click to generate an official inquiry instantly.

### 3. Medical Specialty Taxonomy & Technical Compliance
General e-commerce search engines do not understand clinical hierarchies. A theater surgeon searching for "bone rongeurs" needs to filter by **Surgical Specialty** (Orthopedics, Neurosurgery, Cardiothoracic, OB/GYN, General Surgery) and inspect international quality certifications (**ISO 13485**, **CE Mark**, **NAFDAC Registration**, autoclavability, and titanium vs. medical-grade stainless steel metallurgy). Elpima API structures products around strict medical schemas, technical specifications, and compliance badges.

### 4. The WhatsApp Dominance in African Healthcare Operations
Across Nigeria and the African continent, healthcare commerce runs on **WhatsApp**. Doctors, hospital administrators, and medical sales representatives conduct urgent inquiries, logistics updates, and stock checks through direct messaging. The Elpima platform acts as a bridge between structured web catalog discovery and direct WhatsApp conversation. The API generates a cryptographically unique reference, takes an immutable snapshot of all requested equipment, and generates a pre-formatted, click-to-chat WhatsApp deep link. When clicked, it opens WhatsApp directly to Elpima's sales desk with the customer's identity, clinic name, and line-item list pre-populated.

### 5. Multi-Actor Administrative Governance & Auditability
Healthcare distribution companies require strict organizational separation of duties:
- **Public Customers / Clinicians**: Browse catalog, review technical specifications, and request single or multi-item quotes without an account.
- **Supervising Managers (Sales/Ops Staff)**: Manage product inventory, toggle real-time stock availability, review incoming quotes, update quotation workflow states (`NEW` → `CONTACTED` → `QUOTED` → `FULFILLED`), and communicate with hospitals.
- **Super-Admin**: Overall system administrator controlling staff accounts, assigned permissions, store contact parameters, immutable audit logs, and business-wide analytics.

---

## 🏛️ Architectural Design

### System Topology & Data Flow

```
                                  [ PUBLIC CLINICAL USERS ]
                          Surgeons, Procurement Directors, Theater Nurses
                                             │
                                             │ HTTPS / JSON / Multi-Part
                                             ▼
       ┌───────────────────────────────────────────────────────────────────────────┐
       │                        REVERSE PROXY / INGRESS                            │
       │                   (Nginx / Render / Fly.io / Cloudflare)                  │
       │           - SSL Termination    - Trust Proxy (X-Forwarded-For)            │
       └─────────────────────────────────────┬─────────────────────────────────────┘
                                             │
                                             ▼
 ┌───────────────────────────────────────────────────────────────────────────────────────┐
 │                               EXPRESS API SERVER (server.js)                          │
 │                                                                                       │
 │  ┌─────────────────────────────────────────────────────────────────────────────────┐  │
 │  │                               MIDDLEWARE PIPELINE                               │  │
 │  │  Helmet  │  CORS  │  HPP  │  Compression  │  CorrelationId  │  Morgan Access Log │  │
 │  │  Global Rate Limiter (RedisStore)  │  Idempotency Guard  │  Zod Validation      │  │
 │  └────────────────────────────────────────┬────────────────────────────────────────┘  │
 │                                           │                                           │
 │  ┌────────────────────────────────────────▼────────────────────────────────────────┐  │
 │  │                             V1 ROUTING MODULES                                  │  │
 │  │  /auth        /products       /categories     /specialties     /quotes          │  │
 │  │  /managers    /audit-logs     /settings       /upload          /analytics       │  │
 │  │  /notifications (REST & Server-Sent Events /stream)                             │  │
 │  └───────┬───────────────────────────┬─────────────────────────────┬───────────────┘  │
 └──────────┼───────────────────────────┼─────────────────────────────┼──────────────────┘
            │                           │                             │
            ▼                           ▼                             ▼
 ┌─────────────────────┐     ┌──────────────────────┐     ┌──────────────────────┐
 │   DATABASE LAYER    │     │   IN-MEMORY / CACHE  │     │  MESSAGE BROKER /    │
 │   Prisma ORM Client │     │   Redis (ioredis)    │     │  JOB QUEUES          │
 │          │          │     │          │           │     │  BullMQ (Redis)      │
 │          ▼          │     │          ▼           │     │          │           │
 │     PostgreSQL      │     │  Key-Value Caching   │     │  - email-queue       │
 │   (Supabase / Neon /│     │  Pub/Sub Backplane   │     │  - notification-queue│
 │    Local Docker)    │     │  (Bounded LRU Map    │     └──────────┬───────────┘
 └─────────────────────┘     │   fallback if down)  │                │
                             └──────────────────────┘                │
                                                                     ▼
                                             ┌───────────────────────────────────┐
                                             │   BACKGROUND WORKER (worker.js)   │
                                             │                                   │
                                             │  - BullMQ Email Worker            │
                                             │    (Resend API / SMTP)            │
                                             │  - Webhook Notification Worker    │
                                             │    (Sales Desk Webhooks)          │
                                             │  - Exponential Backoff & Retries  │
                                             └───────────────────────────────────┘
```

---

### Dual-Process Execution Model

The codebase implements a decoupled **dual-process architecture** separating synchronous HTTP request servicing from asynchronous task execution:

```
┌─────────────────────────────────┐        ┌─────────────────────────────────┐
│     API SERVER (server.js)      │        │     WORKER (worker.js)          │
│                                 │        │                                 │
│ - Express HTTP listener         │        │ - Dedicated BullMQ worker       │
│ - Sub-20ms request processing   │        │ - Consumes 'email-queue'        │
│ - Non-blocking SSE connections  │        │ - Consumes 'notification-queue' │
│ - Immediate HTTP responses      │        │ - Exponential backoff retry     │
│ - Enqueues background jobs      │        │ - External webhook delivery     │
└────────────────┬────────────────┘        └────────────────┬────────────────┘
                 │                                          │
                 └───────────────► [ REDIS ] ◄──────────────┘
```

1. **`server.js` (Web Server Process)**:
   - Dedicated exclusively to handling HTTP requests, performing input validation, managing database transactions, streaming Server-Sent Events (SSE), and returning fast responses.
   - CPU-expensive or network-unreliable tasks (e.g., third-party email delivery, external sales desk webhooks) are **never executed inline** within request cycles. Instead, the server enqueues lightweight jobs into BullMQ and responds immediately to the client.
   - Configured with Slowloris DoS timeouts (`keepAliveTimeout: 5000ms`, `headersTimeout: 20000ms`, `requestTimeout: 30000ms`) and graceful shutdown signal handlers (`SIGTERM`, `SIGINT`).

2. **`worker.js` (Background Worker Process)**:
   - Standalone Node.js process that boots independently, connects to PostgreSQL and Redis, and acts as a dedicated BullMQ consumer.
   - Concurrently processes email notifications (password resets, proforma quote confirmations, staff invitations, 2FA security alerts) and outbound HTTP webhooks to sales desk CRMs.
   - Operates with an automatic 3-attempt exponential backoff strategy (delays: 3s, 6s, 12s), protecting against external provider downtime without dropping customer inquiries.

---

### Layered Modular Architecture

Every domain feature inside `src/modules/` adheres to a strict, decoupled 4-layer architecture:

```
  [ HTTP Request ]
         │
         ▼
  ┌──────────────┐
  │   route.js   │ ──► Declares HTTP verbs, URL paths, middleware chains (auth, rate limits, role guards)
  └──────┬───────┘
         │
         ▼
  ┌──────────────┐
  │validation.js │ ──► Zod schemas validating request body, query parameters, and route parameters
  └──────┬───────┘
         │
         ▼
  ┌──────────────┐
  │controller.js │ ──► Extracts validated input, coordinates service calls, formats standard JSON response
  └──────┬───────┘
         │
         ▼
  ┌──────────────┐
  │  service.js  │ ──► Pure business logic, Prisma ORM queries, cache management, event dispatch
  └──────┬───────┘
         │
         ▼
  [ Database / Cache ]
```

---

### Resilient Universal Caching

The caching subsystem (`src/config/redis.js`) implements a **zero-downtime, tiered caching pattern**:
- **Tier 1 (Redis)**: When `REDIS_URL` is provided and reachable, all caching operations (`cacheGet`, `cacheSet`, `cacheDel`, `cacheInvalidatePattern`) execute against Redis using atomic TTLs.
- **Tier 2 (Bounded In-Memory Map)**: If Redis is unavailable, unconfigured, or drops offline, the system automatically falls back to an in-memory `Map`. To prevent memory leaks and V8 heap exhaustion, the in-memory fallback enforces:
  - Hard capacity cap of **500 items** with Least Recently Used (LRU) key eviction on overflow.
  - Active background sweeping timer running every 60 seconds (unreferenced from the event loop) that prunes expired entries.

---

### Real-Time Push Distribution (SSE + Pub/Sub)

Administrative staff receive instantaneous alerts for new hospital RFQs, urgent quote requests, and catalog changes without page refreshes:
- Implemented using **Server-Sent Events (SSE)** (`GET /api/v1/notifications/stream`).
- When a quote is created, the system publishes the event to the Redis Pub/Sub channel `elpima:notifications:broadcast`.
- All running API server instances subscribed to the Redis channel receive the broadcast and push it down their respective active SSE client streams.
- If Redis is absent, an in-process `EventEmitter` acts as a local fallback bus.

---

### Security & Session Architecture

Elpima API implements bank-grade authentication and session safeguards:
1. **Short-Lived Access Tokens (10 min)**: Pinned strictly to `HS256` to prevent algorithm confusion attacks; includes user identity, role, and the user's `tokenVersion`.
2. **Hashed Refresh Tokens in Database (8 hours)**: Refresh tokens are stored as SHA-256 hashes (`tokenHash`). Raw tokens are never stored in plaintext.
3. **Anti-Theft Refresh Token Rotation**:
   - Every time a refresh token is exchanged, it is immediately revoked, and a new token pair is issued in the same `familyId` lineage.
   - If an already-revoked refresh token is re-submitted (indicating that a stolen token is being replayed by an attacker), the system flags **token reuse**, immediately revokes all active sessions for that user, increments `tokenVersion`, and creates a critical audit log.
4. **20-Second Rotation Grace Window**:
   - Modern Single Page Applications (SPAs) frequently trigger concurrent API calls on page mount, causing multiple near-simultaneous token refresh requests.
   - A strict single-use rotation would cause race conditions and falsely log out legitimate users. Elpima implements a 20-second grace window (`JWT_ROTATION_GRACE_PERIOD_SECONDS`) that permits in-flight duplicate refresh requests to receive the active session token without triggering a theft alert.
5. **Client Device Fingerprinting**:
   - During session creation, a cryptographic hash of the client's `User-Agent` and IP address (`createClientFingerprint`) is bound to the token record.
   - If an incoming refresh request originates from an entirely mismatched environment, the session family is terminated for suspected session hijacking.
6. **Instant Global Revocation via `tokenVersion`**:
   - The `User` model includes an integer `tokenVersion`.
   - When a user changes their password, executes "Logout All Devices", or triggers a security alert, `tokenVersion` is incremented in the database.
   - Even though existing access tokens have remaining validity time, the `requireAuth` middleware checks `payload.tokenVersion === user.tokenVersion`, invalidating all active access tokens across all devices within **0 milliseconds**.
7. **Two-Factor Authentication (TOTP - RFC 6238)**:
   - Compatible with Google Authenticator, Microsoft Authenticator, and 1Password.
   - Pre-generates 8 cryptographically hashed, single-use emergency backup recovery codes.

---

## ⚖️ Engineering Tradeoffs & Rationale

Building a production-ready enterprise medical API requires deliberate architectural compromises. The following table and detailed explanations document the **why** and **reasons behind each decision**:

| Decision Area | Chosen Strategy | Alternative Rejected | Core Tradeoff Reason |
|---|---|---|---|
| **Procurement UX** | Interactive WhatsApp RFQ Engine | Direct Credit Card Cart Checkout | Hospital procurement requires committee review, proforma approval, and negotiation; instant credit card checkout has near-100% bounce rate for B2B surgical equipment. |
| **Pricing Strategy** | Dynamic Quotation on Request | Static Public Catalog Prices | Extreme FX currency volatility (NGN/USD/EUR) and variable freight/tariffs make static prices obsolete and financially risky. |
| **Process Model** | Dual-Process (API Server + BullMQ Worker) | Single Monolithic Node.js Process | Isolates HTTP response cycles from CPU-heavy PDF generation, email dispatch, and webhook retries, ensuring consistent sub-20ms latency. |
| **Data Persistence** | PostgreSQL + Prisma ORM | MongoDB / NoSQL Document DB | Guarantees ACID transactions, strict schema constraints, referential integrity, and cascading safety across financial quotes and inventory. |
| **Caching Layer** | Redis with Bounded In-Memory Map Fallback | Hard Redis-Only Requirement | Enables frictionless local development and graceful degradation during network partitions without bringing down the API. |
| **Real-Time Alerts** | Server-Sent Events (SSE) + Redis Pub/Sub | WebSockets (Socket.io / ws) | Unidirectional server-to-dashboard notifications need no client-to-server overhead; SSE runs over standard HTTP and effortlessly navigates hospital firewall proxies. |
| **Session Model** | Hashed Refresh Token Rotation + 20s Grace Period | Pure Stateless JWTs OR Stateful DB Session on Every Req | Stateless JWTs cannot be revoked immediately; DB sessions on every request bottleneck the database. The hybrid approach combines 10m stateless speed with instant revocation and SPA race immunity. |
| **Quote Integrity** | Point-in-Time Item Snapshotting | Foreign Key Reference Only | When catalog products are renamed, re-specified, or discontinued, existing quotes must remain legally and commercially immutable. |
| **Public Identifiers** | Nanoid Prefix References (`ELP-YYYYMM-XXXX`) | Auto-Increment IDs OR Raw UUIDs | Auto-increment IDs leak business metrics and invite enumeration attacks; UUIDs are impossible to recite over WhatsApp voice notes or phone calls. |
| **Idempotency** | In-Memory / Distributed In-Flight Lock | DB Row-Level Pessimistic Locking | Prevents accidental double-submission on mobile networks without holding expensive database row locks. |

---

### Detailed Rationale for Key Decisions

#### 1. WhatsApp RFQ Engine vs. Consumer E-Commerce Cart & Checkout
- **The Challenge**: Traditional retail e-commerce assumes impulse buying, individual consumers, and fixed credit card payment gateways (e.g., Paystack, Stripe).
- **The Reality**: Surgical tools and hospital theater installations range from ₦500,000 to over ₦100,000,000. Purchases are governed by hospital directors, chief medical directors (CMDs), and procurement boards who demand formal proforma invoices, delivery lead-time guarantees, sterility certificates, and installment wire transfers.
- **Why We Chose WhatsApp RFQ**: WhatsApp is the undisputed enterprise communication channel for African clinical commerce. By assembling an inquiry and translating it into a pre-filled WhatsApp deep link alongside an immutable database quote, Elpima bridges digital discovery with high-touch, relationship-driven sales conversion.

#### 2. Dynamic RFQ Pricing vs. Fixed Public Catalog Prices
- **The Challenge**: Displaying fixed prices on the web catalog.
- **Why It Fails**: Most high-precision surgical instruments are imported. Rapid currency devaluation, international shipping surcharges, and customs duties mean a price listed on Monday could result in a 15% financial loss by Friday. Furthermore, prices vary significantly depending on whether a hospital orders 1 unit or 50 theater sets.
- **The Tradeoff**: The platform intentionally hides public pricing and requires quote submission. This protects company margins, allows volume discounting, and turns passive browsers into qualified sales leads.

#### 3. Dual-Process (Server + Worker) vs. Monolithic Single Process
- **The Challenge**: Running email sending, webhook dispatch, and PDF generation inside the main Express process.
- **Why It Fails**: In Node.js's single-threaded event loop, synchronous tasks or awaiting slow external SMTP/HTTP connections blocks other incoming requests. If an email provider experiences elevated latency (e.g., 5-second response time), the entire API server stalls.
- **The Solution**: The Express server pushes a message to BullMQ and returns `201 Created` in ~15ms. The independent `worker.js` process picks up the job, manages retries, and processes the task in the background.

#### 4. PostgreSQL + Prisma ORM vs. NoSQL / Document Store
- **The Challenge**: NoSQL databases (e.g., MongoDB) offer flexible JSON schemas but lack strong relational integrity.
- **Why We Chose PostgreSQL**: Healthcare transactions require rigid data integrity. We require relational foreign keys (`onDelete: Restrict` on products so an item cannot be deleted if referenced in active quotes; `onDelete: Cascade` for refresh tokens and quote line-items). PostgreSQL provides ACID compliance, strong typing via Prisma, and rock-solid indexing.

#### 5. Redis with Bounded In-Memory Map Fallback vs. Hard Redis Dependency
- **The Challenge**: Production APIs that crash completely if Redis is temporarily unreachable create severe operational fragility.
- **The Solution**: All cache interfaces in `src/config/redis.js` check Redis health. If Redis is down, operations fallback to a 500-item bounded `Map` with periodic background sweepers. The application logs a warning but continues serving catalog requests and user logins without interruption.

#### 6. Server-Sent Events (SSE) vs. WebSockets for Administrative Alerts
- **The Challenge**: Real-time notification delivery to staff dashboards.
- **Why Not WebSockets**: WebSockets are full-duplex (bidirectional) and require custom connection upgrade handshakes, ping/pong heartbeats, and dedicated connection state management. Hospital networks and strict corporate proxies often terminate long-lived WebSocket connections.
- **Why SSE Wins**: Administrative dashboard alerts are purely unidirectional (server pushing notifications to the browser). SSE operates over standard HTTP, natively supports automatic browser reconnection (`EventSource`), supports HTTP/2 multiplexing, and passes through corporate proxies transparently.

#### 7. Anti-Theft Refresh Token Rotation (with 20s Grace Window) vs. Pure Stateless JWTs
- **The Problem with Stateless JWTs**: If an attacker steals a stateless JWT, it remains valid until expiration; there is no way to revoke it without deploying complex global token blacklists.
- **The Problem with Pure Stateful Sessions**: Checking the database for every single API request turns the database into a performance bottleneck.
- **The Chosen Hybrid**: 10-minute short-lived access tokens provide fast, stateless validation for 99% of requests. Long-lived refresh tokens are stateful and rotated on every use. To eliminate frontend SPA race conditions where multiple parallel requests refresh simultaneously, a **20-second grace window** allows the successor token to be returned without triggering false theft alarms.

#### 8. Point-in-Time Quote Item Snapshotting vs. Pure Foreign Key References
- **The Challenge**: Over a 5-year operating lifespan, catalog products are renamed, specifications change, SKUs are revised, and older products are discontinued.
- **Why Snapshotting is Essential**: If a quote only stored `productId`, fetching a quote generated 18 months ago would reflect the *current* product state or fail if the product was deleted. `QuoteInquiryItem` takes an immutable point-in-time snapshot of `productName` and `productSku` at the exact moment of quote generation, ensuring legal and commercial permanence.

#### 9. Nanoid Human-Friendly Reference Codes vs. Auto-Incrementing IDs or UUIDs
- **Why Not Auto-Increment IDs**: Exposing sequential integers (`/quotes/1`, `/quotes/2`) reveals business volume to competitors and allows malicious users to scrape and enumerate all quotes.
- **Why Not UUIDs**: A UUID (`3fa85f64-5717-4562-b3fc-2c963f66afa6`) is 36 characters long, impossible to pronounce over a phone call, and awkward to type into a WhatsApp message.
- **The Chosen Pattern**: Custom alphanumeric Nanoid (`ELP-202610-8A9C`):
  - `ELP`: Company branding prefix.
  - `202610`: Year and month for instant operational triage and date filtering.
  - `8A9C`: Cryptographically secure, unguessable random suffix omitting ambiguous characters (`0`, `O`, `1`, `I`).

#### 10. In-Memory / Distributed Concurrency Idempotency Locks vs. DB Pessimistic Locking
- **The Challenge**: A doctor on a flaky 3G mobile hospital connection taps "Submit Quote Request" four times in rapid succession.
- **Why Not DB Locking**: Row-level pessimistic locks (`SELECT FOR UPDATE`) stall database connection pools and degrade throughput under concurrency.
- **The Solution**: The `idempotency` middleware intercepts requests containing an `Idempotency-Key` header. An active request sets the key to `IN_FLIGHT`. Subsequent duplicate requests immediately receive `409 Conflict`, while cached successful responses receive the original payload with an `X-Cache-Lookup: HIT-IDEMPOTENT` header.

---

## 📂 Complete Codebase & Directory Structure

```
elpima-api/
├── .agents/                                # AI agent workspace guidelines and conventions
│   └── rules/
│       └── naming-conventions.md           # Mandatory coding & identifier guidelines
├── prisma/
│   ├── schema.prisma                       # Complete PostgreSQL schema definitions & relations
│   └── seed.js                             # Comprehensive production & staging database seeder
├── scripts/
│   └── generate-openapi.js                 # Swagger / OpenAPI specification compiler script
├── src/
│   ├── config/
│   │   ├── env.js                          # Zod-validated environment variable loader
│   │   ├── prisma.js                       # Prisma Client connection pool & lifecycle hooks
│   │   ├── redis.js                        # Redis connection, Pub/Sub, & LRU fallback cache
│   │   └── swagger.js                      # OpenAPI documentation generator configuration
│   ├── constants/
│   │   └── roles.js                        # Role constants: SUPER_ADMIN, SUPERVISING_MANAGER
│   ├── middlewares/
│   │   ├── auth.js                         # JWT verification, tokenVersion check, RBAC guards
│   │   ├── correlationId.js                # X-Request-Id correlation generator & tracer
│   │   ├── errorHandler.js                 # Global centralized error handler & 404 catcher
│   │   ├── idempotency.js                  # Idempotency-Key concurrency guard & cache
│   │   ├── rateLimiter.js                  # Tiered Redis-backed rate limiters
│   │   └── validate.js                     # Generic Zod request schema validation middleware
│   ├── modules/
│   │   ├── analytics/                      # Executive KPI dashboard and reporting metrics
│   │   │   ├── controller.js
│   │   │   ├── route.js
│   │   │   └── service.js
│   │   ├── audit/                          # Administrative audit logs and forensic inspection
│   │   │   ├── controller.js
│   │   │   ├── route.js
│   │   │   ├── service.js
│   │   │   └── validation.js
│   │   ├── auth/                           # Authentication, 2FA, token rotation, sessions
│   │   │   ├── controller.js
│   │   │   ├── route.js
│   │   │   ├── service.js
│   │   │   └── validation.js
│   │   ├── categories/                     # Equipment categories management
│   │   │   ├── controller.js
│   │   │   ├── route.js
│   │   │   ├── service.js
│   │   │   └── validation.js
│   │   ├── managers/                       # Supervising Manager staff accounts
│   │   │   ├── controller.js
│   │   │   ├── route.js
│   │   │   ├── service.js
│   │   │   └── validation.js
│   │   ├── notifications/                  # In-app notifications & real-time SSE stream
│   │   │   ├── controller.js
│   │   │   ├── route.js
│   │   │   ├── schema.js
│   │   │   ├── service.js
│   │   │   └── sse.js
│   │   ├── products/                       # Surgical equipment catalog and inventory
│   │   │   ├── controller.js
│   │   │   ├── route.js
│   │   │   ├── service.js
│   │   │   └── validation.js
│   │   ├── quotes/                         # Quote requests, WhatsApp links, Proforma PDFs
│   │   │   ├── controller.js
│   │   │   ├── route.js
│   │   │   ├── service.js
│   │   │   └── validation.js
│   │   ├── settings/                       # Store contact information & default WhatsApp phone
│   │   │   ├── controller.js
│   │   │   ├── route.js
│   │   │   ├── service.js
│   │   │   └── validation.js
│   │   ├── specialties/                    # Medical specialties taxonomy
│   │   │   ├── controller.js
│   │   │   ├── route.js
│   │   │   ├── service.js
│   │   │   └── validation.js
│   │   └── upload/                         # Image upload (Supabase Storage / local fallback)
│   │       ├── controller.js
│   │       ├── route.js
│   │       └── service.js
│   ├── queues/
│   │   ├── email.queue.js                  # BullMQ email queue producer & consumer
│   │   ├── index.js                        # Queues entrypoint & graceful shutdown orchestrator
│   │   └── notification.queue.js           # BullMQ external webhook queue producer & consumer
│   ├── routes/
│   │   ├── health.route.js                 # Unversioned container heartbeat & uptime probe
│   │   └── index.js                        # Aggregated v1 routing directory
│   ├── utils/
│   │   ├── AppError.js                     # Operational error class with HTTP status & kind
│   │   ├── logger.js                       # Winston logger with JSON formatting & Morgan stream
│   │   ├── mailer.js                       # Resend email templates & dispatcher
│   │   ├── notifications.js                # External webhook notification dispatch
│   │   ├── pdfGenerator.js                 # Vector PDFKit proforma invoice document builder
│   │   ├── reference.js                    # Cryptographic Nanoid reference generator
│   │   ├── response.js                     # Standardized success/error response helpers
│   │   └── whatsapp.js                     # WhatsApp deep-link message generator
│   └── app.js                              # Express application factory & middleware setup
├── test/                                   # Vitest automated test suites
│   ├── auth-2fa.test.js                    # TOTP 2FA setup, enable, verify, and backup codes
│   ├── auth-security.test.js               # Brute-force throttling & security defenses
│   ├── auth-session-recovery.test.js       # Refresh token rotation & reuse detection
│   ├── cache.test.js                       # Universal cache & LRU fallback mechanics
│   ├── compression.test.js                 # Response compression efficiency tests
│   ├── health.test.js                      # Health probe & uptime tests
│   ├── mailer.test.js                      # Email rendering & HTML escaping tests
│   ├── notifications.test.js               # In-app notifications & read-state tests
│   ├── pdf.test.js                         # PDFKit proforma generation tests
│   ├── queues.test.js                      # BullMQ queue job creation tests
│   ├── validation.test.js                  # Zod validation schema verification tests
│   └── whatsapp.test.js                    # WhatsApp URL format & phone parsing tests
├── uploads/                                # Local filesystem image storage fallback
├── .dockerignore
├── .env.example                            # Comprehensive environment configuration template
├── .gitignore
├── agent.md                                # AI & engineering architectural rules
├── docker-compose.yml                      # Local development Redis container setup
├── Dockerfile                              # Multi-stage optimized Node.js Alpine container
├── elpima-api.postman_collection.json      # Postman API testing collection
├── openapi.json                            # Static OpenAPI / Swagger specification
├── package.json                            # Project manifest, dependencies, and npm scripts
├── render.yaml                             # Cloud deployment blueprint for Render
├── server.js                               # API HTTP server entrypoint
├── vitest.config.js                        # Vitest runner configuration
└── worker.js                               # Background queue worker process entrypoint
```

---

## 🗄️ Data Models & Database Schema

The database is defined in `prisma/schema.prisma` and backed by PostgreSQL. Below is an overview of the core models and their relationships:

```mermaid
erDiagram
    User ||--o{ RefreshToken : owns
    User ||--o{ QuoteInquiry : "assigned to"
    User ||--o{ AuditLog : performs
    User ||--o{ Notification : receives
    Category ||--o{ Product : classifies
    Specialty ||--o{ Product : specializes
    Product ||--o{ QuoteInquiryItem : references
    QuoteInquiry ||--|{ QuoteInquiryItem : contains

    User {
        string id PK
        string email UK
        string passwordHash
        string fullName
        Role role
        string phone
        boolean isActive
        datetime lastLoginAt
        boolean isTwoFactorEnabled
        string twoFactorSecret
        string twoFactorTempSecret
        string[] twoFactorBackupCodes
        string passwordResetToken
        datetime passwordResetExpires
        int tokenVersion
        datetime createdAt
        datetime updatedAt
    }

    RefreshToken {
        string id PK
        string tokenHash UK
        string familyId
        string userId FK
        string fingerprintHash
        datetime lastUsedAt
        datetime expiresAt
        datetime absoluteExpiresAt
        boolean isRevoked
        string createdByIp
        string userAgent
    }

    Category {
        string id PK
        string name UK
        string slug UK
        string description
        string imageUrl
        string icon
        int displayOrder
        boolean isActive
    }

    Specialty {
        string id PK
        string name UK
        string slug UK
        string description
        string imageUrl
    }

    Product {
        string id PK
        string name
        string slug UK
        string sku UK
        string categoryId FK
        string specialtyId FK
        string shortDescription
        string description
        json specifications
        string[] compliance
        string[] images
        boolean inStock
        string leadTime
        int minOrderQuantity
        boolean isFeatured
        boolean isActive
        int viewCount
    }

    QuoteInquiry {
        string id PK
        string reference UK
        string customerName
        string customerPhone
        string customerEmail
        string hospitalClinic
        string location
        QuoteStatus status
        Priority priority
        string customerNotes
        string adminNotes
        string whatsappLink
        string assignedToId FK
    }

    QuoteInquiryItem {
        string id PK
        string quoteInquiryId FK
        string productId FK
        string productName
        string productSku
        int quantity
        string customRequirement
    }

    AuditLog {
        string id PK
        string actorId FK
        string actorRole
        string action
        string entityType
        string entityId
        json metadata
        string ipAddress
        string userAgent
        datetime createdAt
    }

    StoreSetting {
        string id PK
        string whatsappNumber
        string companyName
        string companyEmail
        string companyPhone
        string companyAddress
        string quoteDisclaimer
    }

    Notification {
        string id PK
        string userId FK
        NotificationCategory category
        NotificationIconType iconType
        string title
        string description
        boolean isRead
        json metadata
        datetime createdAt
    }
```

### Enumerations
- **`Role`**: `SUPER_ADMIN`, `SUPERVISING_MANAGER`
- **`QuoteStatus`**: `NEW`, `CONTACTED`, `QUOTED`, `FULFILLED`, `CANCELLED`
- **`Priority`**: `STANDARD`, `URGENT`
- **`NotificationCategory`**: `GENERAL`, `SYSTEM`
- **`NotificationIconType`**: `QUOTE`, `URGENT`, `PRODUCT`, `MANAGER`, `SYSTEM_DB`, `SYSTEM_SHIELD`

---

## 📡 Comprehensive API Route Reference

All versioned routes are mounted under `/api/v1`. All endpoints return standardized response envelopes.

### Standard Request & Response Envelopes

#### Success Envelope (`200 OK`, `201 Created`)
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { ... },
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "totalPages": 3
    }
  }
}
```

#### Error Envelope (`4xx`, `5xx`)
```json
{
  "success": false,
  "error": {
    "message": "Detailed human-readable error description",
    "kind": "validation_error | unauthorized | forbidden | not_found | conflict | rate_limit_exceeded | server_error",
    "correlationId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "details": []
  }
}
```

---

### Sample Payloads & Concrete cURL Examples

#### 1. Submit a Quote / RFQ (`POST /api/v1/quotes`)
Public endpoint used by doctors, theater nurses, and hospital procurement officers. Generates a quote reference, takes point-in-time item snapshots, dispatches background notifications, and returns a ready-to-use WhatsApp deep link.

```bash
curl -X POST http://localhost:5000/api/v1/quotes \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: a1b2c3d4-e5f6-7890-abcd-ef1234567890" \
  -d '{
    "customerName": "Dr. Amina Bello",
    "customerPhone": "2348031234567",
    "customerEmail": "a.bello@nationalhospital.gov.ng",
    "hospitalClinic": "National Hospital Abuja",
    "location": "Abuja, FCT",
    "priority": "URGENT",
    "customerNotes": "Urgent procurement required for upcoming orthopedic theater expansion.",
    "items": [
      {
        "productId": "45d1f85e-648b-4977-83d1-93e18a514d02",
        "quantity": 2,
        "customRequirement": "Autoclavable titanium alloy, sterile package"
      },
      {
        "productId": "6b2d1844-48f1-4db8-9279-8b010bbdfc65",
        "quantity": 5
      }
    ]
  }'
```

**Response (`201 Created`):**
```json
{
  "success": true,
  "message": "Quote inquiry submitted successfully",
  "data": {
    "reference": "ELP-202610-8A9C",
    "whatsappLink": "https://wa.me/2348118941799?text=*NEW%20QUOTE%20REQUEST%20%E2%80%94%20ELPIMA%20SURGICALS*%0A*Reference:*%20ELP-202610-8A9C%0A*From:*%20Dr.%20Amina%20Bello...",
    "quote": {
      "id": "e3b0c442-98fc-1c14-9afb-4c7b6c7b9172",
      "reference": "ELP-202610-8A9C",
      "customerName": "Dr. Amina Bello",
      "customerPhone": "2348031234567",
      "hospitalClinic": "National Hospital Abuja",
      "location": "Abuja, FCT",
      "status": "NEW",
      "priority": "URGENT",
      "items": [
        {
          "id": "f2a1b3c4-d5e6-7890-abcd-ef0123456789",
          "productId": "45d1f85e-648b-4977-83d1-93e18a514d02",
          "productName": "Titanium Orthopedic Bone Plate Set",
          "productSku": "ELP-ORTH-001",
          "quantity": 2,
          "customRequirement": "Autoclavable titanium alloy, sterile package"
        }
      ]
    }
  }
}
```

---

#### 2. Staff Authentication & 2FA Challenge (`POST /api/v1/auth/login`)

```bash
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "manager@elpimasurgicals.com",
    "password": "SuperSecretPassword123!"
  }'
```

**Scenario A: 2FA Disabled — Direct Token Issuance (`200 OK`):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "7a9f8e4c1b3d5e2a8f6c4b2d0e8a6c4b...",
    "expiresIn": "10m",
    "user": {
      "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
      "email": "manager@elpimasurgicals.com",
      "fullName": "Supervising Manager",
      "role": "SUPERVISING_MANAGER",
      "isTwoFactorEnabled": false
    }
  }
}
```

**Scenario B: 2FA Enabled — Challenge Triggered (`200 OK`):**
```json
{
  "success": true,
  "message": "Two-factor authentication required. Please verify with your 6-digit authenticator code or backup code.",
  "data": {
    "requires2FA": true,
    "tempToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": "5m"
  }
}
```

---

#### 3. Complete 2FA Verification (`POST /api/v1/auth/2fa/verify`)

```bash
curl -X POST http://localhost:5000/api/v1/auth/2fa/verify \
  -H "Content-Type: application/json" \
  -d '{
    "tempToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "code": "482910"
  }'
```

---

#### 4. Refresh Token Rotation with Grace Period (`POST /api/v1/auth/refresh-token`)

```bash
curl -X POST http://localhost:5000/api/v1/auth/refresh-token \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "7a9f8e4c1b3d5e2a8f6c4b2d0e8a6c4b..."
  }'
```

**Response (`200 OK`):**
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.new...",
    "refreshToken": "8b0a1c2d3e4f5a6b7c8d9e0f1a2b3c4d.new...",
    "expiresIn": "10m"
  }
}
```

---

#### 5. Create Surgical Catalog Product (`POST /api/v1/products`)
Requires `SUPER_ADMIN` or `SUPERVISING_MANAGER` Bearer token.

```bash
curl -X POST http://localhost:5000/api/v1/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -d '{
    "name": "High-Definition Laparoscopy Tower System",
    "categoryId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "specialtyId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "shortDescription": "4K Ultra-HD endoscopic surgical visualization unit with LED light source and insufflator.",
    "specifications": {
      "Camera Sensor": "1/3 inch 4K CMOS",
      "Resolution": "3840 x 2160 pixels",
      "Light Source": "300W Medical Grade LED",
      "Insufflator Flow Rate": "40 Liters/min",
      "Sterilization": "Camera head gas plasma / EtO sterilizable"
    },
    "compliance": ["ISO 13485", "CE Mark", "NAFDAC Registered"],
    "images": [
      "https://storage.elpimasurgicals.com/products/laparoscopy-tower-1.webp",
      "https://storage.elpimasurgicals.com/products/laparoscopy-tower-2.webp"
    ],
    "inStock": true,
    "leadTime": "Available Immediately (Kaduna / Abuja warehouse)",
    "minOrderQuantity": 1,
    "isFeatured": true
  }'
```

---

#### 6. Live Dashboard Server-Sent Events Stream (`GET /api/v1/notifications/stream`)
Establishes a long-lived HTTP connection using `text/event-stream`. Receives push notifications when quotes are created, updated, or when system alerts trigger. Supports passing `?token=<JWT>` or `Authorization: Bearer <JWT>`.

```bash
curl -N -H "Authorization: Bearer <ACCESS_TOKEN>" \
  http://localhost:5000/api/v1/notifications/stream
```

**Streamed Event Format:**
```http
event: connected
data: {"message":"Connected to Elpima live notification stream"}

event: notification
data: {
  "id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "category": "GENERAL",
  "iconType": "URGENT",
  "title": "Urgent Hospital RFQ Submitted",
  "description": "Dr. Amina Bello (National Hospital Abuja) requested a quote for 2 item(s) (ELP-202610-8A9C)",
  "isRead": false,
  "createdAt": "2026-11-11T13:45:00.000Z",
  "metadata": {
    "quoteId": "e3b0c442-98fc-1c14-9afb-4c7b6c7b9172",
    "reference": "ELP-202610-8A9C",
    "priority": "URGENT"
  }
}
```

---

### Root & Service Directory

| Method | Endpoint | Access | Rate Limit | Description |
|---|---|---|---|---|
| `GET` | `/` | Public | Global | Service directory & OpenAPI links |

---

### Health Check

| Method | Endpoint | Access | Rate Limit | Description |
|---|---|---|---|---|
| `GET` | `/health` | Public | Global | Container uptime and heartbeat probe |

---

### Authentication & Sessions

| Method | Endpoint | Access | Rate Limit | Description |
|---|---|---|---|---|
| `POST` | `/api/v1/auth/login` | Public | Auth (10/15m) | Authenticate user. Returns JWT pair or `requires2FA: true` with temporary challenge token. |
| `POST` | `/api/v1/auth/refresh-token` | Public | Refresh (120/15m) | Rotate refresh token with grace period protection and issue new token pair. |
| `POST` | `/api/v1/auth/forgot-password` | Public | Auth (10/15m) | Send secure password reset link (constant-time anti-enumeration). |
| `POST` | `/api/v1/auth/reset-password` | Public | Auth (10/15m) | Reset password via token and revoke all existing sessions globally. |
| `GET` | `/api/v1/auth/me` | Authenticated | Global | Get profile of the current authenticated user. |
| `PATCH` | `/api/v1/auth/me` | Authenticated | Global | Update profile information (full name, phone number). |
| `POST` | `/api/v1/auth/change-password` | Authenticated | Global | Change password, increment `tokenVersion`, and revoke all other sessions. |
| `POST` | `/api/v1/auth/logout` | Authenticated | Global | Terminate current device session and revoke refresh token. |
| `POST` | `/api/v1/auth/logout-all` | Authenticated | Global | Terminate all active sessions across all devices for current user. |
| `GET` | `/api/v1/auth/sessions` | Authenticated | Global | List all active logged-in devices and sessions for the current user. |
| `DELETE` | `/api/v1/auth/sessions/:sessionId` | Authenticated | Global | Remotely revoke a specific device session. |

---

### Two-Factor Authentication (TOTP)

| Method | Endpoint | Access | Rate Limit | Description |
|---|---|---|---|---|
| `POST` | `/api/v1/auth/2fa/verify` | Public | Auth (10/15m) | Verify 6-digit TOTP code or backup code during login challenge. |
| `GET` | `/api/v1/auth/2fa/status` | Authenticated | Global | Check 2FA enablement status and count of remaining backup codes. |
| `POST` | `/api/v1/auth/2fa/setup` | Authenticated | Global | Generate Base32 secret, QR code Data URL, and 8 backup recovery codes. |
| `POST` | `/api/v1/auth/2fa/enable` | Authenticated | Global | Confirm setup with initial 6-digit code and activate 2FA on account. |
| `POST` | `/api/v1/auth/2fa/disable` | Authenticated | Global | Deactivate 2FA (requires current password and valid 2FA code). |
| `POST` | `/api/v1/auth/2fa/backup-codes`| Authenticated | Global | Regenerate 8 new emergency backup recovery codes (invalidates old codes). |

---

### Products Catalog

| Method | Endpoint | Access | Rate Limit | Description |
|---|---|---|---|---|
| `GET` | `/api/v1/products` | Public | Global | Search & filter products (by category, specialty, inStock, featured, keyword). |
| `GET` | `/api/v1/products/id/:id` | Public | Global | Get single product by UUID. |
| `GET` | `/api/v1/products/:slug` | Public | Global | Get single product by URL slug (increments view count). |
| `GET` | `/api/v1/products/:slug/related` | Public | Global | Get related surgical products in the same category or specialty. |
| `POST` | `/api/v1/products` | Admin / Manager | Global | Create a new surgical product in catalog. |
| `PUT` | `/api/v1/products/:id` | Admin / Manager | Global | Update existing product details, specs, and compliance certifications. |
| `PATCH` | `/api/v1/products/:id/stock` | Admin / Manager | Global | Quick toggle stock status (`inStock: boolean`) and lead time. |
| `DELETE` | `/api/v1/products/:id` | Super-Admin | Global | Deactivate product (soft-delete). |

---

### Categories

| Method | Endpoint | Access | Rate Limit | Description |
|---|---|---|---|---|
| `GET` | `/api/v1/categories` | Public | Global | List all active product categories with product count badges. |
| `GET` | `/api/v1/categories/id/:id` | Public | Global | Get category details by UUID. |
| `GET` | `/api/v1/categories/:slug` | Public | Global | Get category details and associated products by URL slug. |
| `POST` | `/api/v1/categories` | Admin / Manager | Global | Create a new product category. |
| `PUT` | `/api/v1/categories/:id` | Admin / Manager | Global | Update category name, description, icon, or display order. |
| `DELETE` | `/api/v1/categories/:id` | Super-Admin | Global | Delete a category (restricted if products are assigned). |

---

### Specialties

| Method | Endpoint | Access | Rate Limit | Description |
|---|---|---|---|---|
| `GET` | `/api/v1/specialties` | Public | Global | List all medical specialties (Orthopedics, General Surgery, etc.). |
| `GET` | `/api/v1/specialties/id/:id` | Public | Global | Get specialty details by UUID. |
| `GET` | `/api/v1/specialties/:slug` | Public | Global | Get specialty details and associated products by URL slug. |
| `POST` | `/api/v1/specialties` | Admin / Manager | Global | Create a new medical specialty. |
| `PUT` | `/api/v1/specialties/:id` | Admin / Manager | Global | Update specialty name, description, or image. |
| `DELETE` | `/api/v1/specialties/:id` | Super-Admin | Global | Delete a medical specialty. |

---

### Quotes & WhatsApp RFQ Engine

| Method | Endpoint | Access | Rate Limit | Description |
|---|---|---|---|---|
| `POST` | `/api/v1/quotes` | Public | Quote (15/10m) | Submit quote request. Saves inquiry, takes snapshot, triggers alerts, and returns formatted WhatsApp link. Supports `Idempotency-Key`. |
| `GET` | `/api/v1/quotes` | Admin / Manager | Global | List quotes with status, priority, and date range filters (paginated). |
| `GET` | `/api/v1/quotes/stats/overview`| Admin / Manager | Global | Aggregated quotation statistics by status and priority. |
| `GET` | `/api/v1/quotes/:reference` | Admin / Manager | Global | Get complete quote details with line-item snapshot by reference code. |
| `GET` | `/api/v1/quotes/:reference/pdf`| Public | PDF (25/15m) | Stream dynamically generated official Proforma Quotation PDF. |
| `PATCH` | `/api/v1/quotes/:id/status` | Admin / Manager | Global | Update quote status (`NEW`, `CONTACTED`, `QUOTED`, `FULFILLED`, `CANCELLED`) and internal notes. |
| `PATCH` | `/api/v1/quotes/:id/assign` | Super-Admin | Global | Assign quote to a specific Supervising Manager. |
| `DELETE` | `/api/v1/quotes/:id` | Super-Admin | Global | Delete quote inquiry record. |

---

### Supervising Managers Administration

| Method | Endpoint | Access | Rate Limit | Description |
|---|---|---|---|---|
| `GET` | `/api/v1/managers` | Super-Admin | Global | List all staff manager accounts. |
| `POST` | `/api/v1/managers` | Super-Admin | Global | Create a new Supervising Manager and dispatch invitation email. |
| `GET` | `/api/v1/managers/:id` | Super-Admin | Global | Get manager account details and activity summary. |
| `PUT` | `/api/v1/managers/:id` | Super-Admin | Global | Update manager account details (full name, email, phone). |
| `PATCH` | `/api/v1/managers/:id/status`| Super-Admin | Global | Activate or deactivate a manager account. |
| `DELETE` | `/api/v1/managers/:id` | Super-Admin | Global | Delete a manager account. |

---

### In-App Notifications & Live SSE

| Method | Endpoint | Access | Rate Limit | Description |
|---|---|---|---|---|
| `GET` | `/api/v1/notifications/stream` | Authenticated | Global | Establish persistent Server-Sent Events (SSE) stream for live dashboard alerts. |
| `GET` | `/api/v1/notifications/unread-count`| Authenticated | Global | Fast unread counter for navigation bell badge. |
| `GET` | `/api/v1/notifications` | Authenticated | Global | Paginated list of notifications with category and read status filters. |
| `PATCH` | `/api/v1/notifications/:id/read` | Authenticated | Global | Toggle read/unread status of a notification. |
| `POST` | `/api/v1/notifications/mark-all-read`| Authenticated | Global | Mark all notifications as read for current user. |

---

### Analytics & Executive Dashboard

| Method | Endpoint | Access | Rate Limit | Description |
|---|---|---|---|---|
| `GET` | `/api/v1/analytics/dashboard`| Admin / Manager | Global | Comprehensive analytics: catalog inventory totals, quote volume by status, urgent pending quotes, and recent audit logs. |

---

### Audit Logs & Compliance

| Method | Endpoint | Access | Rate Limit | Description |
|---|---|---|---|---|
| `GET` | `/api/v1/audit-logs` | Super-Admin | Global | Immutable audit trail of administrative actions with filtering by actor, action, and entity. |
| `GET` | `/api/v1/audit-logs/:id` | Super-Admin | Global | Detailed forensic view of an audit log entry with full metadata. |

---

### Store Settings

| Method | Endpoint | Access | Rate Limit | Description |
|---|---|---|---|---|
| `GET` | `/api/v1/settings` | Public | Global | Get public store contact info, address, and target WhatsApp sales number. |
| `PUT` | `/api/v1/settings` | Super-Admin | Global | Update store contact info, legal company name, and WhatsApp number. |

---

### Media & File Uploads

| Method | Endpoint | Access | Rate Limit | Description |
|---|---|---|---|---|
| `POST` | `/api/v1/upload/image` | Admin / Manager | Global | Upload a single equipment image (max 5MB, JPEG/PNG/WebP). |
| `POST` | `/api/v1/upload/images` | Admin / Manager | Global | Upload up to 10 equipment images in batch. |

---

## 🛡️ Security & Hardening Standards

The API implements defense-in-depth security measures across every layer:

1. **Strict Input Schema Validation**:
   - Every request (`body`, `query`, and `params`) is validated using **Zod** before reaching the service layer.
   - Strips unknown fields, enforces string boundaries, regex formats, and sanitizes input.
2. **Multi-Tier Rate Limiting**:
   - `globalRateLimiter`: 300 requests / 15 min per IP across all endpoints.
   - `authRateLimiter`: 10 attempts / 15 min per IP on `/login`, `/2fa/verify`, and `/forgot-password`.
   - `refreshTokenRateLimiter`: 120 requests / 15 min per IP for smooth SPA token renewal.
   - `quoteRateLimiter`: 15 submissions / 10 min per IP against quote spamming.
   - `pdfRateLimiter`: 25 downloads / 15 min per IP to protect server CPU from PDF generation exhaustion.
3. **HTTP Header Hardening**:
   - `helmet()`: Enforces secure headers (`X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Strict-Transport-Security`, etc.).
   - `hpp()`: Protects against HTTP Parameter Pollution attacks.
   - `compression()`: Compresses response bodies with Gzip/Deflate (60-80% smaller payloads).
4. **Idempotency Guard**:
   - Protects quote creation against double-submissions on flaky networks via the `Idempotency-Key` header.
   - Uses in-flight locks (`409 Conflict`) to prevent simultaneous duplicate requests.
5. **Anti-Enumeration Protections**:
   - Forgot-password and login endpoints use constant-time bcrypt operations (`DUMMY_BCRYPT_HASH`) to ensure identical response timings whether an email exists or not.
6. **File Upload Hardening**:
   - Memory-buffered uploads capped at **5MB** per file and max 10 files per request.
   - Strict MIME whitelist (`image/jpeg`, `image/png`, `image/webp`).
   - Extensions derived strictly from validated MIME types to eliminate stored HTML or executable script attacks.
7. **Email Template Security**:
   - All dynamic user inputs injected into email templates are passed through `escapeHtml()` to eliminate HTML/script injection vectors.

---

## ⚙️ Environment Configuration Reference

Create a `.env` file in the project root:

```env
# ==========================================
# SERVER & RUNTIME ENVIRONMENT
# ==========================================
NODE_ENV=development
PORT=5000
CORS_ORIGIN=http://localhost:3000,http://localhost:5173
FRONTEND_URL=http://localhost:3000

# ==========================================
# DATABASE & CACHE
# ==========================================
# PostgreSQL connection string (Pooling / Transaction mode)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/elpima_db?schema=public
# Direct connection string for Prisma migrations (optional)
DIRECT_URL=postgresql://postgres:postgres@localhost:5432/elpima_db?schema=public
# Redis URL for caching, Pub/Sub, and BullMQ (optional in dev; uses in-memory fallback if omitted)
REDIS_URL=redis://localhost:6379

# ==========================================
# AUTHENTICATION & JWT SECURITY
# ==========================================
JWT_SECRET=super_secret_cryptographic_jwt_key_at_least_32_characters_long
JWT_ACCESS_EXPIRES_IN=10m
JWT_REFRESH_EXPIRES_IN=8h
JWT_IDLE_TIMEOUT_MINUTES=120
JWT_MAX_SESSION_HOURS=8
JWT_ROTATION_GRACE_PERIOD_SECONDS=20

# ==========================================
# BUSINESS & CONTACT SETTINGS
# ==========================================
COMPANY_NAME=Elpima Surgicals Limited
COMPANY_EMAIL=info@elpimasurgicals.com
COMPANY_PHONE=+2348118941799
COMPANY_ADDRESS="Kaduna, Nigeria"
DEFAULT_WHATSAPP_NUMBER=2348118941799

# ==========================================
# SUPABASE STORAGE (OPTIONAL: FALLS BACK TO LOCAL /uploads)
# ==========================================
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# ==========================================
# EMAIL DELIVERY (RESEND API)
# ==========================================
RESEND_API_KEY=re_your_resend_api_key
RESEND_FROM_EMAIL="Elpima Surgicals <onboarding@resend.dev>"

# ==========================================
# EXTERNAL INTEGRATIONS
# ==========================================
SALES_DESK_WEBHOOK_URL=https://your-crm.com/api/webhooks/quote
```

---

## 🚀 Local Development, Docker & Deployment

### Prerequisites
- **Node.js**: `v20.0.0` or higher
- **PostgreSQL**: `v14` or higher (or cloud provider like Supabase/Neon)
- **Redis**: `v7` or higher (optional for local dev; required for full BullMQ queue processing)
- **Docker & Docker Compose** (optional)

---

### Step 1: Clone & Install Dependencies
```bash
git clone https://github.com/elpimasurgicals/elpima-api.git
cd elpima-api
npm install
```

### Step 2: Configure Environment
```bash
cp .env.example .env
# Edit .env with your PostgreSQL credentials and JWT secret
```

### Step 3: Run Redis (Optional via Docker Compose)
```bash
npm run redis:up
```

### Step 4: Run Prisma Migrations & Seed Database
```bash
npm run db:generate
npm run db:push
npm run db:seed
```
*The database seeder pre-populates default admin credentials, surgical specialties, product categories, and sample surgical tools.*

### Step 5: Start Development Server
```bash
npm run dev
```
- API Server: `http://localhost:5000`
- Interactive OpenAPI Docs: `http://localhost:5000/api/v1/docs`

### Step 6: Start Dedicated Background Queue Worker
In a separate terminal window:
```bash
npm run worker
```

---

### Running Automated Test Suites
Run the full test suite with Vitest:
```bash
npm test
```
Run tests in interactive watch mode:
```bash
npm run test:watch
```

---

### Production Docker Container
Build and run the multi-stage, unprivileged Alpine Linux container:
```bash
docker build -t elpima-api:latest .
docker run -p 5000:5000 --env-file .env elpima-api:latest
```

---

### Deployment on Render / Cloud Platforms
The repository includes a ready-to-deploy `render.yaml` blueprint defining:
- Web service configured with automatic Docker builds.
- Native `/health` probe endpoint.
- Automatic restarts and graceful termination signal handling via `dumb-init`.

---

## 📄 License & Proprietary Notice

Copyright © 2026 **Elpima Surgicals Limited** (RC-1849204). All rights reserved.  
This software and documentation are proprietary and confidential. Unauthorized copying, distribution, modification, or deployment of this repository is strictly prohibited.

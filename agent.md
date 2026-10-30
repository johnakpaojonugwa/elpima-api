# Elpima API – Engineering Guidelines & Agent Rules

This document establishes the mandatory architectural standards, coding conventions, API contracts, and security rules for any human or AI agent contributing to the `elpima-api` codebase.

---

## 1. Core Architecture & Tech Stack

- **Runtime**: Node.js 20+ (ES Modules, `"type": "module"`)
- **Web Framework**: Express 4 with security middlewares (`helmet`, `cors`, `hpp`, `compression`)
- **Database & ORM**: PostgreSQL via Prisma ORM
- **In-Memory Cache & Pub/Sub**: Redis (ioredis) with automatic memory-cache fallback
- **Background Worker & Job Queues**: BullMQ with exponential backoff and automatic retry
- **Validation**: Zod schema validation on request `body`, `query`, and `params`
- **Real-Time Delivery**: Server-Sent Events (SSE) with Redis Pub/Sub broadcast distribution
- **Test Runner**: Vitest with Supertest

---

## 2. Naming Conventions & Code Style Guidelines

All code written in this repository **MUST** strictly adhere to descriptive, unambiguous identifiers. Never use single-letter variables or truncated abbreviations.

### Rule 2.1: No Single-Letter Identifiers
- ❌ Never use `e`, `i`, `v`, `p`, `q`, `a`, `s`, `d`, `t`, `x`, `y`, `o`, `w`.
- ✅ Use `event` or `changeEvent` instead of `e`.
- ✅ Use `index` or `itemIndex` instead of `i`.
- ✅ Use `error` instead of `err` or `e`.
- ✅ Use `value` or `currentValue` instead of `v` or `val`.
- ✅ Use `query` or `searchQuery` instead of `q`.
- ✅ Use `word` or `term` instead of `w`.
- ✅ Use `originItem` instead of `o`.

### Rule 2.2: No Truncated Abbreviations
- ❌ Avoid `req`, `res`, `err`, `cat`, `doc`, `msg`, `acc`, `el`, `opts`.
- ✅ Use `request` and `response` in Express handlers and middleware.
- ✅ Use `error` in `catch` blocks and error handling callbacks.
- ✅ Use `parameters` instead of `params` (except when interacting with Express's native `request.params` object).
- ✅ Use `queryParameters` or `queryOptions` instead of `queryParams` or `opts`.
- ✅ Use `category` instead of `cat`.
- ✅ Use `document` instead of `doc`.
- ✅ Use `message` instead of `msg`.
- ✅ Use `accumulator` instead of `acc`.

### Rule 2.3: Domain-Contextualized Entity Identifiers
In collection iterations (`.map()`, `.filter()`, `.find()`, `.some()`, `.every()`, `.reduce()`), always use full domain nouns:
- ✅ `(product) => product.id` (never `(p) => p.id`)
- ✅ `(category) => category.name` (never `(c) => c.name`)
- ✅ `(manager) => manager.email` (never `(m) => m.email`)
- ✅ `(quote) => quote.reference` (never `(q) => q.reference`)
- ✅ `(firstItem, secondItem) => ...` (never `(a, b) => ...`)

In function parameters and data structures, specify the domain entity:
- ✅ `productId`, `categoryId`, `quoteId` instead of generic `id`.
- ✅ `quoteData`, `categoryPayload`, `updateData` instead of generic `data` or `payload`.

### Rule 2.4: Descriptive Function & Handler Naming
- Name functions and handlers after intention and domain action:
  - Controllers: `createQuote`, `listQuotes`, `getQuoteByReference`, `updateQuoteStatus`
  - Services: `generateProformaPdf`, `rotateRefreshToken`, `revokeSession`
  - Middlewares: `requireAuth`, `requireRole`, `idempotency`, `correlationId`

---

## 3. API Design & Routing Rules

1. **Resource-Oriented Endpoints**:
   - Name endpoints after nouns representing resources, not actions (e.g., `POST /api/v1/quotes`, `GET /api/v1/products`, never `/api/v1/createQuote`).
2. **API Versioning**:
   - Always prefix all API routes with `/api/v1/`.
3. **Strict Response Envelope**:
   - **Success Envelope**:
     ```json
     {
       "success": true,
       "data": { ... },
       "message": "Human-readable confirmation message",
       "meta": { "pagination": { "page": 1, "limit": 20, "total": 100 } }
     }
     ```
   - **Error Envelope**:
     ```json
     {
       "success": false,
       "error": {
         "message": "Specific error description",
         "kind": "validation_error | unauthorized | forbidden | not_found | conflict | server_error",
         "correlationId": "uuid",
         "details": []
       }
     }
     ```
4. **Pagination & Query Controls**:
   - Always paginate list endpoints (`page`, `limit`).
   - Enforce a hard maximum `limit` (e.g., `z.coerce.number().max(100)`).
   - Use standard query parameters for filtering and sorting rather than custom URLs.
5. **Schema Validation**:
   - Validate every request (`body`, `query`, or `params`) using Zod schemas via `validate(schema, source)`.
   - Never allow uncontrolled payloads into database operations.
6. **Idempotency**:
   - Protect quote creation and state-mutating requests with the `idempotency` middleware using `Idempotency-Key` headers.
   - Guard against concurrent in-flight requests with concurrency locks returning `409 Conflict`.
7. **Accurate HTTP Status Codes**:
   - `200 OK` (Standard success)
   - `201 Created` (Resource created)
   - `204 No Content` (Successful deletion)
   - `400 Bad Request` (Malformed input or schema validation error)
   - `401 Unauthorized` (Missing or invalid token / session)
   - `403 Forbidden` (Insufficient role permissions)
   - `404 Not Found` (Resource does not exist)
   - `409 Conflict` (Duplicate unique constraint / in-flight idempotency)
   - `413 Payload Too Large` (Upload or request body size exceeded)
   - `429 Too Many Requests` (Rate limit or connection limit exceeded)
   - `500 Internal Server Error` (Unexpected server failure)

---

## 4. Security & Hardening Patterns

1. **Authentication & Session Management**:
   - Short-lived Access Tokens (10 minutes) + long-lived Refresh Tokens (8 hours) stored in the database.
   - **Anti-Theft Refresh Token Rotation**: Rotating a refresh token immediately revokes the old one. If a revoked token is re-used outside the grace window, revoke ALL active sessions for that user.
   - **Grace Window**: Allow a 20-second grace window (`JWT_ROTATION_GRACE_PERIOD_SECONDS`) for token rotation to prevent race conditions from concurrent frontend SPA requests.
   - **Idle Timeout & Absolute Session Limit**: Enforce rolling idle timeouts and hard session caps.
2. **Two-Factor Authentication (TOTP)**:
   - Time-based One-Time Passwords (RFC 6238) via standard authenticator apps (Google Authenticator, Authy).
   - Pre-generated single-use hashed backup codes for emergency recovery.
3. **Password Security**:
   - Passwords hashed with `bcryptjs` (salt rounds >= 10).
   - Minimum 8 characters with at least one uppercase letter, one lowercase letter, one number, and one special symbol.
   - Timing-safe comparisons where applicable.
4. **Rate Limiting & Abuse Prevention**:
   - `globalRateLimiter`: Baseline protection for all endpoints.
   - `authRateLimiter`: Strict limiter for login, 2FA verify, and forgot-password (10 req / 15m).
   - `refreshTokenRateLimiter`: Dedicated limiter for refresh token calls (120 req / 15m).
   - `quoteRateLimiter`: Anti-spam limiter for quote inquiry submissions (10 req / 15m).
   - `pdfRateLimiter`: Protects PDF generation against CPU exhaustion (15 req / 5m).
5. **CORS & Proxy Boundaries**:
   - Parse `CORS_ORIGIN` dynamically to support comma-separated lists.
   - Set `credentials: true` and expose required headers (`Content-Disposition`, `X-Request-Id`).
   - Trust reverse proxy (`app.set("trust proxy", 1)`).
6. **Upload & Payload Safeguards**:
   - Cap general JSON bodies at `1mb`.
   - Enforce Multer upload limits at `5MB` (`5 * 1024 * 1024`) with strict MIME filtering (`image/jpeg`, `image/png`, `image/webp`).
7. **Email & Template Security**:
   - Always HTML-escape all dynamic user input in email templates (`escapeHtml`) to prevent HTML injection attacks.
8. **Audit Logging**:
   - Log all security, administrative, and data-modifying events to the `AuditLog` table with `actorId`, `actorRole`, `action`, `entityType`, `entityId`, `ipAddress`, and `userAgent`.

---

## 5. Project Layout & Directory Structure

```text
elpima-api/
├── .agents/
│   └── rules/
│       └── naming-conventions.md     # Base identifier naming rules
├── agent.md                          # Repository guiding rules (this file)
├── prisma/
│   ├── schema.prisma                 # Database schema definitions
│   └── seed.js                       # Database seeding script
├── src/
│   ├── config/                       # Environment, DB, Redis, and Swagger config
│   ├── constants/                    # Enums, roles, and static configurations
│   ├── middlewares/                  # Express middlewares (auth, validation, etc.)
│   ├── modules/                      # Domain feature modules
│   │   ├── audit/                    # Audit logging & inspection
│   │   ├── auth/                     # Authentication, 2FA, session management
│   │   ├── categories/               # Surgical product categories
│   │   ├── managers/                 # User/Manager account administration
│   │   ├── notifications/            # SSE & in-app notification system
│   │   ├── products/                 # Surgical catalog products & inventory
│   │   ├── quotes/                   # Public quote inquiries & proforma PDFs
│   │   └── specialties/              # Medical specialty taxonomy
│   ├── queues/                       # BullMQ background job queues & workers
│   ├── routes/                       # Aggregated v1 routing index
│   ├── utils/                        # Logging, responses, mailer, pdf, whatsapp
│   └── app.js                        # Express application factory
├── test/                             # Automated Vitest test suites
├── server.js                         # API server entrypoint
├── worker.js                         # Dedicated background queue worker process
└── vitest.config.js                  # Vitest runner configuration
```

---

## 6. Development & Testing Workflow

1. **Sandboxing & Environments**:
   - Commands modifying packages or requiring system network must run with appropriate tool permissions.
2. **Database Isolation in Tests**:
   - Unit tests must mock Prisma models and external network dependencies (`vi.spyOn(prisma.<model>, "<method>")`) to ensure reliable offline execution.
3. **Verification Before Merging**:
   - Run the full test suite (`npm test`) to guarantee all test suites pass without regression before submitting commits.
4. **Git Commit Conventions**:
   - Use Conventional Commits (`feat:`, `fix:`, `chore:`, `refactor:`, `test:`, `docs:`).

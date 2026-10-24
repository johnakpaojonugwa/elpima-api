# Elpima Surgicals Limited — Backend API

Production-grade REST API and Quotation Engine for **Elpima Surgicals Limited** — B2B Direct Surgical Equipment Catalog & WhatsApp RFQ Platform.

---

## 🏥 The Business Logic

In high-grade surgical equipment and medical devices procurement:
1. **Prices are not displayed publicly**: High-precision instruments and imported surgical gear fluctuate with foreign exchange rates, order volume, and facility requirements.
2. **Interactive WhatsApp Quotation Engine**: Doctors, surgeons, theater nurses, and hospital procurement officers request quotes directly without cumbersome account registration forms.
3. **Streamlined Actors**:
   - **Public Customers / Surgeons**: Browse catalog, filter by surgical specialty, view high-res imagery & technical specs, and request quotes (single items or multi-item quote bags).
   - **Super-Admin**: Full system control, catalog management, staff management (Supervising Managers), audit logs, and settings.
   - **Supervising Manager**: Add/edit equipment, toggle stock availability, review incoming inquiries, update quotation status, and communicate directly with healthcare facilities.

---

## 🏛️ System Architecture

```
                       [ PUBLIC STOREFRONT ]
      Hospitals, Clinics & Surgeons Browse Surgical Catalog
                              │
          ┌───────────────────┴───────────────────┐
          ▼                                       ▼
  [Product Catalog]                       [Quote / RFQ Bag]
  - High-res photos & specs               - Select items & quantities
  - Categorized by Surgical Specialty     - Enter Facility & WhatsApp contact
  - ISO/CE/NAFDAC Compliance              - Click "Submit Quote Request"
          │                                       │
          └───────────────────┬───────────────────┘
                              ▼
                     [ API QUOTE ENGINE ]
      - Generates Reference: `ELP-202610-8A9C`
      - Snapshots Product Names & SKUs into Database
      - Generates Formatted WhatsApp Deep Link
                              │
          ┌───────────────────┴───────────────────┐
          ▼                                       ▼
  [ Instant WhatsApp Chat ]               [ ADMIN CMS DASHBOARD ]
  Opens WhatsApp with pre-filled          - Super-Admin & Managers
  item list & reference to message        - Track Quotes & Notes
  Elpima's sales desk immediately!        - Full Catalog CRUD
```

---

## 🚀 Quick Start

### 1. Environment Configuration
Ensure `.env` is configured with your database and JWT secret:
```env
PORT=5000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/elpima_db?schema=public
JWT_SECRET=your_super_secret_jwt_key
DEFAULT_WHATSAPP_NUMBER=2348000000000
```

### 2. Generate Prisma Client & Run Seeds
```bash
npm run db:generate
npm run db:push
npm run db:seed
```

### 3. Start Development Server
```bash
npm run dev
```
* API Server: `http://localhost:5000`
* Interactive OpenAPI (Swagger) Docs: `http://localhost:5000/api/v1/docs`

---

## 📡 API Reference

### Health
* `GET /health` — Service uptime and heartbeat

### Authentication
* `POST /api/v1/auth/login` — Super-Admin / Manager login (Rate-limited, returns JWT)
* `GET /api/v1/auth/me` — Get current authenticated actor profile
* `POST /api/v1/auth/change-password` — Change password

### Products (Surgical Catalog)
* `GET /api/v1/products` — Filter products by category, specialty, inStock, featured, search keywords
* `GET /api/v1/products/:slug` — Detailed product view with specs and compliance
* `POST /api/v1/products` — Create product (Admin / Manager)
* `PUT /api/v1/products/:id` — Update product (Admin / Manager)
* `PATCH /api/v1/products/:id/stock` — Quick toggle inStock & lead-time (Admin / Manager)
* `DELETE /api/v1/products/:id` — Soft-delete / deactivate product (Super-Admin)

### Categories & Specialties
* `GET /api/v1/categories` — List active categories with product counts
* `GET /api/v1/categories/:slug` — Category detail with associated products
* `POST /api/v1/categories` — Create category (Admin / Manager)
* `PUT /api/v1/categories/:id` — Update category (Admin / Manager)
* `DELETE /api/v1/categories/:id` — Delete category (Super-Admin)

### Quotations & WhatsApp Inquiries
* `POST /api/v1/quotes` — Public quote request. Generates reference, saves inquiry, and returns formatted WhatsApp link.
* `GET /api/v1/quotes` — List quotes with status and priority filters (Admin / Manager)
* `GET /api/v1/quotes/:reference` — Quote details with item snapshot (Admin / Manager)
* `PATCH /api/v1/quotes/:id/status` — Update status (`NEW`, `CONTACTED`, `QUOTED`, `FULFILLED`, `CANCELLED`) and internal notes
* `PATCH /api/v1/quotes/:id/assign` — Assign quote to a Supervising Manager (Super-Admin)

### Supervising Managers Management
* `GET /api/v1/managers` — List staff accounts (Super-Admin)
* `POST /api/v1/managers` — Create new Supervising Manager (Super-Admin)
* `PATCH /api/v1/managers/:id/status` — Activate/deactivate manager (Super-Admin)

### Audit & Traceability
* `GET /api/v1/audit-logs` — Immutable audit log of administrative actions (Super-Admin)

### Store Settings
* `GET /api/v1/settings` — Get official contact and WhatsApp number (Public)
* `PUT /api/v1/settings` — Update contact information (Super-Admin)

---

## 🛡️ Security & Resilience Standards Implemented
- **Idempotency Guard**: Prevents duplicate quote submissions via `Idempotency-Key` headers.
- **Rate Limiting**: Multi-tier rate limiting for global requests, authentication brute-force protection, and quote spam prevention.
- **Request Tracing**: `X-Request-Id` correlation IDs passed through all requests and access logs.
- **Strict Input Validation**: Zod schema validation on all inputs before reaching service layer.
- **Standardized Response Envelope**: Predictable `{ success, message, data, meta }` and `{ success, error }` formats.

# Finance Dashboard Backend

Production-oriented REST API for a role-based finance dashboard: **NestJS**, **PostgreSQL**, **Prisma ORM**, **JWT** auth.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Architecture Overview](#architecture-overview)
- [Project Structure](#project-structure)
- [Roles & Permissions](#roles--permissions)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Database](#database)
- [API Reference](#api-reference)
- [Financial Health Score](#financial-health-score)
- [Audit Log](#audit-log)
- [Response Format](#response-format)
- [Rate Limiting](#rate-limiting)
- [Error Handling](#error-handling)
- [Running Tests](#running-tests)
- [Design Decisions & Assumptions](#design-decisions--assumptions)

---

## Tech Stack

| Layer | Package / choice | Notes |
|--------|------------------|--------|
| Framework | **NestJS** (Node.js, TypeScript) | Modules, guards, DI |
| Database | **PostgreSQL** | Relational financial data |
| ORM | **Prisma** (`prisma`, `@prisma/client`) | Migrations, type-safe client |
| DB driver | **`pg`** + **`@prisma/adapter-pg`** | Prisma 7 “driver adapters” in `PrismaService` |
| Auth | **JWT** (`@nestjs/jwt`, `@nestjs/passport`, `passport-jwt`) | Stateless tokens |
| Validation | **class-validator**, **class-transformer** | DTOs & query parsing |
| Rate limiting | **`@nestjs/throttler`** | Global + stricter auth routes |
| API docs | **`@nestjs/swagger`**, **swagger-ui-express** | `/api/docs` |
| Password hashing | **bcryptjs** | User passwords |
| Testing | **Jest**, **@nestjs/testing** | Unit tests |

---

## Architecture Overview

HTTP controllers are thin; business logic lives in services. **`JwtAuthGuard`** + **`RolesGuard`** enforce authentication and role-based access. A global **`TransformInterceptor`** wraps JSON responses in `{ success, data, timestamp }` except routes marked with **`@SkipResponseWrap()`** (e.g. file export). **`AllExceptionsFilter`** normalizes errors.

Prisma access is centralized in **`PrismaService`** (extends `PrismaClient` with `PrismaPg` adapter and connection pool).

---

## Project Structure

```
backend/
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── src/
│   ├── main.ts                 # Bootstrap, CORS, Swagger, global pipes
│   ├── app.module.ts
│   ├── app.controller.ts       # GET / (public API info)
│   ├── prisma.module.ts
│   ├── prisma.service.ts
│   ├── modules/
│   │   ├── auth/               # register, login, profile, JWT strategy
│   │   ├── users/            # Admin user CRUD, role, status
│   │   ├── transactions/     # CRUD, export, restore, list filters
│   │   ├── dashboard/        # Summary, trends, health score, …
│   │   └── audit/            # Audit log read model + fire-and-forget writes
│   └── common/
│       ├── guards/             # jwt-auth, roles
│       ├── decorators/       # @Roles, @CurrentUser, @SkipResponseWrap
│       ├── filters/          # all-exceptions
│       ├── interceptors/     # response transform
│       └── dto/              # shared pagination helpers
├── docker-compose.yml
├── Dockerfile
├── start.sh                  # migrate deploy → seed → node dist/main.js
└── package.json
```

---

## Roles & Permissions

| Action | VIEWER | ANALYST | ADMIN |
|--------|--------|---------|-------|
| List transactions (active only) | ✅ | ✅ | ✅ |
| List with **`includeDeleted=true`** | ❌ | ❌ | ✅ |
| Create / update transactions | ❌ | ✅ (update **own** only) | ✅ |
| Soft-delete transaction | ❌ | ❌ | ✅ |
| **Restore** soft-deleted transaction | ❌ | ❌ | ✅ |
| Export CSV / JSON | ❌ | ✅ | ✅ |
| Dashboard summary & recent | ✅ | ✅ | ✅ |
| Dashboard analytics (categories, trends, ratio, top categories, **health score**) | ❌ | ✅ | ✅ |
| Users CRUD, role, status | ❌ | ❌ | ✅ |
| **Audit log** (`GET /audit-logs`) | ❌ | ❌ | ✅ |
| Register (public) / login / profile | Register+login public; profile authenticated | | |

---

## Getting Started

### Prerequisites

- Node.js 18+ and npm 9+, **or** Docker Desktop  
- PostgreSQL 14+ (if not using Docker for the database)

### Option A — Local (API on host)

```bash
cd backend
npm install
cp .env.example .env
# Set DATABASE_URL and JWT_SECRET in .env

npm run db:generate
npm run db:migrate
npm run db:seed
npm run start:dev
```

- **API base:** http://localhost:3000/api/v1  
- **Swagger:** http://localhost:3000/api/docs  

### Option B — Docker Compose

From `backend/`:

```bash
docker compose up --build -d
```

Postgres becomes healthy first; the API container runs migrations, seeds, then starts Nest. Same URLs as above (port **3000** mapped to host).

### Seed users

Password for all seeded users: **`password123`**.

| Email | Role |
|-------|------|
| admin@finance.dev | ADMIN |
| analyst@finance.dev | ANALYST |
| viewer@finance.dev | VIEWER |
| sarah@finance.dev | ANALYST |
| mike@finance.dev | VIEWER |
| priya@finance.dev | ANALYST |

The seed generates a large set of transactions across users and months (see `prisma/seed.ts`).

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret for signing JWTs |
| `JWT_EXPIRES_IN` | Token lifetime (e.g. `7d`) |
| `PORT` | HTTP port (default `3000`) |
| `CORS_ORIGIN` | CORS origin (`*` or single origin) |

---

## Database

### Models (summary)

- **User** — credentials, role (`VIEWER` | `ANALYST` | `ADMIN`), status (`ACTIVE` | `INACTIVE`).
- **Transaction** — amount (`Decimal`), type, category, date, notes, `userId`, optional **`deletedAt`** (soft delete).
- **AuditLog** — append-only activity (`CREATE` / `UPDATE` / `DELETE` / `RESTORE`) for `transaction` and `user` entities.

### Soft deletes

`DELETE /transactions/:id` sets `deletedAt`. Normal list queries use `deletedAt: null`. Admins may pass **`includeDeleted=true`** on `GET /transactions` to include soft-deleted rows. **`PATCH /transactions/:id/restore`** clears `deletedAt`.

---

## API Reference

Base path: **`/api/v1`**. Interactive docs: **`/api/docs`**.

### Info

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1` (empty path on `AppController`) | No | API name, version, base path, Swagger hint |

### Auth

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | No | Register (default role VIEWER); non-VIEWER roles require admin context per service rules |
| POST | `/auth/login` | No | JWT access token + user |
| GET | `/auth/profile` | Yes | Current user profile |

### Users (ADMIN)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/users` | Paginated list (role, status, search) |
| GET | `/users/:id` | Detail |
| POST | `/users` | Create user (with role) |
| PATCH | `/users/:id` | Update name/email |
| PATCH | `/users/:id/role` | Change role |
| PATCH | `/users/:id/status` | Activate / deactivate |
| DELETE | `/users/:id` | Delete user only if **zero** transactions (else **409 Conflict**) |

### Transactions

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | `/transactions` | ALL | Paginated list; filters below + optional **`includeDeleted=true`** (**ADMIN only**, otherwise ignored) |
| GET | `/transactions/export` | ANALYST, ADMIN | CSV or JSON file download (`format`, optional `type`, `category`, `dateFrom`, `dateTo`); **not** wrapped by transform interceptor |
| GET | `/transactions/:id` | ALL | Single **non-deleted** transaction |
| POST | `/transactions` | ANALYST, ADMIN | Create |
| PATCH | `/transactions/:id` | ANALYST, ADMIN | Update (analyst: own rows only) |
| DELETE | `/transactions/:id` | ADMIN | Soft-delete |
| PATCH | `/transactions/:id/restore` | ADMIN | Restore soft-deleted |

**`GET /transactions` query:** `type`, `category`, `dateFrom`, `dateTo`, `search`, `sortBy` (`date` | `amount` | `createdAt`), `order`, `page`, `limit`, **`includeDeleted`** (boolean string `true` / JSON `true` after transform).

### Dashboard

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | `/dashboard/summary` | ALL | Totals, net, savings rate, counts |
| GET | `/dashboard/categories` | ANALYST, ADMIN | Category breakdown with % |
| GET | `/dashboard/trends/monthly` | ANALYST, ADMIN | Monthly income/expense (`year`) |
| GET | `/dashboard/trends/weekly` | ANALYST, ADMIN | Weekly buckets (`weeks`) |
| GET | `/dashboard/recent` | ALL | Recent transactions (`limit`) |
| GET | `/dashboard/ratio` | ANALYST, ADMIN | Income vs expense % of total flow |
| GET | `/dashboard/top-categories` | ANALYST, ADMIN | Top N categories by sum (`limit`) |
| GET | `/dashboard/health-score` | ANALYST, ADMIN | Score 0–100, grade A–F, breakdown, tips |

### Audit (ADMIN)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/audit-logs` | Paginated audit entries; filters: `action`, `entity`, `dateFrom`, `dateTo`, `page`, `limit` |

---

## Financial Health Score

**Endpoint:** `GET /dashboard/health-score` (ANALYST, ADMIN).

The score is **0–100** from five components (each with sub-score, max points, and a label):

1. **Savings rate (max 30)** — Overall `(income − expenses) / income` thresholds: ≥50% excellent, 30–49% good, 10–29% needs work, &lt;10% critical (0 income → critical).
2. **Expense consistency (max 20)** — Last **3 calendar months** of expense totals: coefficient of variation of monthly expenses; &lt;10% very consistent, 10–25% moderate, &gt;25% inconsistent; if &lt;2 months of expense data or zero mean → “Insufficient data” (partial points).
3. **Income diversity (max 20)** — Distinct **income** categories in that 3-month window: ≥3 diversified, 2 moderate, 1 concentrated, 0 no income.
4. **Housing cost ratio (max 15)** — Expense categories whose name contains **`rent`** or **`housing`** (case-insensitive) vs **total income**; bands for healthy / moderate / high / critical; if no such expenses → full points, “No housing cost detected”.
5. **Trend (max 15)** — **Last calendar month** net vs **previous** month net; % change vs |previous net|; improving / stable / declining bands; edge cases → “Insufficient data” (partial points).

**Letter grade:** A ≥90, B ≥75, C ≥60, D ≥45, F &lt;45.

**Tips:** Conditional strings (e.g. low savings, volatile spending, concentrated income, high housing burden, declining trend, plus a positive message if score ≥75).

Response includes `calculatedAt` (ISO timestamp).

---

## Audit Log

**Purpose:** Persist who changed what for **transactions** and **users** (create, update, soft-delete, restore for transactions; create, role/status update, delete for users).

**Implementation:** `AuditService.log()` is **fire-and-forget** (async write, errors logged, **never** thrown back to the caller) so HTTP latency is not blocked by audit I/O.

**Storage:** `AuditLog` table (`action`, `entity`, `entityId`, `performedBy`, `performedByEmail`, optional `details` JSON, `createdAt`).

**Read API:** Admins use `GET /audit-logs` with optional filters and pagination.

---

## Response Format

Most JSON responses are wrapped:

```json
{
  "success": true,
  "data": { },
  "timestamp": "2026-04-05T12:00:00.000Z"
}
```

**Exception:** `GET /transactions/export` returns raw **CSV** or **JSON** body with `Content-Type` and `Content-Disposition` for downloads (no `{ success, data }` wrapper).

Paginated lists return `data.items` and `data.meta` (`total`, `page`, `limit`, `totalPages`, `hasNextPage`, `hasPrevPage`).

---

## Rate Limiting

`@nestjs/throttler` applies a **global** limit unless overridden:

| Scope | Window | Limit | Notes |
|-------|--------|-------|--------|
| Default (most routes) | 60 s | **100** | Per IP / tracker |
| `POST /auth/login` | 60 s | **10** | `@Throttle` on controller method |
| `POST /auth/register` | 60 s | **5** | `@Throttle` on controller method |

**429** responses include a JSON body with message: *Too many requests. Please wait before trying again.*

---

## Error Handling

`AllExceptionsFilter` returns consistent JSON: `statusCode`, `timestamp`, `path`, `method`, `message`. Prisma errors (e.g. unique violation, record not found) are mapped to appropriate HTTP status codes.

---

## Running Tests

```bash
npm test
npm run test:watch
npm run test:cov
```

**~28** unit tests cover **AuthService**, **TransactionsService** (including analyst own-row rules and soft delete), **DashboardService**, and **RolesGuard** (role combinations).

---

## Design Decisions & Assumptions

| Topic | Decision |
|-------|-----------|
| **Soft deletes (transactions)** | `deletedAt` preserves history; export and default list exclude deleted rows. |
| **Restore** | Admin-only; clears `deletedAt`; audited as `RESTORE`. |
| **User delete** | **Hard delete** only if `transaction.count({ userId }) === 0`; otherwise **409 Conflict** — deactivate instead to preserve FK and financial history. |
| **Analyst updates** | May only **update** transactions where `userId` matches their id. |
| **Money type** | Prisma `Decimal` / PostgreSQL `NUMERIC(15,2)` — avoid float drift. |
| **Admin self-protection** | Cannot change own role, deactivate self, or delete self (where enforced in `UsersService`). |
| **Audit logging** | Fire-and-forget; failures do not fail the original mutation. |
| **JWT** | Configurable expiry; no refresh-token flow in this repo (add in production if needed). |
| **Categories** | Free text, not enums — dashboard `groupBy` works on stored values. |
| **CORS** | `Content-Disposition` exposed for browser file downloads from export. |

---

## Docker notes

The production-style **Dockerfile** copies only **`node_modules/.prisma`** generated client from the build stage into the runtime image; it does **not** overwrite the full `@prisma` tree from the builder (avoids broken `@prisma/engines` in Alpine). See `Dockerfile` and `start.sh`.

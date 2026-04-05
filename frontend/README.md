# FinanceOS Frontend

React dashboard for the FinanceOS API: **Vite**, **TypeScript**, **Tailwind CSS**, **shadcn/ui** (Radix-based components), **TanStack React Query**, **React Router**, and **Recharts** for charts.

---

## Tech stack

| Area | Libraries |
|------|-----------|
| UI | React 18, Tailwind CSS, shadcn/ui (Button, Card, Dialog, Table, Select, …) |
| Data | TanStack Query (server state), Axios |
| Routing | React Router v6 |
| Charts | Recharts |
| Forms | react-hook-form, Zod |
| Auth storage | `localStorage` (token + user JSON) via `api/client.ts` |

---

## Prerequisites

- **Node.js 18+** and npm  
- Backend running at **`http://localhost:3000`** by default (or set `VITE_API_URL`)

---

## Run locally

```bash
cd frontend
npm install
npm run dev
```

App: **http://localhost:5173**

```bash
npm run build   # production build
npm run preview # serve built assets
```

---

## Environment variables

Create `.env` in `frontend/` (optional). See `.env.example`.

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Full API base URL including `/api/v1`, e.g. `http://localhost:3000/api/v1`. If omitted, the client defaults to `http://localhost:3000/api/v1`. |

---

## Pages & features

| Route | Who | Description |
|-------|-----|-------------|
| `/login` | Public | Sign in |
| `/` | Authenticated | Dashboard: summary cards, health score (analyst/admin), charts, recent txs, **top categories** |
| `/transactions` | Authenticated | List, filters, export (analyst/admin), CRUD; **admin**: show deleted + restore |
| `/breakdown` | Authenticated | Category / analytics views |
| `/goals` | Authenticated | Local budget goals (browser storage) |
| `/insights` | Analyst, Admin | Extended insights + health score |
| `/users` | Admin | User management |
| `/audit-logs` | Admin | Audit trail table |
| `/profile` | Authenticated | Profile refresh from `GET /auth/profile` |

**Role-based UI**

- **VIEWER:** Summary + recent; no analytics nav sections, no write actions, no export.  
- **ANALYST:** Analytics, insights, create/edit **own** transactions, export; no user admin, no delete/restore, no audit log.  
- **ADMIN:** Full transaction delete + restore + “show deleted”, user admin, audit log, export.

**Public registration:** The backend exposes `POST /auth/register`; this app is oriented around **seed / admin-created accounts**. Self-service registration is available via **Swagger** or API clients if you enable it in your deployment.

---

## API client

Axios instance in `src/api/client.ts`:

- Attaches `Authorization: Bearer` from storage  
- Unwraps `{ success, data }` responses  
- On **401**, clears auth and redirects to `/login`  
- **Blob** responses (export) are not unwrapped as JSON

---

## Project layout (src)

```
src/
├── api/           # auth, users, transactions, dashboard, audit
├── components/    # ui/, dashboard/, RoleBadge
├── context/       # AuthContext
├── hooks/         # React Query hooks
├── layouts/       # MainLayout + sidebar
├── pages/         # route screens
├── types/         # shared TS types
└── utils/         # formatting, insights helpers, local storage for goals
```

---

## License

Private / see `package.json`.

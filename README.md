# FinanceOS — Finance Dashboard

A full-stack finance dashboard with role-based access control.

## Project Structure

| Path | Description |
|------|-------------|
| `backend/` | NestJS REST API, PostgreSQL, Prisma ORM |
| `frontend/` | React + Vite + Tailwind dashboard |

## Quick Start (Docker)

```bash
cd backend
docker compose up --build -d
cd ../frontend
npm install && npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

## Test Accounts

All accounts use password **`password123`** (see seed in `backend/prisma/seed.ts`).

| Email | Role |
|-------|------|
| admin@finance.dev | ADMIN |
| analyst@finance.dev | ANALYST |
| viewer@finance.dev | VIEWER |
| sarah@finance.dev | ANALYST |
| mike@finance.dev | VIEWER |
| priya@finance.dev | ANALYST |

## Documentation

- **Swagger (interactive API):** [http://localhost:3000/api/docs](http://localhost:3000/api/docs)
- **Backend README:** [backend/README.md](backend/README.md)
- **Frontend README:** [frontend/README.md](frontend/README.md)

## License

Private / UNLICENSED (see package files in each package).

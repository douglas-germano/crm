# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Project Overview

Apex CRM — a full-stack CRM built for an engineering company. Portuguese UI, Brazilian locale. Backend: Flask REST API. Frontend: Next.js 14 with shadcn/ui.

## Development Commands

### Backend
```bash
cd backend
source venv/bin/activate
python run.py                    # starts on port 5001
python seed.py                   # seed sample data
python test_db.py                # quick DB smoke test
flask db migrate -m "message"   # create migration
flask db upgrade                 # apply migrations
```

### Frontend
```bash
cd frontend
npm run dev      # starts on port 3000
npm run build
npm run lint
```

## Architecture

### Backend (`backend/`)
Flask application factory pattern in `app/__init__.py`. All routes are organized as blueprints under `app/blueprints/`, each with `__init__.py` + `routes.py`. Blueprint URL prefixes: `/api/<resource>`.

**Models** (`app/models/`): SQLAlchemy ORM. Key relationships:
- `Lead` → belongs to `Empresa` (company)
- `Negocio` (deal) → belongs to `Lead`, has a `Servico` (service type) and `Pipeline`/stage
- `Pipeline` → has many `PipelineEstagio` stages with order/color
- `Tenant` → multi-tenant support; schema is embedded in JWT claims, set via `SET search_path` before each request

**Auth**: Flask-JWT-Extended. Access token (1h) + refresh token (30d) stored in `localStorage`. The `@app.before_request` hook extracts the JWT schema claim and sets the PostgreSQL search path for multi-tenancy.

**Utils** (`app/utils/`):
- `decorators.py` — `@requer_permissao`, `@requer_admin` JWT-based decorators
- `iniciar_dados.py` — seeds default pipeline stages, permissions, and roles on tenant creation
- `email_service.py` — Brevo (formerly Sendinblue) transactional email

### Frontend (`frontend/src/`)
Next.js App Router. Route groups:
- `app/(authenticated)/` — protected pages; wrapped by `layout.tsx` which checks auth via `AuthContext`
- `app/login/`, `app/registro/`, `app/esqueci-senha/`, `app/redefinir-senha/` — public auth pages

**Key files**:
- `lib/api.ts` — axios instance; auto-attaches `Bearer` token; handles 401 → refresh flow
- `contexts/auth-context.tsx` — global user state, login/logout, token management
- `contexts/sidebar-context.tsx` — sidebar open/collapsed state
- `components/layout/sidebar.tsx` + `topbar.tsx` — persistent chrome for authenticated pages
- `types/index.ts` — all TypeScript interfaces for API responses

**API proxy**: `next.config.js` rewrites `/api/*` → `http://localhost:5001/api/*` in dev, so the frontend only ever calls relative `/api/` paths via Next.js (avoids CORS in dev). In production set `NEXT_PUBLIC_API_URL`.

### shadcn/ui Convention
Components in `components/ui/` use explicit color values (`bg-white`, `text-gray-*`) instead of CSS variables (`bg-background`, `bg-card`) because the theme CSS variables are not configured. When adding new shadcn components, replace any CSS variable-based background/text classes with explicit Tailwind values.

## Environment

Backend env vars (set in shell or `.env`):
- `DATABASE_URL` — defaults to SQLite `crm.sqlite`; production uses PostgreSQL
- `SECRET_KEY`, `JWT_SECRET_KEY`
- `MASTER_WORKSPACE` — default `apex`
- `BREVO_API_KEY`, `MAIL_DEFAULT_SENDER_NAME`, `MAIL_DEFAULT_SENDER_EMAIL`

Frontend: `NEXT_PUBLIC_API_URL` (default `http://localhost:5001`)

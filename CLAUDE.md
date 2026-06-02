# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A multi-tenant CRM application with a Flask REST API backend and a Next.js 14 frontend (App Router). The codebase is written primarily in Portuguese (variable names, routes, UI labels).

## Development Commands

### Backend (Flask)

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env          # then fill in values
python run.py                 # starts on port 5001
```

Database migrations:
```bash
cd backend
flask db init                 # first time only
flask db migrate -m "message"
flask db upgrade
python seed.py                # seed initial data for a tenant
```

### Frontend (Next.js)

```bash
cd frontend
npm install
npm run dev                   # starts on port 3000
npm run build
npm run lint
```

## Architecture

### Multi-tenancy

The backend uses **PostgreSQL schema-based multi-tenancy**. Each tenant gets its own PostgreSQL schema. On every authenticated request, the `before_request` hook in `app/__init__.py` reads the `schema` claim from the JWT and executes `SET search_path TO <schema>, public`. The `Tenant` model lives in the `public` schema; all other models live in tenant-specific schemas.

Login requires three fields: email, password, and **workspace** (the tenant's subdomain). The JWT carries both `sub` (user ID) and `schema` (tenant schema name).

### Backend Structure

- `app/__init__.py` — app factory, extension setup, blueprint registration, tenant schema middleware
- `app/blueprints/<resource>/routes.py` — one blueprint per resource (`/api/<resource>`)
- `app/models/` — SQLAlchemy models (one file per entity)
- `app/utils/decorators.py` — `@token_required` wraps `@jwt_required()` and injects the current `Usuario` as the first argument; `@requer_permissao(codigo)` checks profile permissions
- `app/utils/email_service.py` — email via Brevo API
- `config/development.py` / `config/production.py` — environment-specific config loaded by the factory

Blueprint URL prefixes: `/api/usuarios`, `/api/tenants`, `/api/leads`, `/api/pipelines`, `/api/negocios`, `/api/empresas`, `/api/servicos`, `/api/dashboard`, `/api/projetos`, `/api/admin`

### Frontend Structure

- `src/app/(authenticated)/` — route group for all protected pages; shares `layout.tsx` with sidebar/topbar
- `src/app/login/`, `src/app/registro/`, `src/app/esqueci-senha/`, `src/app/redefinir-senha/` — public auth pages
- `src/contexts/auth-context.tsx` — `AuthProvider` stores JWT in `localStorage`; exposes `useAuth()` hook
- `src/lib/api` — axios instance (inferred); attaches `Authorization: Bearer <token>` header
- `src/components/ui/` — shadcn/ui component wrappers (Radix UI primitives + Tailwind)
- `src/types/index.ts` — shared TypeScript types

### Key Conventions

- All protected routes use `@token_required` (not raw `@jwt_required()`); the decorated function receives `(usuario_atual, ...)` as its first argument.
- The master super-admin workspace is configured via `MASTER_WORKSPACE` env var (default: `engetch`).
- Email sending uses Brevo (formerly Sendinblue); set `BREVO_API_KEY` in the environment.
- Development SQLite is supported; production requires PostgreSQL for schema-based tenancy.

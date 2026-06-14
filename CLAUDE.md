# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Apex CRM — a full-stack CRM built for an engineering company. Portuguese UI, Brazilian locale. Backend: Flask REST API. Frontend: Next.js 14 with shadcn/ui.

## Development Commands

### Backend
```bash
cd backend
source venv/bin/activate
python run.py                    # starts on port 5001
python seed.py                   # seed sample data
python seed_inspect.py           # seed inspection data
python test_db.py                # quick DB smoke test
python test_pdf.py               # test PDF generation
flask db migrate -m "message"   # create migration
flask db upgrade                 # apply migrations
flask lgpd-retencao-leads --dias 730   # anonimiza leads inativos (todos os tenants)
flask lgpd-purgar-ip-logs --dias 180   # remove IP de logs antigos (todos os tenants)
```

> **LGPD:** os comandos `lgpd-*` iteram por todos os schemas de tenant e aplicam a política
> de retenção/anonimização (art. 15/16). Agende-os periodicamente (cron). Endpoints de direitos
> do titular ficam em `/api/v1/core/privacidade/*` (permissão `lgpd_gerir`).

### Frontend
```bash
cd frontend
npm run dev      # starts on port 3000
npm run build
npm run lint
```

## Architecture

### Backend (`backend/`)

Flask application factory in `app/__init__.py`. Blueprints are organized by domain under `app/domains/`, registered centrally via `app/domains/registry.py`.

**Domain structure** (`app/domains/<domain>/blueprints/<resource>/routes.py`):

| Domain | Blueprint | URL Prefix |
|--------|-----------|------------|
| `core` | `usuarios` | `/api/v1/core/usuarios` |
| `core` | `tenants` | `/api/v1/core/tenants` |
| `core` | `admin` | `/api/v1/core/admin` |
| `core` | `webhook` | `/api/v1/core/webhook` |
| `core` | `privacidade` | `/api/v1/core/privacidade` |
| `crm` | `leads` | `/api/v1/crm/leads` |
| `crm` | `empresas` | `/api/v1/crm/empresas` |
| `crm` | `negocios` | `/api/v1/crm/negocios` |
| `crm` | `pipelines` | `/api/v1/crm/pipelines` |
| `crm` | `servicos` | `/api/v1/crm/servicos` |
| `crm` | `projetos` | `/api/v1/crm/projetos` |
| `crm` | `dashboard` | `/api/v1/crm/dashboard` |
| `inspect` | `ativos` | `/api/v1/inspect/ativos` |
| `inspect` | `inspecoes` | `/api/v1/inspect/inspecoes` |
| `inspect` | `ordens` | `/api/v1/inspect/ordens` |

**Models** (`app/domains/<domain>/models/`): All re-exported from `app/models/__init__.py` for convenience — use `from app.models import Foo`. Key relationships:
- `Lead` → belongs to `Empresa`
- `Negocio` → belongs to `Lead`, references `Servico`, placed in a `Pipeline` + `Estagio`
- `Pipeline` → has many `Estagio` stages (ordered, colored); `LeadEstagio` tracks placement history
- `Projeto` → has many `Tarefa`; `Tarefa` has `ChecklistItem` and `ComentarioTarefa`
- `Ativo` → equipment/assets tracked per tenant
- `Inspecao` → field inspection records; `TemplateChecklist` defines reusable checklists
- `ContratoAMC` → annual maintenance contracts
- `Perfil` + `Permissao` → role-based access; every `Usuario` belongs to a `Perfil`
- `LogAtividade` → audit trail for all significant actions
- `Tenant` → top-level isolation; each tenant has its own PostgreSQL schema

**Auth**: Flask-JWT-Extended. Access token (1h) + refresh token (30d) stored in `localStorage`. The `@app.before_request` hook extracts the JWT schema claim and sets `SET search_path` for multi-tenancy.

**Decorator pattern** in route handlers:
```python
@leads_bp.route('/<int:id>', methods=['GET'])
@token_required          # injects `usuario_atual` as first arg
@requer_permissao('leads_ver')
def get_lead(usuario_atual, id):
    ...
```
`@token_required` (from `app/utils/decorators.py`) wraps `@jwt_required()` and resolves the `Usuario` object. `@requer_permissao` checks `usuario_atual.perfil.permissoes`.

**Utils** (`app/utils/`):
- `decorators.py` — `@token_required`, `@requer_permissao`, `@requer_admin`
- `iniciar_dados.py` — seeds default pipeline stages, permissions, and roles on tenant creation
- `email_service.py` — Brevo (formerly Sendinblue) transactional email
- `pdf_generator.py` — ReportLab PDF generation (inspection reports, laudos)
- `validadores.py` — input validation helpers

**Config**: `backend/config/development.py` and `production.py` loaded by factory based on `FLASK_ENV` / `APP_ENV`. Production deploys to Railway (`railway.json`, `Procfile`, `start.sh`).

### Frontend (`frontend/src/`)

Next.js App Router with route groups:
- `app/(authenticated)/` — protected; layout checks auth via `AuthContext`
- Public: `app/login/`, `app/registro/`, `app/esqueci-senha/`, `app/redefinir-senha/`

**Authenticated pages**:
- `dashboard/` — KPI overview
- `leads/` — lead list & kanban
- `negocios/` — deals pipeline
- `pipeline/` — pipeline stage configuration
- `empresas/` — company list
- `projetos/` + `projetos/detalhe/` — project list and detail view
- `inspecoes/campo/` — field inspection form
- `contratos-amc/` — AMC contract management
- `portal-cliente/` — client-facing portal
- `usuarios/` — user management
- `perfil/` — user profile settings
- `admin/` + `admin/settings/` — admin console

**Key files**:
- `lib/api.ts` — axios instance; auto-attaches `Bearer` token; handles 401 → refresh flow
- `contexts/auth-context.tsx` — global user state, login/logout, token management
- `contexts/sidebar-context.tsx` — sidebar open/collapsed state
- `components/layout/sidebar.tsx` + `topbar.tsx` — persistent chrome
- `types/index.ts` — all TypeScript interfaces for API responses

**API proxy**: `next.config.js` rewrites `/api/*` → `http://localhost:5001/api/*` in dev, avoiding CORS. In production set `NEXT_PUBLIC_API_URL`.

### shadcn/ui Convention
Components in `components/ui/` use explicit Tailwind color values (`bg-white`, `text-gray-*`) instead of CSS variables (`bg-background`, `bg-card`) because the theme CSS variables are not configured. Apply this same pattern when adding any new shadcn components.

## Environment

Backend env vars (set in shell or `.env`):
- `DATABASE_URL` — defaults to SQLite `crm.sqlite`; production uses PostgreSQL
- `SECRET_KEY`, `JWT_SECRET_KEY`
- `MASTER_WORKSPACE` — default `apex`
- `BREVO_API_KEY`, `MAIL_DEFAULT_SENDER_NAME`, `MAIL_DEFAULT_SENDER_EMAIL`

Frontend: `NEXT_PUBLIC_API_URL` (default `http://localhost:5001`)

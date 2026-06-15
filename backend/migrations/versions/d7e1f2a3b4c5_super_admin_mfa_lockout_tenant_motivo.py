"""Super Admin: 2FA, lockout de login e motivo de inativação de tenant

Revision ID: d7e1f2a3b4c5
Revises: c6d0e4f8a9b1
Create Date: 2026-06-14 21:30:00.000000
"""
from alembic import op
from sqlalchemy import text


revision = 'd7e1f2a3b4c5'
down_revision = 'c6d0e4f8a9b1'
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    if bind.dialect.name != 'postgresql':
        return

    bind.execute(text("ALTER TABLE public.platform_users ADD COLUMN IF NOT EXISTS mfa_secret VARCHAR(64)"))
    bind.execute(text("ALTER TABLE public.platform_users ADD COLUMN IF NOT EXISTS mfa_habilitado BOOLEAN NOT NULL DEFAULT false"))
    bind.execute(text("ALTER TABLE public.platform_users ADD COLUMN IF NOT EXISTS tentativas_falhas INTEGER NOT NULL DEFAULT 0"))
    bind.execute(text("ALTER TABLE public.platform_users ADD COLUMN IF NOT EXISTS bloqueado_ate TIMESTAMP"))

    bind.execute(text("ALTER TABLE public.tenant ADD COLUMN IF NOT EXISTS motivo_inativacao VARCHAR(255)"))


def downgrade():
    bind = op.get_bind()
    if bind.dialect.name != 'postgresql':
        return

    bind.execute(text("ALTER TABLE public.tenant DROP COLUMN IF EXISTS motivo_inativacao"))
    bind.execute(text("ALTER TABLE public.platform_users DROP COLUMN IF EXISTS bloqueado_ate"))
    bind.execute(text("ALTER TABLE public.platform_users DROP COLUMN IF EXISTS tentativas_falhas"))
    bind.execute(text("ALTER TABLE public.platform_users DROP COLUMN IF EXISTS mfa_habilitado"))
    bind.execute(text("ALTER TABLE public.platform_users DROP COLUMN IF EXISTS mfa_secret"))

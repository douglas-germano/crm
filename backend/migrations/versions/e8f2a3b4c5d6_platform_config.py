"""Configuração global da plataforma (platform_config)

Revision ID: e8f2a3b4c5d6
Revises: d7e1f2a3b4c5
Create Date: 2026-06-15 10:00:00.000000
"""
from alembic import op
from sqlalchemy import text


revision = 'e8f2a3b4c5d6'
down_revision = 'd7e1f2a3b4c5'
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    if bind.dialect.name != 'postgresql':
        return

    bind.execute(text(
        "CREATE TABLE IF NOT EXISTS public.platform_config ("
        "id INTEGER PRIMARY KEY, "
        "inscricoes_abertas BOOLEAN NOT NULL DEFAULT true, "
        "modo_manutencao BOOLEAN NOT NULL DEFAULT false, "
        "forcar_2fa BOOLEAN NOT NULL DEFAULT false, "
        "atualizado_em TIMESTAMP DEFAULT NOW()"
        ")"
    ))
    bind.execute(text(
        "INSERT INTO public.platform_config (id, inscricoes_abertas, modo_manutencao, forcar_2fa) "
        "SELECT 1, true, false, false "
        "WHERE NOT EXISTS (SELECT 1 FROM public.platform_config WHERE id = 1)"
    ))


def downgrade():
    bind = op.get_bind()
    if bind.dialect.name != 'postgresql':
        return
    bind.execute(text("DROP TABLE IF EXISTS public.platform_config"))

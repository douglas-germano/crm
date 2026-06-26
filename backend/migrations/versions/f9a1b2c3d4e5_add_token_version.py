"""Adiciona token_version para revogação de JWT

Revision ID: f9a1b2c3d4e5
Revises: e8f2a3b4c5d6
Create Date: 2026-06-15 14:00:00.000000

Multi-tenant: `usuarios` existe em cada schema de tenant; aplica a coluna em
TODOS os schemas que contêm a tabela. `platform_users` fica em public.
"""
from alembic import op
from sqlalchemy import text


revision = 'f9a1b2c3d4e5'
down_revision = 'e8f2a3b4c5d6'
branch_labels = None
depends_on = None


def _schemas_com_tabela(bind, tabela):
    rows = bind.execute(
        text("SELECT table_schema FROM information_schema.tables WHERE table_name = :t"),
        {'t': tabela},
    ).fetchall()
    return [r[0] for r in rows]


def _coluna_existe(bind, schema, tabela, coluna):
    return bind.execute(
        text(
            "SELECT 1 FROM information_schema.columns "
            "WHERE table_schema = :s AND table_name = :t AND column_name = :c"
        ),
        {'s': schema, 't': tabela, 'c': coluna},
    ).first() is not None


def upgrade():
    bind = op.get_bind()
    if bind.dialect.name != 'postgresql':
        return

    # usuarios em todos os schemas de tenant
    for schema in _schemas_com_tabela(bind, 'usuarios'):
        if not _coluna_existe(bind, schema, 'usuarios', 'token_version'):
            bind.execute(text(
                f'ALTER TABLE "{schema}".usuarios '
                'ADD COLUMN token_version INTEGER NOT NULL DEFAULT 0'
            ))

    # platform_users no schema público
    if not _coluna_existe(bind, 'public', 'platform_users', 'token_version'):
        bind.execute(text(
            'ALTER TABLE public.platform_users '
            'ADD COLUMN token_version INTEGER NOT NULL DEFAULT 0'
        ))


def downgrade():
    bind = op.get_bind()
    if bind.dialect.name != 'postgresql':
        return

    for schema in _schemas_com_tabela(bind, 'usuarios'):
        if _coluna_existe(bind, schema, 'usuarios', 'token_version'):
            bind.execute(text(f'ALTER TABLE "{schema}".usuarios DROP COLUMN token_version'))

    if _coluna_existe(bind, 'public', 'platform_users', 'token_version'):
        bind.execute(text('ALTER TABLE public.platform_users DROP COLUMN token_version'))

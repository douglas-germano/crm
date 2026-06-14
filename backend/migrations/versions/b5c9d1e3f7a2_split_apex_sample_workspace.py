"""Split Apex sample and production workspaces

Revision ID: b5c9d1e3f7a2
Revises: a4b8c0d2e5f6
Create Date: 2026-06-14 19:25:00.000000

The public schema is the sample workspace exposed as "apex". The real Apex
tenant data lives in the apexengenharia schema and needs its own workspace row.
"""
from alembic import op
from sqlalchemy import text


revision = 'b5c9d1e3f7a2'
down_revision = 'a4b8c0d2e5f6'
branch_labels = None
depends_on = None


def _schema_exists(bind, schema):
    return bind.execute(
        text("SELECT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = :schema)"),
        {'schema': schema},
    ).scalar()


def _table_exists(bind, schema, table):
    return bind.execute(
        text(
            "SELECT EXISTS ("
            "SELECT 1 FROM information_schema.tables "
            "WHERE table_schema = :schema AND table_name = :table"
            ")"
        ),
        {'schema': schema, 'table': table},
    ).scalar()


def upgrade():
    bind = op.get_bind()

    if bind.dialect.name != 'postgresql':
        return
    if not _table_exists(bind, 'public', 'tenant'):
        return

    bind.execute(text(
        "UPDATE public.tenant "
        "SET db_schema = 'public' "
        "WHERE subdominio = 'apex' "
        "AND db_schema = 'apexengenharia'"
    ))

    if not _schema_exists(bind, 'apexengenharia'):
        return

    bind.execute(text(
        "INSERT INTO public.tenant "
        "(nome_fantasia, subdominio, db_schema, webhook_token, data_criacao) "
        "SELECT 'Apex Engenharia', 'apexengenharia', 'apexengenharia', NULL, NOW() "
        "WHERE NOT EXISTS ("
        "SELECT 1 FROM public.tenant "
        "WHERE subdominio = 'apexengenharia' OR db_schema = 'apexengenharia'"
        ")"
    ))

    bind.execute(text(
        "UPDATE public.tenant "
        "SET db_schema = 'apexengenharia' "
        "WHERE subdominio = 'apexengenharia' "
        "AND db_schema <> 'apexengenharia' "
        "AND NOT EXISTS ("
        "SELECT 1 FROM public.tenant "
        "WHERE db_schema = 'apexengenharia' AND subdominio <> 'apexengenharia'"
        ")"
    ))


def downgrade():
    bind = op.get_bind()

    if bind.dialect.name != 'postgresql':
        return
    if not _table_exists(bind, 'public', 'tenant'):
        return

    bind.execute(text(
        "DELETE FROM public.tenant "
        "WHERE subdominio = 'apexengenharia' "
        "AND db_schema = 'apexengenharia'"
    ))
    bind.execute(text(
        "UPDATE public.tenant "
        "SET db_schema = 'apexengenharia' "
        "WHERE subdominio = 'apex' "
        "AND db_schema = 'public'"
    ))

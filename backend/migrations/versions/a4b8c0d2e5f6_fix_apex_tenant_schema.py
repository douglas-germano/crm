"""Fix Apex tenant schema mapping

Revision ID: a4b8c0d2e5f6
Revises: f3a7b9c1d2e3
Create Date: 2026-06-14 19:00:00.000000

Production had the Apex tenant registered as db_schema='public' while its
actual tenant tables live in the apexengenharia schema. Keep the public
workspace slug intact, but point JWT/search_path resolution at the data schema.
"""
from alembic import op
from sqlalchemy import text


revision = 'a4b8c0d2e5f6'
down_revision = 'f3a7b9c1d2e3'
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
    if not _schema_exists(bind, 'apexengenharia'):
        return

    bind.execute(text(
        "UPDATE public.tenant "
        "SET db_schema = 'apexengenharia' "
        "WHERE db_schema = 'public' "
        "AND (subdominio = 'apex' OR nome_fantasia ILIKE '%Apex%')"
    ))


def downgrade():
    bind = op.get_bind()

    if bind.dialect.name != 'postgresql':
        return
    if not _table_exists(bind, 'public', 'tenant'):
        return

    bind.execute(text(
        "UPDATE public.tenant "
        "SET db_schema = 'public' "
        "WHERE db_schema = 'apexengenharia' "
        "AND subdominio = 'apex'"
    ))

"""Ensure webhook_integracoes exists in existing tenant schemas

Revision ID: f3a7b9c1d2e3
Revises: e2f4a6b8c9d0
Create Date: 2026-06-14 18:30:00.000000

Follow-up for deployments where legacy data schemas exist but are not listed
in public.tenant.db_schema.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text


revision = 'f3a7b9c1d2e3'
down_revision = 'e2f4a6b8c9d0'
branch_labels = None
depends_on = None


WEBHOOK_TABLE = 'webhook_integracoes'


def _valid_schema(schema):
    return bool(schema) and schema.replace('_', '').isalnum() and schema[0].isalpha()


def _quote_ident(value):
    return '"' + value.replace('"', '""') + '"'


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


def _tenant_schemas(bind):
    rows = bind.execute(text(
        "SELECT DISTINCT table_schema "
        "FROM information_schema.tables "
        "WHERE table_name IN ('leads', 'contatos', 'usuarios', 'empresas') "
        "AND table_schema NOT IN ('information_schema', 'pg_catalog')"
    )).fetchall()
    schemas = {row[0] for row in rows if _valid_schema(row[0])}

    if _table_exists(bind, 'public', 'tenant'):
        rows = bind.execute(text("SELECT db_schema FROM public.tenant")).fetchall()
        schemas.update(row[0] for row in rows if _valid_schema(row[0]))

    schemas.add('public')
    return sorted(schemas)


def _create_webhook_table(schema):
    op.create_table(
        WEBHOOK_TABLE,
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('nome', sa.String(100), nullable=False),
        sa.Column('token', sa.String(64), nullable=False),
        sa.Column('origem_padrao', sa.String(50), nullable=True),
        sa.Column('descricao', sa.String(200), nullable=True),
        sa.Column('ativo', sa.Boolean(), nullable=True, server_default='true'),
        sa.Column('total_leads', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('data_criacao', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('token'),
        schema=schema,
    )


def _copy_public_rows_to_single_tenant(bind, tenant_schema):
    if tenant_schema == 'public':
        return
    if not _table_exists(bind, 'public', WEBHOOK_TABLE):
        return
    if not _table_exists(bind, tenant_schema, WEBHOOK_TABLE):
        return

    public_count = bind.execute(text(f'SELECT COUNT(*) FROM public.{WEBHOOK_TABLE}')).scalar()
    tenant_count = bind.execute(
        text(f'SELECT COUNT(*) FROM {_quote_ident(tenant_schema)}.{WEBHOOK_TABLE}')
    ).scalar()
    if not public_count or tenant_count:
        return

    tenant_table = f'{_quote_ident(tenant_schema)}.{WEBHOOK_TABLE}'
    bind.execute(text(
        f'INSERT INTO {tenant_table} '
        '(id, nome, token, origem_padrao, descricao, ativo, total_leads, data_criacao) '
        f'SELECT id, nome, token, origem_padrao, descricao, ativo, total_leads, data_criacao '
        f'FROM public.{WEBHOOK_TABLE}'
    ))
    bind.execute(text(
        "SELECT setval("
        f"pg_get_serial_sequence('{tenant_table}', 'id'), "
        f"(SELECT COALESCE(MAX(id), 1) FROM {tenant_table}), "
        f"(SELECT COUNT(*) > 0 FROM {tenant_table})"
        ")"
    ))


def upgrade():
    bind = op.get_bind()

    if bind.dialect.name != 'postgresql':
        return

    schemas = _tenant_schemas(bind)
    for schema in schemas:
        if not _table_exists(bind, schema, WEBHOOK_TABLE):
            _create_webhook_table(schema)

    non_public_schemas = [schema for schema in schemas if schema != 'public']
    if len(non_public_schemas) == 1:
        _copy_public_rows_to_single_tenant(bind, non_public_schemas[0])


def downgrade():
    bind = op.get_bind()

    if bind.dialect.name != 'postgresql':
        return

    for schema in _tenant_schemas(bind):
        if schema != 'public' and _table_exists(bind, schema, WEBHOOK_TABLE):
            op.drop_table(WEBHOOK_TABLE, schema=schema)

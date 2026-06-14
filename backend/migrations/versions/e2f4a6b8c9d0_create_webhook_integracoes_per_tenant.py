"""Create webhook_integracoes per tenant schema

Revision ID: e2f4a6b8c9d0
Revises: d1bbb502cf3b
Create Date: 2026-06-14 18:15:00.000000

The original webhook_integracoes migration ran with the default public
search_path, so existing PostgreSQL deployments ended up with only
public.webhook_integracoes. The application queries this model after setting
search_path to the tenant schema, therefore each tenant needs its own table.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text


revision = 'e2f4a6b8c9d0'
down_revision = 'd1bbb502cf3b'
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
    schemas = set()

    if not _table_exists(bind, 'public', 'tenant'):
        schemas.add('public')
    else:
        rows = bind.execute(text("SELECT db_schema FROM public.tenant ORDER BY db_schema")).fetchall()
        schemas.update(row[0] for row in rows if _valid_schema(row[0]))

    # Some legacy deployments have tenant data schemas that are not reflected in
    # public.tenant.db_schema. Include schemas that already hold tenant tables.
    rows = bind.execute(text(
        "SELECT DISTINCT table_schema "
        "FROM information_schema.tables "
        "WHERE table_name IN ('leads', 'contatos', 'usuarios', 'empresas') "
        "AND table_schema NOT IN ('information_schema', 'pg_catalog')"
    )).fetchall()
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

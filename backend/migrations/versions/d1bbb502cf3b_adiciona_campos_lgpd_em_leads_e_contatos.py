"""Adiciona campos LGPD em leads e contatos

Revision ID: d1bbb502cf3b
Revises: c3d4e5f6a7b8
Create Date: 2026-06-14 16:25:06.363954

Multi-tenant: cada tenant possui seu próprio schema com cópias das tabelas
`leads` e `contatos`. Esta migração aplica as colunas em TODOS os schemas que
contêm essas tabelas (idempotente via IF NOT EXISTS no PostgreSQL).
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text


revision = 'd1bbb502cf3b'
down_revision = 'c3d4e5f6a7b8'
branch_labels = None
depends_on = None


# (coluna, DDL de tipo) — ordem preservada para legibilidade
COLUNAS = [
    ('base_legal', 'VARCHAR(30)'),
    ('finalidade', 'TEXT'),
    ('consentimento', 'BOOLEAN'),
    ('consentimento_data', 'TIMESTAMP'),
    ('consentimento_origem', 'VARCHAR(120)'),
    ('anonimizado', 'BOOLEAN'),
    ('anonimizado_em', 'TIMESTAMP'),
]
TABELAS = ['leads', 'contatos']


def _schemas_com_tabela(bind, tabela):
    rows = bind.execute(
        text(
            "SELECT table_schema FROM information_schema.tables "
            "WHERE table_name = :t"
        ),
        {'t': tabela},
    ).fetchall()
    return [r[0] for r in rows]


def upgrade():
    bind = op.get_bind()

    if bind.dialect.name != 'postgresql':
        # Ambientes single-schema (ex.: SQLite em dev) — aplica no schema corrente.
        for tabela in TABELAS:
            with op.batch_alter_table(tabela, schema=None) as batch_op:
                for nome, tipo in COLUNAS:
                    sa_type = sa.Text() if tipo == 'TEXT' else (
                        sa.Boolean() if tipo == 'BOOLEAN' else (
                            sa.DateTime() if tipo == 'TIMESTAMP' else sa.String(length=int(tipo[8:-1]))
                        )
                    )
                    batch_op.add_column(sa.Column(nome, sa_type, nullable=True))
        return

    for tabela in TABELAS:
        for schema in _schemas_com_tabela(bind, tabela):
            for nome, tipo in COLUNAS:
                bind.execute(text(
                    f'ALTER TABLE "{schema}"."{tabela}" ADD COLUMN IF NOT EXISTS {nome} {tipo}'
                ))


def downgrade():
    bind = op.get_bind()

    if bind.dialect.name != 'postgresql':
        for tabela in TABELAS:
            with op.batch_alter_table(tabela, schema=None) as batch_op:
                for nome, _ in reversed(COLUNAS):
                    batch_op.drop_column(nome)
        return

    for tabela in TABELAS:
        for schema in _schemas_com_tabela(bind, tabela):
            for nome, _ in reversed(COLUNAS):
                bind.execute(text(
                    f'ALTER TABLE "{schema}"."{tabela}" DROP COLUMN IF EXISTS {nome}'
                ))

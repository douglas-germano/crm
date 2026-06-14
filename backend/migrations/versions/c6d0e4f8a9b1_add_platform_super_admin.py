"""Add platform super admin management

Revision ID: c6d0e4f8a9b1
Revises: b5c9d1e3f7a2
Create Date: 2026-06-14 20:15:00.000000
"""
import os

from alembic import op
import sqlalchemy as sa
from sqlalchemy import text
from werkzeug.security import generate_password_hash


revision = 'c6d0e4f8a9b1'
down_revision = 'b5c9d1e3f7a2'
branch_labels = None
depends_on = None


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

    if _table_exists(bind, 'public', 'tenant'):
        op.add_column('tenant', sa.Column('ativo', sa.Boolean(), nullable=True, server_default='true'), schema='public')
        bind.execute(text("UPDATE public.tenant SET ativo = true WHERE ativo IS NULL"))

    op.create_table(
        'platform_users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('nome', sa.String(length=100), nullable=False),
        sa.Column('email', sa.String(length=120), nullable=False),
        sa.Column('senha_hash', sa.String(length=256), nullable=False),
        sa.Column('papel', sa.String(length=30), nullable=False, server_default='super_admin'),
        sa.Column('ativo', sa.Boolean(), nullable=True, server_default='true'),
        sa.Column('data_criacao', sa.DateTime(), nullable=True, server_default=sa.text('NOW()')),
        sa.Column('ultimo_login', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email'),
        schema='public',
    )

    op.create_table(
        'platform_audit_logs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('platform_user_id', sa.Integer(), nullable=True),
        sa.Column('acao', sa.String(length=80), nullable=False),
        sa.Column('alvo_tipo', sa.String(length=50), nullable=True),
        sa.Column('alvo_id', sa.String(length=80), nullable=True),
        sa.Column('descricao', sa.Text(), nullable=True),
        sa.Column('ip', sa.String(length=45), nullable=True),
        sa.Column('data_criacao', sa.DateTime(), nullable=True, server_default=sa.text('NOW()')),
        sa.ForeignKeyConstraint(['platform_user_id'], ['public.platform_users.id']),
        sa.PrimaryKeyConstraint('id'),
        schema='public',
    )

    email = os.environ.get('SUPER_ADMIN_EMAIL', 'admin@example.com').strip().lower()
    senha = os.environ.get('SUPER_ADMIN_PASSWORD', 'admin@example.com')
    nome = os.environ.get('SUPER_ADMIN_NAME', 'Super Admin')

    bind.execute(
        text(
            "INSERT INTO public.platform_users (nome, email, senha_hash, papel, ativo, data_criacao) "
            "SELECT :nome, :email, :senha_hash, 'super_admin', true, NOW() "
            "WHERE NOT EXISTS (SELECT 1 FROM public.platform_users WHERE email = :email)"
        ),
        {
            'nome': nome,
            'email': email,
            'senha_hash': generate_password_hash(senha),
        },
    )


def downgrade():
    bind = op.get_bind()

    if bind.dialect.name != 'postgresql':
        return

    op.drop_table('platform_audit_logs', schema='public')
    op.drop_table('platform_users', schema='public')
    if _table_exists(bind, 'public', 'tenant'):
        op.drop_column('tenant', 'ativo', schema='public')

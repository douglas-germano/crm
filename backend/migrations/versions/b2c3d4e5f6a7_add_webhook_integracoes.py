"""add webhook_integracoes table

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-06-05 00:01:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = 'b2c3d4e5f6a7'
down_revision = 'a1b2c3d4e5f6'
branch_labels = None
depends_on = None


def upgrade():
    # Tabela criada em cada schema de tenant (sem schema= aqui)
    op.create_table(
        'webhook_integracoes',
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
    )


def downgrade():
    op.drop_table('webhook_integracoes')

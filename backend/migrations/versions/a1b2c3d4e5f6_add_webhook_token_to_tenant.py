"""add webhook_token to tenant

Revision ID: a1b2c3d4e5f6
Revises: f5f3ffb25a76
Create Date: 2026-06-05 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = 'a1b2c3d4e5f6'
down_revision = 'f5f3ffb25a76'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        'tenant',
        sa.Column('webhook_token', sa.String(64), nullable=True, unique=True),
        schema='public',
    )
    op.create_index(
        'ix_tenant_webhook_token',
        'tenant',
        ['webhook_token'],
        unique=True,
        schema='public',
    )


def downgrade():
    op.drop_index('ix_tenant_webhook_token', table_name='tenant', schema='public')
    op.drop_column('tenant', 'webhook_token', schema='public')

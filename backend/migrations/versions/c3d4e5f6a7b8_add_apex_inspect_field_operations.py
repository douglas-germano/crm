"""add apex inspect field operations

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-06-06 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = 'c3d4e5f6a7b8'
down_revision = 'b2c3d4e5f6a7'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'ordens_servico',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('uuid', sa.String(length=36), nullable=True),
        sa.Column('codigo', sa.String(length=30), nullable=True),
        sa.Column('titulo', sa.String(length=150), nullable=False),
        sa.Column('tipo', sa.String(length=40), nullable=True),
        sa.Column('status', sa.String(length=30), nullable=True),
        sa.Column('prioridade', sa.String(length=20), nullable=True),
        sa.Column('descricao', sa.Text(), nullable=True),
        sa.Column('escopo', sa.JSON(), nullable=True),
        sa.Column('endereco_atendimento', sa.String(length=255), nullable=True),
        sa.Column('latitude', sa.Float(), nullable=True),
        sa.Column('longitude', sa.Float(), nullable=True),
        sa.Column('data_agendada', sa.DateTime(), nullable=True),
        sa.Column('data_inicio', sa.DateTime(), nullable=True),
        sa.Column('data_fim', sa.DateTime(), nullable=True),
        sa.Column('observacoes_internas', sa.Text(), nullable=True),
        sa.Column('observacoes_cliente', sa.Text(), nullable=True),
        sa.Column('empresa_id', sa.Integer(), nullable=False),
        sa.Column('ativo_id', sa.Integer(), nullable=True),
        sa.Column('contrato_amc_id', sa.Integer(), nullable=True),
        sa.Column('projeto_id', sa.Integer(), nullable=True),
        sa.Column('negocio_id', sa.Integer(), nullable=True),
        sa.Column('responsavel_id', sa.Integer(), nullable=True),
        sa.Column('criado_por_id', sa.Integer(), nullable=True),
        sa.Column('data_criacao', sa.DateTime(), nullable=True),
        sa.Column('data_atualizacao', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['ativo_id'], ['ativos.id']),
        sa.ForeignKeyConstraint(['contrato_amc_id'], ['contratos_amc.id']),
        sa.ForeignKeyConstraint(['criado_por_id'], ['usuarios.id']),
        sa.ForeignKeyConstraint(['empresa_id'], ['empresas.id']),
        sa.ForeignKeyConstraint(['negocio_id'], ['negocios.id']),
        sa.ForeignKeyConstraint(['projeto_id'], ['projetos.id']),
        sa.ForeignKeyConstraint(['responsavel_id'], ['usuarios.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('codigo'),
        sa.UniqueConstraint('uuid'),
    )

    op.add_column('inspecoes', sa.Column('ordem_servico_id', sa.Integer(), nullable=True))
    op.create_foreign_key(
        'fk_inspecoes_ordem_servico_id_ordens_servico',
        'inspecoes',
        'ordens_servico',
        ['ordem_servico_id'],
        ['id'],
    )

    op.create_table(
        'execucoes_campo',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('uuid', sa.String(length=36), nullable=True),
        sa.Column('status', sa.String(length=30), nullable=True),
        sa.Column('data_inicio', sa.DateTime(), nullable=True),
        sa.Column('data_fim', sa.DateTime(), nullable=True),
        sa.Column('checklist_snapshot', sa.JSON(), nullable=True),
        sa.Column('respostas', sa.JSON(), nullable=True),
        sa.Column('observacoes', sa.Text(), nullable=True),
        sa.Column('latitude_inicio', sa.Float(), nullable=True),
        sa.Column('longitude_inicio', sa.Float(), nullable=True),
        sa.Column('latitude_fim', sa.Float(), nullable=True),
        sa.Column('longitude_fim', sa.Float(), nullable=True),
        sa.Column('ordem_servico_id', sa.Integer(), nullable=False),
        sa.Column('executor_id', sa.Integer(), nullable=True),
        sa.Column('data_criacao', sa.DateTime(), nullable=True),
        sa.Column('data_atualizacao', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['executor_id'], ['usuarios.id']),
        sa.ForeignKeyConstraint(['ordem_servico_id'], ['ordens_servico.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('uuid'),
    )

    op.create_table(
        'apontamentos_hora',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('data_inicio', sa.DateTime(), nullable=False),
        sa.Column('data_fim', sa.DateTime(), nullable=True),
        sa.Column('horas', sa.Float(), nullable=True),
        sa.Column('tipo', sa.String(length=30), nullable=True),
        sa.Column('descricao', sa.Text(), nullable=True),
        sa.Column('ordem_servico_id', sa.Integer(), nullable=False),
        sa.Column('usuario_id', sa.Integer(), nullable=True),
        sa.Column('data_criacao', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['ordem_servico_id'], ['ordens_servico.id']),
        sa.ForeignKeyConstraint(['usuario_id'], ['usuarios.id']),
        sa.PrimaryKeyConstraint('id'),
    )

    op.create_table(
        'materiais_utilizados',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('nome', sa.String(length=150), nullable=False),
        sa.Column('quantidade', sa.Float(), nullable=True),
        sa.Column('unidade', sa.String(length=20), nullable=True),
        sa.Column('valor_unitario', sa.Float(), nullable=True),
        sa.Column('observacao', sa.Text(), nullable=True),
        sa.Column('ordem_servico_id', sa.Integer(), nullable=False),
        sa.Column('registrado_por_id', sa.Integer(), nullable=True),
        sa.Column('data_criacao', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['ordem_servico_id'], ['ordens_servico.id']),
        sa.ForeignKeyConstraint(['registrado_por_id'], ['usuarios.id']),
        sa.PrimaryKeyConstraint('id'),
    )

    op.create_table(
        'assinaturas_campo',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('nome', sa.String(length=150), nullable=False),
        sa.Column('documento', sa.String(length=50), nullable=True),
        sa.Column('cargo', sa.String(length=100), nullable=True),
        sa.Column('tipo', sa.String(length=30), nullable=True),
        sa.Column('assinatura_url', sa.String(length=500), nullable=True),
        sa.Column('aceite_texto', sa.Text(), nullable=True),
        sa.Column('latitude', sa.Float(), nullable=True),
        sa.Column('longitude', sa.Float(), nullable=True),
        sa.Column('ordem_servico_id', sa.Integer(), nullable=False),
        sa.Column('usuario_id', sa.Integer(), nullable=True),
        sa.Column('data_criacao', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['ordem_servico_id'], ['ordens_servico.id']),
        sa.ForeignKeyConstraint(['usuario_id'], ['usuarios.id']),
        sa.PrimaryKeyConstraint('id'),
    )

    op.create_table(
        'relatorios_tecnicos',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('titulo', sa.String(length=150), nullable=False),
        sa.Column('status', sa.String(length=30), nullable=True),
        sa.Column('conteudo', sa.JSON(), nullable=True),
        sa.Column('pdf_url', sa.String(length=500), nullable=True),
        sa.Column('emitido_em', sa.DateTime(), nullable=True),
        sa.Column('ordem_servico_id', sa.Integer(), nullable=False),
        sa.Column('emitido_por_id', sa.Integer(), nullable=True),
        sa.Column('data_criacao', sa.DateTime(), nullable=True),
        sa.Column('data_atualizacao', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['emitido_por_id'], ['usuarios.id']),
        sa.ForeignKeyConstraint(['ordem_servico_id'], ['ordens_servico.id']),
        sa.PrimaryKeyConstraint('id'),
    )

    op.create_table(
        'evidencias_campo',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('uuid', sa.String(length=36), nullable=True),
        sa.Column('tipo', sa.String(length=30), nullable=True),
        sa.Column('url', sa.String(length=500), nullable=False),
        sa.Column('legenda', sa.String(length=255), nullable=True),
        sa.Column('origem', sa.String(length=50), nullable=True),
        sa.Column('item_referencia', sa.String(length=100), nullable=True),
        sa.Column('latitude', sa.Float(), nullable=True),
        sa.Column('longitude', sa.Float(), nullable=True),
        sa.Column('metadados', sa.JSON(), nullable=True),
        sa.Column('ordem_servico_id', sa.Integer(), nullable=False),
        sa.Column('execucao_id', sa.Integer(), nullable=True),
        sa.Column('criado_por_id', sa.Integer(), nullable=True),
        sa.Column('data_criacao', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['criado_por_id'], ['usuarios.id']),
        sa.ForeignKeyConstraint(['execucao_id'], ['execucoes_campo.id']),
        sa.ForeignKeyConstraint(['ordem_servico_id'], ['ordens_servico.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('uuid'),
    )


def downgrade():
    op.drop_table('evidencias_campo')
    op.drop_table('relatorios_tecnicos')
    op.drop_table('assinaturas_campo')
    op.drop_table('materiais_utilizados')
    op.drop_table('apontamentos_hora')
    op.drop_table('execucoes_campo')
    op.drop_constraint('fk_inspecoes_ordem_servico_id_ordens_servico', 'inspecoes', type_='foreignkey')
    op.drop_column('inspecoes', 'ordem_servico_id')
    op.drop_table('ordens_servico')

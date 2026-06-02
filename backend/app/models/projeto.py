from app import db
from datetime import datetime, timezone
import uuid


class Projeto(db.Model):
    __tablename__ = 'projetos'

    id = db.Column(db.Integer, primary_key=True)
    uuid = db.Column(db.String(36), unique=True, default=lambda: str(uuid.uuid4()))
    nome = db.Column(db.String(200), nullable=False)
    descricao = db.Column(db.Text)

    # Status: planejamento, em_andamento, pausado, concluido, cancelado
    status = db.Column(db.String(20), default='planejamento')

    # Prioridade: baixa, media, alta, critica
    prioridade = db.Column(db.String(20), default='media')

    # Datas
    data_inicio = db.Column(db.Date)
    data_previsao_fim = db.Column(db.Date)
    data_fim = db.Column(db.Date)

    # Financeiro
    valor_contrato = db.Column(db.Float, default=0.0)

    # Progresso (calculado automaticamente)
    percentual_concluido = db.Column(db.Float, default=0.0)

    # Relacionamentos
    negocio_id = db.Column(db.Integer, db.ForeignKey('negocios.id'), nullable=True)
    negocio = db.relationship('Negocio', backref=db.backref('projetos', lazy='dynamic'))

    empresa_id = db.Column(db.Integer, db.ForeignKey('empresas.id'), nullable=True)
    empresa = db.relationship('Empresa', backref=db.backref('projetos', lazy='dynamic'))

    gerente_id = db.Column(db.Integer, db.ForeignKey('usuarios.id'), nullable=True)
    gerente = db.relationship('Usuario', foreign_keys=[gerente_id],
                              backref=db.backref('projetos_gerenciados', lazy='dynamic'))

    criado_por_id = db.Column(db.Integer, db.ForeignKey('usuarios.id'), nullable=True)
    criado_por = db.relationship('Usuario', foreign_keys=[criado_por_id],
                                 backref=db.backref('projetos_criados', lazy='dynamic'))

    # Rastreamento
    data_criacao = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    data_atualizacao = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    def calcular_percentual(self):
        """Calcula o percentual de conclusão baseado nas tarefas (apenas tarefas raiz)."""
        tarefas = self.tarefas.filter_by(tarefa_pai_id=None).all()
        if not tarefas:
            return 0.0
        concluidas = sum(1 for t in tarefas if t.status == 'concluida')
        return round((concluidas / len(tarefas)) * 100, 1)

    def atualizar_percentual(self):
        """Atualiza o campo percentual_concluido."""
        self.percentual_concluido = self.calcular_percentual()

    def to_dict(self, incluir_tarefas=False):
        resultado = {
            'id': self.id,
            'uuid': self.uuid,
            'nome': self.nome,
            'descricao': self.descricao,
            'status': self.status,
            'prioridade': self.prioridade,
            'data_inicio': self.data_inicio.isoformat() if self.data_inicio else None,
            'data_previsao_fim': self.data_previsao_fim.isoformat() if self.data_previsao_fim else None,
            'data_fim': self.data_fim.isoformat() if self.data_fim else None,
            'valor_contrato': self.valor_contrato,
            'percentual_concluido': self.percentual_concluido,
            'negocio_id': self.negocio_id,
            'negocio_nome': self.negocio.nome if self.negocio else None,
            'empresa_id': self.empresa_id,
            'empresa_nome': self.empresa.razao_social if self.empresa else None,
            'gerente_id': self.gerente_id,
            'gerente_nome': self.gerente.nome if self.gerente else None,
            'criado_por_id': self.criado_por_id,
            'data_criacao': self.data_criacao.isoformat() if self.data_criacao else None,
            'data_atualizacao': self.data_atualizacao.isoformat() if self.data_atualizacao else None,
            'total_tarefas': self.tarefas.count() if self.tarefas else 0,
            'total_tarefas_concluidas': self.tarefas.filter_by(status='concluida').count() if self.tarefas else 0,
        }

        if incluir_tarefas:
            resultado['tarefas'] = [t.to_dict() for t in
                                     self.tarefas.filter_by(tarefa_pai_id=None)
                                     .order_by(Tarefa.ordem).all()]

        return resultado

    def __repr__(self):
        return f'<Projeto {self.nome}>'


# Import here to avoid circular imports in to_dict
from app.models.tarefa import Tarefa

from app import db
from datetime import datetime
import uuid

class ContratoAMC(db.Model):
    __tablename__ = 'contratos_amc'

    id = db.Column(db.Integer, primary_key=True)
    uuid = db.Column(db.String(36), unique=True, default=lambda: str(uuid.uuid4()))
    titulo = db.Column(db.String(150), nullable=False)
    plano = db.Column(db.String(50), default='mensal')  # mensal, trimestral, semestral, anual
    valor_recorrente = db.Column(db.Float, default=0.0)
    data_inicio = db.Column(db.Date, nullable=False)
    data_fim = db.Column(db.Date)
    status = db.Column(db.String(20), default='ativo')  # ativo, suspenso, cancelado, finalizado

    # Relacionamento com a empresa (cliente)
    empresa_id = db.Column(db.Integer, db.ForeignKey('empresas.id'), nullable=False)
    empresa = db.relationship('Empresa', backref=db.backref('contratos_amc', lazy='dynamic', cascade='all, delete-orphan'))

    data_criacao = db.Column(db.DateTime, default=datetime.utcnow)
    data_atualizacao = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'uuid': self.uuid,
            'titulo': self.titulo,
            'plano': self.plano,
            'valor_recorrente': self.valor_recorrente,
            'data_inicio': self.data_inicio.isoformat() if self.data_inicio else None,
            'data_fim': self.data_fim.isoformat() if self.data_fim else None,
            'status': self.status,
            'empresa_id': self.empresa_id,
            'empresa_nome': self.empresa.razao_social if self.empresa else None,
            'data_criacao': self.data_criacao.isoformat() if self.data_criacao else None,
            'data_atualizacao': self.data_atualizacao.isoformat() if self.data_atualizacao else None
        }

    def __repr__(self):
        return f'<ContratoAMC {self.titulo} - {self.status}>'

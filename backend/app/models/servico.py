from app import db
from datetime import datetime, timezone
import uuid


class Servico(db.Model):
    __tablename__ = 'servicos'

    id = db.Column(db.Integer, primary_key=True)
    uuid = db.Column(db.String(36), unique=True, default=lambda: str(uuid.uuid4()))
    nome = db.Column(db.String(150), nullable=False)
    descricao = db.Column(db.Text)
    categoria = db.Column(db.String(50))  # projeto, consultoria, manutencao, fabricacao, inspecao
    ativo = db.Column(db.Boolean, default=True)
    data_criacao = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            'id': self.id,
            'uuid': self.uuid,
            'nome': self.nome,
            'descricao': self.descricao,
            'categoria': self.categoria,
            'ativo': self.ativo,
            'data_criacao': self.data_criacao.isoformat() if self.data_criacao else None,
        }

    def __repr__(self):
        return f'<Servico {self.nome}>'

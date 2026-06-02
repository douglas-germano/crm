from app import db
from datetime import datetime, timezone
import uuid

class TemplateChecklist(db.Model):
    __tablename__ = 'templates_checklist'

    id = db.Column(db.Integer, primary_key=True)
    uuid = db.Column(db.String(36), unique=True, default=lambda: str(uuid.uuid4()))
    nome = db.Column(db.String(150), nullable=False)
    regulacao = db.Column(db.String(50))  # pmoc, nr12, nr13, outro
    versao = db.Column(db.String(20), default='1.0')
    itens = db.Column(db.JSON)  # Lista de itens do checklist (ex: [{'id': 1, 'pergunta': 'Texto', 'criticidade': 'alta'}])
    ativo = db.Column(db.Boolean, default=True)

    data_criacao = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    data_atualizacao = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            'id': self.id,
            'uuid': self.uuid,
            'nome': self.nome,
            'regulacao': self.regulacao,
            'versao': self.versao,
            'itens': self.itens,
            'ativo': self.ativo,
            'data_criacao': self.data_criacao.isoformat() if self.data_criacao else None,
            'data_atualizacao': self.data_atualizacao.isoformat() if self.data_atualizacao else None
        }

    def __repr__(self):
        return f'<TemplateChecklist {self.nome} - v{self.versao}>'

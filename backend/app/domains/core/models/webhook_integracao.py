import secrets
from app import db
from datetime import datetime, timezone


class WebhookIntegracao(db.Model):
    __tablename__ = 'webhook_integracoes'

    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False)
    token = db.Column(db.String(64), unique=True, nullable=False,
                      default=lambda: secrets.token_urlsafe(40))
    origem_padrao = db.Column(db.String(50))  # preenchido automaticamente nos leads
    descricao = db.Column(db.String(200))
    ativo = db.Column(db.Boolean, default=True)
    total_leads = db.Column(db.Integer, default=0)
    data_criacao = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            'id': self.id,
            'nome': self.nome,
            'token': self.token,
            'origem_padrao': self.origem_padrao,
            'descricao': self.descricao,
            'ativo': self.ativo,
            'total_leads': self.total_leads,
            'data_criacao': self.data_criacao.isoformat() if self.data_criacao else None,
        }

    def __repr__(self):
        return f'<WebhookIntegracao {self.nome}>'

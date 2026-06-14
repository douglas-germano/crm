from app import db
from datetime import datetime, timezone
import uuid


class Contato(db.Model):
    __tablename__ = 'contatos'

    id = db.Column(db.Integer, primary_key=True)
    uuid = db.Column(db.String(36), unique=True, default=lambda: str(uuid.uuid4()))
    nome = db.Column(db.String(100), nullable=False)
    cargo = db.Column(db.String(100))
    email = db.Column(db.String(100))
    telefone = db.Column(db.String(20))
    celular = db.Column(db.String(20))
    principal = db.Column(db.Boolean, default=False)
    observacoes = db.Column(db.Text)
    empresa_id = db.Column(db.Integer, db.ForeignKey('empresas.id'), nullable=False)
    data_criacao = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    data_atualizacao = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # --- LGPD (Lei 13.709/2018) ---
    base_legal = db.Column(db.String(30), default='execucao_contrato')
    finalidade = db.Column(db.Text)
    consentimento = db.Column(db.Boolean, default=False)
    consentimento_data = db.Column(db.DateTime)
    consentimento_origem = db.Column(db.String(120))
    anonimizado = db.Column(db.Boolean, default=False)
    anonimizado_em = db.Column(db.DateTime)

    def to_dict(self):
        return {
            'id': self.id,
            'uuid': self.uuid,
            'nome': self.nome,
            'cargo': self.cargo,
            'email': self.email,
            'telefone': self.telefone,
            'celular': self.celular,
            'principal': self.principal,
            'observacoes': self.observacoes,
            'empresa_id': self.empresa_id,
            'data_criacao': self.data_criacao.isoformat() if self.data_criacao else None,
            'data_atualizacao': self.data_atualizacao.isoformat() if self.data_atualizacao else None,
            'base_legal': self.base_legal,
            'finalidade': self.finalidade,
            'consentimento': self.consentimento,
            'consentimento_data': self.consentimento_data.isoformat() if self.consentimento_data else None,
            'consentimento_origem': self.consentimento_origem,
            'anonimizado': self.anonimizado,
            'anonimizado_em': self.anonimizado_em.isoformat() if self.anonimizado_em else None,
        }

    def __repr__(self):
        return f'<Contato {self.nome}>'

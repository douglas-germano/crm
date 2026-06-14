from app import db
from datetime import datetime, timezone
import uuid

class Lead(db.Model):
    __tablename__ = 'leads'

    id = db.Column(db.Integer, primary_key=True)
    uuid = db.Column(db.String(36), unique=True, default=lambda: str(uuid.uuid4()))
    nome = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(100), nullable=False)
    telefone = db.Column(db.String(20))
    empresa_nome = db.Column('empresa', db.String(100))  # legacy - nome da empresa como texto
    empresa_id = db.Column(db.Integer, db.ForeignKey('empresas.id'), nullable=True)
    empresa = db.relationship('Empresa', backref=db.backref('leads', lazy='dynamic'))
    cargo = db.Column(db.String(100))
    interesse = db.Column(db.String(100))
    origem = db.Column(db.String(50))  # Site, Indicação, Evento, etc.
    observacoes = db.Column(db.Text)
    status = db.Column(db.String(20), default='novo')  # novo, contatado, qualificado, convertido, perdido
    data_criacao = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    data_atualizacao = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # --- LGPD (Lei 13.709/2018) ---
    # base_legal (art. 7): consentimento | legitimo_interesse | execucao_contrato | obrigacao_legal
    base_legal = db.Column(db.String(30), default='legitimo_interesse')
    finalidade = db.Column(db.Text)  # finalidade específica do tratamento (art. 6, I)
    consentimento = db.Column(db.Boolean, default=False)  # titular consentiu explicitamente (art. 8)
    consentimento_data = db.Column(db.DateTime)  # quando o consentimento foi coletado
    consentimento_origem = db.Column(db.String(120))  # de onde veio (formulário, landing, etc.)
    anonimizado = db.Column(db.Boolean, default=False)  # dados pessoais anonimizados (art. 16)
    anonimizado_em = db.Column(db.DateTime)

    # Campo para indicar qual usuário está responsável pelo lead
    responsavel_id = db.Column(db.Integer, db.ForeignKey('usuarios.id'))
    responsavel = db.relationship('Usuario', backref=db.backref('leads', lazy='dynamic'))
    
    def to_dict(self):
        return {
            'id': self.id,
            'uuid': self.uuid,
            'nome': self.nome,
            'email': self.email,
            'telefone': self.telefone,
            'empresa': self.empresa_nome,
            'empresa_id': self.empresa_id,
            'empresa_dados': self.empresa.to_dict() if self.empresa else None,
            'cargo': self.cargo,
            'interesse': self.interesse,
            'origem': self.origem,
            'observacoes': self.observacoes,
            'status': self.status,
            'data_criacao': self.data_criacao.isoformat() if self.data_criacao else None,
            'data_atualizacao': self.data_atualizacao.isoformat() if self.data_atualizacao else None,
            'base_legal': self.base_legal,
            'finalidade': self.finalidade,
            'consentimento': self.consentimento,
            'consentimento_data': self.consentimento_data.isoformat() if self.consentimento_data else None,
            'consentimento_origem': self.consentimento_origem,
            'anonimizado': self.anonimizado,
            'anonimizado_em': self.anonimizado_em.isoformat() if self.anonimizado_em else None,
            'responsavel': self.responsavel.nome if self.responsavel else None,
            'responsavel_id': self.responsavel_id
        }
    
    def __repr__(self):
        return f'<Lead {self.nome}>' 
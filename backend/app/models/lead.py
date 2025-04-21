from app import db
from datetime import datetime
import uuid

# Este arquivo define o modelo de dados para a entidade Lead, incluindo seus atributos e métodos.

class Lead(db.Model):
    __tablename__ = 'leads'  # Nome da tabela no banco de dados.
    
    id = db.Column(db.Integer, primary_key=True)  # Identificador único do lead.
    uuid = db.Column(db.String(36), unique=True, default=lambda: str(uuid.uuid4()))  # UUID único para o lead.
    nome = db.Column(db.String(100), nullable=False)  # Nome do lead.
    email = db.Column(db.String(100), nullable=False)  # Email do lead.
    telefone = db.Column(db.String(20))  # Telefone do lead.
    empresa = db.Column(db.String(100))  # Empresa associada ao lead.
    cargo = db.Column(db.String(100))  # Cargo do lead na empresa.
    interesse = db.Column(db.String(100))  # Interesse do lead.
    origem = db.Column(db.String(50))  # Origem do lead (ex.: Site, Indicação, Evento).
    observacoes = db.Column(db.Text)  # Observações adicionais sobre o lead.
    status = db.Column(db.String(20), default='novo')  # Status do lead (ex.: novo, contatado, qualificado).
    data_criacao = db.Column(db.DateTime, default=datetime.utcnow)  # Data de criação do lead.
    data_atualizacao = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)  # Data de última atualização.
    
    responsavel_id = db.Column(db.Integer, db.ForeignKey('usuarios.id'))  # ID do usuário responsável pelo lead.
    responsavel = db.relationship('Usuario', backref=db.backref('leads', lazy='dynamic'))  # Relacionamento com o modelo Usuario.
    
    def to_dict(self):
        # Método para converter o objeto Lead em um dicionário.
        return {
            'id': self.id,
            'uuid': self.uuid,
            'nome': self.nome,
            'email': self.email,
            'telefone': self.telefone,
            'empresa': self.empresa,
            'cargo': self.cargo,
            'interesse': self.interesse,
            'origem': self.origem,
            'observacoes': self.observacoes,
            'status': self.status,
            'data_criacao': self.data_criacao.isoformat() if self.data_criacao else None,
            'data_atualizacao': self.data_atualizacao.isoformat() if self.data_atualizacao else None,
            'responsavel': self.responsavel.nome if self.responsavel else None,
            'responsavel_id': self.responsavel_id
        }
    
    def __repr__(self):
        # Representação textual do objeto Lead.
        return f'<Lead {self.nome}>'
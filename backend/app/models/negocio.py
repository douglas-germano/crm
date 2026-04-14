from app import db
from datetime import datetime
import uuid

class Negocio(db.Model):
    __tablename__ = 'negocios'
    
    id = db.Column(db.Integer, primary_key=True)
    uuid = db.Column(db.String(36), unique=True, default=lambda: str(uuid.uuid4()))
    nome = db.Column(db.String(100), nullable=False)
    descricao = db.Column(db.Text)
    valor = db.Column(db.Float, default=0.0)
    
    # Tipo de negócio: único ou recorrente
    tipo = db.Column(db.String(20), default='unico')  # 'unico' ou 'recorrente'
    
    # Periodicidade (para negócios recorrentes)
    periodicidade = db.Column(db.String(20))  # mensal, trimestral, semestral, anual, etc.
    
    # Probabilidade de fechamento (em %)
    probabilidade = db.Column(db.Integer, default=0)  # 0 a 100
    
    # Data prevista para fechamento
    data_previsao_fechamento = db.Column(db.Date)
    
    # Status do negócio (aberto, ganho, perdido)
    status = db.Column(db.String(20), default='aberto')
    
    # Motivo de ganho/perda
    motivo = db.Column(db.Text)
    
    # Campos para rastreamento
    data_criacao = db.Column(db.DateTime, default=datetime.utcnow)
    data_atualizacao = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    data_fechamento = db.Column(db.DateTime)  # Data em que o negócio foi fechado (ganho ou perdido)
    
    # Relacionamentos
    # Lead associado à oportunidade
    lead_id = db.Column(db.Integer, db.ForeignKey('leads.id'), nullable=False)
    lead = db.relationship('Lead', backref=db.backref('negocios', lazy='dynamic'))
    
    # Pipeline e estágio do negócio
    pipeline_id = db.Column(db.Integer, db.ForeignKey('pipelines.id'), nullable=False)
    pipeline = db.relationship('Pipeline')
    
    estagio_id = db.Column(db.Integer, db.ForeignKey('estagios.id'))
    estagio = db.relationship('Estagio')
    
    # Usuário responsável
    responsavel_id = db.Column(db.Integer, db.ForeignKey('usuarios.id'))
    responsavel = db.relationship('Usuario', foreign_keys=[responsavel_id], backref=db.backref('negocios_responsavel', lazy='dynamic'))
    
    # Serviço relacionado
    servico_id = db.Column(db.Integer, db.ForeignKey('servicos.id'), nullable=True)
    servico = db.relationship('Servico')

    # Usuário que criou o negócio
    criado_por_id = db.Column(db.Integer, db.ForeignKey('usuarios.id'))
    criado_por = db.relationship('Usuario', foreign_keys=[criado_por_id], backref=db.backref('negocios_criados', lazy='dynamic'))
    
    def to_dict(self):
        return {
            'id': self.id,
            'uuid': self.uuid,
            'nome': self.nome,
            'descricao': self.descricao,
            'valor': self.valor,
            'tipo': self.tipo,
            'periodicidade': self.periodicidade,
            'probabilidade': self.probabilidade,
            'data_previsao_fechamento': self.data_previsao_fechamento.isoformat() if self.data_previsao_fechamento else None,
            'status': self.status,
            'motivo': self.motivo,
            'data_criacao': self.data_criacao.isoformat() if self.data_criacao else None,
            'data_atualizacao': self.data_atualizacao.isoformat() if self.data_atualizacao else None,
            'data_fechamento': self.data_fechamento.isoformat() if self.data_fechamento else None,
            'lead_id': self.lead_id,
            'lead': self.lead.to_dict() if self.lead else None,
            'pipeline_id': self.pipeline_id,
            'estagio_id': self.estagio_id,
            'estagio': self.estagio.to_dict() if self.estagio else None,
            'responsavel_id': self.responsavel_id,
            'responsavel': self.responsavel.nome if self.responsavel else None,
            'servico_id': self.servico_id,
            'servico': self.servico.to_dict() if self.servico else None,
        }
    
    def calcular_valor_anualizado(self):
        """
        Calcula o valor anualizado do negócio com base no tipo e periodicidade
        """
        if self.tipo != 'recorrente' or not self.valor:
            return self.valor
            
        # Calcular o valor anualizado com base na periodicidade
        multiplicadores = {
            'mensal': 12,
            'bimestral': 6,
            'trimestral': 4,
            'semestral': 2,
            'anual': 1
        }
        
        multiplicador = multiplicadores.get(self.periodicidade, 1)
        return self.valor * multiplicador
    
    def __repr__(self):
        return f'<Negocio {self.nome}>'


# Atividades relacionadas a negócios
class AtividadeNegocio(db.Model):
    __tablename__ = 'atividades_negocio'
    
    id = db.Column(db.Integer, primary_key=True)
    uuid = db.Column(db.String(36), unique=True, default=lambda: str(uuid.uuid4()))
    
    # Tipo de atividade (reunião, chamada, email, etc)
    tipo = db.Column(db.String(50), nullable=False)
    
    titulo = db.Column(db.String(200), nullable=False)
    descricao = db.Column(db.Text)
    
    # Datas
    data_agendada = db.Column(db.DateTime, nullable=False)
    data_conclusao = db.Column(db.DateTime)
    
    # Status
    status = db.Column(db.String(20), default='pendente')  # pendente, concluida, cancelada
    
    # Resultado da atividade
    resultado = db.Column(db.Text)
    
    # Relacionamentos
    negocio_id = db.Column(db.Integer, db.ForeignKey('negocios.id'), nullable=False)
    negocio = db.relationship('Negocio', backref=db.backref('atividades', lazy='dynamic', cascade='all, delete-orphan'))
    
    # Usuário responsável
    responsavel_id = db.Column(db.Integer, db.ForeignKey('usuarios.id'))
    responsavel = db.relationship('Usuario', foreign_keys=[responsavel_id], backref=db.backref('atividades_negocio', lazy='dynamic'))
    
    # Rastreamento
    data_criacao = db.Column(db.DateTime, default=datetime.utcnow)
    data_atualizacao = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'uuid': self.uuid,
            'tipo': self.tipo,
            'titulo': self.titulo,
            'descricao': self.descricao,
            'data_agendada': self.data_agendada.isoformat() if self.data_agendada else None,
            'data_conclusao': self.data_conclusao.isoformat() if self.data_conclusao else None,
            'status': self.status,
            'resultado': self.resultado,
            'negocio_id': self.negocio_id,
            'responsavel_id': self.responsavel_id,
            'responsavel': self.responsavel.nome if self.responsavel else None,
            'data_criacao': self.data_criacao.isoformat() if self.data_criacao else None,
            'data_atualizacao': self.data_atualizacao.isoformat() if self.data_atualizacao else None
        }
    
    def __repr__(self):
        return f'<AtividadeNegocio {self.titulo}>' 
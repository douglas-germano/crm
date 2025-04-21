from app import db
from datetime import datetime
import uuid

class Pipeline(db.Model):
    __tablename__ = 'pipelines'
    
    id = db.Column(db.Integer, primary_key=True)
    uuid = db.Column(db.String(36), unique=True, default=lambda: str(uuid.uuid4()))
    nome = db.Column(db.String(100), nullable=False)
    descricao = db.Column(db.Text)
    ativo = db.Column(db.Boolean, default=True)
    data_criacao = db.Column(db.DateTime, default=datetime.utcnow)
    data_atualizacao = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relacionamentos
    estagios = db.relationship('Estagio', back_populates='pipeline', order_by='Estagio.ordem', cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'id': self.id,
            'uuid': self.uuid,
            'nome': self.nome,
            'descricao': self.descricao,
            'ativo': self.ativo,
            'data_criacao': self.data_criacao.isoformat() if self.data_criacao else None,
            'data_atualizacao': self.data_atualizacao.isoformat() if self.data_atualizacao else None,
            'estagios': [estagio.to_dict() for estagio in self.estagios]
        }
    
    @staticmethod
    def criar_pipeline_padrao():
        """
        Cria um pipeline padrão na inicialização do banco de dados, 
        se nenhum pipeline existir ainda.
        Este pipeline pode ser editado ou excluído posteriormente.
        """
        # Verifica se já existe algum pipeline
        if Pipeline.query.first() is None:
            try:
                # Criar pipeline padrão
                pipeline_padrao = Pipeline(
                    nome="Funil de Vendas Padrão",
                    descricao="Pipeline padrão criado automaticamente pelo sistema."
                )
                
                # Adicionar estágios padrão
                estagios_padrao = [
                    {'nome': 'Novo Lead', 'ordem': 1, 'cor': '#3498db', 'descricao': 'Leads recém-adicionados'},
                    {'nome': 'Primeiro Contato', 'ordem': 2, 'cor': '#f39c12', 'descricao': 'Leads que foram contatados pela primeira vez'},
                    {'nome': 'Qualificação', 'ordem': 3, 'cor': '#e67e22', 'descricao': 'Leads que demonstraram interesse'},
                    {'nome': 'Proposta Enviada', 'ordem': 4, 'cor': '#9b59b6', 'descricao': 'Leads que receberam uma proposta'},
                    {'nome': 'Negociação', 'ordem': 5, 'cor': '#1abc9c', 'descricao': 'Leads em fase de negociação'},
                    {'nome': 'Fechado Ganho', 'ordem': 6, 'cor': '#27ae60', 'descricao': 'Negócios fechados com sucesso'},
                    {'nome': 'Fechado Perdido', 'ordem': 7, 'cor': '#e74c3c', 'descricao': 'Negócios que não foram concretizados'}
                ]
                
                for estagio_dados in estagios_padrao:
                    estagio = Estagio(
                        nome=estagio_dados['nome'],
                        ordem=estagio_dados['ordem'],
                        cor=estagio_dados['cor'],
                        descricao=estagio_dados['descricao'],
                        pipeline=pipeline_padrao
                    )
                    db.session.add(estagio)
                
                db.session.add(pipeline_padrao)
                db.session.commit()
                
                print("Pipeline padrão criado com sucesso!")
                return pipeline_padrao
            except Exception as e:
                db.session.rollback()
                print(f"Erro ao criar pipeline padrão: {str(e)}")
                return None
        
        return None
    
    def __repr__(self):
        return f'<Pipeline {self.nome}>'

class Estagio(db.Model):
    __tablename__ = 'estagios'
    
    id = db.Column(db.Integer, primary_key=True)
    uuid = db.Column(db.String(36), unique=True, default=lambda: str(uuid.uuid4()))
    nome = db.Column(db.String(100), nullable=False)
    descricao = db.Column(db.Text)
    cor = db.Column(db.String(20), default='#3498db')  # Cor padrão azul
    ordem = db.Column(db.Integer, nullable=False)
    pipeline_id = db.Column(db.Integer, db.ForeignKey('pipelines.id'), nullable=False)
    data_criacao = db.Column(db.DateTime, default=datetime.utcnow)
    data_atualizacao = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relacionamentos
    pipeline = db.relationship('Pipeline', back_populates='estagios')
    lead_estagios = db.relationship('LeadEstagio', back_populates='estagio', cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'id': self.id,
            'uuid': self.uuid,
            'nome': self.nome,
            'descricao': self.descricao,
            'cor': self.cor,
            'ordem': self.ordem,
            'pipeline_id': self.pipeline_id,
            'data_criacao': self.data_criacao.isoformat() if self.data_criacao else None,
            'data_atualizacao': self.data_atualizacao.isoformat() if self.data_atualizacao else None
        }
    
    def __repr__(self):
        return f'<Estagio {self.nome}>'

class LeadEstagio(db.Model):
    __tablename__ = 'lead_estagios'
    
    id = db.Column(db.Integer, primary_key=True)
    lead_id = db.Column(db.Integer, db.ForeignKey('leads.id'), nullable=False)
    estagio_id = db.Column(db.Integer, db.ForeignKey('estagios.id'), nullable=False)
    posicao = db.Column(db.Integer, nullable=False, default=0)  # Posição dentro do estágio
    data_entrada = db.Column(db.DateTime, default=datetime.utcnow)
    data_atualizacao = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relacionamentos
    lead = db.relationship('Lead')
    estagio = db.relationship('Estagio', back_populates='lead_estagios')
    
    def to_dict(self):
        return {
            'id': self.id,
            'lead_id': self.lead_id,
            'estagio_id': self.estagio_id,
            'posicao': self.posicao,
            'data_entrada': self.data_entrada.isoformat() if self.data_entrada else None,
            'data_atualizacao': self.data_atualizacao.isoformat() if self.data_atualizacao else None,
            'lead': self.lead.to_dict() if self.lead else None
        }
    
    def __repr__(self):
        return f'<LeadEstagio {self.lead_id} - {self.estagio_id}>' 
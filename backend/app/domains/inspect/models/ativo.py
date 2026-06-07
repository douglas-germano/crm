from app import db
from datetime import datetime, timezone
import uuid

class Ativo(db.Model):
    __tablename__ = 'ativos'

    id = db.Column(db.Integer, primary_key=True)
    uuid = db.Column(db.String(36), unique=True, default=lambda: str(uuid.uuid4()))
    nome = db.Column(db.String(150), nullable=False)
    tag_identificacao = db.Column(db.String(50), nullable=False)
    categoria = db.Column(db.String(50), default='outro')  # hvac, nr12, nr13, outro
    fabricante = db.Column(db.String(100))
    modelo = db.Column(db.String(100))
    numero_serie = db.Column(db.String(100))
    dados_tecnicos = db.Column(db.JSON)  # Armazena parâmetros como pressão de projeto, BTUs, potência
    localizacao = db.Column(db.String(200))
    data_instalacao = db.Column(db.Date)
    status = db.Column(db.String(20), default='ativo')  # ativo, inativo, manutencao

    # Relacionamento com a empresa (cliente)
    empresa_id = db.Column(db.Integer, db.ForeignKey('empresas.id'), nullable=False)
    empresa = db.relationship('Empresa', backref=db.backref('ativos', lazy='dynamic', cascade='all, delete-orphan'))

    data_criacao = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    data_atualizacao = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            'id': self.id,
            'uuid': self.uuid,
            'nome': self.nome,
            'tag_identificacao': self.tag_identificacao,
            'categoria': self.categoria,
            'fabricante': self.fabricante,
            'modelo': self.modelo,
            'numero_serie': self.numero_serie,
            'dados_tecnicos': self.dados_tecnicos,
            'localizacao': self.localizacao,
            'data_instalacao': self.data_instalacao.isoformat() if self.data_instalacao else None,
            'status': self.status,
            'empresa_id': self.empresa_id,
            'empresa_nome': self.empresa.razao_social if self.empresa else None,
            'data_criacao': self.data_criacao.isoformat() if self.data_criacao else None,
            'data_atualizacao': self.data_atualizacao.isoformat() if self.data_atualizacao else None
        }

    def __repr__(self):
        return f'<Ativo {self.tag_identificacao} - {self.nome}>'

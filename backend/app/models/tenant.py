from app import db
from datetime import datetime

class Tenant(db.Model):
    __tablename__ = 'tenant'
    # Forçar que este model seja criado sempre no esquema principal (public)
    __table_args__ = {'schema': 'public'}

    id = db.Column(db.Integer, primary_key=True)
    nome_fantasia = db.Column(db.String(100), nullable=False)
    subdominio = db.Column(db.String(50), unique=True, nullable=False)
    db_schema = db.Column(db.String(50), unique=True, nullable=False)
    data_criacao = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'nome_fantasia': self.nome_fantasia,
            'subdominio': self.subdominio,
            'db_schema': self.db_schema,
            'data_criacao': self.data_criacao.isoformat() if self.data_criacao else None
        }

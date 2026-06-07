from app import db
from datetime import datetime, timezone

# Tabela de associação entre perfis e permissões
perfil_permissao = db.Table(
    'perfil_permissao',
    db.Column('perfil_id', db.Integer, db.ForeignKey('perfis.id'), primary_key=True),
    db.Column('permissao_id', db.Integer, db.ForeignKey('permissoes.id'), primary_key=True)
)

class Perfil(db.Model):
    __tablename__ = 'perfis'
    
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(50), unique=True, nullable=False)
    descricao = db.Column(db.String(200))
    data_criacao = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    
    # Relacionamentos
    permissoes = db.relationship('Permissao', secondary=perfil_permissao, lazy='subquery',
                                backref=db.backref('perfis', lazy=True))
    usuarios = db.relationship('Usuario', back_populates='perfil', lazy='dynamic')
    
    def to_dict(self):
        return {
            'id': self.id,
            'nome': self.nome,
            'descricao': self.descricao,
            'permissoes': [p.to_dict() for p in self.permissoes],
            'data_criacao': self.data_criacao.isoformat() if self.data_criacao else None
        }
    
    def __repr__(self):
        return f'<Perfil {self.nome}>'

class Permissao(db.Model):
    __tablename__ = 'permissoes'
    
    id = db.Column(db.Integer, primary_key=True)
    codigo = db.Column(db.String(50), unique=True, nullable=False)
    descricao = db.Column(db.String(200))
    modulo = db.Column(db.String(50), nullable=False)
    
    def to_dict(self):
        return {
            'id': self.id,
            'codigo': self.codigo,
            'descricao': self.descricao,
            'modulo': self.modulo
        }
    
    def __repr__(self):
        return f'<Permissao {self.codigo}>' 
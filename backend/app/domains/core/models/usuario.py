from app import db
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timezone
import uuid

class Usuario(db.Model):
    __tablename__ = 'usuarios'

    id = db.Column(db.Integer, primary_key=True)
    uuid = db.Column(db.String(36), unique=True, default=lambda: str(uuid.uuid4()))
    nome = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    senha_hash = db.Column(db.String(256), nullable=False)
    perfil_id = db.Column(db.Integer, db.ForeignKey('perfis.id'), nullable=False)
    ativo = db.Column(db.Boolean, default=True)
    deve_trocar_senha = db.Column(db.Boolean, default=True)
    data_criacao = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    ultimo_login = db.Column(db.DateTime)
    
    # Relacionamentos
    perfil = db.relationship('Perfil', back_populates='usuarios')
    logs = db.relationship('LogAtividade', back_populates='usuario', lazy='dynamic')
    
    @property
    def senha(self):
        raise AttributeError('senha não é um atributo legível')
    
    @senha.setter
    def senha(self, senha):
        from app.utils.validadores import validar_forca_senha
        validar_forca_senha(senha)  # LGPD art. 46 — rejeita senhas fracas
        self.senha_hash = generate_password_hash(senha)
    
    def verificar_senha(self, senha):
        return check_password_hash(self.senha_hash, senha)

    def to_dict(self):
        return {
            'id': self.id,
            'uuid': self.uuid,
            'nome': self.nome,
            'email': self.email,
            'perfil_id': self.perfil_id,
            'perfil': self.perfil.nome,
            'ativo': self.ativo,
            'deve_trocar_senha': self.deve_trocar_senha,
            'data_criacao': self.data_criacao.isoformat() if self.data_criacao else None,
            'ultimo_login': self.ultimo_login.isoformat() if self.ultimo_login else None
        }
    
    def __repr__(self):
        return f'<Usuario {self.nome}>'
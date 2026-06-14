from datetime import datetime, timezone

from werkzeug.security import check_password_hash, generate_password_hash

from app import db


class PlatformUser(db.Model):
    __tablename__ = 'platform_users'
    __table_args__ = {'schema': 'public'}

    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    senha_hash = db.Column(db.String(256), nullable=False)
    papel = db.Column(db.String(30), nullable=False, default='super_admin')
    ativo = db.Column(db.Boolean, default=True)
    data_criacao = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    ultimo_login = db.Column(db.DateTime)

    @property
    def senha(self):
        raise AttributeError('senha não é um atributo legível')

    @senha.setter
    def senha(self, senha):
        self.senha_hash = generate_password_hash(senha)

    def verificar_senha(self, senha):
        return check_password_hash(self.senha_hash, senha)

    def to_dict(self):
        return {
            'id': self.id,
            'nome': self.nome,
            'email': self.email,
            'papel': self.papel,
            'ativo': self.ativo,
            'data_criacao': self.data_criacao.isoformat() if self.data_criacao else None,
            'ultimo_login': self.ultimo_login.isoformat() if self.ultimo_login else None,
            'tipo': 'platform',
            'is_super_admin': self.papel == 'super_admin',
        }


class PlatformAuditLog(db.Model):
    __tablename__ = 'platform_audit_logs'
    __table_args__ = {'schema': 'public'}

    id = db.Column(db.Integer, primary_key=True)
    platform_user_id = db.Column(db.Integer, db.ForeignKey('public.platform_users.id'), nullable=True)
    acao = db.Column(db.String(80), nullable=False)
    alvo_tipo = db.Column(db.String(50))
    alvo_id = db.Column(db.String(80))
    descricao = db.Column(db.Text)
    ip = db.Column(db.String(45))
    data_criacao = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    usuario = db.relationship('PlatformUser')

    def to_dict(self):
        return {
            'id': self.id,
            'platform_user_id': self.platform_user_id,
            'usuario': self.usuario.email if self.usuario else None,
            'acao': self.acao,
            'alvo_tipo': self.alvo_tipo,
            'alvo_id': self.alvo_id,
            'descricao': self.descricao,
            'ip': self.ip,
            'data_criacao': self.data_criacao.isoformat() if self.data_criacao else None,
        }

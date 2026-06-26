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
    # Papéis: 'super_admin' (acesso total) | 'suporte' (somente leitura/inspeção)
    papel = db.Column(db.String(30), nullable=False, default='super_admin')
    ativo = db.Column(db.Boolean, default=True)
    data_criacao = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    ultimo_login = db.Column(db.DateTime)

    # 2FA (TOTP)
    mfa_secret = db.Column(db.String(64))
    mfa_habilitado = db.Column(db.Boolean, default=False, nullable=False)

    # Proteção contra força bruta
    tentativas_falhas = db.Column(db.Integer, default=0, nullable=False)
    bloqueado_ate = db.Column(db.DateTime)

    # Revogação: tokens carregam esta versão; incrementar invalida todos os tokens existentes
    token_version = db.Column(db.Integer, default=0, nullable=False)

    PAPEIS_VALIDOS = ('super_admin', 'suporte')

    def revogar_tokens(self):
        """Invalida todos os tokens ativos deste operador (logout-all/segurança)."""
        self.token_version = (self.token_version or 0) + 1

    @property
    def senha(self):
        raise AttributeError('senha não é um atributo legível')

    @senha.setter
    def senha(self, senha):
        from app.utils.validadores import validar_forca_senha
        validar_forca_senha(senha)  # exige senha forte também para operadores da plataforma
        self.senha_hash = generate_password_hash(senha)

    def verificar_senha(self, senha):
        return check_password_hash(self.senha_hash, senha)

    @property
    def esta_bloqueado(self):
        if not self.bloqueado_ate:
            return False
        agora = datetime.now(timezone.utc)
        bloqueio = self.bloqueado_ate
        if bloqueio.tzinfo is None:
            bloqueio = bloqueio.replace(tzinfo=timezone.utc)
        return bloqueio > agora

    @property
    def is_super_admin(self):
        return self.papel == 'super_admin' and self.ativo

    def to_dict(self):
        return {
            'id': self.id,
            'nome': self.nome,
            'email': self.email,
            'papel': self.papel,
            'ativo': self.ativo,
            'mfa_habilitado': bool(self.mfa_habilitado),
            'bloqueado': self.esta_bloqueado,
            'data_criacao': self.data_criacao.isoformat() if self.data_criacao else None,
            'ultimo_login': self.ultimo_login.isoformat() if self.ultimo_login else None,
            'tipo': 'platform',
            'is_super_admin': self.papel == 'super_admin',
        }


class PlatformConfig(db.Model):
    """Configurações globais da plataforma (linha única, id=1)."""
    __tablename__ = 'platform_config'
    __table_args__ = {'schema': 'public'}

    id = db.Column(db.Integer, primary_key=True)
    inscricoes_abertas = db.Column(db.Boolean, default=True, nullable=False)
    modo_manutencao = db.Column(db.Boolean, default=False, nullable=False)
    forcar_2fa = db.Column(db.Boolean, default=False, nullable=False)
    atualizado_em = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            'inscricoes_abertas': bool(self.inscricoes_abertas),
            'modo_manutencao': bool(self.modo_manutencao),
            'forcar_2fa': bool(self.forcar_2fa),
            'atualizado_em': self.atualizado_em.isoformat() if self.atualizado_em else None,
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

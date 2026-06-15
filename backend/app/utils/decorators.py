from functools import wraps
from flask import request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from app.models import Usuario
from app import db


def _platform_user_id():
    """Extrai o id do PlatformUser a partir da identity `platform:<id>`."""
    identity = get_jwt_identity()
    if isinstance(identity, str) and identity.startswith('platform:'):
        try:
            return int(identity.split(':', 1)[1])
        except (ValueError, IndexError):
            return None
    return None


def requer_super_admin(f):
    """Exige um token de plataforma válido com papel super_admin (acesso total).

    Revalida o operador no banco (ativo + papel) a cada requisição — não confia
    apenas nas claims do JWT.
    """
    @wraps(f)
    @jwt_required()
    def decorated_function(*args, **kwargs):
        from app.domains.core.models import PlatformUser

        claims = get_jwt()
        if claims.get('tipo') != 'platform' or not claims.get('is_super_admin'):
            return jsonify({'erro': 'Acesso negado. Requer Super Admin da plataforma.'}), 403

        user_id = _platform_user_id()
        if user_id is None:
            return jsonify({'erro': 'Token de plataforma inválido.'}), 401

        user = db.session.get(PlatformUser, user_id)
        if not user or not user.ativo or user.papel != 'super_admin':
            return jsonify({'erro': 'Operador Super Admin inativo ou sem permissão.'}), 403

        return f(*args, **kwargs)
    return decorated_function


def requer_operador_plataforma(f):
    """Exige token de plataforma ativo (super_admin OU suporte).

    Usar em rotas de inspeção/leitura que o papel 'suporte' também pode acessar.
    """
    @wraps(f)
    @jwt_required()
    def decorated_function(*args, **kwargs):
        from app.domains.core.models import PlatformUser

        claims = get_jwt()
        if claims.get('tipo') != 'platform':
            return jsonify({'erro': 'Acesso negado. Requer operador da plataforma.'}), 403

        user_id = _platform_user_id()
        if user_id is None:
            return jsonify({'erro': 'Token de plataforma inválido.'}), 401

        user = db.session.get(PlatformUser, user_id)
        if not user or not user.ativo or user.papel not in PlatformUser.PAPEIS_VALIDOS:
            return jsonify({'erro': 'Operador da plataforma inativo ou sem permissão.'}), 403

        return f(*args, **kwargs)
    return decorated_function


def token_required(f):
    """Decorator que exige token JWT e injeta o usuário atual como primeiro argumento."""
    @wraps(f)
    @jwt_required()
    def decorated_function(*args, **kwargs):
        try:
            identity = get_jwt_identity()
            try:
                usuario_id = int(identity)
            except (ValueError, TypeError):
                return jsonify({'erro': 'Token inválido'}), 401

            usuario = db.session.get(Usuario, usuario_id)

            if not usuario:
                return jsonify({'erro': 'Usuário não encontrado'}), 404

            if not usuario.ativo:
                return jsonify({'erro': 'Usuário desativado'}), 403

            return f(usuario, *args, **kwargs)

        except Exception as e:
            current_app.logger.error(f"Erro na autenticação: {str(e)}")
            return jsonify({'erro': 'Erro na autenticação'}), 401

    return decorated_function


def requer_permissao(codigo_permissao):
    """Decorator que verifica permissão. Deve ser usado com @token_required."""
    def decorator(f):
        @wraps(f)
        def decorated_function(usuario_atual, *args, **kwargs):
            if any(p.codigo == codigo_permissao for p in usuario_atual.perfil.permissoes):
                return f(usuario_atual, *args, **kwargs)
            return jsonify({'erro': 'Acesso negado. Você não tem permissão para esta ação.'}), 403

        return decorated_function
    return decorator

from functools import wraps
from flask import request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from app.models import Usuario
from app import db


def escopo_atual():
    """Retorna o `scope` do token atual ('platform' | 'tenant' | None)."""
    return (get_jwt() or {}).get('scope')


def _platform_user_id():
    """Id do PlatformUser a partir da identity (numérica, scope=platform)."""
    identity = get_jwt_identity()
    try:
        return int(identity)
    except (ValueError, TypeError):
        return None


# ---------------------------------------------------------------------------
# Plataforma (Super Admin) — confia nas claims do access token (curto).
# A revalidação no banco (ativo + token_version) acontece no /auth/refresh.
# ---------------------------------------------------------------------------

def requer_operador_plataforma(f):
    """Exige token de plataforma (super_admin OU suporte)."""
    @wraps(f)
    @jwt_required()
    def decorated_function(*args, **kwargs):
        claims = get_jwt()
        if claims.get('scope') != 'platform':
            return jsonify({'erro': 'Acesso negado. Requer operador da plataforma.'}), 403
        if claims.get('papel') not in ('super_admin', 'suporte'):
            return jsonify({'erro': 'Operador sem permissão de plataforma.'}), 403
        return f(*args, **kwargs)
    return decorated_function


def requer_super_admin(f):
    """Exige token de plataforma com papel super_admin (acesso total)."""
    @wraps(f)
    @jwt_required()
    def decorated_function(*args, **kwargs):
        claims = get_jwt()
        if claims.get('scope') != 'platform' or claims.get('papel') != 'super_admin':
            return jsonify({'erro': 'Acesso negado. Requer Super Admin da plataforma.'}), 403
        return f(*args, **kwargs)
    return decorated_function


# ---------------------------------------------------------------------------
# Tenant — carrega o usuário (necessário p/ permissões) e revalida revogação.
# ---------------------------------------------------------------------------

def token_required(f):
    """Exige token de tenant e injeta o usuário atual como primeiro argumento."""
    @wraps(f)
    @jwt_required()
    def decorated_function(*args, **kwargs):
        try:
            claims = get_jwt()
            if claims.get('scope') != 'tenant':
                return jsonify({'erro': 'Token inválido para este recurso'}), 403

            try:
                usuario_id = int(get_jwt_identity())
            except (ValueError, TypeError):
                return jsonify({'erro': 'Token inválido'}), 401

            usuario = db.session.get(Usuario, usuario_id)
            if not usuario:
                return jsonify({'erro': 'Usuário não encontrado'}), 404
            if not usuario.ativo:
                return jsonify({'erro': 'Usuário desativado'}), 403
            # Revogação: o token precisa carregar a versão atual do usuário
            if claims.get('ver') != (usuario.token_version or 0):
                return jsonify({'erro': 'Sessão revogada. Faça login novamente.'}), 401

            return f(usuario, *args, **kwargs)

        except Exception as e:
            current_app.logger.error(f"Erro na autenticação: {str(e)}")
            return jsonify({'erro': 'Erro na autenticação'}), 401

    return decorated_function


def requer_permissao(codigo_permissao):
    """Verifica permissão. Deve ser usado com @token_required."""
    def decorator(f):
        @wraps(f)
        def decorated_function(usuario_atual, *args, **kwargs):
            if any(p.codigo == codigo_permissao for p in usuario_atual.perfil.permissoes):
                return f(usuario_atual, *args, **kwargs)
            return jsonify({'erro': 'Acesso negado. Você não tem permissão para esta ação.'}), 403

        return decorated_function
    return decorator

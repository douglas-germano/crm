from functools import wraps
from flask import request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import Usuario
from app import db


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

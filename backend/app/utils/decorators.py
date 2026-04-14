from functools import wraps
from flask import request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import Usuario

def token_required(f):
    """
    Decorator para exigir token JWT e passar o usuário atual para a função.
    """
    @wraps(f)
    @jwt_required()
    def decorated_function(*args, **kwargs):
        try:
            # Obter ID do usuário do token JWT
            identity = get_jwt_identity()
            
            # Converter identity de string para int
            try:
                usuario_id = int(identity)
            except (ValueError, TypeError):
                return jsonify({'erro': 'Token inválido'}), 401
            
            # Buscar o usuário no banco de dados
            usuario = Usuario.query.filter_by(id=usuario_id).first()
            
            if not usuario:
                return jsonify({'erro': 'Usuário não encontrado'}), 404
                
            if not usuario.ativo:
                return jsonify({'erro': 'Usuário desativado'}), 403
            
            # Chamar a função original com o usuário atual como primeiro argumento
            return f(usuario, *args, **kwargs)
            
        except Exception as e:
            current_app.logger.error(f"Erro na autenticação: {str(e)}")
            return jsonify({'erro': 'Erro na autenticação'}), 401
            
    return decorated_function

def requer_permissao(codigo_permissao):
    """
    Decorator para verificar permissões do usuário.
    Deve ser usado em conjunto com @token_required.
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(usuario_atual, *args, **kwargs):
            # Verificar se o usuário tem a permissão necessária
            for permissao in usuario_atual.perfil.permissoes:
                if permissao.codigo == codigo_permissao:
                    return f(usuario_atual, *args, **kwargs)
            
            # Se não tiver permissão, retornar erro 403
            return jsonify({'erro': 'Acesso negado. Você não tem permissão para esta ação.'}), 403
            
        return decorated_function
    return decorator 
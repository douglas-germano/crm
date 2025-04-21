from flask import request, jsonify, current_app
from flask_login import login_user, logout_user, login_required, current_user
from flask_jwt_extended import create_access_token, create_refresh_token, jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash
from datetime import datetime
from functools import wraps
import uuid

from app import db
from app.models import Usuario, Perfil, Permissao, LogAtividade
from app.blueprints.usuarios import usuarios_bp

# Decorator para verificar permissões
def requer_permissao(codigo_permissao):
    def decorator(f):
        @wraps(f)
        @jwt_required()
        def decorated_function(*args, **kwargs):
            identity = get_jwt_identity()
            # Converter identity de string para int
            try:
                usuario_id = int(identity)
                usuario = Usuario.query.filter_by(id=usuario_id).first()
            except (ValueError, TypeError):
                return jsonify({'erro': 'Token inválido'}), 401
            
            if not usuario:
                return jsonify({'erro': 'Usuário não encontrado'}), 404
                
            for permissao in usuario.perfil.permissoes:
                if permissao.codigo == codigo_permissao:
                    return f(*args, **kwargs)
                    
            return jsonify({'erro': 'Acesso negado. Você não tem permissão para esta ação.'}), 403
        return decorated_function
    return decorator

# Função para registrar log de atividade
def registrar_log(usuario_id, acao, modulo, descricao=None):
    try:
        ip = request.remote_addr
        log = LogAtividade(
            usuario_id=usuario_id,
            acao=acao,
            modulo=modulo,
            descricao=descricao,
            ip=ip
        )
        db.session.add(log)
        db.session.commit()
    except Exception as e:
        current_app.logger.error(f"Erro ao registrar log: {str(e)}")

# Rotas de autenticação
@usuarios_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    
    if not data or not data.get('email') or not data.get('senha'):
        return jsonify({'erro': 'Email e senha são obrigatórios'}), 400
        
    usuario = Usuario.query.filter_by(email=data.get('email')).first()
    
    if not usuario or not usuario.verificar_senha(data.get('senha')):
        return jsonify({'erro': 'Credenciais inválidas'}), 401
        
    if not usuario.ativo:
        return jsonify({'erro': 'Usuário desativado'}), 403
    
    # Atualizar último login
    usuario.ultimo_login = datetime.utcnow()
    db.session.commit()
    
    # Registrar log
    registrar_log(usuario.id, 'login', 'usuarios', 'Login realizado com sucesso')
    
    # Gerar tokens - convertendo ID para string para evitar problemas
    access_token = create_access_token(identity=str(usuario.id))
    refresh_token = create_refresh_token(identity=str(usuario.id))
    
    return jsonify({
        'access_token': access_token,
        'refresh_token': refresh_token,
        'usuario': usuario.to_dict()
    }), 200

@usuarios_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh_token():
    identity = get_jwt_identity()
    access_token = create_access_token(identity=identity)
    return jsonify({'access_token': access_token}), 200

@usuarios_bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    registrar_log(get_jwt_identity(), 'logout', 'usuarios', 'Logout realizado')
    return jsonify({'mensagem': 'Logout realizado com sucesso'}), 200

# Perfil do usuário atual
@usuarios_bp.route('/perfil', methods=['GET'])
@jwt_required()
def obter_perfil_usuario():
    try:
        identity = get_jwt_identity()
        usuario_id = int(identity)
        usuario = Usuario.query.filter_by(id=usuario_id).first()
        
        if not usuario:
            return jsonify({'erro': 'Usuário não encontrado'}), 404
            
        return jsonify(usuario.to_dict()), 200
    except Exception as e:
        current_app.logger.error(f"Erro ao obter perfil: {str(e)}")
        return jsonify({'erro': 'Erro ao obter perfil do usuário'}), 500

@usuarios_bp.route('/perfil', methods=['PUT'])
@jwt_required()
def atualizar_perfil_usuario():
    try:
        identity = get_jwt_identity()
        usuario_id = int(identity)
        usuario = Usuario.query.filter_by(id=usuario_id).first()
        
        if not usuario:
            return jsonify({'erro': 'Usuário não encontrado'}), 404
            
        data = request.get_json()
        
        if not data:
            return jsonify({'erro': 'Dados inválidos'}), 400
        
        # Atualizar campos
        if 'nome' in data:
            usuario.nome = data['nome']
        
        if 'senha' in data and data['senha']:
            usuario.senha = data['senha']
        
        db.session.commit()
        
        # Registrar log
        registrar_log(
            usuario_id, 
            'atualizar_perfil', 
            'usuarios', 
            f'Usuário {usuario.nome} atualizou seu perfil'
        )
        
        return jsonify({
            'mensagem': 'Perfil atualizado com sucesso',
            'usuario': usuario.to_dict()
        }), 200
    except Exception as e:
        current_app.logger.error(f"Erro ao atualizar perfil: {str(e)}")
        return jsonify({'erro': f'Erro ao atualizar perfil do usuário: {str(e)}'}), 500

# Rotas de usuários
@usuarios_bp.route('', methods=['GET'])
@requer_permissao('listar_usuarios')
def listar_usuarios():
    usuarios = Usuario.query.all()
    return jsonify({
        'usuarios': [usuario.to_dict() for usuario in usuarios]
    }), 200

@usuarios_bp.route('/<int:id>', methods=['GET'])
@requer_permissao('visualizar_usuario')
def obter_usuario(id):
    usuario = Usuario.query.get_or_404(id)
    return jsonify({'usuario': usuario.to_dict()}), 200

@usuarios_bp.route('', methods=['POST'])
@requer_permissao('criar_usuario')
def criar_usuario():
    data = request.get_json()
    
    # Validar dados
    if not data:
        return jsonify({'erro': 'Dados inválidos'}), 400
        
    campos_obrigatorios = ['nome', 'email', 'senha', 'perfil_id']
    for campo in campos_obrigatorios:
        if campo not in data:
            return jsonify({'erro': f'Campo {campo} é obrigatório'}), 400
    
    # Verificar se email já existe
    if Usuario.query.filter_by(email=data['email']).first():
        return jsonify({'erro': 'Email já cadastrado'}), 400
    
    # Verificar se o perfil existe
    perfil = Perfil.query.get(data['perfil_id'])
    if not perfil:
        return jsonify({'erro': 'Perfil não encontrado'}), 404
    
    # Criar usuário
    novo_usuario = Usuario(
        nome=data['nome'],
        email=data['email'],
        perfil_id=data['perfil_id'],
        uuid=str(uuid.uuid4())
    )
    novo_usuario.senha = data['senha']
    
    db.session.add(novo_usuario)
    db.session.commit()
    
    # Registrar log
    registrar_log(
        get_jwt_identity(), 
        'criar_usuario', 
        'usuarios', 
        f'Usuário {novo_usuario.nome} (ID: {novo_usuario.id}) criado'
    )
    
    return jsonify({
        'mensagem': 'Usuário criado com sucesso',
        'usuario': novo_usuario.to_dict()
    }), 201

@usuarios_bp.route('/<int:id>', methods=['PUT'])
@requer_permissao('editar_usuario')
def atualizar_usuario(id):
    usuario = Usuario.query.get_or_404(id)
    data = request.get_json()
    
    if not data:
        return jsonify({'erro': 'Dados inválidos'}), 400
    
    # Atualizar campos
    if 'nome' in data:
        usuario.nome = data['nome']
    
    if 'email' in data and data['email'] != usuario.email:
        # Verificar se email já existe
        if Usuario.query.filter_by(email=data['email']).first():
            return jsonify({'erro': 'Email já cadastrado'}), 400
        usuario.email = data['email']
    
    if 'senha' in data:
        usuario.senha = data['senha']
    
    if 'perfil_id' in data:
        perfil = Perfil.query.get(data['perfil_id'])
        if not perfil:
            return jsonify({'erro': 'Perfil não encontrado'}), 404
        usuario.perfil_id = data['perfil_id']
    
    if 'ativo' in data:
        usuario.ativo = data['ativo']
    
    db.session.commit()
    
    # Registrar log
    registrar_log(
        get_jwt_identity(), 
        'atualizar_usuario', 
        'usuarios', 
        f'Usuário {usuario.nome} (ID: {usuario.id}) atualizado'
    )
    
    return jsonify({
        'mensagem': 'Usuário atualizado com sucesso',
        'usuario': usuario.to_dict()
    }), 200

@usuarios_bp.route('/<int:id>', methods=['DELETE'])
@requer_permissao('excluir_usuario')
def excluir_usuario(id):
    usuario = Usuario.query.get_or_404(id)
    
    # Em vez de excluir permanentemente, desativar o usuário
    usuario.ativo = False
    db.session.commit()
    
    # Registrar log
    registrar_log(
        get_jwt_identity(), 
        'excluir_usuario', 
        'usuarios', 
        f'Usuário {usuario.nome} (ID: {usuario.id}) desativado'
    )
    
    return jsonify({'mensagem': 'Usuário desativado com sucesso'}), 200

# Rotas de perfis
@usuarios_bp.route('/perfis', methods=['GET'])
@requer_permissao('listar_perfis')
def listar_perfis():
    perfis = Perfil.query.all()
    return jsonify({
        'perfis': [perfil.to_dict() for perfil in perfis]
    }), 200

@usuarios_bp.route('/perfis/<int:id>', methods=['GET'])
@requer_permissao('visualizar_perfil')
def obter_perfil(id):
    perfil = Perfil.query.get_or_404(id)
    return jsonify({'perfil': perfil.to_dict()}), 200

@usuarios_bp.route('/perfis', methods=['POST'])
@requer_permissao('criar_perfil')
def criar_perfil():
    data = request.get_json()
    
    # Validar dados
    if not data or 'nome' not in data:
        return jsonify({'erro': 'Nome do perfil é obrigatório'}), 400
    
    # Verificar se nome já existe
    if Perfil.query.filter_by(nome=data['nome']).first():
        return jsonify({'erro': 'Nome de perfil já cadastrado'}), 400
    
    # Criar perfil
    novo_perfil = Perfil(
        nome=data['nome'],
        descricao=data.get('descricao', '')
    )
    
    # Adicionar permissões se fornecidas
    if 'permissoes' in data and isinstance(data['permissoes'], list):
        for permissao_id in data['permissoes']:
            permissao = Permissao.query.get(permissao_id)
            if permissao:
                novo_perfil.permissoes.append(permissao)
    
    db.session.add(novo_perfil)
    db.session.commit()
    
    # Registrar log
    registrar_log(
        get_jwt_identity(), 
        'criar_perfil', 
        'usuarios', 
        f'Perfil {novo_perfil.nome} (ID: {novo_perfil.id}) criado'
    )
    
    return jsonify({
        'mensagem': 'Perfil criado com sucesso',
        'perfil': novo_perfil.to_dict()
    }), 201

@usuarios_bp.route('/perfis/<int:id>', methods=['PUT'])
@requer_permissao('editar_perfil')
def atualizar_perfil(id):
    perfil = Perfil.query.get_or_404(id)
    data = request.get_json()
    
    if not data:
        return jsonify({'erro': 'Dados inválidos'}), 400
    
    # Atualizar campos
    if 'nome' in data and data['nome'] != perfil.nome:
        # Verificar se nome já existe
        if Perfil.query.filter_by(nome=data['nome']).first():
            return jsonify({'erro': 'Nome de perfil já cadastrado'}), 400
        perfil.nome = data['nome']
    
    if 'descricao' in data:
        perfil.descricao = data['descricao']
    
    # Atualizar permissões se fornecidas
    if 'permissoes' in data and isinstance(data['permissoes'], list):
        # Limpar permissões atuais
        perfil.permissoes = []
        
        # Adicionar novas permissões
        for permissao_id in data['permissoes']:
            permissao = Permissao.query.get(permissao_id)
            if permissao:
                perfil.permissoes.append(permissao)
    
    db.session.commit()
    
    # Registrar log
    registrar_log(
        get_jwt_identity(), 
        'atualizar_perfil', 
        'usuarios', 
        f'Perfil {perfil.nome} (ID: {perfil.id}) atualizado'
    )
    
    return jsonify({
        'mensagem': 'Perfil atualizado com sucesso',
        'perfil': perfil.to_dict()
    }), 200

@usuarios_bp.route('/perfis/<int:id>', methods=['DELETE'])
@requer_permissao('excluir_perfil')
def excluir_perfil(id):
    perfil = Perfil.query.get_or_404(id)
    
    # Verificar se existem usuários associados a este perfil
    if Usuario.query.filter_by(perfil_id=id).first():
        return jsonify({'erro': 'Não é possível excluir perfil com usuários associados'}), 400
    
    db.session.delete(perfil)
    db.session.commit()
    
    # Registrar log
    registrar_log(
        get_jwt_identity(), 
        'excluir_perfil', 
        'usuarios', 
        f'Perfil {perfil.nome} (ID: {perfil.id}) excluído'
    )
    
    return jsonify({'mensagem': 'Perfil excluído com sucesso'}), 200

# Rotas de permissões
@usuarios_bp.route('/permissoes', methods=['GET'])
@requer_permissao('listar_permissoes')
def listar_permissoes():
    permissoes = Permissao.query.all()
    return jsonify({
        'permissoes': [permissao.to_dict() for permissao in permissoes]
    }), 200

# Rota para logs de atividade
@usuarios_bp.route('/logs', methods=['GET'])
@requer_permissao('visualizar_logs')
def listar_logs():
    # Parâmetros de filtro
    usuario_id = request.args.get('usuario_id', type=int)
    data_inicio = request.args.get('data_inicio')
    data_fim = request.args.get('data_fim')
    modulo = request.args.get('modulo')
    acao = request.args.get('acao')
    
    # Base query
    query = LogAtividade.query
    
    # Aplicar filtros
    if usuario_id:
        query = query.filter_by(usuario_id=usuario_id)
    
    if modulo:
        query = query.filter_by(modulo=modulo)
    
    if acao:
        query = query.filter_by(acao=acao)
    
    if data_inicio:
        try:
            data_inicio = datetime.fromisoformat(data_inicio)
            query = query.filter(LogAtividade.data_hora >= data_inicio)
        except ValueError:
            pass
    
    if data_fim:
        try:
            data_fim = datetime.fromisoformat(data_fim)
            query = query.filter(LogAtividade.data_hora <= data_fim)
        except ValueError:
            pass
    
    # Ordenar por data mais recente
    logs = query.order_by(LogAtividade.data_hora.desc()).all()
    
    return jsonify({
        'logs': [log.to_dict() for log in logs]
    }), 200

# Endpoint para registrar o primeiro administrador (sem autenticação)
@usuarios_bp.route('/registrar-admin', methods=['POST'])
def registrar_admin():
    # Verificar se já existem usuários no sistema
    if Usuario.query.count() > 0:
        return jsonify({'erro': 'Já existem usuários cadastrados no sistema. Não é possível criar um novo administrador por esta rota.'}), 403
    
    data = request.get_json()
    
    # Validar dados
    if not data:
        return jsonify({'erro': 'Dados inválidos'}), 400
        
    campos_obrigatorios = ['nome', 'email', 'senha']
    for campo in campos_obrigatorios:
        if campo not in data:
            return jsonify({'erro': f'Campo {campo} é obrigatório'}), 400
    
    # Verificar se email já existe
    if Usuario.query.filter_by(email=data['email']).first():
        return jsonify({'erro': 'Email já cadastrado'}), 400
    
    # Criar perfil de administrador se não existir
    perfil_admin = Perfil.query.filter_by(nome='Administrador').first()
    if not perfil_admin:
        # Criar permissões se não existirem
        permissoes = []
        permissoes_codigos = [
            'listar_usuarios', 'visualizar_usuario', 'criar_usuario', 'editar_usuario', 'excluir_usuario',
            'listar_perfis', 'visualizar_perfil', 'criar_perfil', 'editar_perfil', 'excluir_perfil',
            'listar_permissoes', 'visualizar_logs'
        ]
        
        for codigo in permissoes_codigos:
            permissao = Permissao.query.filter_by(codigo=codigo).first()
            if not permissao:
                permissao = Permissao(
                    codigo=codigo,
                    descricao=codigo.replace('_', ' ').title(),
                    modulo='usuarios'
                )
                db.session.add(permissao)
            permissoes.append(permissao)
        
        # Criar perfil de administrador
        perfil_admin = Perfil(
            nome='Administrador',
            descricao='Acesso total ao sistema'
        )
        perfil_admin.permissoes = permissoes
        db.session.add(perfil_admin)
        db.session.commit()
    
    # Criar usuário administrador
    novo_usuario = Usuario(
        nome=data['nome'],
        email=data['email'],
        perfil_id=perfil_admin.id,
        uuid=str(uuid.uuid4()),
        ativo=True
    )
    novo_usuario.senha = data['senha']
    
    db.session.add(novo_usuario)
    db.session.commit()
    
    return jsonify({
        'mensagem': 'Usuário administrador criado com sucesso',
        'usuario': novo_usuario.to_dict()
    }), 201 
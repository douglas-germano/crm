from flask import request, jsonify, current_app, abort
from flask_jwt_extended import create_access_token, create_refresh_token, jwt_required, get_jwt_identity, get_jwt
from datetime import datetime, timezone
from functools import wraps
import re
import uuid

from app import db, limiter
from app.domains.core.models import LogAtividade, Perfil, Permissao, Tenant, Usuario
from app.utils.decorators import token_required
from app.domains.core.blueprints.usuarios import usuarios_bp
from sqlalchemy import text
from itsdangerous import URLSafeTimedSerializer, SignatureExpired, BadSignature
from app.utils.email_service import enviar_email


# Decorator para verificar permissões (usado por outros blueprints via import)
def requer_permissao(codigo_permissao):
    def decorator(f):
        @wraps(f)
        @jwt_required()
        def decorated_function(*args, **kwargs):
            identity = get_jwt_identity()
            try:
                usuario_id = int(identity)
                usuario = db.session.get(Usuario, usuario_id)
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


# Função para registrar log de atividade (usada por outros blueprints via import)
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
@limiter.limit('10 per minute')
def login():
    data = request.get_json()

    if not data or not data.get('email') or not data.get('senha') or not data.get('workspace'):
        return jsonify({'erro': 'Email, senha e workspace são obrigatórios'}), 400

    workspace = data.get('workspace')
    tenant = Tenant.query.filter_by(subdominio=workspace).first()

    if not tenant:
        return jsonify({'erro': 'Workspace não encontrado'}), 404

    if not re.match(r'^[a-z_][a-z0-9_]*$', tenant.db_schema):
        return jsonify({'erro': 'Workspace inválido'}), 400
    db.session.execute(text(f"SET search_path TO {tenant.db_schema}, public"))

    usuario = Usuario.query.filter_by(email=data.get('email')).first()

    if not usuario or not usuario.verificar_senha(data.get('senha')):
        return jsonify({'erro': 'Credenciais inválidas'}), 401

    if not usuario.ativo:
        return jsonify({'erro': 'Usuário desativado'}), 403

    usuario.ultimo_login = datetime.now(timezone.utc)
    db.session.commit()

    registrar_log(usuario.id, 'login', 'usuarios', 'Login realizado com sucesso')

    adicional = {'schema': tenant.db_schema}
    access_token = create_access_token(identity=str(usuario.id), additional_claims=adicional)
    refresh_token = create_refresh_token(identity=str(usuario.id), additional_claims=adicional)

    return jsonify({
        'access_token': access_token,
        'refresh_token': refresh_token,
        'usuario': usuario.to_dict(),
        'workspace': tenant.to_dict()
    }), 200


@usuarios_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh_token():
    identity = get_jwt_identity()
    claims = get_jwt()
    additional = {'schema': claims['schema']} if 'schema' in claims else {}
    access_token = create_access_token(identity=identity, additional_claims=additional)
    return jsonify({'access_token': access_token}), 200


@usuarios_bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    registrar_log(get_jwt_identity(), 'logout', 'usuarios', 'Logout realizado')
    return jsonify({'mensagem': 'Logout realizado com sucesso'}), 200


@usuarios_bp.route('/perfil', methods=['GET'])
@jwt_required()
def obter_perfil_usuario():
    try:
        usuario_id = int(get_jwt_identity())
        usuario = db.session.get(Usuario, usuario_id)

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
        usuario_id = int(get_jwt_identity())
        usuario = db.session.get(Usuario, usuario_id)

        if not usuario:
            return jsonify({'erro': 'Usuário não encontrado'}), 404

        data = request.get_json()

        if not data:
            return jsonify({'erro': 'Dados inválidos'}), 400

        if 'nome' in data:
            usuario.nome = data['nome']

        if 'senha' in data and data['senha']:
            usuario.senha = data['senha']

        db.session.commit()

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


@usuarios_bp.route('/senha', methods=['PUT'])
@token_required
def alterar_senha(usuario_atual):
    try:
        data = request.get_json()

        if not data or not data.get('senha_atual') or not data.get('nova_senha'):
            return jsonify({'erro': 'senha_atual e nova_senha são obrigatórios'}), 400

        if not usuario_atual.verificar_senha(data['senha_atual']):
            return jsonify({'erro': 'Senha atual incorreta'}), 401

        usuario_atual.senha = data['nova_senha']
        usuario_atual.deve_trocar_senha = False
        db.session.commit()

        registrar_log(
            usuario_atual.id,
            'alterar_senha',
            'usuarios',
            f'Usuário {usuario_atual.nome} alterou sua senha'
        )

        return jsonify({'mensagem': 'Senha alterada com sucesso'}), 200
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Erro ao alterar senha: {str(e)}")
        return jsonify({'erro': 'Erro ao alterar senha'}), 500


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
    usuario = db.session.get(Usuario, id)
    if not usuario:
        abort(404)
    return jsonify({'usuario': usuario.to_dict()}), 200


@usuarios_bp.route('', methods=['POST'])
@requer_permissao('criar_usuario')
def criar_usuario():
    data = request.get_json()

    if not data:
        return jsonify({'erro': 'Dados inválidos'}), 400

    campos_obrigatorios = ['nome', 'email', 'senha', 'perfil_id']
    for campo in campos_obrigatorios:
        if campo not in data:
            return jsonify({'erro': f'Campo {campo} é obrigatório'}), 400

    if Usuario.query.filter_by(email=data['email']).first():
        return jsonify({'erro': 'Email já cadastrado'}), 400

    perfil = db.session.get(Perfil, data['perfil_id'])
    if not perfil:
        return jsonify({'erro': 'Perfil não encontrado'}), 404

    novo_usuario = Usuario(
        nome=data['nome'],
        email=data['email'],
        perfil_id=data['perfil_id'],
        uuid=str(uuid.uuid4())
    )
    novo_usuario.senha = data['senha']

    db.session.add(novo_usuario)
    db.session.commit()

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
    usuario = db.session.get(Usuario, id)
    if not usuario:
        abort(404)

    data = request.get_json()

    if not data:
        return jsonify({'erro': 'Dados inválidos'}), 400

    if 'nome' in data:
        usuario.nome = data['nome']

    if 'email' in data and data['email'] != usuario.email:
        if Usuario.query.filter_by(email=data['email']).first():
            return jsonify({'erro': 'Email já cadastrado'}), 400
        usuario.email = data['email']

    if 'senha' in data:
        usuario.senha = data['senha']

    if 'perfil_id' in data:
        perfil = db.session.get(Perfil, data['perfil_id'])
        if not perfil:
            return jsonify({'erro': 'Perfil não encontrado'}), 404
        usuario.perfil_id = data['perfil_id']

    if 'ativo' in data:
        usuario.ativo = data['ativo']

    db.session.commit()

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
    usuario = db.session.get(Usuario, id)
    if not usuario:
        abort(404)

    usuario.ativo = False
    db.session.commit()

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
    perfil = db.session.get(Perfil, id)
    if not perfil:
        abort(404)
    return jsonify({'perfil': perfil.to_dict()}), 200


@usuarios_bp.route('/perfis', methods=['POST'])
@requer_permissao('criar_perfil')
def criar_perfil():
    data = request.get_json()

    if not data or 'nome' not in data:
        return jsonify({'erro': 'Nome do perfil é obrigatório'}), 400

    if Perfil.query.filter_by(nome=data['nome']).first():
        return jsonify({'erro': 'Nome de perfil já cadastrado'}), 400

    novo_perfil = Perfil(
        nome=data['nome'],
        descricao=data.get('descricao', '')
    )

    if 'permissoes' in data and isinstance(data['permissoes'], list):
        for permissao_id in data['permissoes']:
            permissao = db.session.get(Permissao, permissao_id)
            if permissao:
                novo_perfil.permissoes.append(permissao)

    db.session.add(novo_perfil)
    db.session.commit()

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
    perfil = db.session.get(Perfil, id)
    if not perfil:
        abort(404)

    data = request.get_json()

    if not data:
        return jsonify({'erro': 'Dados inválidos'}), 400

    if 'nome' in data and data['nome'] != perfil.nome:
        if Perfil.query.filter_by(nome=data['nome']).first():
            return jsonify({'erro': 'Nome de perfil já cadastrado'}), 400
        perfil.nome = data['nome']

    if 'descricao' in data:
        perfil.descricao = data['descricao']

    if 'permissoes' in data and isinstance(data['permissoes'], list):
        perfil.permissoes = []
        for permissao_id in data['permissoes']:
            permissao = db.session.get(Permissao, permissao_id)
            if permissao:
                perfil.permissoes.append(permissao)

    db.session.commit()

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
    perfil = db.session.get(Perfil, id)
    if not perfil:
        abort(404)

    if Usuario.query.filter_by(perfil_id=id).first():
        return jsonify({'erro': 'Não é possível excluir perfil com usuários associados'}), 400

    db.session.delete(perfil)
    db.session.commit()

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


# Logs são intencionalmente somente leitura — imutabilidade garante trilha de auditoria confiável.
@usuarios_bp.route('/logs', methods=['GET'])
@requer_permissao('visualizar_logs')
def listar_logs():
    usuario_id = request.args.get('usuario_id', type=int)
    data_inicio = request.args.get('data_inicio')
    data_fim = request.args.get('data_fim')
    modulo = request.args.get('modulo')
    acao = request.args.get('acao')

    query = LogAtividade.query

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
            return jsonify({'erro': 'Formato de data_inicio inválido. Use ISO 8601 (ex: 2026-01-01T00:00:00)'}), 400

    if data_fim:
        try:
            data_fim = datetime.fromisoformat(data_fim)
            query = query.filter(LogAtividade.data_hora <= data_fim)
        except ValueError:
            return jsonify({'erro': 'Formato de data_fim inválido. Use ISO 8601 (ex: 2026-12-31T23:59:59)'}), 400

    page = request.args.get('page', 1, type=int)
    per_page = min(request.args.get('per_page', 50, type=int), 200)

    pagination = query.order_by(LogAtividade.data_hora.desc()).paginate(page=page, per_page=per_page)

    return jsonify({
        'logs': [log.to_dict() for log in pagination.items],
        'total': pagination.total,
        'pages': pagination.pages,
        'page': page,
        'per_page': per_page
    }), 200


@usuarios_bp.route('/registrar-admin', methods=['POST'])
def registrar_admin():
    if Usuario.query.count() > 0:
        return jsonify({'erro': 'Já existem usuários cadastrados no sistema. Não é possível criar um novo administrador por esta rota.'}), 403

    data = request.get_json()

    if not data:
        return jsonify({'erro': 'Dados inválidos'}), 400

    campos_obrigatorios = ['nome', 'email', 'senha']
    for campo in campos_obrigatorios:
        if campo not in data:
            return jsonify({'erro': f'Campo {campo} é obrigatório'}), 400

    if Usuario.query.filter_by(email=data['email']).first():
        return jsonify({'erro': 'Email já cadastrado'}), 400

    perfil_admin = Perfil.query.filter_by(nome='Administrador').first()
    if not perfil_admin:
        permissoes = []
        permissoes_codigos = [
            'listar_usuarios', 'visualizar_usuario', 'criar_usuario', 'editar_usuario', 'excluir_usuario',
            'listar_perfis', 'visualizar_perfil', 'criar_perfil', 'editar_perfil', 'excluir_perfil',
            'listar_permissoes', 'visualizar_logs', 'lgpd_gerir'
        ]

        for codigo in permissoes_codigos:
            permissao = Permissao.query.filter_by(codigo=codigo).first()
            if not permissao:
                permissao = Permissao(
                    codigo=codigo,
                    descricao=codigo.replace('_', ' ').title(),
                    modulo='privacidade' if codigo == 'lgpd_gerir' else 'usuarios'
                )
                db.session.add(permissao)
            permissoes.append(permissao)

        perfil_admin = Perfil(
            nome='Administrador',
            descricao='Acesso total ao sistema'
        )
        perfil_admin.permissoes = permissoes
        db.session.add(perfil_admin)
        db.session.commit()

    novo_usuario = Usuario(
        nome=data['nome'],
        email=data['email'],
        perfil_id=perfil_admin.id,
        uuid=str(uuid.uuid4()),
        ativo=True,
        deve_trocar_senha=True
    )
    novo_usuario.senha = data['senha']

    db.session.add(novo_usuario)
    db.session.commit()

    return jsonify({
        'mensagem': 'Usuário administrador criado com sucesso',
        'usuario': novo_usuario.to_dict()
    }), 201


# --- Rotas de Recuperação de Senha (Stateless) ---

@usuarios_bp.route('/esqueci-senha', methods=['POST'])
@limiter.limit('5 per minute')
def esqueci_senha():
    data = request.get_json()
    if not data or 'email' not in data or 'workspace' not in data:
        return jsonify({'erro': 'Email e Workspace são obrigatórios'}), 400

    email = data.get('email').strip().lower()
    workspace = data.get('workspace').strip().lower()

    tenant = Tenant.query.filter_by(subdominio=workspace).first()
    if not tenant:
        return jsonify({'mensagem': 'Se os dados estiverem corretos, preparamos as instruções de recuperação.'}), 200

    if not re.match(r'^[a-z_][a-z0-9_]*$', tenant.db_schema):
        return jsonify({'mensagem': 'Se os dados estiverem corretos, preparamos as instruções de recuperação.'}), 200
    db.session.execute(text(f"SET search_path TO {tenant.db_schema}, public"))

    usuario = Usuario.query.filter_by(email=email).first()
    if not usuario or not usuario.ativo:
        return jsonify({'mensagem': 'Se os dados estiverem corretos, preparamos as instruções de recuperação.'}), 200

    serializer = URLSafeTimedSerializer(current_app.config['SECRET_KEY'])
    token = serializer.dumps({
        'usuario_id': usuario.id,
        'schema': tenant.db_schema
    }, salt='password-reset')

    base_url = current_app.config.get('FRONTEND_URL', 'http://localhost:3000')
    reset_url = f"{base_url}/redefinir-senha?token={token}"

    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <h2 style="color: #4F46E5;">Recuperação de Senha</h2>
        <p>Olá <b>{usuario.nome}</b>, recebemos uma solicitação para redefinir a sua senha de acesso ao Workspace corporativo <b>{tenant.nome_fantasia}</b>.</p>
        <p>Se foi você quem fez este pedido, clique no botão abaixo para criar uma senha nova, a sua conta estará segura.</p>

        <div style="text-align: center; margin: 30px 0;">
            <a href="{reset_url}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">
                Redefinir Minha Senha
            </a>
        </div>

        <p style="font-size: 13px; color: #666;">Se você não solicitou este e-mail, nenhuma ação extra é necessária. Sua senha continuará a mesma e 100% segura. O token de recuperação irá expirar em 60 minutos.</p>

        <hr style="border: none; border-top: 1px solid #eaeaea; margin: 30px 0;" />
        <p style="font-size: 12px; color: #999; text-align: center;">Operado pela Plataforma Apex CRM • Segurança B2B em Nuvem</p>
    </div>
    """

    sucesso, msg_erro = enviar_email(
        para_email=usuario.email,
        assunto="Instruções para redefinir sua senha",
        html_content=html,
        para_nome=usuario.nome
    )

    if not sucesso:
        current_app.logger.warning(f"O serviço de mensageria falhou, mas deixaremos de acusar publicamente: {msg_erro}")

    return jsonify({
        'mensagem': 'Se os dados estiverem corretos, enviamos as instruções para o seu e-mail.'
    }), 200


@usuarios_bp.route('/redefinir-senha', methods=['POST'])
def redefinir_senha():
    data = request.get_json()
    if not data or 'token' not in data or 'nova_senha' not in data:
        return jsonify({'erro': 'Token e Nova Senha são obrigatórios'}), 400

    token = data.get('token')
    nova_senha = data.get('nova_senha')

    serializer = URLSafeTimedSerializer(current_app.config['SECRET_KEY'])
    try:
        payload = serializer.loads(token, salt='password-reset', max_age=3600)
    except SignatureExpired:
        return jsonify({'erro': 'Este token expirou. Solicite a redefinição de senha novamente.'}), 400
    except BadSignature:
        return jsonify({'erro': 'Token inválido ou danificado.'}), 400

    usuario_id = payload.get('usuario_id')
    schema = payload.get('schema')

    if not usuario_id or not schema:
        return jsonify({'erro': 'Token inconsistente.'}), 400

    if not re.match(r'^[a-z_][a-z0-9_]*$', schema):
        return jsonify({'erro': 'Token inconsistente.'}), 400

    db.session.execute(text(f"SET search_path TO {schema}, public"))

    usuario = db.session.get(Usuario, usuario_id)
    if not usuario or not usuario.ativo:
        return jsonify({'erro': 'Usuário não encontrado em sua organização.'}), 404

    usuario.senha = nova_senha
    usuario.deve_trocar_senha = False

    db.session.commit()

    registrar_log(usuario.id, 'redefinir_senha', 'usuarios', f'Usuário {usuario.email} redefiniu sua senha via token.')

    return jsonify({'mensagem': 'Sua senha foi atualizada com sucesso!'}), 200

import csv
import io
from datetime import datetime

from flask import Response, abort, jsonify, request
from flask_jwt_extended import (
    create_access_token,
    create_refresh_token,
    get_jwt,
    get_jwt_identity,
    jwt_required,
)
from sqlalchemy import text

from app import db, limiter
from app.domains.core.blueprints.super_admin import super_admin_bp
from app.domains.core.models import PlatformUser, Tenant
from app.utils.decorators import (
    _platform_user_id,
    requer_operador_plataforma,
    requer_super_admin,
)
from app.utils import totp
from app.domains.core.blueprints.super_admin import service


def _operador_atual():
    return db.session.get(PlatformUser, _platform_user_id())


def _claims_para(user):
    return {
        'tipo': 'platform',
        'scope': 'platform',
        'is_super_admin': user.papel == 'super_admin',
        'papel': user.papel,
    }


# ---------------------------------------------------------------------------
# Autenticação
# ---------------------------------------------------------------------------

@super_admin_bp.route('/login', methods=['POST'])
@limiter.limit('10 per minute')
def login():
    data = request.get_json() or {}
    email = (data.get('email') or '').strip().lower()
    senha = data.get('senha') or ''
    codigo_mfa = (data.get('codigo_mfa') or '').strip()

    if not email or not senha:
        return jsonify({'erro': 'Email e senha são obrigatórios.'}), 400

    user = PlatformUser.query.filter_by(email=email).first()
    if not user or not user.verificar_senha(senha):
        if user:
            service.registrar_falha_login(user)
            service.registrar_auditoria('login_falha', 'platform_user', user.id, 'Senha incorreta', platform_user_id=user.id)
        return jsonify({'erro': 'Credenciais inválidas.'}), 401

    if not user.ativo:
        return jsonify({'erro': 'Operador inativo.'}), 403
    if user.papel not in PlatformUser.PAPEIS_VALIDOS:
        return jsonify({'erro': 'Operador sem permissão de plataforma.'}), 403
    if user.esta_bloqueado:
        service.registrar_auditoria('login_bloqueado', 'platform_user', user.id, 'Tentativa durante bloqueio', platform_user_id=user.id)
        return jsonify({'erro': 'Conta temporariamente bloqueada por tentativas falhas. Tente novamente em alguns minutos.'}), 429

    if user.mfa_habilitado:
        if not codigo_mfa:
            return jsonify({'mfa_requerido': True, 'mensagem': 'Informe o código do autenticador.'}), 200
        if not totp.verificar_codigo(user.mfa_secret, codigo_mfa):
            service.registrar_falha_login(user)
            service.registrar_auditoria('login_falha_mfa', 'platform_user', user.id, 'Código 2FA inválido', platform_user_id=user.id)
            return jsonify({'erro': 'Código de verificação inválido.'}), 401

    service.registrar_sucesso_login(user)
    claims = _claims_para(user)
    token = create_access_token(identity=f'platform:{user.id}', additional_claims=claims)
    refresh = create_refresh_token(identity=f'platform:{user.id}', additional_claims=claims)
    service.registrar_auditoria('login', 'platform_user', user.id, 'Login Super Admin', platform_user_id=user.id)

    # Política global de 2FA obrigatório: sinaliza ao front que o operador precisa configurar
    config = service.obter_config()
    mfa_setup_requerido = bool(config.forcar_2fa) and not user.mfa_habilitado

    return jsonify({
        'access_token': token,
        'refresh_token': refresh,
        'usuario': user.to_dict(),
        'mfa_setup_requerido': mfa_setup_requerido,
    }), 200


@super_admin_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    claims = get_jwt()
    identity = get_jwt_identity()
    if claims.get('tipo') != 'platform':
        return jsonify({'erro': 'Refresh token inválido para plataforma.'}), 401

    user = _operador_atual()
    if not user or not user.ativo:
        return jsonify({'erro': 'Operador inativo.'}), 403

    return jsonify({'access_token': create_access_token(identity=identity, additional_claims=_claims_para(user))}), 200


@super_admin_bp.route('/me', methods=['GET'])
@requer_operador_plataforma
def me():
    return jsonify({'usuario': _operador_atual().to_dict()}), 200


# ---------------------------------------------------------------------------
# Configuração global da plataforma
# ---------------------------------------------------------------------------

@super_admin_bp.route('/config', methods=['GET'])
@requer_operador_plataforma
def obter_config():
    return jsonify({'config': service.obter_config().to_dict()}), 200


@super_admin_bp.route('/config', methods=['PUT'])
@requer_super_admin
def atualizar_config():
    config = service.atualizar_config(request.get_json() or {})
    service.registrar_auditoria('atualizar_config', 'platform', None, f'Config atualizada: {config.to_dict()}', platform_user_id=_platform_user_id())
    return jsonify({'config': config.to_dict()}), 200


# ---------------------------------------------------------------------------
# 2FA / MFA (cada operador gerencia o próprio)
# ---------------------------------------------------------------------------

@super_admin_bp.route('/mfa/setup', methods=['POST'])
@requer_operador_plataforma
def mfa_setup():
    user = _operador_atual()
    secret = totp.gerar_secret()
    user.mfa_secret = secret
    user.mfa_habilitado = False  # só ativa após confirmar um código válido
    db.session.commit()
    return jsonify({
        'secret': secret,
        'otpauth_uri': totp.uri_provisionamento(secret, user.email),
    }), 200


@super_admin_bp.route('/mfa/ativar', methods=['POST'])
@requer_operador_plataforma
def mfa_ativar():
    user = _operador_atual()
    codigo = (request.get_json() or {}).get('codigo', '')
    if not user.mfa_secret:
        return jsonify({'erro': 'Inicie a configuração do 2FA primeiro.'}), 400
    if not totp.verificar_codigo(user.mfa_secret, codigo):
        return jsonify({'erro': 'Código inválido. Tente novamente.'}), 400
    user.mfa_habilitado = True
    db.session.commit()
    service.registrar_auditoria('mfa_ativado', 'platform_user', user.id, '2FA ativado', platform_user_id=user.id)
    return jsonify({'mensagem': '2FA ativado com sucesso.', 'usuario': user.to_dict()}), 200


@super_admin_bp.route('/mfa/desativar', methods=['POST'])
@requer_operador_plataforma
def mfa_desativar():
    user = _operador_atual()
    data = request.get_json() or {}
    senha = data.get('senha') or ''
    if not user.verificar_senha(senha):
        return jsonify({'erro': 'Confirme sua senha para desativar o 2FA.'}), 401
    user.mfa_habilitado = False
    user.mfa_secret = None
    db.session.commit()
    service.registrar_auditoria('mfa_desativado', 'platform_user', user.id, '2FA desativado', platform_user_id=user.id)
    return jsonify({'mensagem': '2FA desativado.', 'usuario': user.to_dict()}), 200


# ---------------------------------------------------------------------------
# Dashboard / tenants (leitura — super_admin e suporte)
# ---------------------------------------------------------------------------

@super_admin_bp.route('/dashboard', methods=['GET'])
@requer_operador_plataforma
def dashboard():
    tenants, payloads = service.listar_tenants(com_stats=True)
    totais = service.calcular_totais(tenants, payloads)
    service.registrar_auditoria('consultar_dashboard', 'platform', None, 'Consulta dashboard global', platform_user_id=_platform_user_id())
    return jsonify({'totais': totais, 'tenants': payloads}), 200


@super_admin_bp.route('/tenants', methods=['GET'])
@requer_operador_plataforma
def listar_tenants():
    _, payloads = service.listar_tenants(com_stats=True)
    return jsonify({'tenants': payloads}), 200


@super_admin_bp.route('/tenants/<int:tenant_id>', methods=['GET'])
@requer_operador_plataforma
def obter_tenant(tenant_id):
    tenant = db.session.get(Tenant, tenant_id)
    if not tenant:
        abort(404)
    payload = service.tenant_payload(tenant)
    service.registrar_auditoria('consultar_tenant', 'tenant', tenant_id, f'Consulta tenant {tenant.subdominio}', platform_user_id=_platform_user_id())
    db.session.execute(text('SET search_path TO public'))
    return jsonify({'tenant': payload}), 200


# ---------------------------------------------------------------------------
# Tenants (escrita — apenas super_admin)
# ---------------------------------------------------------------------------

@super_admin_bp.route('/tenants', methods=['POST'])
@requer_super_admin
def criar_tenant():
    data = request.get_json() or {}
    obrigatorios = ['nome_empresa', 'workspace', 'nome_admin', 'email_admin', 'senha_admin']
    if not all(data.get(c) for c in obrigatorios):
        return jsonify({'erro': 'Todos os campos são obrigatórios.'}), 400

    try:
        tenant, erro = service.criar_tenant(
            data['nome_empresa'], data['workspace'], data['nome_admin'],
            data['email_admin'], data['senha_admin'],
        )
    except Exception as e:
        db.session.rollback()
        db.session.execute(text('SET search_path TO public'))
        return jsonify({'erro': f'Falha ao provisionar tenant: {str(e)}'}), 500

    if erro:
        return jsonify({'erro': erro[0]}), erro[1]

    service.registrar_auditoria('criar_tenant', 'tenant', tenant.id, f'Tenant {tenant.subdominio} provisionado', platform_user_id=_platform_user_id())
    return jsonify({'mensagem': 'Tenant provisionado com sucesso.', 'tenant': tenant.to_dict()}), 201


@super_admin_bp.route('/tenants/<int:tenant_id>', methods=['PUT'])
@requer_super_admin
def atualizar_tenant(tenant_id):
    tenant = db.session.get(Tenant, tenant_id)
    if not tenant:
        abort(404)
    data = request.get_json() or {}
    if 'nome_fantasia' in data and data['nome_fantasia']:
        tenant.nome_fantasia = data['nome_fantasia']
    db.session.commit()
    service.registrar_auditoria('editar_tenant', 'tenant', tenant.id, f'Tenant {tenant.subdominio} editado', platform_user_id=_platform_user_id())
    return jsonify({'tenant': tenant.to_dict()}), 200


@super_admin_bp.route('/tenants/<int:tenant_id>/status', methods=['PATCH'])
@requer_super_admin
def atualizar_status_tenant(tenant_id):
    tenant = db.session.get(Tenant, tenant_id)
    if not tenant:
        abort(404)
    data = request.get_json() or {}
    if 'ativo' not in data:
        return jsonify({'erro': 'Campo ativo é obrigatório.'}), 400

    tenant.ativo = bool(data['ativo'])
    tenant.motivo_inativacao = None if tenant.ativo else (data.get('motivo') or 'Inativado pela administração da plataforma')
    db.session.commit()
    service.registrar_auditoria(
        'alterar_status_tenant', 'tenant', tenant.id,
        f"Tenant {tenant.subdominio} {'ativado' if tenant.ativo else 'inativado'}"
        + ('' if tenant.ativo else f" — motivo: {tenant.motivo_inativacao}"),
        platform_user_id=_platform_user_id(),
    )
    return jsonify({'tenant': tenant.to_dict()}), 200


@super_admin_bp.route('/tenants/<int:tenant_id>/<recurso>', methods=['GET'])
@requer_operador_plataforma
def listar_recurso_do_tenant(tenant_id, recurso):
    tenant = db.session.get(Tenant, tenant_id)
    if not tenant:
        abort(404)
    dados = service.inspecionar_recurso(tenant, recurso)
    if dados is None:
        return jsonify({'erro': 'Recurso desconhecido.'}), 400
    service.registrar_auditoria('inspecionar_tenant', 'tenant', tenant.id, f'Consulta {recurso} em {tenant.subdominio}', platform_user_id=_platform_user_id())
    return jsonify({'tenant': tenant.to_dict(), 'recurso': recurso, 'dados': dados}), 200


@super_admin_bp.route('/tenants/<int:tenant_id>/usuarios/<int:usuario_id>/reset-senha', methods=['POST'])
@requer_super_admin
def reset_senha_usuario(tenant_id, usuario_id):
    tenant = db.session.get(Tenant, tenant_id)
    if not tenant:
        abort(404)
    nova_senha = (request.get_json() or {}).get('nova_senha') or ''
    try:
        resultado = service.resetar_senha_usuario_tenant(tenant, usuario_id, nova_senha)
    except ValueError as e:
        return jsonify({'erro': str(e)}), 400
    if resultado is None:
        return jsonify({'erro': 'Usuário não encontrado no tenant.'}), 404
    service.registrar_auditoria('reset_senha_usuario', 'tenant', tenant.id, f'Reset de senha do usuário {usuario_id} em {tenant.subdominio}', platform_user_id=_platform_user_id())
    return jsonify({'mensagem': 'Senha redefinida. O usuário deverá trocá-la no próximo acesso.'}), 200


@super_admin_bp.route('/tenants/<int:tenant_id>/impersonar', methods=['POST'])
@requer_super_admin
def impersonar(tenant_id):
    tenant = db.session.get(Tenant, tenant_id)
    if not tenant:
        abort(404)
    if not tenant.ativo:
        return jsonify({'erro': 'Não é possível impersonar um tenant inativo.'}), 400
    usuario_id = (request.get_json() or {}).get('usuario_id')
    if not usuario_id:
        return jsonify({'erro': 'usuario_id é obrigatório.'}), 400

    operador = _operador_atual()
    tokens, alvo = service.gerar_token_impersonacao(tenant, operador, usuario_id)
    if tokens is None:
        return jsonify({'erro': 'Usuário alvo inválido ou inativo.'}), 404
    service.registrar_auditoria('impersonar', 'tenant', tenant.id, f'Impersonou usuário {alvo.get("email")} em {tenant.subdominio}', platform_user_id=operador.id)
    return jsonify(tokens), 200


# ---------------------------------------------------------------------------
# Operadores da plataforma (apenas super_admin)
# ---------------------------------------------------------------------------

@super_admin_bp.route('/platform-users', methods=['GET'])
@requer_super_admin
def listar_operadores():
    return jsonify({'operadores': service.listar_operadores()}), 200


@super_admin_bp.route('/platform-users', methods=['POST'])
@requer_super_admin
def criar_operador():
    data = request.get_json() or {}
    try:
        operador, erro = service.criar_operador(
            data.get('nome'), data.get('email'), data.get('senha'), data.get('papel', 'super_admin'),
        )
    except ValueError as e:
        return jsonify({'erro': str(e)}), 400
    if erro:
        return jsonify({'erro': erro[0]}), erro[1]
    service.registrar_auditoria('criar_operador', 'platform_user', operador.id, f'Operador {operador.email} criado ({operador.papel})', platform_user_id=_platform_user_id())
    return jsonify({'operador': operador.to_dict()}), 201


@super_admin_bp.route('/platform-users/<int:operador_id>', methods=['PUT'])
@requer_super_admin
def atualizar_operador(operador_id):
    operador = db.session.get(PlatformUser, operador_id)
    if not operador:
        abort(404)
    data = request.get_json() or {}
    # Impede que o último super_admin ativo se rebaixe/desative e trave a plataforma
    rebaixando = (data.get('papel') and data['papel'] != 'super_admin') or (data.get('ativo') is False)
    if operador.papel == 'super_admin' and rebaixando:
        ativos = PlatformUser.query.filter_by(papel='super_admin', ativo=True).count()
        if ativos <= 1:
            return jsonify({'erro': 'Não é possível desativar/rebaixar o último Super Admin ativo.'}), 400
    try:
        operador, erro = service.atualizar_operador(operador, data)
    except ValueError as e:
        return jsonify({'erro': str(e)}), 400
    if erro:
        return jsonify({'erro': erro[0]}), erro[1]
    service.registrar_auditoria('atualizar_operador', 'platform_user', operador.id, f'Operador {operador.email} atualizado', platform_user_id=_platform_user_id())
    return jsonify({'operador': operador.to_dict()}), 200


@super_admin_bp.route('/platform-users/<int:operador_id>', methods=['DELETE'])
@requer_super_admin
def desativar_operador(operador_id):
    operador = db.session.get(PlatformUser, operador_id)
    if not operador:
        abort(404)
    if operador.id == _platform_user_id():
        return jsonify({'erro': 'Você não pode desativar a si mesmo.'}), 400
    if operador.papel == 'super_admin':
        ativos = PlatformUser.query.filter_by(papel='super_admin', ativo=True).count()
        if ativos <= 1:
            return jsonify({'erro': 'Não é possível desativar o último Super Admin ativo.'}), 400
    operador.ativo = False
    db.session.commit()
    service.registrar_auditoria('desativar_operador', 'platform_user', operador.id, f'Operador {operador.email} desativado', platform_user_id=_platform_user_id())
    return jsonify({'mensagem': 'Operador desativado.'}), 200


# ---------------------------------------------------------------------------
# Auditoria
# ---------------------------------------------------------------------------

def _parse_data(valor):
    if not valor:
        return None
    try:
        return datetime.fromisoformat(valor)
    except ValueError:
        return None


@super_admin_bp.route('/audit-logs', methods=['GET'])
@requer_operador_plataforma
def audit_logs():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 50, type=int)
    pagination = service.consultar_logs(
        page=page,
        per_page=per_page,
        acao=request.args.get('acao'),
        platform_user_id=request.args.get('platform_user_id', type=int),
        data_inicio=_parse_data(request.args.get('data_inicio')),
        data_fim=_parse_data(request.args.get('data_fim')),
    )
    return jsonify({
        'logs': [log.to_dict() for log in pagination.items],
        'total': pagination.total,
        'pages': pagination.pages,
        'page': pagination.page,
        'per_page': pagination.per_page,
    }), 200


@super_admin_bp.route('/audit-logs/export', methods=['GET'])
@requer_super_admin
def exportar_audit_logs():
    pagination = service.consultar_logs(
        page=1,
        per_page=200,
        acao=request.args.get('acao'),
        data_inicio=_parse_data(request.args.get('data_inicio')),
        data_fim=_parse_data(request.args.get('data_fim')),
    )
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(['id', 'data', 'operador', 'acao', 'alvo_tipo', 'alvo_id', 'descricao', 'ip'])
    for log in pagination.items:
        d = log.to_dict()
        writer.writerow([d['id'], d['data_criacao'], d['usuario'], d['acao'], d['alvo_tipo'], d['alvo_id'], d['descricao'], d['ip']])
    service.registrar_auditoria('exportar_logs', 'platform', None, 'Exportação CSV de logs', platform_user_id=_platform_user_id())
    return Response(
        buffer.getvalue(),
        mimetype='text/csv',
        headers={'Content-Disposition': 'attachment; filename=audit-logs.csv'},
    )

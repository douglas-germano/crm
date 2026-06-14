from datetime import datetime, timezone
from functools import wraps
import re

from flask import abort, jsonify, request
from flask_jwt_extended import create_access_token, create_refresh_token, get_jwt, get_jwt_identity, jwt_required
from sqlalchemy import text

from app import db, limiter
from app.domains.core.blueprints.super_admin import super_admin_bp
from app.domains.core.models import PlatformAuditLog, PlatformUser, Tenant, Usuario
from app.domains.crm.models import Empresa, Lead


def _schema_valido(schema):
    return bool(schema) and re.match(r'^[a-z_][a-z0-9_]*$', schema)


def _registrar_auditoria(acao, alvo_tipo=None, alvo_id=None, descricao=None, platform_user_id=None):
    try:
        user_id = platform_user_id
        if user_id is None:
            identity = get_jwt_identity()
            user_id = int(identity.split(':', 1)[1]) if isinstance(identity, str) and identity.startswith('platform:') else None
        log = PlatformAuditLog(
            platform_user_id=user_id,
            acao=acao,
            alvo_tipo=alvo_tipo,
            alvo_id=str(alvo_id) if alvo_id is not None else None,
            descricao=descricao,
            ip=request.remote_addr,
        )
        db.session.add(log)
        db.session.commit()
    except Exception:
        db.session.rollback()


def requer_super_admin(f):
    @wraps(f)
    @jwt_required()
    def decorated_function(*args, **kwargs):
        claims = get_jwt()
        identity = get_jwt_identity()
        if claims.get('tipo') != 'platform' or not claims.get('is_super_admin'):
            return jsonify({'erro': 'Acesso negado. Requer Super Admin da plataforma.'}), 403

        try:
            user_id = int(identity.split(':', 1)[1])
        except Exception:
            return jsonify({'erro': 'Token de plataforma inválido.'}), 401

        user = db.session.get(PlatformUser, user_id)
        if not user or not user.ativo or user.papel != 'super_admin':
            return jsonify({'erro': 'Operador Super Admin inativo ou sem permissão.'}), 403

        return f(*args, **kwargs)
    return decorated_function


def _tenant_stats(tenant):
    if not _schema_valido(tenant.db_schema):
        return {'erro': 'schema_invalido'}

    db.session.execute(text(f'SET search_path TO {tenant.db_schema}, public'))
    return {
        'usuarios': db.session.scalar(text('SELECT count(*) FROM usuarios')),
        'empresas': db.session.scalar(text('SELECT count(*) FROM empresas')),
        'leads': db.session.scalar(text('SELECT count(*) FROM leads')),
    }


def _tenant_payload(tenant):
    return {
        'id': tenant.id,
        'nome_fantasia': tenant.nome_fantasia,
        'subdominio': tenant.subdominio,
        'db_schema': tenant.db_schema,
        'ativo': tenant.ativo,
        'criado_em': tenant.data_criacao.isoformat() if tenant.data_criacao else None,
        'estatisticas': _tenant_stats(tenant),
    }


@super_admin_bp.route('/login', methods=['POST'])
@limiter.limit('10 per minute')
def login():
    data = request.get_json() or {}
    email = (data.get('email') or '').strip().lower()
    senha = data.get('senha') or ''

    if not email or not senha:
        return jsonify({'erro': 'Email e senha são obrigatórios.'}), 400

    user = PlatformUser.query.filter_by(email=email).first()
    if not user or not user.verificar_senha(senha):
        return jsonify({'erro': 'Credenciais inválidas.'}), 401
    if not user.ativo:
        return jsonify({'erro': 'Operador inativo.'}), 403
    if user.papel != 'super_admin':
        return jsonify({'erro': 'Operador sem permissão Super Admin.'}), 403

    user.ultimo_login = datetime.now(timezone.utc)
    db.session.commit()

    claims = {
        'tipo': 'platform',
        'is_super_admin': True,
        'papel': user.papel,
    }
    token = create_access_token(identity=f'platform:{user.id}', additional_claims=claims)
    refresh = create_refresh_token(identity=f'platform:{user.id}', additional_claims=claims)
    _registrar_auditoria('login', 'platform_user', user.id, 'Login Super Admin', platform_user_id=user.id)

    return jsonify({'access_token': token, 'refresh_token': refresh, 'usuario': user.to_dict()}), 200


@super_admin_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    claims = get_jwt()
    identity = get_jwt_identity()
    if claims.get('tipo') != 'platform' or not claims.get('is_super_admin'):
        return jsonify({'erro': 'Refresh token inválido para plataforma.'}), 401
    additional = {
        'tipo': 'platform',
        'is_super_admin': True,
        'papel': claims.get('papel', 'super_admin'),
    }
    return jsonify({'access_token': create_access_token(identity=identity, additional_claims=additional)}), 200


@super_admin_bp.route('/me', methods=['GET'])
@requer_super_admin
def me():
    user_id = int(get_jwt_identity().split(':', 1)[1])
    user = db.session.get(PlatformUser, user_id)
    return jsonify({'usuario': user.to_dict()}), 200


@super_admin_bp.route('/dashboard', methods=['GET'])
@requer_super_admin
def dashboard():
    tenants = Tenant.query.order_by(Tenant.id).all()
    payloads = [_tenant_payload(t) for t in tenants]
    totais = {
        'tenants': len(payloads),
        'tenants_ativos': sum(1 for t in tenants if t.ativo),
        'usuarios': sum((p['estatisticas'].get('usuarios') or 0) for p in payloads if isinstance(p['estatisticas'], dict)),
        'empresas': sum((p['estatisticas'].get('empresas') or 0) for p in payloads if isinstance(p['estatisticas'], dict)),
        'leads': sum((p['estatisticas'].get('leads') or 0) for p in payloads if isinstance(p['estatisticas'], dict)),
    }
    _registrar_auditoria('consultar_dashboard', 'platform', None, 'Consulta dashboard global')
    db.session.execute(text('SET search_path TO public'))
    return jsonify({'totais': totais, 'tenants': payloads}), 200


@super_admin_bp.route('/tenants', methods=['GET'])
@requer_super_admin
def listar_tenants():
    tenants = Tenant.query.order_by(Tenant.id).all()
    data = [_tenant_payload(t) for t in tenants]
    db.session.execute(text('SET search_path TO public'))
    return jsonify({'tenants': data}), 200


@super_admin_bp.route('/tenants/<int:tenant_id>', methods=['GET'])
@requer_super_admin
def obter_tenant(tenant_id):
    tenant = db.session.get(Tenant, tenant_id)
    if not tenant:
        abort(404)
    data = _tenant_payload(tenant)
    _registrar_auditoria('consultar_tenant', 'tenant', tenant_id, f'Consulta tenant {tenant.subdominio}')
    db.session.execute(text('SET search_path TO public'))
    return jsonify({'tenant': data}), 200


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
    db.session.commit()
    _registrar_auditoria(
        'alterar_status_tenant',
        'tenant',
        tenant.id,
        f"Tenant {tenant.subdominio} {'ativado' if tenant.ativo else 'inativado'}",
    )
    return jsonify({'tenant': tenant.to_dict()}), 200


@super_admin_bp.route('/tenants/<int:tenant_id>/<recurso>', methods=['GET'])
@requer_super_admin
def listar_recurso_do_tenant(tenant_id, recurso):
    tenant = db.session.get(Tenant, tenant_id)
    if not tenant:
        abort(404)
    if not _schema_valido(tenant.db_schema):
        return jsonify({'erro': 'Schema do tenant inválido.'}), 400

    db.session.execute(text(f'SET search_path TO {tenant.db_schema}, public'))
    if recurso == 'usuarios':
        items = Usuario.query.order_by(Usuario.id).all()
        data = [i.to_dict() for i in items]
    elif recurso == 'empresas':
        items = Empresa.query.order_by(Empresa.id).all()
        data = [i.to_dict() for i in items]
    elif recurso == 'leads':
        items = Lead.query.order_by(Lead.id).all()
        data = [i.to_dict() for i in items]
    else:
        return jsonify({'erro': 'Recurso desconhecido.'}), 400

    _registrar_auditoria('inspecionar_tenant', 'tenant', tenant.id, f'Consulta {recurso} em {tenant.subdominio}')
    db.session.execute(text('SET search_path TO public'))
    return jsonify({'tenant': tenant.to_dict(), 'recurso': recurso, 'dados': data}), 200


@super_admin_bp.route('/audit-logs', methods=['GET'])
@requer_super_admin
def audit_logs():
    logs = PlatformAuditLog.query.order_by(PlatformAuditLog.data_criacao.desc()).limit(100).all()
    return jsonify({'logs': [log.to_dict() for log in logs]}), 200

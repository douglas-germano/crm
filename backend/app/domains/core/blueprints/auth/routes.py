"""Endpoints de sessão unificados (cookies httpOnly), para tenant e plataforma.

- GET  /me      → identidade atual (lê o `scope` das claims)
- POST /refresh → renova o access cookie revalidando usuário + token_version
- POST /logout  → limpa os cookies de sessão
"""

from flask import jsonify, make_response
from flask_jwt_extended import (
    create_access_token,
    get_jwt,
    get_jwt_identity,
    jwt_required,
    set_access_cookies,
    unset_jwt_cookies,
)
from sqlalchemy import text

from app import db
from app.domains.core.blueprints.auth import auth_bp
from app.domains.core.models import PlatformUser, Tenant, Usuario
from app.utils.auth_tokens import claims_plataforma, claims_tenant
from app.utils.db_schema import schema_valido


def _carregar_operador():
    try:
        return db.session.get(PlatformUser, int(get_jwt_identity()))
    except (ValueError, TypeError):
        return None


# ---------------------------------------------------------------------------
# /me
# ---------------------------------------------------------------------------

@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def me():
    claims = get_jwt()
    scope = claims.get('scope')

    if scope == 'platform':
        operador = _carregar_operador()
        if not operador or not operador.ativo:
            return jsonify({'erro': 'Operador inativo.'}), 403
        from app.domains.core.blueprints.super_admin import service
        return jsonify({
            'scope': 'platform',
            'usuario': operador.to_dict(),
            'forcar_2fa': bool(service.obter_config().forcar_2fa),
        }), 200

    if scope == 'tenant':
        # before_request já posicionou o search_path a partir da claim `tenant`
        try:
            usuario = db.session.get(Usuario, int(get_jwt_identity()))
        except (ValueError, TypeError):
            usuario = None
        if not usuario or not usuario.ativo:
            return jsonify({'erro': 'Usuário inválido.'}), 403
        if claims.get('ver') != (usuario.token_version or 0):
            return jsonify({'erro': 'Sessão revogada.'}), 401

        schema = claims.get('tenant')
        db.session.execute(text('SET search_path TO public'))
        tenant = Tenant.query.filter_by(db_schema=schema).first()
        return jsonify({
            'scope': 'tenant',
            'usuario': usuario.to_dict(),
            'workspace': tenant.to_dict() if tenant else None,
            'impersonacao': bool(claims.get('impersonacao')),
        }), 200

    return jsonify({'erro': 'Sessão inválida.'}), 401


# ---------------------------------------------------------------------------
# /refresh — revalida no banco e reemite o access cookie
# ---------------------------------------------------------------------------

@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    claims = get_jwt()
    scope = claims.get('scope')
    identity = get_jwt_identity()

    if scope == 'platform':
        operador = _carregar_operador()
        if not operador or not operador.ativo or operador.token_version != claims.get('ver'):
            return jsonify({'erro': 'Sessão expirada. Faça login novamente.'}), 401
        novo = create_access_token(identity=identity, additional_claims=claims_plataforma(operador))
        resp = make_response(jsonify({'ok': True}), 200)
        set_access_cookies(resp, novo)
        return resp

    if scope == 'tenant':
        schema = claims.get('tenant')
        if not schema_valido(schema):
            return jsonify({'erro': 'Sessão inválida.'}), 401
        db.session.execute(text(f'SET search_path TO {schema}, public'))
        try:
            usuario = db.session.get(Usuario, int(identity))
            tenant = Tenant.query.filter_by(db_schema=schema).first()
            if (not usuario or not usuario.ativo or not tenant or not tenant.ativo
                    or usuario.token_version != claims.get('ver')):
                return jsonify({'erro': 'Sessão expirada. Faça login novamente.'}), 401
            extra = {'impersonacao': True} if claims.get('impersonacao') else None
            novo_claims = claims_tenant(usuario, tenant)
            if extra:
                novo_claims.update(extra)
            novo = create_access_token(identity=identity, additional_claims=novo_claims)
        finally:
            db.session.execute(text('SET search_path TO public'))
        resp = make_response(jsonify({'ok': True}), 200)
        set_access_cookies(resp, novo)
        return resp

    return jsonify({'erro': 'Sessão inválida.'}), 401


# ---------------------------------------------------------------------------
# /logout — limpa os cookies (funciona mesmo com access expirado)
# ---------------------------------------------------------------------------

@auth_bp.route('/logout', methods=['POST'])
def logout():
    resp = make_response(jsonify({'ok': True}), 200)
    unset_jwt_cookies(resp)
    return resp

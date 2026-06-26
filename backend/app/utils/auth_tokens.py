"""Emissão unificada de sessão JWT em cookies httpOnly.

Modelo:
- Access token: curto (15 min), confiado pelas claims (scope/papel/tenant/ver).
- Refresh token: longo, revalidado no banco a cada refresh (usuário ativo + token_version).
- Claims unificadas distinguem plataforma e tenant pelo campo `scope`, sem prefixo
  no `sub` (identity é sempre o id numérico).
"""

from flask_jwt_extended import (
    create_access_token,
    create_refresh_token,
    set_access_cookies,
    set_refresh_cookies,
)


def claims_tenant(usuario, tenant):
    return {
        'scope': 'tenant',
        'tenant': tenant.db_schema,
        'papel': usuario.perfil.nome if usuario.perfil else None,
        'ver': usuario.token_version or 0,
    }


def claims_plataforma(operador):
    return {
        'scope': 'platform',
        'papel': operador.papel,
        'is_super_admin': operador.papel == 'super_admin',
        'ver': operador.token_version or 0,
    }


def emitir_sessao_tenant(resp, usuario, tenant, extra_claims=None):
    claims = claims_tenant(usuario, tenant)
    if extra_claims:
        claims.update(extra_claims)
    identity = str(usuario.id)
    set_access_cookies(resp, create_access_token(identity=identity, additional_claims=claims))
    set_refresh_cookies(resp, create_refresh_token(identity=identity, additional_claims=claims))
    return resp


def emitir_sessao_plataforma(resp, operador):
    claims = claims_plataforma(operador)
    identity = str(operador.id)
    set_access_cookies(resp, create_access_token(identity=identity, additional_claims=claims))
    set_refresh_cookies(resp, create_refresh_token(identity=identity, additional_claims=claims))
    return resp

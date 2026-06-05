import secrets
import re
from flask import request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from sqlalchemy import text

from app import db
from app.models.tenant import Tenant
from app.models import Lead
from app.blueprints.usuarios.routes import registrar_log
from . import webhook_bp


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _get_token_from_request():
    """Extrai o token do header X-Webhook-Token, Authorization Bearer ou query string."""
    token = request.headers.get('X-Webhook-Token')
    if token:
        return token

    auth = request.headers.get('Authorization', '')
    if auth.lower().startswith('bearer '):
        candidate = auth[7:].strip()
        # Tokens de webhook não são JWTs (não contêm ponto separador de segmentos)
        if '.' not in candidate:
            return candidate

    return request.args.get('token')


def _set_schema(schema: str):
    if not re.match(r'^[a-z_][a-z0-9_]*$', schema):
        return False
    db.session.execute(text(f'SET search_path TO {schema}, public'))
    return True


# ---------------------------------------------------------------------------
# Endpoint público — recebe leads via webhook
# ---------------------------------------------------------------------------

@webhook_bp.route('/leads', methods=['POST'])
def receber_lead():
    """
    Endpoint público autenticado apenas pelo webhook_token do tenant.

    Headers aceitos (qualquer um):
        X-Webhook-Token: <token>
        Authorization: Bearer <token>

    Query string alternativa:
        ?token=<token>

    Payload (JSON):
        nome / name / full_name   — obrigatório
        email                     — obrigatório
        telefone / phone          — opcional
        empresa / company         — opcional
        cargo / job_title         — opcional
        interesse / interest      — opcional
        origem / source           — opcional (padrão: "Webhook")
        observacoes / message     — opcional
        utm_source                — mapeado para origem se presente
    """
    token = _get_token_from_request()
    if not token:
        return jsonify({'erro': 'Token de webhook obrigatório. Use o header X-Webhook-Token ou ?token=<token>.'}), 401

    # Busca no schema público — webhook_token identifica o tenant
    tenant = Tenant.query.filter_by(webhook_token=token).first()
    if not tenant:
        return jsonify({'erro': 'Token inválido ou expirado.'}), 401

    if not _set_schema(tenant.db_schema):
        return jsonify({'erro': 'Configuração de tenant inválida.'}), 500

    dados = request.get_json(silent=True) or {}

    # Mapeamento flexível de campos
    nome = (
        dados.get('nome') or dados.get('name') or dados.get('full_name') or
        f"{dados.get('first_name', '')} {dados.get('last_name', '')}".strip() or None
    )
    email = dados.get('email') or dados.get('email_address')

    if not nome:
        return jsonify({'erro': "Campo obrigatório ausente: 'nome' (ou 'name')."}), 422
    if not email:
        return jsonify({'erro': "Campo obrigatório ausente: 'email'."}), 422

    # Normalizar email
    email = email.lower().strip()

    telefone  = dados.get('telefone') or dados.get('phone') or dados.get('telephone') or dados.get('mobile')
    empresa   = dados.get('empresa') or dados.get('company') or dados.get('company_name')
    cargo     = dados.get('cargo') or dados.get('job_title') or dados.get('position') or dados.get('role')
    interesse = dados.get('interesse') or dados.get('interest') or dados.get('subject') or dados.get('product')
    origem    = (
        dados.get('origem') or dados.get('source') or dados.get('utm_source') or
        dados.get('lead_source') or 'Webhook'
    )
    observacoes = dados.get('observacoes') or dados.get('message') or dados.get('notes') or dados.get('comments')

    lead = Lead(
        nome=nome[:100],
        email=email[:100],
        telefone=telefone[:20] if telefone else None,
        empresa_nome=empresa[:100] if empresa else None,
        cargo=cargo[:100] if cargo else None,
        interesse=interesse[:100] if interesse else None,
        origem=origem[:50] if origem else 'Webhook',
        observacoes=observacoes,
        status='novo',
    )

    db.session.add(lead)
    db.session.commit()

    current_app.logger.info(f'Webhook lead criado: tenant={tenant.db_schema} lead_id={lead.id} email={email}')

    return jsonify({
        'mensagem': 'Lead recebido com sucesso.',
        'lead_id': lead.id,
        'lead_uuid': lead.uuid,
    }), 201


# ---------------------------------------------------------------------------
# Endpoints autenticados — gestão do token
# ---------------------------------------------------------------------------

@webhook_bp.route('/config', methods=['GET'])
@jwt_required()
def obter_config():
    """Retorna o token e a URL do webhook para o tenant autenticado."""
    claims = get_jwt()
    schema = claims.get('schema')

    tenant = Tenant.query.filter_by(db_schema=schema).first()
    if not tenant:
        return jsonify({'erro': 'Tenant não encontrado.'}), 404

    # Gera token na primeira consulta se ainda não existir
    if not tenant.webhook_token:
        tenant.webhook_token = secrets.token_urlsafe(40)
        db.session.commit()

    base_url = current_app.config.get('WEBHOOK_BASE_URL', request.host_url.rstrip('/'))

    return jsonify({
        'webhook_token': tenant.webhook_token,
        'webhook_url': f'{base_url}/api/webhook/leads',
        'campos_suportados': {
            'obrigatorios': ['nome (ou name)', 'email'],
            'opcionais': ['telefone', 'empresa', 'cargo', 'interesse', 'origem', 'observacoes'],
            'aliases': {
                'nome': ['name', 'full_name', 'first_name + last_name'],
                'telefone': ['phone', 'telephone', 'mobile'],
                'empresa': ['company', 'company_name'],
                'cargo': ['job_title', 'position', 'role'],
                'interesse': ['interest', 'subject', 'product'],
                'origem': ['source', 'utm_source', 'lead_source'],
                'observacoes': ['message', 'notes', 'comments'],
            }
        }
    }), 200


@webhook_bp.route('/token/regenerate', methods=['POST'])
@jwt_required()
def regenerar_token():
    """Gera um novo token, invalidando o anterior."""
    claims = get_jwt()
    schema = claims.get('schema')

    tenant = Tenant.query.filter_by(db_schema=schema).first()
    if not tenant:
        return jsonify({'erro': 'Tenant não encontrado.'}), 404

    tenant.webhook_token = secrets.token_urlsafe(40)
    db.session.commit()

    usuario_id = int(get_jwt_identity())
    registrar_log(usuario_id, 'regenerar_token_webhook', 'webhook', 'Token de webhook regenerado pelo administrador')

    return jsonify({
        'mensagem': 'Token regenerado. O token anterior não funcionará mais.',
        'webhook_token': tenant.webhook_token,
    }), 200

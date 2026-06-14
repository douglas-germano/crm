"""Endpoints de direitos do titular (LGPD art. 18).

Permite ao operador atender solicitações de titulares de dados:
- acesso e portabilidade (exportar);
- eliminação via anonimização (art. 16);
- revogação de consentimento (art. 8, §5).

Todas as ações exigem a permissão `lgpd_gerir` e são registradas em LogAtividade
para fins de prestação de contas (art. 6, X).
"""

from flask import request, jsonify
from flask_jwt_extended import get_jwt_identity

from app import db
from app.domains.crm.models import Lead
from app.domains.core.blueprints.usuarios.routes import requer_permissao, registrar_log
from app.utils.lgpd import (
    anonimizar_lead,
    exportar_dados_titular,
    revogar_consentimento_titular,
)
from . import privacidade_bp


@privacidade_bp.route('/titular/exportar', methods=['POST'])
@requer_permissao('lgpd_gerir')
def exportar_titular():
    """Direito de acesso/portabilidade — devolve todos os dados de um titular (art. 18, II/V)."""
    dados = request.get_json(silent=True) or {}
    email = (dados.get('email') or '').strip().lower()
    if not email:
        return jsonify({'erro': 'O campo email é obrigatório.'}), 400

    resultado = exportar_dados_titular(email)

    registrar_log(
        int(get_jwt_identity()),
        'exportar_dados_titular',
        'privacidade',
        f'Exportação de dados solicitada para o titular {email} '
        f'({resultado.get("total_registros", 0)} registros)'
    )

    return jsonify(resultado), 200


@privacidade_bp.route('/titular/anonimizar', methods=['POST'])
@requer_permissao('lgpd_gerir')
def anonimizar_titular():
    """Direito de eliminação — anonimiza os leads de um titular (art. 18, VI / art. 16)."""
    dados = request.get_json(silent=True) or {}
    email = (dados.get('email') or '').strip().lower()
    lead_id = dados.get('lead_id')

    if not email and not lead_id:
        return jsonify({'erro': 'Informe email ou lead_id.'}), 400

    if lead_id:
        lead = db.session.get(Lead, lead_id)
        if not lead:
            return jsonify({'erro': 'Lead não encontrado.'}), 404
        alvos = [lead]
    else:
        alvos = Lead.query.filter(db.func.lower(Lead.email) == email).all()
        if not alvos:
            return jsonify({'erro': 'Nenhum lead encontrado para este e-mail.'}), 404

    identificador = email or f'lead {lead_id}'
    for lead in alvos:
        anonimizar_lead(lead)
    db.session.commit()

    registrar_log(
        int(get_jwt_identity()),
        'anonimizar_titular',
        'privacidade',
        f'{len(alvos)} registro(s) anonimizado(s) para o titular {identificador}'
    )

    return jsonify({
        'mensagem': 'Dados pessoais anonimizados com sucesso.',
        'registros_anonimizados': len(alvos),
    }), 200


@privacidade_bp.route('/titular/revogar-consentimento', methods=['POST'])
@requer_permissao('lgpd_gerir')
def revogar_consentimento():
    """Revoga o consentimento do titular (art. 8, §5)."""
    dados = request.get_json(silent=True) or {}
    email = (dados.get('email') or '').strip().lower()
    if not email:
        return jsonify({'erro': 'O campo email é obrigatório.'}), 400

    afetados = revogar_consentimento_titular(email)
    db.session.commit()

    registrar_log(
        int(get_jwt_identity()),
        'revogar_consentimento',
        'privacidade',
        f'Consentimento revogado para o titular {email} ({afetados} registro(s))'
    )

    return jsonify({
        'mensagem': 'Consentimento revogado.',
        'registros_afetados': afetados,
    }), 200

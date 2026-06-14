from datetime import datetime, timezone
from flask import jsonify, request
from app import db
from app.domains.core.models import Usuario
from app.domains.crm.models import Lead
from app.domains.crm.blueprints.leads import leads_bp
from app.domains.core.blueprints.usuarios.routes import requer_permissao, registrar_log
from app.utils.lgpd import anonimizar_lead
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import desc


@leads_bp.route('', methods=['GET'])
@jwt_required()
def listar_leads():
    try:
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 10, type=int), 100)
        status = request.args.get('status')

        query = Lead.query

        if status:
            query = query.filter(Lead.status == status)

        query = query.order_by(desc(Lead.data_criacao))
        pagination = query.paginate(page=page, per_page=per_page)

        return jsonify({
            'leads': [lead.to_dict() for lead in pagination.items],
            'total': pagination.total,
            'pages': pagination.pages,
            'page': page,
            'per_page': per_page
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'erro': f'Erro ao listar leads: {str(e)}'}), 500


@leads_bp.route('/<int:lead_id>', methods=['GET'])
@jwt_required()
def obter_lead(lead_id):
    try:
        lead = db.session.get(Lead, lead_id)

        if not lead:
            return jsonify({'erro': 'Lead não encontrado'}), 404

        return jsonify(lead.to_dict()), 200
    except Exception as e:
        return jsonify({'erro': f'Erro ao obter lead: {str(e)}'}), 500


@leads_bp.route('', methods=['POST'])
@jwt_required()
def criar_lead():
    try:
        dados = request.get_json()

        if not dados.get('nome') or not dados.get('email'):
            return jsonify({'erro': 'Nome e email são obrigatórios'}), 400

        consentimento = bool(dados.get('consentimento'))
        base_legal = dados.get('base_legal') or ('consentimento' if consentimento else 'legitimo_interesse')

        lead = Lead(
            nome=dados.get('nome'),
            email=dados.get('email'),
            telefone=dados.get('telefone'),
            empresa_nome=dados.get('empresa'),
            cargo=dados.get('cargo'),
            interesse=dados.get('interesse'),
            origem=dados.get('origem'),
            observacoes=dados.get('observacoes'),
            status=dados.get('status', 'novo'),
            base_legal=base_legal,
            finalidade=dados.get('finalidade'),
            consentimento=consentimento,
            consentimento_data=datetime.now(timezone.utc) if consentimento else None,
            consentimento_origem=dados.get('consentimento_origem') or 'Cadastro manual',
        )

        if dados.get('responsavel_id'):
            responsavel = db.session.get(Usuario, dados.get('responsavel_id'))
            if responsavel:
                lead.responsavel = responsavel
            else:
                return jsonify({'erro': 'Responsável não encontrado'}), 404

        db.session.add(lead)
        db.session.commit()

        usuario_id = int(get_jwt_identity())
        registrar_log(usuario_id, 'criar', 'leads', f'Lead {lead.id} criado')

        return jsonify({'mensagem': 'Lead criado com sucesso', 'lead': lead.to_dict()}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'erro': f'Erro ao criar lead: {str(e)}'}), 500


@leads_bp.route('/<int:lead_id>', methods=['PUT'])
@jwt_required()
def atualizar_lead(lead_id):
    try:
        lead = db.session.get(Lead, lead_id)

        if not lead:
            return jsonify({'erro': 'Lead não encontrado'}), 404

        dados = request.get_json()

        if 'nome' in dados:
            lead.nome = dados['nome']
        if 'email' in dados:
            lead.email = dados['email']
        if 'telefone' in dados:
            lead.telefone = dados['telefone']
        if 'empresa' in dados:
            lead.empresa_nome = dados['empresa']
        if 'cargo' in dados:
            lead.cargo = dados['cargo']
        if 'interesse' in dados:
            lead.interesse = dados['interesse']
        if 'origem' in dados:
            lead.origem = dados['origem']
        if 'observacoes' in dados:
            lead.observacoes = dados['observacoes']
        if 'status' in dados:
            lead.status = dados['status']
        if 'base_legal' in dados:
            lead.base_legal = dados['base_legal']
        if 'finalidade' in dados:
            lead.finalidade = dados['finalidade']
        if 'consentimento' in dados:
            novo_consentimento = bool(dados['consentimento'])
            # registra a data apenas na transição para "consentido"
            if novo_consentimento and not lead.consentimento:
                lead.consentimento_data = datetime.now(timezone.utc)
            lead.consentimento = novo_consentimento

        if 'responsavel_id' in dados:
            responsavel = db.session.get(Usuario, dados['responsavel_id'])
            if responsavel:
                lead.responsavel = responsavel
            else:
                return jsonify({'erro': 'Responsável não encontrado'}), 404

        db.session.commit()

        usuario_id = int(get_jwt_identity())
        registrar_log(usuario_id, 'atualizar', 'leads', f'Lead {lead.id} atualizado')

        return jsonify({'mensagem': 'Lead atualizado com sucesso', 'lead': lead.to_dict()}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'erro': f'Erro ao atualizar lead: {str(e)}'}), 500


@leads_bp.route('/<int:lead_id>', methods=['DELETE'])
@jwt_required()
def excluir_lead(lead_id):
    """Atende ao direito de eliminação (LGPD art. 16/18, VI) via anonimização.

    Em vez de apagar o registro — o que quebraria o histórico de negócios e as
    métricas do funil — os dados pessoais do titular são anonimizados de forma
    irreversível, preservando a integridade referencial do CRM.
    Use ?hard=true para exclusão definitiva quando não houver negócios vinculados.
    """
    try:
        lead = db.session.get(Lead, lead_id)

        if not lead:
            return jsonify({'erro': 'Lead não encontrado'}), 404

        usuario_id = int(get_jwt_identity())
        hard_delete = request.args.get('hard', '').lower() in ('1', 'true', 'sim')

        if hard_delete and lead.negocios.count() == 0:
            db.session.delete(lead)
            db.session.commit()
            registrar_log(usuario_id, 'excluir', 'leads', f'Lead {lead_id} excluído definitivamente (LGPD)')
            return jsonify({'mensagem': 'Lead excluído definitivamente'}), 200

        anonimizar_lead(lead)
        db.session.commit()
        registrar_log(usuario_id, 'anonimizar', 'leads', f'Lead {lead_id} anonimizado (LGPD art. 16)')

        return jsonify({
            'mensagem': 'Dados pessoais do lead anonimizados com sucesso (LGPD).',
            'lead': lead.to_dict(),
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'erro': f'Erro ao excluir lead: {str(e)}'}), 500

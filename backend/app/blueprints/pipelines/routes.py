from flask import jsonify, request
from app import db
from app.models import Pipeline, Estagio, LeadEstagio, Lead
from app.blueprints.pipelines import pipelines_bp
from app.blueprints.usuarios.routes import requer_permissao, registrar_log
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import desc, asc
from sqlalchemy.orm import joinedload


def normalizar_posicoes_estagio(estagio_id):
    lead_estagios = (
        LeadEstagio.query
        .filter_by(estagio_id=estagio_id)
        .order_by(LeadEstagio.posicao.asc(), LeadEstagio.data_entrada.asc(), LeadEstagio.id.asc())
        .all()
    )
    for idx, lead_estagio in enumerate(lead_estagios):
        lead_estagio.posicao = idx


# ----- Rotas de Pipeline -----

@pipelines_bp.route('', methods=['GET'])
@jwt_required()
def listar_pipelines():
    try:
        page = request.args.get('page', type=int)
        per_page = request.args.get('per_page', 20, type=int)
        ativo = request.args.get('ativo')

        query = Pipeline.query
        if ativo is not None:
            query = query.filter(Pipeline.ativo == (ativo.lower() == 'true'))

        if page:
            pagination = query.paginate(page=page, per_page=min(per_page, 100))
            return jsonify({
                'pipelines': [p.to_dict() for p in pagination.items],
                'total': pagination.total,
                'pages': pagination.pages,
                'page': page,
                'per_page': per_page,
            }), 200

        return jsonify({'pipelines': [p.to_dict() for p in query.all()]}), 200
    except Exception as e:
        return jsonify({'erro': f'Erro ao listar pipelines: {str(e)}'}), 500


@pipelines_bp.route('/<int:pipeline_id>', methods=['GET'])
@jwt_required()
def obter_pipeline(pipeline_id):
    try:
        pipeline = db.session.get(Pipeline, pipeline_id)

        if not pipeline:
            return jsonify({'erro': 'Pipeline não encontrado'}), 404

        return jsonify(pipeline.to_dict()), 200
    except Exception as e:
        return jsonify({'erro': f'Erro ao obter pipeline: {str(e)}'}), 500


@pipelines_bp.route('', methods=['POST'])
@jwt_required()
def criar_pipeline():
    try:
        dados = request.get_json()

        if not dados.get('nome'):
            return jsonify({'erro': 'Nome é obrigatório'}), 400

        pipeline = Pipeline(
            nome=dados.get('nome'),
            descricao=dados.get('descricao')
        )

        criar_estagios_padrao = dados.get('criar_estagios_padrao', True)
        if criar_estagios_padrao:
            estagios_padrao = [
                {'nome': 'Novo', 'ordem': 1, 'cor': '#3498db'},
                {'nome': 'Contatado', 'ordem': 2, 'cor': '#f39c12'},
                {'nome': 'Qualificado', 'ordem': 3, 'cor': '#e67e22'},
                {'nome': 'Proposta', 'ordem': 4, 'cor': '#9b59b6'},
                {'nome': 'Fechado', 'ordem': 5, 'cor': '#27ae60'}
            ]

            for estagio_dados in estagios_padrao:
                estagio = Estagio(
                    nome=estagio_dados['nome'],
                    ordem=estagio_dados['ordem'],
                    cor=estagio_dados['cor'],
                    pipeline=pipeline
                )
                db.session.add(estagio)

        db.session.add(pipeline)
        db.session.commit()

        usuario_id = int(get_jwt_identity())
        registrar_log(usuario_id, 'criar', 'pipelines', f'Pipeline {pipeline.id} criado')

        return jsonify({
            'mensagem': 'Pipeline criado com sucesso',
            'pipeline': pipeline.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'erro': f'Erro ao criar pipeline: {str(e)}'}), 500


@pipelines_bp.route('/<int:pipeline_id>', methods=['PUT'])
@jwt_required()
def atualizar_pipeline(pipeline_id):
    try:
        pipeline = db.session.get(Pipeline, pipeline_id)

        if not pipeline:
            return jsonify({'erro': 'Pipeline não encontrado'}), 404

        dados = request.get_json()

        if 'nome' in dados:
            pipeline.nome = dados['nome']
        if 'descricao' in dados:
            pipeline.descricao = dados['descricao']
        if 'ativo' in dados:
            pipeline.ativo = dados['ativo']

        db.session.commit()

        usuario_id = int(get_jwt_identity())
        registrar_log(usuario_id, 'atualizar', 'pipelines', f'Pipeline {pipeline.id} atualizado')

        return jsonify({
            'mensagem': 'Pipeline atualizado com sucesso',
            'pipeline': pipeline.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'erro': f'Erro ao atualizar pipeline: {str(e)}'}), 500


@pipelines_bp.route('/<int:pipeline_id>', methods=['DELETE'])
@jwt_required()
def excluir_pipeline(pipeline_id):
    try:
        pipeline = db.session.get(Pipeline, pipeline_id)

        if not pipeline:
            return jsonify({'erro': 'Pipeline não encontrado'}), 404

        db.session.delete(pipeline)
        db.session.commit()

        usuario_id = int(get_jwt_identity())
        registrar_log(usuario_id, 'excluir', 'pipelines', f'Pipeline {pipeline_id} excluído')

        return jsonify({'mensagem': 'Pipeline excluído com sucesso'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'erro': f'Erro ao excluir pipeline: {str(e)}'}), 500


# ----- Rotas de Estágio -----

@pipelines_bp.route('/<int:pipeline_id>/estagios', methods=['GET'])
@jwt_required()
def listar_estagios(pipeline_id):
    try:
        pipeline = db.session.get(Pipeline, pipeline_id)

        if not pipeline:
            return jsonify({'erro': 'Pipeline não encontrado'}), 404

        return jsonify({
            'estagios': [estagio.to_dict() for estagio in pipeline.estagios]
        }), 200
    except Exception as e:
        return jsonify({'erro': f'Erro ao listar estágios: {str(e)}'}), 500


@pipelines_bp.route('/<int:pipeline_id>/estagios', methods=['POST'])
@jwt_required()
def criar_estagio(pipeline_id):
    try:
        pipeline = db.session.get(Pipeline, pipeline_id)

        if not pipeline:
            return jsonify({'erro': 'Pipeline não encontrado'}), 404

        dados = request.get_json()

        if not dados.get('nome'):
            return jsonify({'erro': 'Nome é obrigatório'}), 400

        if 'ordem' not in dados:
            ultima_ordem = 0
            if pipeline.estagios:
                ultima_ordem = max(estagio.ordem for estagio in pipeline.estagios)
            dados['ordem'] = ultima_ordem + 1

        estagio = Estagio(
            nome=dados.get('nome'),
            descricao=dados.get('descricao'),
            cor=dados.get('cor', '#3498db'),
            ordem=dados.get('ordem'),
            pipeline=pipeline
        )

        db.session.add(estagio)
        db.session.commit()

        usuario_id = int(get_jwt_identity())
        registrar_log(usuario_id, 'criar', 'pipelines', f'Estágio {estagio.id} criado no pipeline {pipeline_id}')

        return jsonify({
            'mensagem': 'Estágio criado com sucesso',
            'estagio': estagio.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'erro': f'Erro ao criar estágio: {str(e)}'}), 500


@pipelines_bp.route('/estagios/<int:estagio_id>', methods=['PUT'])
@jwt_required()
def atualizar_estagio(estagio_id):
    try:
        estagio = db.session.get(Estagio, estagio_id)

        if not estagio:
            return jsonify({'erro': 'Estágio não encontrado'}), 404

        dados = request.get_json()

        if 'nome' in dados:
            estagio.nome = dados['nome']
        if 'descricao' in dados:
            estagio.descricao = dados['descricao']
        if 'cor' in dados:
            estagio.cor = dados['cor']
        if 'ordem' in dados:
            estagio.ordem = dados['ordem']

        db.session.commit()

        usuario_id = int(get_jwt_identity())
        registrar_log(usuario_id, 'atualizar', 'pipelines', f'Estágio {estagio.id} atualizado')

        return jsonify({
            'mensagem': 'Estágio atualizado com sucesso',
            'estagio': estagio.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'erro': f'Erro ao atualizar estágio: {str(e)}'}), 500


@pipelines_bp.route('/estagios/<int:estagio_id>', methods=['DELETE'])
@jwt_required()
def excluir_estagio(estagio_id):
    try:
        estagio = db.session.get(Estagio, estagio_id)

        if not estagio:
            return jsonify({'erro': 'Estágio não encontrado'}), 404

        if estagio.lead_estagios:
            return jsonify({'erro': 'Não é possível excluir um estágio que contém leads'}), 400

        db.session.delete(estagio)
        db.session.commit()

        usuario_id = int(get_jwt_identity())
        registrar_log(usuario_id, 'excluir', 'pipelines', f'Estágio {estagio_id} excluído')

        return jsonify({'mensagem': 'Estágio excluído com sucesso'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'erro': f'Erro ao excluir estágio: {str(e)}'}), 500


# ----- Rotas de Leads no Pipeline -----

@pipelines_bp.route('/<int:pipeline_id>/leads', methods=['GET'])
@jwt_required()
def listar_leads_pipeline(pipeline_id):
    try:
        pipeline = db.session.get(Pipeline, pipeline_id)

        if not pipeline:
            return jsonify({'erro': 'Pipeline não encontrado'}), 404

        resultado = []

        for estagio in pipeline.estagios:
            lead_estagios = LeadEstagio.query.filter_by(estagio_id=estagio.id).order_by(LeadEstagio.posicao).all()

            leads = []
            for lead_estagio in lead_estagios:
                lead_data = lead_estagio.lead.to_dict()
                lead_data['posicao'] = lead_estagio.posicao
                lead_data['lead_estagio_id'] = lead_estagio.id
                leads.append(lead_data)

            resultado.append({
                'estagio': estagio.to_dict(),
                'leads': leads
            })

        return jsonify({'pipeline': pipeline.to_dict(), 'leads_por_estagio': resultado}), 200
    except Exception as e:
        return jsonify({'erro': f'Erro ao listar leads do pipeline: {str(e)}'}), 500


@pipelines_bp.route('/leads/<int:lead_id>/mover', methods=['POST'])
@jwt_required()
def mover_lead(lead_id):
    try:
        dados = request.get_json()

        if not dados.get('estagio_id'):
            return jsonify({'erro': 'ID do estágio é obrigatório'}), 400

        lead = db.session.get(Lead, lead_id)
        if not lead:
            return jsonify({'erro': 'Lead não encontrado'}), 404

        estagio = db.session.get(Estagio, dados.get('estagio_id'))
        if not estagio:
            return jsonify({'erro': 'Estágio não encontrado'}), 404

        posicao_destino = dados.get('posicao')
        try:
            posicao_destino = int(posicao_destino) if posicao_destino is not None else None
        except (TypeError, ValueError):
            return jsonify({'erro': 'Posição inválida'}), 400

        lead_estagio = (
            LeadEstagio.query
            .filter_by(lead_id=lead_id)
            .join(Estagio)
            .filter(Estagio.pipeline_id == estagio.pipeline_id)
            .first()
        )

        if lead_estagio:
            old_estagio_id = lead_estagio.estagio_id
            normalizar_posicoes_estagio(old_estagio_id)
            db.session.flush()
            if old_estagio_id != estagio.id:
                lead_estagio.estagio_id = estagio.id
                db.session.flush()
                normalizar_posicoes_estagio(old_estagio_id)
        else:
            lead_estagio = LeadEstagio(
                lead_id=lead_id,
                estagio_id=estagio.id,
                posicao=0
            )
            db.session.add(lead_estagio)
            old_estagio_id = None
            db.session.flush()

        lead_estagios_destino = (
            LeadEstagio.query
            .filter_by(estagio_id=estagio.id)
            .order_by(LeadEstagio.posicao.asc(), LeadEstagio.data_entrada.asc(), LeadEstagio.id.asc())
            .all()
        )
        lead_estagios_destino = [item for item in lead_estagios_destino if item.id != lead_estagio.id]

        if posicao_destino is None:
            posicao_destino = len(lead_estagios_destino)
        posicao_destino = max(0, min(posicao_destino, len(lead_estagios_destino)))

        lead_estagios_destino.insert(posicao_destino, lead_estagio)
        for idx, item in enumerate(lead_estagios_destino):
            item.posicao = idx

        db.session.commit()

        usuario_id = int(get_jwt_identity())
        registrar_log(
            usuario_id,
            'mover_lead',
            'pipelines',
            f'Lead {lead_id} movido para o estágio {estagio.id}'
        )

        return jsonify({
            'mensagem': 'Lead movido com sucesso',
            'lead_estagio': lead_estagio.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'erro': f'Erro ao mover lead: {str(e)}'}), 500


@pipelines_bp.route('/leads/reordenar', methods=['POST'])
@jwt_required()
def reordenar_leads():
    try:
        dados = request.get_json()

        if not dados.get('estagio_id') or 'ordenacao' not in dados:
            return jsonify({'erro': 'ID do estágio e ordenação são obrigatórios'}), 400

        estagio_id = dados.get('estagio_id')
        ordenacao = dados.get('ordenacao')

        estagio = db.session.get(Estagio, estagio_id)
        if not estagio:
            return jsonify({'erro': 'Estágio não encontrado'}), 404

        for idx, lead_estagio_id in enumerate(ordenacao):
            lead_estagio = db.session.get(LeadEstagio, lead_estagio_id)
            if lead_estagio and lead_estagio.estagio_id == estagio_id:
                lead_estagio.posicao = idx

        normalizar_posicoes_estagio(estagio_id)

        db.session.commit()

        usuario_id = int(get_jwt_identity())
        registrar_log(
            usuario_id,
            'reordenar_leads',
            'pipelines',
            f'Leads reordenados no estágio {estagio_id}'
        )

        return jsonify({'mensagem': 'Leads reordenados com sucesso'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'erro': f'Erro ao reordenar leads: {str(e)}'}), 500

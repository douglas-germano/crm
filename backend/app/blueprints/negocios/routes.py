from flask import request, jsonify, current_app
from sqlalchemy.exc import SQLAlchemyError
from app import db
from app.models import Negocio, Lead, Pipeline, Estagio, Usuario, AtividadeNegocio
from app.utils.decorators import token_required, requer_permissao
from app.utils.validadores import validar_campos
from datetime import datetime, timezone
import traceback

from app.blueprints.negocios import negocios_bp


@negocios_bp.route('', methods=['GET'])
@token_required
def listar_negocios(usuario_atual):
    try:
        pipeline_id = request.args.get('pipeline_id', type=int)
        lead_id = request.args.get('lead_id', type=int)
        estagio_id = request.args.get('estagio_id', type=int)
        status = request.args.get('status')
        tipo = request.args.get('tipo')
        responsavel_id = request.args.get('responsavel_id', type=int)

        query = Negocio.query

        if pipeline_id:
            query = query.filter(Negocio.pipeline_id == pipeline_id)
        if lead_id:
            query = query.filter(Negocio.lead_id == lead_id)
        if estagio_id:
            query = query.filter(Negocio.estagio_id == estagio_id)
        if status:
            query = query.filter(Negocio.status == status)
        if tipo:
            query = query.filter(Negocio.tipo == tipo)
        if responsavel_id:
            query = query.filter(Negocio.responsavel_id == responsavel_id)

        query = query.order_by(Negocio.data_atualizacao.desc())
        negocios = query.all()

        return jsonify([negocio.to_dict() for negocio in negocios]), 200

    except Exception as e:
        current_app.logger.error(f"Erro ao listar negócios: {str(e)}")
        return jsonify({"erro": "Erro ao listar negócios"}), 500


@negocios_bp.route('/<int:negocio_id>', methods=['GET'])
@token_required
def obter_negocio(usuario_atual, negocio_id):
    try:
        negocio = db.session.get(Negocio, negocio_id)

        if not negocio:
            return jsonify({"erro": "Negócio não encontrado"}), 404

        return jsonify(negocio.to_dict()), 200

    except Exception as e:
        current_app.logger.error(f"Erro ao obter negócio: {str(e)}")
        return jsonify({"erro": "Erro ao obter negócio"}), 500


@negocios_bp.route('', methods=['POST'])
@token_required
def criar_negocio(usuario_atual):
    try:
        dados = request.json

        campos_obrigatorios = ['nome', 'lead_id', 'pipeline_id']
        mensagens_erro = validar_campos(dados, campos_obrigatorios)

        if mensagens_erro:
            return jsonify({"erro": "Campos obrigatórios ausentes", "campos": mensagens_erro}), 400

        lead = db.session.get(Lead, dados.get('lead_id'))
        if not lead:
            return jsonify({"erro": "Lead não encontrado"}), 404

        pipeline = db.session.get(Pipeline, dados.get('pipeline_id'))
        if not pipeline:
            return jsonify({"erro": "Pipeline não encontrado"}), 404

        estagio_id = dados.get('estagio_id')
        if estagio_id:
            estagio = db.session.get(Estagio, estagio_id)
            if not estagio:
                return jsonify({"erro": "Estágio não encontrado"}), 404
            if estagio.pipeline_id != pipeline.id:
                return jsonify({"erro": "Estágio não pertence ao pipeline selecionado"}), 400
        else:
            primeiro_estagio = Estagio.query.filter_by(pipeline_id=pipeline.id).order_by(Estagio.ordem).first()
            if primeiro_estagio:
                estagio_id = primeiro_estagio.id

        responsavel_id = dados.get('responsavel_id')
        if responsavel_id:
            responsavel = db.session.get(Usuario, responsavel_id)
            if not responsavel:
                return jsonify({"erro": "Responsável não encontrado"}), 404
        else:
            responsavel_id = usuario_atual.id

        negocio = Negocio(
            nome=dados.get('nome'),
            descricao=dados.get('descricao', ''),
            valor=dados.get('valor', 0.0),
            tipo=dados.get('tipo', 'unico'),
            periodicidade=dados.get('periodicidade'),
            probabilidade=dados.get('probabilidade', 0),
            data_previsao_fechamento=datetime.fromisoformat(dados.get('data_previsao_fechamento')) if dados.get('data_previsao_fechamento') else None,
            status=dados.get('status', 'aberto'),
            lead_id=dados.get('lead_id'),
            pipeline_id=dados.get('pipeline_id'),
            estagio_id=estagio_id,
            responsavel_id=responsavel_id,
            criado_por_id=usuario_atual.id,
            servico_id=dados.get('servico_id')
        )

        db.session.add(negocio)
        db.session.commit()

        return jsonify(negocio.to_dict()), 201

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Erro ao criar negócio: {str(e)}")
        current_app.logger.error(traceback.format_exc())
        return jsonify({"erro": "Erro ao criar negócio"}), 500


@negocios_bp.route('/<int:negocio_id>', methods=['PUT'])
@token_required
def atualizar_negocio(usuario_atual, negocio_id):
    try:
        dados = request.json

        negocio = db.session.get(Negocio, negocio_id)
        if not negocio:
            return jsonify({"erro": "Negócio não encontrado"}), 404

        if 'nome' in dados:
            negocio.nome = dados['nome']

        if 'descricao' in dados:
            negocio.descricao = dados['descricao']

        if 'valor' in dados:
            negocio.valor = dados['valor']

        if 'tipo' in dados:
            negocio.tipo = dados['tipo']

        if 'periodicidade' in dados:
            negocio.periodicidade = dados['periodicidade']

        if 'probabilidade' in dados:
            negocio.probabilidade = dados['probabilidade']

        if 'data_previsao_fechamento' in dados:
            negocio.data_previsao_fechamento = datetime.fromisoformat(dados['data_previsao_fechamento']) if dados['data_previsao_fechamento'] else None

        if 'status' in dados:
            if dados['status'] in ['ganho', 'perdido'] and negocio.status == 'aberto':
                negocio.data_fechamento = datetime.now(timezone.utc)
            negocio.status = dados['status']

        if 'motivo' in dados:
            negocio.motivo = dados['motivo']

        if 'estagio_id' in dados and dados['estagio_id'] != negocio.estagio_id:
            estagio = db.session.get(Estagio, dados['estagio_id'])
            if not estagio:
                return jsonify({"erro": "Estágio não encontrado"}), 404

            if estagio.pipeline_id != negocio.pipeline_id:
                return jsonify({"erro": "Estágio não pertence ao pipeline do negócio"}), 400

            negocio.estagio_id = dados['estagio_id']

        if 'servico_id' in dados:
            negocio.servico_id = dados['servico_id']

        if 'responsavel_id' in dados:
            responsavel = db.session.get(Usuario, dados['responsavel_id'])
            if not responsavel:
                return jsonify({"erro": "Responsável não encontrado"}), 404

            negocio.responsavel_id = dados['responsavel_id']

        db.session.commit()

        return jsonify(negocio.to_dict()), 200

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Erro ao atualizar negócio: {str(e)}")
        return jsonify({"erro": "Erro ao atualizar negócio"}), 500


@negocios_bp.route('/<int:negocio_id>', methods=['DELETE'])
@token_required
def excluir_negocio(usuario_atual, negocio_id):
    try:
        negocio = db.session.get(Negocio, negocio_id)
        if not negocio:
            return jsonify({"erro": "Negócio não encontrado"}), 404

        db.session.delete(negocio)
        db.session.commit()

        return jsonify({"mensagem": "Negócio excluído com sucesso"}), 200

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Erro ao excluir negócio: {str(e)}")
        return jsonify({"erro": "Erro ao excluir negócio"}), 500


@negocios_bp.route('/estatisticas', methods=['GET'])
@token_required
def obter_estatisticas(usuario_atual):
    try:
        pipeline_id = request.args.get('pipeline_id', type=int)
        periodo = request.args.get('periodo', 'mes')

        from sqlalchemy import func

        filtros = []
        if pipeline_id:
            filtros.append(Negocio.pipeline_id == pipeline_id)

        now = datetime.now(timezone.utc)
        if periodo == 'mes':
            inicio = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            filtros.append(Negocio.data_criacao >= inicio)
        elif periodo == 'trimestre':
            mes_inicio = ((now.month - 1) // 3) * 3 + 1
            inicio = now.replace(month=mes_inicio, day=1, hour=0, minute=0, second=0, microsecond=0)
            filtros.append(Negocio.data_criacao >= inicio)
        elif periodo == 'ano':
            inicio = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
            filtros.append(Negocio.data_criacao >= inicio)

        total_negocios = Negocio.query.filter(*filtros).count()
        total_abertos = Negocio.query.filter(Negocio.status == 'aberto', *filtros).count()
        total_ganhos = Negocio.query.filter(Negocio.status == 'ganho', *filtros).count()
        total_perdidos = Negocio.query.filter(Negocio.status == 'perdido', *filtros).count()

        valor_total = db.session.query(func.sum(Negocio.valor)).filter(*filtros).scalar() or 0
        valor_ganho = db.session.query(func.sum(Negocio.valor)).filter(Negocio.status == 'ganho', *filtros).scalar() or 0
        valor_aberto = db.session.query(func.sum(Negocio.valor)).filter(Negocio.status == 'aberto', *filtros).scalar() or 0
        valor_perdido = db.session.query(func.sum(Negocio.valor)).filter(Negocio.status == 'perdido', *filtros).scalar() or 0

        return jsonify({
            'total_negocios': total_negocios,
            'total_abertos': total_abertos,
            'total_ganhos': total_ganhos,
            'total_perdidos': total_perdidos,
            'valor_total': float(valor_total),
            'valor_ganho': float(valor_ganho),
            'valor_aberto': float(valor_aberto),
            'valor_perdido': float(valor_perdido),
            'periodo': periodo
        }), 200

    except Exception as e:
        current_app.logger.error(f"Erro ao obter estatísticas: {str(e)}")
        return jsonify({"erro": "Erro ao obter estatísticas"}), 500


# Rotas para atividades de negócios
@negocios_bp.route('/<int:negocio_id>/atividades', methods=['GET'])
@token_required
def listar_atividades(usuario_atual, negocio_id):
    try:
        negocio = db.session.get(Negocio, negocio_id)
        if not negocio:
            return jsonify({"erro": "Negócio não encontrado"}), 404

        atividades = AtividadeNegocio.query.filter_by(negocio_id=negocio_id).order_by(AtividadeNegocio.data_agendada).all()

        return jsonify([atividade.to_dict() for atividade in atividades]), 200

    except Exception as e:
        current_app.logger.error(f"Erro ao listar atividades: {str(e)}")
        return jsonify({"erro": "Erro ao listar atividades"}), 500


@negocios_bp.route('/<int:negocio_id>/atividades', methods=['POST'])
@token_required
def criar_atividade(usuario_atual, negocio_id):
    try:
        dados = request.json

        campos_obrigatorios = ['tipo', 'titulo', 'data_agendada']
        mensagens_erro = validar_campos(dados, campos_obrigatorios)

        if mensagens_erro:
            return jsonify({"erro": "Campos obrigatórios ausentes", "campos": mensagens_erro}), 400

        negocio = db.session.get(Negocio, negocio_id)
        if not negocio:
            return jsonify({"erro": "Negócio não encontrado"}), 404

        atividade = AtividadeNegocio(
            tipo=dados.get('tipo'),
            titulo=dados.get('titulo'),
            descricao=dados.get('descricao', ''),
            data_agendada=datetime.fromisoformat(dados.get('data_agendada')),
            status=dados.get('status', 'pendente'),
            responsavel_id=dados.get('responsavel_id', usuario_atual.id),
            negocio_id=negocio_id
        )

        db.session.add(atividade)
        db.session.commit()

        return jsonify(atividade.to_dict()), 201

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Erro ao criar atividade: {str(e)}")
        return jsonify({"erro": "Erro ao criar atividade"}), 500


@negocios_bp.route('/<int:negocio_id>/atividades/<int:atividade_id>', methods=['PUT'])
@token_required
def atualizar_atividade(usuario_atual, negocio_id, atividade_id):
    try:
        dados = request.json

        atividade = AtividadeNegocio.query.filter_by(id=atividade_id, negocio_id=negocio_id).first()
        if not atividade:
            return jsonify({"erro": "Atividade não encontrada ou não pertence ao negócio informado"}), 404

        if 'tipo' in dados:
            atividade.tipo = dados['tipo']

        if 'titulo' in dados:
            atividade.titulo = dados['titulo']

        if 'descricao' in dados:
            atividade.descricao = dados['descricao']

        if 'data_agendada' in dados:
            atividade.data_agendada = datetime.fromisoformat(dados['data_agendada'])

        if 'status' in dados:
            if dados['status'] == 'concluida' and atividade.status != 'concluida':
                atividade.data_conclusao = datetime.now(timezone.utc)
            atividade.status = dados['status']

        if 'resultado' in dados:
            atividade.resultado = dados['resultado']

        if 'responsavel_id' in dados:
            responsavel = db.session.get(Usuario, dados['responsavel_id'])
            if not responsavel:
                return jsonify({"erro": "Responsável não encontrado"}), 404

            atividade.responsavel_id = dados['responsavel_id']

        db.session.commit()

        return jsonify(atividade.to_dict()), 200

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Erro ao atualizar atividade: {str(e)}")
        return jsonify({"erro": "Erro ao atualizar atividade"}), 500


@negocios_bp.route('/<int:negocio_id>/atividades/<int:atividade_id>', methods=['DELETE'])
@token_required
def excluir_atividade(usuario_atual, negocio_id, atividade_id):
    try:
        atividade = AtividadeNegocio.query.filter_by(id=atividade_id, negocio_id=negocio_id).first()
        if not atividade:
            return jsonify({"erro": "Atividade não encontrada ou não pertence ao negócio informado"}), 404

        db.session.delete(atividade)
        db.session.commit()

        return jsonify({"mensagem": "Atividade excluída com sucesso"}), 200

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Erro ao excluir atividade: {str(e)}")
        return jsonify({"erro": "Erro ao excluir atividade"}), 500

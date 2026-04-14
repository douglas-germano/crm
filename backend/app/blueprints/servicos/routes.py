from flask import request, jsonify, current_app
from app import db
from app.models import Servico
from app.blueprints.servicos import servicos_bp
from app.utils.decorators import token_required


@servicos_bp.route('', methods=['GET'])
@token_required
def listar_servicos(usuario_atual):
    try:
        ativo = request.args.get('ativo', None)
        query = Servico.query

        if ativo is not None:
            query = query.filter(Servico.ativo == (ativo.lower() == 'true'))

        servicos = query.order_by(Servico.nome).all()
        return jsonify([s.to_dict() for s in servicos]), 200
    except Exception as e:
        current_app.logger.error(f"Erro ao listar serviços: {str(e)}")
        return jsonify({'erro': 'Erro ao listar serviços'}), 500


@servicos_bp.route('', methods=['POST'])
@token_required
def criar_servico(usuario_atual):
    try:
        dados = request.get_json()
        if not dados.get('nome'):
            return jsonify({'erro': 'Nome é obrigatório'}), 400

        servico = Servico(
            nome=dados['nome'],
            descricao=dados.get('descricao'),
            categoria=dados.get('categoria'),
        )
        db.session.add(servico)
        db.session.commit()
        return jsonify({'mensagem': 'Serviço criado', 'servico': servico.to_dict()}), 201
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Erro ao criar serviço: {str(e)}")
        return jsonify({'erro': 'Erro ao criar serviço'}), 500


@servicos_bp.route('/<int:servico_id>', methods=['PUT'])
@token_required
def atualizar_servico(usuario_atual, servico_id):
    try:
        servico = Servico.query.get(servico_id)
        if not servico:
            return jsonify({'erro': 'Serviço não encontrado'}), 404

        dados = request.get_json()
        for campo in ['nome', 'descricao', 'categoria', 'ativo']:
            if campo in dados:
                setattr(servico, campo, dados[campo])

        db.session.commit()
        return jsonify({'mensagem': 'Serviço atualizado', 'servico': servico.to_dict()}), 200
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Erro ao atualizar serviço: {str(e)}")
        return jsonify({'erro': 'Erro ao atualizar serviço'}), 500


@servicos_bp.route('/<int:servico_id>', methods=['DELETE'])
@token_required
def excluir_servico(usuario_atual, servico_id):
    try:
        servico = Servico.query.get(servico_id)
        if not servico:
            return jsonify({'erro': 'Serviço não encontrado'}), 404

        servico.ativo = False
        db.session.commit()
        return jsonify({'mensagem': 'Serviço desativado'}), 200
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Erro ao excluir serviço: {str(e)}")
        return jsonify({'erro': 'Erro ao excluir serviço'}), 500

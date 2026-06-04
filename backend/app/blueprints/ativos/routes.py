from flask import request, jsonify, current_app
from app import db
from app.models.ativo import Ativo
from app.models.empresa import Empresa
from app.blueprints.ativos import ativos_bp
from app.utils.decorators import token_required
from datetime import datetime


@ativos_bp.route('', methods=['GET'])
@token_required
def listar_ativos(usuario_atual):
    try:
        empresa_id = request.args.get('empresa_id', type=int)
        categoria = request.args.get('categoria')
        status = request.args.get('status')
        page = request.args.get('page', type=int)
        per_page = request.args.get('per_page', 20, type=int)

        query = Ativo.query

        if empresa_id:
            query = query.filter(Ativo.empresa_id == empresa_id)
        if categoria:
            query = query.filter(Ativo.categoria == categoria)
        if status:
            query = query.filter(Ativo.status == status)

        query = query.order_by(Ativo.tag_identificacao)

        if page:
            pagination = query.paginate(page=page, per_page=min(per_page, 100))
            return jsonify({
                'ativos': [a.to_dict() for a in pagination.items],
                'total': pagination.total,
                'pages': pagination.pages,
                'page': page,
                'per_page': per_page,
            }), 200

        return jsonify([a.to_dict() for a in query.all()]), 200
    except Exception as e:
        current_app.logger.error(f"Erro ao listar ativos: {str(e)}")
        return jsonify({'erro': 'Erro ao listar ativos'}), 500


@ativos_bp.route('/<int:ativo_id>', methods=['GET'])
@token_required
def obter_ativo(usuario_atual, ativo_id):
    try:
        ativo = db.session.get(Ativo, ativo_id)
        if not ativo:
            return jsonify({'erro': 'Ativo não encontrado'}), 404
        return jsonify(ativo.to_dict()), 200
    except Exception as e:
        current_app.logger.error(f"Erro ao obter ativo: {str(e)}")
        return jsonify({'erro': 'Erro ao obter ativo'}), 500


@ativos_bp.route('', methods=['POST'])
@token_required
def criar_ativo(usuario_atual):
    try:
        dados = request.get_json()

        campos_obrigatorios = ['nome', 'tag_identificacao', 'empresa_id']
        for campo in campos_obrigatorios:
            if not dados.get(campo):
                return jsonify({'erro': f'O campo {campo} é obrigatório'}), 400

        empresa = db.session.get(Empresa, dados['empresa_id'])
        if not empresa:
            return jsonify({'erro': 'Empresa associada não encontrada'}), 404

        ativo = Ativo(
            nome=dados['nome'],
            tag_identificacao=dados['tag_identificacao'],
            categoria=dados.get('categoria', 'outro'),
            fabricante=dados.get('fabricante'),
            modelo=dados.get('modelo'),
            numero_serie=dados.get('numero_serie'),
            dados_tecnicos=dados.get('dados_tecnicos', {}),
            localizacao=dados.get('localizacao'),
            data_instalacao=datetime.fromisoformat(dados['data_instalacao']).date() if dados.get('data_instalacao') else None,
            status=dados.get('status', 'ativo'),
            empresa_id=dados['empresa_id']
        )

        db.session.add(ativo)
        db.session.commit()
        return jsonify({'mensagem': 'Ativo criado com sucesso', 'ativo': ativo.to_dict()}), 201
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Erro ao criar ativo: {str(e)}")
        return jsonify({'erro': 'Erro ao criar ativo'}), 500


@ativos_bp.route('/<int:ativo_id>', methods=['PUT'])
@token_required
def atualizar_ativo(usuario_atual, ativo_id):
    try:
        ativo = db.session.get(Ativo, ativo_id)
        if not ativo:
            return jsonify({'erro': 'Ativo não encontrado'}), 404

        dados = request.get_json()

        campos_simples = ['nome', 'tag_identificacao', 'categoria', 'fabricante', 'modelo', 'numero_serie', 'dados_tecnicos', 'localizacao', 'status']
        for campo in campos_simples:
            if campo in dados:
                setattr(ativo, campo, dados[campo])

        if 'data_instalacao' in dados:
            ativo.data_instalacao = datetime.fromisoformat(dados['data_instalacao']).date() if dados['data_instalacao'] else None

        if 'empresa_id' in dados:
            empresa = db.session.get(Empresa, dados['empresa_id'])
            if not empresa:
                return jsonify({'erro': 'Empresa associada não encontrada'}), 404
            ativo.empresa_id = dados['empresa_id']

        db.session.commit()
        return jsonify({'mensagem': 'Ativo atualizado com sucesso', 'ativo': ativo.to_dict()}), 200
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Erro ao atualizar ativo: {str(e)}")
        return jsonify({'erro': 'Erro ao atualizar ativo'}), 500


@ativos_bp.route('/<int:ativo_id>', methods=['DELETE'])
@token_required
def excluir_ativo(usuario_atual, ativo_id):
    try:
        ativo = db.session.get(Ativo, ativo_id)
        if not ativo:
            return jsonify({'erro': 'Ativo não encontrado'}), 404

        db.session.delete(ativo)
        db.session.commit()
        return jsonify({'mensagem': 'Ativo excluído com sucesso'}), 200
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Erro ao excluir ativo: {str(e)}")
        return jsonify({'erro': 'Erro ao excluir ativo'}), 500

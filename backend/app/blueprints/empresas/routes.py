from flask import request, jsonify, current_app
from app import db
from app.models import Empresa, Contato
from app.blueprints.empresas import empresas_bp
from app.utils.decorators import token_required
from sqlalchemy import desc, or_


@empresas_bp.route('', methods=['GET'])
@token_required
def listar_empresas(usuario_atual):
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        busca = request.args.get('busca', '')
        ativo = request.args.get('ativo', None)

        query = Empresa.query

        if busca:
            query = query.filter(
                or_(
                    Empresa.razao_social.ilike(f'%{busca}%'),
                    Empresa.nome_fantasia.ilike(f'%{busca}%'),
                    Empresa.cnpj.ilike(f'%{busca}%'),
                )
            )

        if ativo is not None:
            query = query.filter(Empresa.ativo == (ativo.lower() == 'true'))

        query = query.order_by(desc(Empresa.data_criacao))
        pagination = query.paginate(page=page, per_page=per_page)

        return jsonify({
            'empresas': [e.to_dict() for e in pagination.items],
            'total': pagination.total,
            'pages': pagination.pages,
            'page': page,
            'per_page': per_page,
        }), 200
    except Exception as e:
        current_app.logger.error(f"Erro ao listar empresas: {str(e)}")
        return jsonify({'erro': 'Erro ao listar empresas'}), 500


@empresas_bp.route('/<int:empresa_id>', methods=['GET'])
@token_required
def obter_empresa(usuario_atual, empresa_id):
    try:
        empresa = db.session.get(Empresa, empresa_id)
        if not empresa:
            return jsonify({'erro': 'Empresa não encontrada'}), 404

        dados = empresa.to_dict()
        dados['contatos'] = [c.to_dict() for c in empresa.contatos.all()]
        return jsonify(dados), 200
    except Exception as e:
        current_app.logger.error(f"Erro ao obter empresa: {str(e)}")
        return jsonify({'erro': 'Erro ao obter empresa'}), 500


@empresas_bp.route('', methods=['POST'])
@token_required
def criar_empresa(usuario_atual):
    try:
        dados = request.get_json()

        if not dados.get('razao_social'):
            return jsonify({'erro': 'Razão social é obrigatória'}), 400

        empresa = Empresa(
            cnpj=dados.get('cnpj'),
            razao_social=dados['razao_social'],
            nome_fantasia=dados.get('nome_fantasia'),
            ramo=dados.get('ramo'),
            porte=dados.get('porte'),
            endereco=dados.get('endereco'),
            cidade=dados.get('cidade'),
            estado=dados.get('estado'),
            cep=dados.get('cep'),
            telefone=dados.get('telefone'),
            email=dados.get('email'),
            website=dados.get('website'),
            observacoes=dados.get('observacoes'),
        )

        db.session.add(empresa)
        db.session.commit()

        return jsonify({'mensagem': 'Empresa criada com sucesso', 'empresa': empresa.to_dict()}), 201
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Erro ao criar empresa: {str(e)}")
        return jsonify({'erro': 'Erro ao criar empresa'}), 500


@empresas_bp.route('/<int:empresa_id>', methods=['PUT'])
@token_required
def atualizar_empresa(usuario_atual, empresa_id):
    try:
        empresa = db.session.get(Empresa, empresa_id)
        if not empresa:
            return jsonify({'erro': 'Empresa não encontrada'}), 404

        dados = request.get_json()

        campos = ['cnpj', 'razao_social', 'nome_fantasia', 'ramo', 'porte',
                  'endereco', 'cidade', 'estado', 'cep', 'telefone',
                  'email', 'website', 'observacoes', 'ativo']
        for campo in campos:
            if campo in dados:
                setattr(empresa, campo, dados[campo])

        db.session.commit()
        return jsonify({'mensagem': 'Empresa atualizada', 'empresa': empresa.to_dict()}), 200
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Erro ao atualizar empresa: {str(e)}")
        return jsonify({'erro': 'Erro ao atualizar empresa'}), 500


@empresas_bp.route('/<int:empresa_id>', methods=['DELETE'])
@token_required
def excluir_empresa(usuario_atual, empresa_id):
    try:
        empresa = db.session.get(Empresa, empresa_id)
        if not empresa:
            return jsonify({'erro': 'Empresa não encontrada'}), 404

        empresa.ativo = False
        db.session.commit()
        return jsonify({'mensagem': 'Empresa desativada com sucesso'}), 200
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Erro ao excluir empresa: {str(e)}")
        return jsonify({'erro': 'Erro ao excluir empresa'}), 500


# --- Contatos ---

@empresas_bp.route('/<int:empresa_id>/contatos', methods=['GET'])
@token_required
def listar_contatos(usuario_atual, empresa_id):
    try:
        empresa = db.session.get(Empresa, empresa_id)
        if not empresa:
            return jsonify({'erro': 'Empresa não encontrada'}), 404

        contatos = Contato.query.filter_by(empresa_id=empresa_id).all()
        return jsonify([c.to_dict() for c in contatos]), 200
    except Exception as e:
        current_app.logger.error(f"Erro ao listar contatos: {str(e)}")
        return jsonify({'erro': 'Erro ao listar contatos'}), 500


@empresas_bp.route('/<int:empresa_id>/contatos', methods=['POST'])
@token_required
def criar_contato(usuario_atual, empresa_id):
    try:
        empresa = db.session.get(Empresa, empresa_id)
        if not empresa:
            return jsonify({'erro': 'Empresa não encontrada'}), 404

        dados = request.get_json()

        if not dados.get('nome'):
            return jsonify({'erro': 'Nome é obrigatório'}), 400

        contato = Contato(
            nome=dados['nome'],
            cargo=dados.get('cargo'),
            email=dados.get('email'),
            telefone=dados.get('telefone'),
            celular=dados.get('celular'),
            principal=dados.get('principal', False),
            observacoes=dados.get('observacoes'),
            empresa_id=empresa_id,
        )

        db.session.add(contato)
        db.session.commit()
        return jsonify({'mensagem': 'Contato criado', 'contato': contato.to_dict()}), 201
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Erro ao criar contato: {str(e)}")
        return jsonify({'erro': 'Erro ao criar contato'}), 500


@empresas_bp.route('/<int:empresa_id>/contatos/<int:contato_id>', methods=['PUT'])
@token_required
def atualizar_contato(usuario_atual, empresa_id, contato_id):
    try:
        contato = Contato.query.filter_by(id=contato_id, empresa_id=empresa_id).first()
        if not contato:
            return jsonify({'erro': 'Contato não encontrado'}), 404

        dados = request.get_json()
        campos = ['nome', 'cargo', 'email', 'telefone', 'celular', 'principal', 'observacoes']
        for campo in campos:
            if campo in dados:
                setattr(contato, campo, dados[campo])

        db.session.commit()
        return jsonify({'mensagem': 'Contato atualizado', 'contato': contato.to_dict()}), 200
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Erro ao atualizar contato: {str(e)}")
        return jsonify({'erro': 'Erro ao atualizar contato'}), 500


@empresas_bp.route('/<int:empresa_id>/contatos/<int:contato_id>', methods=['DELETE'])
@token_required
def excluir_contato(usuario_atual, empresa_id, contato_id):
    try:
        contato = Contato.query.filter_by(id=contato_id, empresa_id=empresa_id).first()
        if not contato:
            return jsonify({'erro': 'Contato não encontrado'}), 404

        db.session.delete(contato)
        db.session.commit()
        return jsonify({'mensagem': 'Contato excluído'}), 200
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Erro ao excluir contato: {str(e)}")
        return jsonify({'erro': 'Erro ao excluir contato'}), 500

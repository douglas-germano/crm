from flask import request, jsonify, current_app, send_file
from app import db
from app.domains.crm.models.empresa import Empresa
from app.domains.inspect.models.ativo import Ativo
from app.domains.inspect.models.contrato_amc import ContratoAMC
from app.domains.inspect.models.inspecao import Inspecao
from app.domains.inspect.models.template_checklist import TemplateChecklist
from app.domains.inspect.blueprints.inspecoes import inspecoes_bp
from app.utils.decorators import token_required
from app.utils.pdf_generator import gerar_pdf_laudo
from datetime import datetime, timezone, date
import io


# ─── TEMPLATES CHECKLIST ──────────────────────────────────────────────────────

@inspecoes_bp.route('/templates', methods=['GET'])
@token_required
def listar_templates(usuario_atual):
    try:
        regulacao = request.args.get('regulacao')
        query = TemplateChecklist.query

        if regulacao:
            query = query.filter(TemplateChecklist.regulacao == regulacao)

        templates = query.order_by(TemplateChecklist.nome).all()
        return jsonify([t.to_dict() for t in templates]), 200
    except Exception as e:
        current_app.logger.error(f"Erro ao listar templates: {str(e)}")
        return jsonify({'erro': 'Erro ao listar templates'}), 500


@inspecoes_bp.route('/templates/<int:template_id>', methods=['GET'])
@token_required
def obter_template(usuario_atual, template_id):
    try:
        template = db.session.get(TemplateChecklist, template_id)
        if not template:
            return jsonify({'erro': 'Template não encontrado'}), 404
        return jsonify(template.to_dict()), 200
    except Exception as e:
        current_app.logger.error(f"Erro ao obter template: {str(e)}")
        return jsonify({'erro': 'Erro ao obter template'}), 500


@inspecoes_bp.route('/templates/<int:template_id>', methods=['PUT'])
@token_required
def atualizar_template(usuario_atual, template_id):
    try:
        template = db.session.get(TemplateChecklist, template_id)
        if not template:
            return jsonify({'erro': 'Template não encontrado'}), 404

        dados = request.get_json()
        for campo in ['nome', 'regulacao', 'versao', 'ativo']:
            if campo in dados:
                setattr(template, campo, dados[campo])
        if 'itens' in dados:
            template.itens = dados['itens']

        db.session.commit()
        return jsonify({'mensagem': 'Template atualizado com sucesso', 'template': template.to_dict()}), 200
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Erro ao atualizar template: {str(e)}")
        return jsonify({'erro': 'Erro ao atualizar template'}), 500


@inspecoes_bp.route('/templates/<int:template_id>', methods=['DELETE'])
@token_required
def excluir_template(usuario_atual, template_id):
    try:
        template = db.session.get(TemplateChecklist, template_id)
        if not template:
            return jsonify({'erro': 'Template não encontrado'}), 404

        template.ativo = False
        db.session.commit()
        return jsonify({'mensagem': 'Template desativado com sucesso'}), 200
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Erro ao desativar template: {str(e)}")
        return jsonify({'erro': 'Erro ao desativar template'}), 500


@inspecoes_bp.route('/templates', methods=['POST'])
@token_required
def criar_template(usuario_atual):
    try:
        dados = request.get_json()
        if not dados.get('nome') or not dados.get('itens'):
            return jsonify({'erro': 'Nome e itens são obrigatórios'}), 400

        template = TemplateChecklist(
            nome=dados['nome'],
            regulacao=dados.get('regulacao', 'outro'),
            versao=dados.get('versao', '1.0'),
            itens=dados['itens'],
            ativo=dados.get('ativo', True)
        )

        db.session.add(template)
        db.session.commit()
        return jsonify({'mensagem': 'Template criado com sucesso', 'template': template.to_dict()}), 201
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Erro ao criar template: {str(e)}")
        return jsonify({'erro': 'Erro ao criar template'}), 500


# ─── CONTRATOS AMC ────────────────────────────────────────────────────────────

@inspecoes_bp.route('/contratos-amc', methods=['GET'])
@token_required
def listar_contratos_amc(usuario_atual):
    try:
        empresa_id = request.args.get('empresa_id', type=int)
        status = request.args.get('status')

        query = ContratoAMC.query

        if empresa_id:
            query = query.filter(ContratoAMC.empresa_id == empresa_id)
        if status:
            query = query.filter(ContratoAMC.status == status)

        contratos = query.order_by(ContratoAMC.data_inicio.desc()).all()
        return jsonify([c.to_dict() for c in contratos]), 200
    except Exception as e:
        current_app.logger.error(f"Erro ao listar contratos AMC: {str(e)}")
        return jsonify({'erro': 'Erro ao listar contratos AMC'}), 500


@inspecoes_bp.route('/contratos-amc', methods=['POST'])
@token_required
def criar_contrato_amc(usuario_atual):
    try:
        dados = request.get_json()
        campos_obrigatorios = ['titulo', 'empresa_id', 'data_inicio']
        for campo in campos_obrigatorios:
            if not dados.get(campo):
                return jsonify({'erro': f'O campo {campo} é obrigatório'}), 400

        empresa = db.session.get(Empresa, dados['empresa_id'])
        if not empresa:
            return jsonify({'erro': 'Empresa associada não encontrada'}), 404

        contrato = ContratoAMC(
            titulo=dados['titulo'],
            plano=dados.get('plano', 'mensal'),
            valor_recorrente=dados.get('valor_recorrente', 0.0),
            data_inicio=datetime.fromisoformat(dados['data_inicio']).date(),
            data_fim=datetime.fromisoformat(dados['data_fim']).date() if dados.get('data_fim') else None,
            status=dados.get('status', 'ativo'),
            empresa_id=dados['empresa_id']
        )

        db.session.add(contrato)
        db.session.commit()
        return jsonify({'mensagem': 'Contrato AMC criado com sucesso', 'contrato': contrato.to_dict()}), 201
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Erro ao criar contrato AMC: {str(e)}")
        return jsonify({'erro': 'Erro ao criar contrato AMC'}), 500


@inspecoes_bp.route('/contratos-amc/<int:contrato_id>', methods=['PUT'])
@token_required
def atualizar_contrato_amc(usuario_atual, contrato_id):
    try:
        contrato = db.session.get(ContratoAMC, contrato_id)
        if not contrato:
            return jsonify({'erro': 'Contrato AMC não encontrado'}), 404

        dados = request.get_json()
        for campo in ['titulo', 'plano', 'valor_recorrente', 'status']:
            if campo in dados:
                setattr(contrato, campo, dados[campo])
        if 'data_inicio' in dados and dados['data_inicio']:
            contrato.data_inicio = datetime.fromisoformat(dados['data_inicio']).date()
        if 'data_fim' in dados:
            contrato.data_fim = datetime.fromisoformat(dados['data_fim']).date() if dados['data_fim'] else None
        if 'empresa_id' in dados:
            empresa = db.session.get(Empresa, dados['empresa_id'])
            if not empresa:
                return jsonify({'erro': 'Empresa não encontrada'}), 404
            contrato.empresa_id = dados['empresa_id']

        db.session.commit()
        return jsonify({'mensagem': 'Contrato AMC atualizado com sucesso', 'contrato': contrato.to_dict()}), 200
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Erro ao atualizar contrato AMC: {str(e)}")
        return jsonify({'erro': 'Erro ao atualizar contrato AMC'}), 500


@inspecoes_bp.route('/contratos-amc/<int:contrato_id>', methods=['DELETE'])
@token_required
def excluir_contrato_amc(usuario_atual, contrato_id):
    try:
        contrato = db.session.get(ContratoAMC, contrato_id)
        if not contrato:
            return jsonify({'erro': 'Contrato AMC não encontrado'}), 404

        db.session.delete(contrato)
        db.session.commit()
        return jsonify({'mensagem': 'Contrato AMC excluído com sucesso'}), 200
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Erro ao excluir contrato AMC: {str(e)}")
        return jsonify({'erro': 'Erro ao excluir contrato AMC'}), 500


# ─── INSPEÇÕES ────────────────────────────────────────────────────────────────

@inspecoes_bp.route('', methods=['GET'])
@token_required
def listar_inspecoes(usuario_atual):
    try:
        status = request.args.get('status')
        ativo_id = request.args.get('ativo_id', type=int)
        contrato_amc_id = request.args.get('contrato_amc_id', type=int)
        empresa_id = request.args.get('empresa_id', type=int)

        query = Inspecao.query

        if status:
            status_list = [item.strip() for item in status.split(',') if item.strip()]
            if len(status_list) > 1:
                query = query.filter(Inspecao.status.in_(status_list))
            else:
                query = query.filter(Inspecao.status == status)
        if ativo_id:
            query = query.filter(Inspecao.ativo_id == ativo_id)
        if contrato_amc_id:
            query = query.filter(Inspecao.contrato_amc_id == contrato_amc_id)
        if empresa_id:
            query = query.join(Ativo).filter(Ativo.empresa_id == empresa_id)

        inspecoes = query.order_by(Inspecao.data_inspecao.desc()).all()
        return jsonify([i.to_dict() for i in inspecoes]), 200
    except Exception as e:
        current_app.logger.error(f"Erro ao listar inspeções: {str(e)}")
        return jsonify({'erro': 'Erro ao listar inspeções'}), 500


@inspecoes_bp.route('/<int:inspecao_id>', methods=['GET'])
@token_required
def obter_inspecao(usuario_atual, inspecao_id):
    try:
        inspecao = db.session.get(Inspecao, inspecao_id)
        if not inspecao:
            return jsonify({'erro': 'Inspeção não encontrada'}), 404
        return jsonify(inspecao.to_dict()), 200
    except Exception as e:
        current_app.logger.error(f"Erro ao obter inspeção: {str(e)}")
        return jsonify({'erro': 'Erro ao obter inspeção'}), 500


@inspecoes_bp.route('', methods=['POST'])
@token_required
def agendar_inspecao(usuario_atual):
    try:
        dados = request.get_json()
        campos_obrigatorios = ['ativo_id', 'template_id', 'data_inspecao']
        for campo in campos_obrigatorios:
            if not dados.get(campo):
                return jsonify({'erro': f'O campo {campo} é obrigatório'}), 400

        ativo = db.session.get(Ativo, dados['ativo_id'])
        if not ativo:
            return jsonify({'erro': 'Ativo associado não encontrado'}), 404

        template = db.session.get(TemplateChecklist, dados['template_id'])
        if not template:
            return jsonify({'erro': 'Template de checklist não encontrado'}), 404

        if dados.get('contrato_amc_id'):
            contrato = db.session.get(ContratoAMC, dados['contrato_amc_id'])
            if not contrato:
                return jsonify({'erro': 'Contrato AMC não encontrado'}), 404

        inspecao = Inspecao(
            ativo_id=dados['ativo_id'],
            template_id=dados['template_id'],
            contrato_amc_id=dados.get('contrato_amc_id'),
            data_inspecao=datetime.fromisoformat(dados['data_inspecao']).date(),
            status='agendada',
            inspetor_id=dados.get('inspetor_id', usuario_atual.id),
            criado_por_id=usuario_atual.id
        )

        db.session.add(inspecao)
        db.session.commit()
        return jsonify({'mensagem': 'Inspeção agendada com sucesso', 'inspecao': inspecao.to_dict()}), 201
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Erro ao agendar inspeção: {str(e)}")
        return jsonify({'erro': 'Erro ao agendar inspeção'}), 500


@inspecoes_bp.route('/<int:inspecao_id>/campo', methods=['PUT'])
@token_required
def preencher_checklist_campo(usuario_atual, inspecao_id):
    try:
        inspecao = db.session.get(Inspecao, inspecao_id)
        if not inspecao:
            return jsonify({'erro': 'Inspeção não encontrada'}), 404

        dados = request.get_json()
        if not dados.get('respostas'):
            return jsonify({'erro': 'Respostas do checklist são obrigatórias'}), 400

        inspecao.respostas = dados['respostas']
        inspecao.observacoes_gerais = dados.get('observacoes_gerais', '')
        inspecao.art_numero = dados.get('art_numero', inspecao.art_numero)
        inspecao.status = 'concluida'
        inspecao.data_realizacao = datetime.now(timezone.utc)
        inspecao.inspetor_id = usuario_atual.id

        db.session.commit()
        return jsonify({'mensagem': 'Inspeção concluída com sucesso', 'inspecao': inspecao.to_dict()}), 200
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Erro ao preencher inspeção no campo: {str(e)}")
        return jsonify({'erro': 'Erro ao preencher inspeção'}), 500


# ─── GERAÇÃO DE PDF ───────────────────────────────────────────────────────────

@inspecoes_bp.route('/<int:inspecao_id>/pdf', methods=['GET'])
@token_required
def obter_pdf_laudo(usuario_atual, inspecao_id):
    try:
        inspecao = db.session.get(Inspecao, inspecao_id)
        if not inspecao:
            return jsonify({'erro': 'Inspeção não encontrada'}), 404

        if inspecao.status != 'concluida':
            return jsonify({'erro': 'Não é possível baixar laudo de inspeção não concluída'}), 400

        pdf_buffer = gerar_pdf_laudo(inspecao)

        return send_file(
            pdf_buffer,
            mimetype='application/pdf',
            as_attachment=True,
            download_name=f"laudo_inspecao_{inspecao.ativo.tag_identificacao}_{inspecao.data_realizacao.strftime('%Y%m%d')}.pdf"
        )
    except Exception as e:
        current_app.logger.error(f"Erro ao gerar laudo em PDF: {str(e)}")
        import traceback
        current_app.logger.error(traceback.format_exc())
        return jsonify({'erro': 'Erro ao gerar PDF do laudo'}), 500

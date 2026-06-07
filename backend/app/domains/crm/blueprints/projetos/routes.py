from flask import request, jsonify, current_app
from app import db
from app.domains.core.models import Usuario
from app.domains.crm.models.empresa import Empresa
from app.domains.crm.models.negocio import Negocio
from app.domains.crm.models.projeto import Projeto
from app.domains.crm.models.tarefa import ChecklistItem, ComentarioTarefa, Tarefa
from app.utils.decorators import token_required
from app.utils.validadores import validar_campos
from datetime import datetime, timezone
import traceback

from app.domains.crm.blueprints.projetos import projetos_bp


# ─── PROJETOS ────────────────────────────────────────────────────────────────

@projetos_bp.route('', methods=['GET'])
@token_required
def listar_projetos(usuario_atual):
    try:
        status = request.args.get('status')
        prioridade = request.args.get('prioridade')
        gerente_id = request.args.get('gerente_id', type=int)
        empresa_id = request.args.get('empresa_id', type=int)
        busca = request.args.get('busca')

        query = Projeto.query

        if status:
            query = query.filter(Projeto.status == status)
        if prioridade:
            query = query.filter(Projeto.prioridade == prioridade)
        if gerente_id:
            query = query.filter(Projeto.gerente_id == gerente_id)
        if empresa_id:
            query = query.filter(Projeto.empresa_id == empresa_id)
        if busca:
            query = query.filter(Projeto.nome.ilike(f'%{busca}%'))

        query = query.order_by(Projeto.data_atualizacao.desc())
        projetos = query.all()

        return jsonify([p.to_dict() for p in projetos]), 200

    except Exception as e:
        current_app.logger.error(f"Erro ao listar projetos: {str(e)}")
        return jsonify({"erro": "Erro ao listar projetos"}), 500


@projetos_bp.route('/<int:projeto_id>', methods=['GET'])
@token_required
def obter_projeto(usuario_atual, projeto_id):
    try:
        projeto = db.session.get(Projeto, projeto_id)
        if not projeto:
            return jsonify({"erro": "Projeto não encontrado"}), 404

        return jsonify(projeto.to_dict(incluir_tarefas=True)), 200

    except Exception as e:
        current_app.logger.error(f"Erro ao obter projeto: {str(e)}")
        return jsonify({"erro": "Erro ao obter projeto"}), 500


@projetos_bp.route('', methods=['POST'])
@token_required
def criar_projeto(usuario_atual):
    try:
        dados = request.json

        campos_obrigatorios = ['nome']
        mensagens_erro = validar_campos(dados, campos_obrigatorios)
        if mensagens_erro:
            return jsonify({"erro": "Campos obrigatórios ausentes", "campos": mensagens_erro}), 400

        if dados.get('negocio_id'):
            if not db.session.get(Negocio, dados['negocio_id']):
                return jsonify({"erro": "Negócio não encontrado"}), 404

        if dados.get('empresa_id'):
            if not db.session.get(Empresa, dados['empresa_id']):
                return jsonify({"erro": "Empresa não encontrada"}), 404

        if dados.get('gerente_id'):
            if not db.session.get(Usuario, dados['gerente_id']):
                return jsonify({"erro": "Gerente não encontrado"}), 404

        projeto = Projeto(
            nome=dados['nome'],
            descricao=dados.get('descricao', ''),
            status=dados.get('status', 'planejamento'),
            prioridade=dados.get('prioridade', 'media'),
            data_inicio=datetime.fromisoformat(dados['data_inicio']).date() if dados.get('data_inicio') else None,
            data_previsao_fim=datetime.fromisoformat(dados['data_previsao_fim']).date() if dados.get('data_previsao_fim') else None,
            valor_contrato=dados.get('valor_contrato', 0.0),
            negocio_id=dados.get('negocio_id'),
            empresa_id=dados.get('empresa_id'),
            gerente_id=dados.get('gerente_id', usuario_atual.id),
            criado_por_id=usuario_atual.id,
        )

        db.session.add(projeto)
        db.session.commit()

        return jsonify(projeto.to_dict()), 201

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Erro ao criar projeto: {str(e)}")
        current_app.logger.error(traceback.format_exc())
        return jsonify({"erro": "Erro ao criar projeto"}), 500


@projetos_bp.route('/<int:projeto_id>', methods=['PUT'])
@token_required
def atualizar_projeto(usuario_atual, projeto_id):
    try:
        dados = request.json
        projeto = db.session.get(Projeto, projeto_id)
        if not projeto:
            return jsonify({"erro": "Projeto não encontrado"}), 404

        campos_simples = ['nome', 'descricao', 'status', 'prioridade', 'valor_contrato']
        for campo in campos_simples:
            if campo in dados:
                setattr(projeto, campo, dados[campo])

        if 'data_inicio' in dados:
            projeto.data_inicio = datetime.fromisoformat(dados['data_inicio']).date() if dados['data_inicio'] else None
        if 'data_previsao_fim' in dados:
            projeto.data_previsao_fim = datetime.fromisoformat(dados['data_previsao_fim']).date() if dados['data_previsao_fim'] else None
        if 'data_fim' in dados:
            projeto.data_fim = datetime.fromisoformat(dados['data_fim']).date() if dados['data_fim'] else None

        if 'gerente_id' in dados:
            if dados['gerente_id'] and not db.session.get(Usuario, dados['gerente_id']):
                return jsonify({"erro": "Gerente não encontrado"}), 404
            projeto.gerente_id = dados['gerente_id']

        if 'empresa_id' in dados:
            if dados['empresa_id'] and not db.session.get(Empresa, dados['empresa_id']):
                return jsonify({"erro": "Empresa não encontrada"}), 404
            projeto.empresa_id = dados['empresa_id']

        if 'negocio_id' in dados:
            if dados['negocio_id'] and not db.session.get(Negocio, dados['negocio_id']):
                return jsonify({"erro": "Negócio não encontrado"}), 404
            projeto.negocio_id = dados['negocio_id']

        if dados.get('status') == 'concluido' and projeto.status != 'concluido':
            projeto.data_fim = datetime.now(timezone.utc).date()

        db.session.commit()

        return jsonify(projeto.to_dict()), 200

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Erro ao atualizar projeto: {str(e)}")
        return jsonify({"erro": "Erro ao atualizar projeto"}), 500


@projetos_bp.route('/<int:projeto_id>', methods=['DELETE'])
@token_required
def excluir_projeto(usuario_atual, projeto_id):
    try:
        projeto = db.session.get(Projeto, projeto_id)
        if not projeto:
            return jsonify({"erro": "Projeto não encontrado"}), 404

        db.session.delete(projeto)
        db.session.commit()

        return jsonify({"mensagem": "Projeto excluído com sucesso"}), 200

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Erro ao excluir projeto: {str(e)}")
        return jsonify({"erro": "Erro ao excluir projeto"}), 500


@projetos_bp.route('/estatisticas', methods=['GET'])
@token_required
def obter_estatisticas(usuario_atual):
    try:
        from sqlalchemy import func

        total = Projeto.query.count()
        por_status = {}
        for status in ['planejamento', 'em_andamento', 'pausado', 'concluido', 'cancelado']:
            por_status[status] = Projeto.query.filter_by(status=status).count()

        valor_total = db.session.query(func.sum(Projeto.valor_contrato)).scalar() or 0
        valor_em_andamento = db.session.query(func.sum(Projeto.valor_contrato)).filter(
            Projeto.status == 'em_andamento'
        ).scalar() or 0

        return jsonify({
            'total': total,
            'por_status': por_status,
            'valor_total': float(valor_total),
            'valor_em_andamento': float(valor_em_andamento),
        }), 200

    except Exception as e:
        current_app.logger.error(f"Erro ao obter estatísticas: {str(e)}")
        return jsonify({"erro": "Erro ao obter estatísticas"}), 500


# ─── TAREFAS ─────────────────────────────────────────────────────────────────

@projetos_bp.route('/<int:projeto_id>/tarefas', methods=['GET'])
@token_required
def listar_tarefas(usuario_atual, projeto_id):
    try:
        projeto = db.session.get(Projeto, projeto_id)
        if not projeto:
            return jsonify({"erro": "Projeto não encontrado"}), 404

        tarefas = Tarefa.query.filter_by(
            projeto_id=projeto_id,
            tarefa_pai_id=None
        ).order_by(Tarefa.ordem).all()

        return jsonify([t.to_dict() for t in tarefas]), 200

    except Exception as e:
        current_app.logger.error(f"Erro ao listar tarefas: {str(e)}")
        return jsonify({"erro": "Erro ao listar tarefas"}), 500


@projetos_bp.route('/<int:projeto_id>/tarefas', methods=['POST'])
@token_required
def criar_tarefa(usuario_atual, projeto_id):
    try:
        dados = request.json

        projeto = db.session.get(Projeto, projeto_id)
        if not projeto:
            return jsonify({"erro": "Projeto não encontrado"}), 404

        campos_obrigatorios = ['titulo']
        mensagens_erro = validar_campos(dados, campos_obrigatorios)
        if mensagens_erro:
            return jsonify({"erro": "Campos obrigatórios ausentes", "campos": mensagens_erro}), 400

        max_ordem = db.session.query(db.func.max(Tarefa.ordem)).filter_by(
            projeto_id=projeto_id,
            status=dados.get('status', 'a_fazer')
        ).scalar() or 0

        tarefa = Tarefa(
            titulo=dados['titulo'],
            descricao=dados.get('descricao', ''),
            status=dados.get('status', 'a_fazer'),
            prioridade=dados.get('prioridade', 'media'),
            data_inicio=datetime.fromisoformat(dados['data_inicio']).date() if dados.get('data_inicio') else None,
            data_prazo=datetime.fromisoformat(dados['data_prazo']).date() if dados.get('data_prazo') else None,
            ordem=max_ordem + 1,
            projeto_id=projeto_id,
            responsavel_id=dados.get('responsavel_id'),
            tarefa_pai_id=dados.get('tarefa_pai_id'),
        )

        db.session.add(tarefa)

        if dados.get('checklist'):
            for i, item_texto in enumerate(dados['checklist']):
                item = ChecklistItem(
                    descricao=item_texto if isinstance(item_texto, str) else item_texto.get('descricao', ''),
                    concluido=False if isinstance(item_texto, str) else item_texto.get('concluido', False),
                    ordem=i,
                    tarefa=tarefa,
                )
                db.session.add(item)

        db.session.commit()

        projeto.atualizar_percentual()
        db.session.commit()

        return jsonify(tarefa.to_dict()), 201

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Erro ao criar tarefa: {str(e)}")
        current_app.logger.error(traceback.format_exc())
        return jsonify({"erro": "Erro ao criar tarefa"}), 500


@projetos_bp.route('/<int:projeto_id>/tarefas/<int:tarefa_id>', methods=['PUT'])
@token_required
def atualizar_tarefa(usuario_atual, projeto_id, tarefa_id):
    try:
        dados = request.json

        tarefa = Tarefa.query.filter_by(id=tarefa_id, projeto_id=projeto_id).first()
        if not tarefa:
            return jsonify({"erro": "Tarefa não encontrada"}), 404

        campos_simples = ['titulo', 'descricao', 'status', 'prioridade', 'ordem']
        for campo in campos_simples:
            if campo in dados:
                setattr(tarefa, campo, dados[campo])

        if 'data_inicio' in dados:
            tarefa.data_inicio = datetime.fromisoformat(dados['data_inicio']).date() if dados['data_inicio'] else None
        if 'data_prazo' in dados:
            tarefa.data_prazo = datetime.fromisoformat(dados['data_prazo']).date() if dados['data_prazo'] else None
        if 'responsavel_id' in dados:
            tarefa.responsavel_id = dados['responsavel_id']

        if dados.get('status') == 'concluida' and tarefa.status != 'concluida':
            tarefa.data_conclusao = datetime.now(timezone.utc)
        elif dados.get('status') and dados['status'] != 'concluida':
            tarefa.data_conclusao = None

        db.session.commit()

        projeto = db.session.get(Projeto, projeto_id)
        if projeto:
            projeto.atualizar_percentual()
            db.session.commit()

        return jsonify(tarefa.to_dict()), 200

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Erro ao atualizar tarefa: {str(e)}")
        return jsonify({"erro": "Erro ao atualizar tarefa"}), 500


@projetos_bp.route('/<int:projeto_id>/tarefas/<int:tarefa_id>', methods=['DELETE'])
@token_required
def excluir_tarefa(usuario_atual, projeto_id, tarefa_id):
    try:
        tarefa = Tarefa.query.filter_by(id=tarefa_id, projeto_id=projeto_id).first()
        if not tarefa:
            return jsonify({"erro": "Tarefa não encontrada"}), 404

        db.session.delete(tarefa)
        db.session.commit()

        projeto = db.session.get(Projeto, projeto_id)
        if projeto:
            projeto.atualizar_percentual()
            db.session.commit()

        return jsonify({"mensagem": "Tarefa excluída com sucesso"}), 200

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Erro ao excluir tarefa: {str(e)}")
        return jsonify({"erro": "Erro ao excluir tarefa"}), 500


@projetos_bp.route('/<int:projeto_id>/tarefas/reordenar', methods=['PUT'])
@token_required
def reordenar_tarefas(usuario_atual, projeto_id):
    try:
        dados = request.json

        projeto = db.session.get(Projeto, projeto_id)
        if not projeto:
            return jsonify({"erro": "Projeto não encontrado"}), 404

        for item in dados.get('tarefas', []):
            tarefa = Tarefa.query.filter_by(id=item['id'], projeto_id=projeto_id).first()
            if tarefa:
                tarefa.status = item.get('status', tarefa.status)
                tarefa.ordem = item.get('ordem', tarefa.ordem)

                if item.get('status') == 'concluida' and tarefa.data_conclusao is None:
                    tarefa.data_conclusao = datetime.now(timezone.utc)
                elif item.get('status') and item['status'] != 'concluida':
                    tarefa.data_conclusao = None

        db.session.commit()

        projeto.atualizar_percentual()
        db.session.commit()

        return jsonify({"mensagem": "Tarefas reordenadas com sucesso"}), 200

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Erro ao reordenar tarefas: {str(e)}")
        return jsonify({"erro": "Erro ao reordenar tarefas"}), 500


# ─── CHECKLIST ───────────────────────────────────────────────────────────────

@projetos_bp.route('/<int:projeto_id>/tarefas/<int:tarefa_id>/checklist', methods=['PUT'])
@token_required
def atualizar_checklist(usuario_atual, projeto_id, tarefa_id):
    try:
        dados = request.json

        tarefa = Tarefa.query.filter_by(id=tarefa_id, projeto_id=projeto_id).first()
        if not tarefa:
            return jsonify({"erro": "Tarefa não encontrada"}), 404

        ChecklistItem.query.filter_by(tarefa_id=tarefa_id).delete()

        for i, item_data in enumerate(dados.get('items', [])):
            item = ChecklistItem(
                descricao=item_data.get('descricao', ''),
                concluido=item_data.get('concluido', False),
                ordem=i,
                tarefa_id=tarefa_id,
            )
            db.session.add(item)

        db.session.commit()

        return jsonify(tarefa.to_dict()), 200

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Erro ao atualizar checklist: {str(e)}")
        return jsonify({"erro": "Erro ao atualizar checklist"}), 500


# ─── COMENTÁRIOS ─────────────────────────────────────────────────────────────

@projetos_bp.route('/<int:projeto_id>/tarefas/<int:tarefa_id>/comentarios', methods=['GET'])
@token_required
def listar_comentarios(usuario_atual, projeto_id, tarefa_id):
    try:
        tarefa = Tarefa.query.filter_by(id=tarefa_id, projeto_id=projeto_id).first()
        if not tarefa:
            return jsonify({"erro": "Tarefa não encontrada"}), 404

        comentarios = ComentarioTarefa.query.filter_by(
            tarefa_id=tarefa_id
        ).order_by(ComentarioTarefa.data_criacao.asc()).all()

        return jsonify([c.to_dict() for c in comentarios]), 200

    except Exception as e:
        current_app.logger.error(f"Erro ao listar comentários: {str(e)}")
        return jsonify({"erro": "Erro ao listar comentários"}), 500


@projetos_bp.route('/<int:projeto_id>/tarefas/<int:tarefa_id>/comentarios', methods=['POST'])
@token_required
def criar_comentario(usuario_atual, projeto_id, tarefa_id):
    try:
        dados = request.json

        tarefa = Tarefa.query.filter_by(id=tarefa_id, projeto_id=projeto_id).first()
        if not tarefa:
            return jsonify({"erro": "Tarefa não encontrada"}), 404

        campos_obrigatorios = ['conteudo']
        mensagens_erro = validar_campos(dados, campos_obrigatorios)
        if mensagens_erro:
            return jsonify({"erro": "Campos obrigatórios ausentes", "campos": mensagens_erro}), 400

        comentario = ComentarioTarefa(
            conteudo=dados['conteudo'],
            tarefa_id=tarefa_id,
            autor_id=usuario_atual.id,
        )

        db.session.add(comentario)
        db.session.commit()

        return jsonify(comentario.to_dict()), 201

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Erro ao criar comentário: {str(e)}")
        return jsonify({"erro": "Erro ao criar comentário"}), 500


@projetos_bp.route('/<int:projeto_id>/tarefas/<int:tarefa_id>/comentarios/<int:comentario_id>', methods=['DELETE'])
@token_required
def excluir_comentario(usuario_atual, projeto_id, tarefa_id, comentario_id):
    try:
        comentario = ComentarioTarefa.query.filter_by(
            id=comentario_id,
            tarefa_id=tarefa_id
        ).first()

        if not comentario:
            return jsonify({"erro": "Comentário não encontrado"}), 404

        if comentario.autor_id != usuario_atual.id:
            return jsonify({"erro": "Você não pode excluir este comentário"}), 403

        db.session.delete(comentario)
        db.session.commit()

        return jsonify({"mensagem": "Comentário excluído com sucesso"}), 200

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Erro ao excluir comentário: {str(e)}")
        return jsonify({"erro": "Erro ao excluir comentário"}), 500

from flask import request, jsonify, current_app
from app import db
from app.domains.core.models.usuario import Usuario
from app.domains.crm.models.empresa import Empresa
from app.domains.crm.models.negocio import Negocio
from app.domains.crm.models.projeto import Projeto
from app.domains.inspect.blueprints.ordens import ordens_bp
from app.domains.inspect.models.ativo import Ativo
from app.domains.inspect.models.contrato_amc import ContratoAMC
from app.domains.inspect.models.inspecao import Inspecao
from app.domains.inspect.models.ordem_servico import (
    ApontamentoHora,
    AssinaturaCampo,
    EvidenciaCampo,
    ExecucaoCampo,
    MaterialUtilizado,
    OrdemServico,
    RelatorioTecnico,
)
from app.utils.decorators import token_required
from datetime import datetime, timezone


def _parse_datetime(valor):
    if not valor:
        return None
    if isinstance(valor, datetime):
        return valor
    return datetime.fromisoformat(str(valor).replace('Z', '+00:00'))


def _gerar_codigo_os():
    ano = datetime.now(timezone.utc).year
    prefixo = f'INS-{ano}-'
    ultima_ordem = (
        OrdemServico.query
        .filter(OrdemServico.codigo.like(f'{prefixo}%'))
        .order_by(OrdemServico.id.desc())
        .first()
    )
    if not ultima_ordem or not ultima_ordem.codigo:
        proximo_numero = 1
    else:
        try:
            proximo_numero = int(ultima_ordem.codigo.rsplit('-', 1)[-1]) + 1
        except ValueError:
            proximo_numero = 1
    return f'{prefixo}{proximo_numero:05d}'


def _obter_ordem(ordem_id):
    ordem = db.session.get(OrdemServico, ordem_id)
    if not ordem:
        return None, (jsonify({'erro': 'Ordem de serviço não encontrada'}), 404)
    return ordem, None


def _validar_relacionamentos(dados):
    empresa = db.session.get(Empresa, dados.get('empresa_id'))
    if not empresa:
        return {'erro': 'Empresa associada não encontrada'}, 404

    validacoes = (
        ('ativo_id', Ativo, 'Ativo associado não encontrado'),
        ('contrato_amc_id', ContratoAMC, 'Contrato AMC não encontrado'),
        ('projeto_id', Projeto, 'Projeto associado não encontrado'),
        ('negocio_id', Negocio, 'Negócio associado não encontrado'),
        ('responsavel_id', Usuario, 'Responsável não encontrado'),
    )

    for campo, modelo, mensagem in validacoes:
        if dados.get(campo) and not db.session.get(modelo, dados[campo]):
            return {'erro': mensagem}, 404

    return None, None


def _execucao_ativa(ordem):
    return (
        ExecucaoCampo.query
        .filter(
            ExecucaoCampo.ordem_servico_id == ordem.id,
            ExecucaoCampo.status.in_(['em_andamento', 'pausada'])
        )
        .order_by(ExecucaoCampo.data_inicio.desc())
        .first()
    )


@ordens_bp.route('', methods=['GET'])
@token_required
def listar_ordens(usuario_atual):
    try:
        query = OrdemServico.query

        filtros = {
            'status': OrdemServico.status,
            'tipo': OrdemServico.tipo,
            'prioridade': OrdemServico.prioridade,
            'empresa_id': OrdemServico.empresa_id,
            'ativo_id': OrdemServico.ativo_id,
            'contrato_amc_id': OrdemServico.contrato_amc_id,
            'responsavel_id': OrdemServico.responsavel_id,
        }

        for parametro, coluna in filtros.items():
            valor = request.args.get(parametro)
            if valor:
                query = query.filter(coluna == valor)

        data_inicio = _parse_datetime(request.args.get('data_inicio'))
        data_fim = _parse_datetime(request.args.get('data_fim'))
        if data_inicio:
            query = query.filter(OrdemServico.data_agendada >= data_inicio)
        if data_fim:
            query = query.filter(OrdemServico.data_agendada <= data_fim)

        ordens = query.order_by(OrdemServico.data_agendada.asc(), OrdemServico.id.desc()).all()
        return jsonify([ordem.to_dict() for ordem in ordens]), 200
    except Exception as e:
        current_app.logger.error(f"Erro ao listar ordens de serviço: {str(e)}")
        return jsonify({'erro': 'Erro ao listar ordens de serviço'}), 500


@ordens_bp.route('/<int:ordem_id>', methods=['GET'])
@token_required
def obter_ordem(usuario_atual, ordem_id):
    try:
        ordem, erro = _obter_ordem(ordem_id)
        if erro:
            return erro
        return jsonify(ordem.to_dict(incluir_relacionamentos=True)), 200
    except Exception as e:
        current_app.logger.error(f"Erro ao obter ordem de serviço: {str(e)}")
        return jsonify({'erro': 'Erro ao obter ordem de serviço'}), 500


@ordens_bp.route('', methods=['POST'])
@token_required
def criar_ordem(usuario_atual):
    try:
        dados = request.get_json() or {}
        if not dados.get('titulo') or not dados.get('empresa_id'):
            return jsonify({'erro': 'Título e empresa são obrigatórios'}), 400

        erro, status_code = _validar_relacionamentos(dados)
        if erro:
            return jsonify(erro), status_code

        inspecao = None
        if dados.get('inspecao_id'):
            inspecao = db.session.get(Inspecao, dados['inspecao_id'])
            if not inspecao:
                return jsonify({'erro': 'Inspeção associada não encontrada'}), 404

        ordem = OrdemServico(
            codigo=dados.get('codigo') or _gerar_codigo_os(),
            titulo=dados['titulo'],
            tipo=dados.get('tipo', 'inspecao'),
            status=dados.get('status', 'planejada'),
            prioridade=dados.get('prioridade', 'normal'),
            descricao=dados.get('descricao'),
            escopo=dados.get('escopo'),
            endereco_atendimento=dados.get('endereco_atendimento'),
            latitude=dados.get('latitude'),
            longitude=dados.get('longitude'),
            data_agendada=_parse_datetime(dados.get('data_agendada')),
            observacoes_internas=dados.get('observacoes_internas'),
            observacoes_cliente=dados.get('observacoes_cliente'),
            empresa_id=dados['empresa_id'],
            ativo_id=dados.get('ativo_id'),
            contrato_amc_id=dados.get('contrato_amc_id'),
            projeto_id=dados.get('projeto_id'),
            negocio_id=dados.get('negocio_id'),
            responsavel_id=dados.get('responsavel_id', usuario_atual.id),
            criado_por_id=usuario_atual.id,
        )

        db.session.add(ordem)
        db.session.flush()

        if inspecao:
            inspecao.ordem_servico_id = ordem.id

        db.session.commit()
        return jsonify({'mensagem': 'Ordem de serviço criada com sucesso', 'ordem': ordem.to_dict()}), 201
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Erro ao criar ordem de serviço: {str(e)}")
        return jsonify({'erro': 'Erro ao criar ordem de serviço'}), 500


@ordens_bp.route('/<int:ordem_id>', methods=['PUT'])
@token_required
def atualizar_ordem(usuario_atual, ordem_id):
    try:
        ordem, erro = _obter_ordem(ordem_id)
        if erro:
            return erro

        dados = request.get_json() or {}
        dados_validacao = {'empresa_id': dados.get('empresa_id', ordem.empresa_id), **dados}
        erro, status_code = _validar_relacionamentos(dados_validacao)
        if erro:
            return jsonify(erro), status_code

        campos_simples = [
            'codigo', 'titulo', 'tipo', 'status', 'prioridade', 'descricao', 'escopo',
            'endereco_atendimento', 'latitude', 'longitude', 'observacoes_internas',
            'observacoes_cliente', 'empresa_id', 'ativo_id', 'contrato_amc_id',
            'projeto_id', 'negocio_id', 'responsavel_id'
        ]
        for campo in campos_simples:
            if campo in dados:
                setattr(ordem, campo, dados[campo])

        for campo_data in ['data_agendada', 'data_inicio', 'data_fim']:
            if campo_data in dados:
                setattr(ordem, campo_data, _parse_datetime(dados[campo_data]))

        db.session.commit()
        return jsonify({'mensagem': 'Ordem de serviço atualizada com sucesso', 'ordem': ordem.to_dict()}), 200
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Erro ao atualizar ordem de serviço: {str(e)}")
        return jsonify({'erro': 'Erro ao atualizar ordem de serviço'}), 500


@ordens_bp.route('/<int:ordem_id>/cancelar', methods=['POST'])
@token_required
def cancelar_ordem(usuario_atual, ordem_id):
    try:
        ordem, erro = _obter_ordem(ordem_id)
        if erro:
            return erro

        dados = request.get_json() or {}
        ordem.status = 'cancelada'
        ordem.observacoes_internas = dados.get('motivo', ordem.observacoes_internas)

        execucao = _execucao_ativa(ordem)
        if execucao:
            execucao.status = 'cancelada'
            execucao.data_fim = datetime.now(timezone.utc)

        db.session.commit()
        return jsonify({'mensagem': 'Ordem de serviço cancelada com sucesso', 'ordem': ordem.to_dict()}), 200
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Erro ao cancelar ordem de serviço: {str(e)}")
        return jsonify({'erro': 'Erro ao cancelar ordem de serviço'}), 500


@ordens_bp.route('/<int:ordem_id>/iniciar', methods=['POST'])
@token_required
def iniciar_execucao(usuario_atual, ordem_id):
    try:
        ordem, erro = _obter_ordem(ordem_id)
        if erro:
            return erro

        dados = request.get_json() or {}
        execucao = _execucao_ativa(ordem)
        if execucao and execucao.status == 'em_andamento':
            return jsonify({'erro': 'A ordem já possui uma execução em andamento'}), 400

        if execucao and execucao.status == 'pausada':
            execucao.status = 'em_andamento'
            execucao.data_atualizacao = datetime.now(timezone.utc)
        else:
            execucao = ExecucaoCampo(
                ordem_servico_id=ordem.id,
                executor_id=dados.get('executor_id', usuario_atual.id),
                checklist_snapshot=dados.get('checklist_snapshot'),
                observacoes=dados.get('observacoes'),
                latitude_inicio=dados.get('latitude'),
                longitude_inicio=dados.get('longitude'),
            )
            db.session.add(execucao)

        ordem.status = 'em_campo'
        ordem.data_inicio = ordem.data_inicio or datetime.now(timezone.utc)

        db.session.commit()
        return jsonify({'mensagem': 'Execução em campo iniciada', 'ordem': ordem.to_dict(), 'execucao': execucao.to_dict()}), 200
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Erro ao iniciar execução em campo: {str(e)}")
        return jsonify({'erro': 'Erro ao iniciar execução em campo'}), 500


@ordens_bp.route('/<int:ordem_id>/pausar', methods=['POST'])
@token_required
def pausar_execucao(usuario_atual, ordem_id):
    try:
        ordem, erro = _obter_ordem(ordem_id)
        if erro:
            return erro

        execucao = _execucao_ativa(ordem)
        if not execucao or execucao.status != 'em_andamento':
            return jsonify({'erro': 'Não existe execução em andamento para pausar'}), 400

        dados = request.get_json() or {}
        execucao.status = 'pausada'
        execucao.observacoes = dados.get('observacoes', execucao.observacoes)
        ordem.status = 'pausada'

        db.session.commit()
        return jsonify({'mensagem': 'Execução em campo pausada', 'ordem': ordem.to_dict(), 'execucao': execucao.to_dict()}), 200
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Erro ao pausar execução em campo: {str(e)}")
        return jsonify({'erro': 'Erro ao pausar execução em campo'}), 500


@ordens_bp.route('/<int:ordem_id>/finalizar', methods=['POST'])
@token_required
def finalizar_execucao(usuario_atual, ordem_id):
    try:
        ordem, erro = _obter_ordem(ordem_id)
        if erro:
            return erro

        execucao = _execucao_ativa(ordem)
        if not execucao:
            return jsonify({'erro': 'Não existe execução ativa para finalizar'}), 400

        dados = request.get_json() or {}
        agora = datetime.now(timezone.utc)
        execucao.status = 'concluida'
        execucao.data_fim = agora
        execucao.respostas = dados.get('respostas', execucao.respostas)
        execucao.observacoes = dados.get('observacoes', execucao.observacoes)
        execucao.latitude_fim = dados.get('latitude')
        execucao.longitude_fim = dados.get('longitude')

        ordem.status = 'concluida'
        ordem.data_fim = agora
        ordem.observacoes_cliente = dados.get('observacoes_cliente', ordem.observacoes_cliente)

        db.session.commit()
        return jsonify({'mensagem': 'Ordem de serviço finalizada com sucesso', 'ordem': ordem.to_dict(), 'execucao': execucao.to_dict()}), 200
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Erro ao finalizar ordem de serviço: {str(e)}")
        return jsonify({'erro': 'Erro ao finalizar ordem de serviço'}), 500


@ordens_bp.route('/<int:ordem_id>/evidencias', methods=['POST'])
@token_required
def registrar_evidencia(usuario_atual, ordem_id):
    try:
        ordem, erro = _obter_ordem(ordem_id)
        if erro:
            return erro

        dados = request.get_json() or {}
        if not dados.get('url'):
            return jsonify({'erro': 'URL da evidência é obrigatória'}), 400

        evidencia = EvidenciaCampo(
            ordem_servico_id=ordem.id,
            execucao_id=dados.get('execucao_id'),
            tipo=dados.get('tipo', 'foto'),
            url=dados['url'],
            legenda=dados.get('legenda'),
            origem=dados.get('origem', 'campo'),
            item_referencia=dados.get('item_referencia'),
            latitude=dados.get('latitude'),
            longitude=dados.get('longitude'),
            metadados=dados.get('metadados'),
            criado_por_id=usuario_atual.id,
        )
        db.session.add(evidencia)
        db.session.commit()
        return jsonify({'mensagem': 'Evidência registrada com sucesso', 'evidencia': evidencia.to_dict()}), 201
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Erro ao registrar evidência: {str(e)}")
        return jsonify({'erro': 'Erro ao registrar evidência'}), 500


@ordens_bp.route('/<int:ordem_id>/apontamentos-hora', methods=['POST'])
@token_required
def registrar_apontamento_hora(usuario_atual, ordem_id):
    try:
        ordem, erro = _obter_ordem(ordem_id)
        if erro:
            return erro

        dados = request.get_json() or {}
        if not dados.get('data_inicio'):
            return jsonify({'erro': 'Data de início é obrigatória'}), 400

        data_inicio = _parse_datetime(dados['data_inicio'])
        data_fim = _parse_datetime(dados.get('data_fim'))
        horas = dados.get('horas')
        if horas is None and data_inicio and data_fim:
            horas = (data_fim - data_inicio).total_seconds() / 3600

        apontamento = ApontamentoHora(
            ordem_servico_id=ordem.id,
            usuario_id=dados.get('usuario_id', usuario_atual.id),
            data_inicio=data_inicio,
            data_fim=data_fim,
            horas=horas or 0,
            tipo=dados.get('tipo', 'campo'),
            descricao=dados.get('descricao'),
        )
        db.session.add(apontamento)
        db.session.commit()
        return jsonify({'mensagem': 'Apontamento de horas registrado com sucesso', 'apontamento': apontamento.to_dict()}), 201
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Erro ao registrar apontamento de horas: {str(e)}")
        return jsonify({'erro': 'Erro ao registrar apontamento de horas'}), 500


@ordens_bp.route('/<int:ordem_id>/materiais', methods=['POST'])
@token_required
def registrar_material(usuario_atual, ordem_id):
    try:
        ordem, erro = _obter_ordem(ordem_id)
        if erro:
            return erro

        dados = request.get_json() or {}
        if not dados.get('nome'):
            return jsonify({'erro': 'Nome do material é obrigatório'}), 400

        material = MaterialUtilizado(
            ordem_servico_id=ordem.id,
            nome=dados['nome'],
            quantidade=dados.get('quantidade', 1),
            unidade=dados.get('unidade', 'un'),
            valor_unitario=dados.get('valor_unitario', 0),
            observacao=dados.get('observacao'),
            registrado_por_id=usuario_atual.id,
        )
        db.session.add(material)
        db.session.commit()
        return jsonify({'mensagem': 'Material registrado com sucesso', 'material': material.to_dict()}), 201
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Erro ao registrar material: {str(e)}")
        return jsonify({'erro': 'Erro ao registrar material'}), 500


@ordens_bp.route('/<int:ordem_id>/assinaturas', methods=['POST'])
@token_required
def registrar_assinatura(usuario_atual, ordem_id):
    try:
        ordem, erro = _obter_ordem(ordem_id)
        if erro:
            return erro

        dados = request.get_json() or {}
        if not dados.get('nome'):
            return jsonify({'erro': 'Nome do assinante é obrigatório'}), 400

        assinatura = AssinaturaCampo(
            ordem_servico_id=ordem.id,
            usuario_id=dados.get('usuario_id'),
            nome=dados['nome'],
            documento=dados.get('documento'),
            cargo=dados.get('cargo'),
            tipo=dados.get('tipo', 'cliente'),
            assinatura_url=dados.get('assinatura_url'),
            aceite_texto=dados.get('aceite_texto'),
            latitude=dados.get('latitude'),
            longitude=dados.get('longitude'),
        )
        db.session.add(assinatura)
        db.session.commit()
        return jsonify({'mensagem': 'Assinatura registrada com sucesso', 'assinatura': assinatura.to_dict()}), 201
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Erro ao registrar assinatura: {str(e)}")
        return jsonify({'erro': 'Erro ao registrar assinatura'}), 500


@ordens_bp.route('/<int:ordem_id>/relatorios', methods=['POST'])
@token_required
def criar_relatorio(usuario_atual, ordem_id):
    try:
        ordem, erro = _obter_ordem(ordem_id)
        if erro:
            return erro

        dados = request.get_json() or {}
        if not dados.get('titulo'):
            return jsonify({'erro': 'Título do relatório é obrigatório'}), 400

        relatorio = RelatorioTecnico(
            ordem_servico_id=ordem.id,
            titulo=dados['titulo'],
            status=dados.get('status', 'rascunho'),
            conteudo=dados.get('conteudo'),
            pdf_url=dados.get('pdf_url'),
            emitido_em=_parse_datetime(dados.get('emitido_em')),
            emitido_por_id=dados.get('emitido_por_id', usuario_atual.id),
        )
        db.session.add(relatorio)
        db.session.commit()
        return jsonify({'mensagem': 'Relatório técnico criado com sucesso', 'relatorio': relatorio.to_dict()}), 201
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Erro ao criar relatório técnico: {str(e)}")
        return jsonify({'erro': 'Erro ao criar relatório técnico'}), 500

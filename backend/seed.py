"""
Seed deterministico para o schema public do Apex.

Uso:
  cd backend
  source venv/bin/activate
  python3 seed.py

O script limpa os dados do schema public mantendo a tabela alembic_version e
recria uma base integrada para Apex CRM e Apex Inspect.
"""
from dotenv import load_dotenv
load_dotenv()

from datetime import date, datetime, timedelta, timezone

from sqlalchemy import text

from app import create_app, db
from app.models import (
    ApontamentoHora,
    AssinaturaCampo,
    AtividadeNegocio,
    Ativo,
    ChecklistItem,
    ComentarioTarefa,
    Contato,
    ContratoAMC,
    Empresa,
    Estagio,
    EvidenciaCampo,
    ExecucaoCampo,
    Inspecao,
    Lead,
    LeadEstagio,
    MaterialUtilizado,
    Negocio,
    OrdemServico,
    Perfil,
    Pipeline,
    Projeto,
    RelatorioTecnico,
    Servico,
    Tarefa,
    TemplateChecklist,
    Tenant,
    Usuario,
)


app = create_app()
NOW = datetime.now(timezone.utc)
TODAY = date.today()


def limpar_schema_public():
    db.session.execute(text("SET search_path TO public"))
    tabelas = db.session.execute(text("""
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_type = 'BASE TABLE'
          AND table_name <> 'alembic_version'
        ORDER BY table_name
    """)).scalars().all()

    if tabelas:
        nomes = ", ".join(f'"{tabela}"' for tabela in tabelas)
        db.session.execute(text(f"TRUNCATE TABLE {nomes} RESTART IDENTITY CASCADE"))
        db.session.commit()
        print(f"[ok] Schema public limpo: {len(tabelas)} tabelas truncadas")
    else:
        print("[ok] Schema public sem tabelas para limpar")


def criar_usuarios():
    from app.utils.iniciar_dados import inicializar_dados

    dados_base = inicializar_dados()
    admin = dados_base["admin"]
    admin.nome = "Administrador Apex"
    admin.email = "admin@example.com"
    admin.senha = "admin@example.com"
    admin.deve_trocar_senha = False
    admin.ativo = True

    admin_perfil = Perfil.query.filter_by(nome="Administrador").first()
    supervisor_perfil = Perfil.query.filter_by(nome="Supervisor").first()
    vendedor_perfil = Perfil.query.filter_by(nome="Vendedor").first()

    engenheiro_perfil = Perfil(
        nome="Engenheiro de Campo",
        descricao="Responsavel por inspecoes e execucoes do Apex Inspect",
        permissoes=admin_perfil.permissoes,
    )
    cliente_perfil = Perfil(
        nome="Cliente",
        descricao="Acesso de cliente ao portal e relatorios",
        permissoes=[],
    )
    db.session.add_all([engenheiro_perfil, cliente_perfil])
    db.session.flush()

    usuarios = [
        Usuario(nome="Carlos Mendes", email="carlos@apex.com.br", perfil_id=supervisor_perfil.id, ativo=True, deve_trocar_senha=False),
        Usuario(nome="Fernanda Lima", email="fernanda@apex.com.br", perfil_id=vendedor_perfil.id, ativo=True, deve_trocar_senha=False),
        Usuario(nome="Mariana Torres", email="mariana@apex.com.br", perfil_id=engenheiro_perfil.id, ativo=True, deve_trocar_senha=False),
        Usuario(nome="Roberto Almeida", email="roberto@apex.com.br", perfil_id=engenheiro_perfil.id, ativo=True, deve_trocar_senha=False),
        Usuario(nome="Cliente MetalRondon", email="cliente@metalrondon.com.br", perfil_id=cliente_perfil.id, ativo=True, deve_trocar_senha=False),
    ]

    for usuario in usuarios:
        usuario.senha = "eng123"

    db.session.add_all(usuarios)
    db.session.commit()

    return {
        "admin": admin,
        "supervisor": usuarios[0],
        "vendedora": usuarios[1],
        "engenheira": usuarios[2],
        "engenheiro": usuarios[3],
        "cliente": usuarios[4],
    }


def criar_base_crm(usuarios):
    tenant = Tenant(
        nome_fantasia="Apex Engenharia",
        subdominio="apex",
        db_schema="public",
    )
    db.session.add(tenant)

    servicos = [
        Servico(nome="Inspecao NR-13", descricao="Inspecao tecnica de vasos de pressao e caldeiras", categoria="inspecao"),
        Servico(nome="PMOC HVAC", descricao="Plano de manutencao, operacao e controle de climatizacao", categoria="manutencao"),
        Servico(nome="Adequacao NR-12", descricao="Projeto e regularizacao de seguranca em maquinas", categoria="projeto"),
        Servico(nome="Contrato AMC Industrial", descricao="Atendimento recorrente para manutencao e inspecao", categoria="manutencao"),
    ]
    db.session.add_all(servicos)

    pipeline = Pipeline(
        nome="Funil Apex CRM",
        descricao="Pipeline comercial para oportunidades de engenharia e campo",
    )
    estagios = [
        Estagio(nome="Prospeccao", ordem=1, cor="#2563eb", descricao="Oportunidades identificadas", pipeline=pipeline),
        Estagio(nome="Qualificacao", ordem=2, cor="#f59e0b", descricao="Necessidade e fit tecnico validados", pipeline=pipeline),
        Estagio(nome="Levantamento Tecnico", ordem=3, cor="#ea580c", descricao="Visita ou coleta de dados", pipeline=pipeline),
        Estagio(nome="Proposta", ordem=4, cor="#7c3aed", descricao="Proposta tecnico-comercial enviada", pipeline=pipeline),
        Estagio(nome="Contrato/OS", ordem=5, cor="#16a34a", descricao="Negocio aprovado para execucao", pipeline=pipeline),
    ]
    db.session.add(pipeline)

    empresas = [
        Empresa(
            razao_social="Industria Metalurgica Rondon Ltda",
            nome_fantasia="MetalRondon",
            cnpj="12.345.678/0001-90",
            ramo="Metalurgia",
            porte="grande",
            endereco="Av. Industrial, 1500",
            cidade="Rondonopolis",
            estado="MT",
            telefone="(66) 3423-1000",
            email="manutencao@metalrondon.com.br",
        ),
        Empresa(
            razao_social="Agro Maquinas Cerrado S.A.",
            nome_fantasia="AgroCerrado",
            cnpj="23.456.789/0001-01",
            ramo="Maquinas Agricolas",
            porte="grande",
            endereco="Rod. BR-364 Km 12",
            cidade="Rondonopolis",
            estado="MT",
            telefone="(66) 3411-2000",
            email="engenharia@agrocerrado.com.br",
        ),
        Empresa(
            razao_social="Hospital Sao Bento Ltda",
            nome_fantasia="Hospital Sao Bento",
            cnpj="34.567.890/0001-12",
            ramo="Saude",
            porte="medio",
            endereco="Rua Dom Pedro II, 420",
            cidade="Cuiaba",
            estado="MT",
            telefone="(65) 3322-9090",
            email="operacoes@hospitalsaobento.com.br",
        ),
    ]
    db.session.add_all(empresas)
    db.session.flush()

    contatos = [
        Contato(nome="Jose Roberto Almeida", cargo="Diretor Industrial", email="jose.roberto@metalrondon.com.br", telefone="(66) 3423-1001", celular="(66) 99901-1001", principal=True, empresa_id=empresas[0].id),
        Contato(nome="Paulo Henrique Souza", cargo="Gerente de Operacoes", email="paulo@agrocerrado.com.br", telefone="(66) 3411-2001", celular="(66) 99903-2001", principal=True, empresa_id=empresas[1].id),
        Contato(nome="Dra. Helena Prado", cargo="Diretora Operacional", email="helena@hospitalsaobento.com.br", telefone="(65) 3322-9091", celular="(65) 99920-9091", principal=True, empresa_id=empresas[2].id),
    ]
    db.session.add_all(contatos)
    db.session.flush()

    leads = [
        Lead(nome=contatos[0].nome, email=contatos[0].email, telefone=contatos[0].celular, empresa_nome=empresas[0].nome_fantasia, empresa_id=empresas[0].id, cargo=contatos[0].cargo, interesse="Inspecao NR-13 em vasos de pressao", origem="Indicacao", status="qualificado", responsavel_id=usuarios["vendedora"].id),
        Lead(nome=contatos[1].nome, email=contatos[1].email, telefone=contatos[1].celular, empresa_nome=empresas[1].nome_fantasia, empresa_id=empresas[1].id, cargo=contatos[1].cargo, interesse="Contrato AMC para manutencao de colhedoras", origem="Evento", status="convertido", responsavel_id=usuarios["supervisor"].id),
        Lead(nome=contatos[2].nome, email=contatos[2].email, telefone=contatos[2].celular, empresa_nome=empresas[2].nome_fantasia, empresa_id=empresas[2].id, cargo=contatos[2].cargo, interesse="PMOC e laudos de climatizacao", origem="Site", status="contatado", responsavel_id=usuarios["vendedora"].id),
    ]
    db.session.add_all(leads)
    db.session.flush()

    for posicao, lead in enumerate(leads):
        db.session.add(LeadEstagio(lead_id=lead.id, estagio_id=estagios[min(posicao + 1, len(estagios) - 1)].id, posicao=posicao))

    negocios = [
        Negocio(nome="NR-13 MetalRondon - Linha de Vasos", descricao="Inspecao inicial com relatorio tecnico e ART", valor=48500, tipo="unico", probabilidade=80, data_previsao_fechamento=TODAY + timedelta(days=15), status="aberto", lead_id=leads[0].id, pipeline_id=pipeline.id, estagio_id=estagios[3].id, responsavel_id=usuarios["vendedora"].id, servico_id=servicos[0].id, criado_por_id=usuarios["admin"].id),
        Negocio(nome="AMC AgroCerrado - Frota Industrial", descricao="Contrato recorrente para inspecao e manutencao de campo", valor=18500, tipo="recorrente", periodicidade="mensal", probabilidade=100, data_previsao_fechamento=TODAY - timedelta(days=5), status="ganho", data_fechamento=NOW - timedelta(days=5), lead_id=leads[1].id, pipeline_id=pipeline.id, estagio_id=estagios[4].id, responsavel_id=usuarios["supervisor"].id, servico_id=servicos[3].id, criado_por_id=usuarios["admin"].id),
        Negocio(nome="PMOC Hospital Sao Bento", descricao="Implantacao de rotinas PMOC e laudos de climatizacao", valor=32000, tipo="unico", probabilidade=60, data_previsao_fechamento=TODAY + timedelta(days=25), status="aberto", lead_id=leads[2].id, pipeline_id=pipeline.id, estagio_id=estagios[2].id, responsavel_id=usuarios["vendedora"].id, servico_id=servicos[1].id, criado_por_id=usuarios["admin"].id),
    ]
    db.session.add_all(negocios)
    db.session.flush()

    atividades = [
        AtividadeNegocio(tipo="visita_tecnica", titulo="Levantamento NR-13 MetalRondon", descricao="Mapear equipamentos e documentos existentes", data_agendada=NOW + timedelta(days=2), status="pendente", negocio_id=negocios[0].id, responsavel_id=usuarios["engenheira"].id),
        AtividadeNegocio(tipo="reuniao", titulo="Kickoff AMC AgroCerrado", descricao="Definir calendario das visitas recorrentes", data_agendada=NOW - timedelta(days=4), data_conclusao=NOW - timedelta(days=4), status="concluida", resultado="Calendario mensal aprovado", negocio_id=negocios[1].id, responsavel_id=usuarios["supervisor"].id),
        AtividadeNegocio(tipo="email", titulo="Enviar proposta PMOC", descricao="Enviar proposta revisada com cronograma", data_agendada=NOW + timedelta(days=1), status="pendente", negocio_id=negocios[2].id, responsavel_id=usuarios["vendedora"].id),
    ]
    db.session.add_all(atividades)

    projetos = [
        Projeto(nome="Implantacao AMC AgroCerrado", descricao="Estruturar rotina de campo e manutencao recorrente", status="em_andamento", prioridade="alta", data_inicio=TODAY - timedelta(days=5), data_previsao_fim=TODAY + timedelta(days=85), valor_contrato=222000, percentual_concluido=35, negocio_id=negocios[1].id, empresa_id=empresas[1].id, gerente_id=usuarios["supervisor"].id, criado_por_id=usuarios["admin"].id),
        Projeto(nome="PMOC Hospital Sao Bento", descricao="Plano de manutencao, operacao e controle dos sistemas HVAC", status="planejamento", prioridade="media", data_inicio=TODAY + timedelta(days=10), data_previsao_fim=TODAY + timedelta(days=55), valor_contrato=32000, percentual_concluido=10, negocio_id=negocios[2].id, empresa_id=empresas[2].id, gerente_id=usuarios["engenheira"].id, criado_por_id=usuarios["admin"].id),
    ]
    db.session.add_all(projetos)
    db.session.flush()

    tarefas = [
        Tarefa(titulo="Cadastrar ativos criticos", descricao="Inventariar equipamentos atendidos pelo contrato", status="concluida", prioridade="alta", data_inicio=TODAY - timedelta(days=5), data_prazo=TODAY - timedelta(days=1), data_conclusao=NOW - timedelta(days=1), ordem=1, projeto_id=projetos[0].id, responsavel_id=usuarios["engenheira"].id),
        Tarefa(titulo="Executar primeira rota de campo", descricao="Realizar inspecao e evidenciar nao conformidades", status="em_andamento", prioridade="alta", data_inicio=TODAY, data_prazo=TODAY + timedelta(days=7), ordem=2, projeto_id=projetos[0].id, responsavel_id=usuarios["engenheiro"].id),
        Tarefa(titulo="Validar carga termica dos ambientes", descricao="Coletar dados para PMOC", status="a_fazer", prioridade="media", data_inicio=TODAY + timedelta(days=10), data_prazo=TODAY + timedelta(days=18), ordem=1, projeto_id=projetos[1].id, responsavel_id=usuarios["engenheira"].id),
    ]
    db.session.add_all(tarefas)
    db.session.flush()

    db.session.add_all([
        ChecklistItem(descricao="Tags e localizacao conferidas", concluido=True, ordem=1, tarefa_id=tarefas[0].id),
        ChecklistItem(descricao="Fotos de placa anexadas", concluido=True, ordem=2, tarefa_id=tarefas[0].id),
        ChecklistItem(descricao="Plano de rota aprovado", concluido=False, ordem=1, tarefa_id=tarefas[1].id),
        ComentarioTarefa(conteudo="Cliente confirmou acesso aos galpoes a partir das 07h30.", tarefa_id=tarefas[1].id, autor_id=usuarios["supervisor"].id),
    ])

    return {
        "servicos": servicos,
        "pipeline": pipeline,
        "estagios": estagios,
        "empresas": empresas,
        "contatos": contatos,
        "leads": leads,
        "negocios": negocios,
        "projetos": projetos,
    }


def criar_base_inspect(usuarios, crm):
    templates = [
        TemplateChecklist(
            nome="Checklist NR-13 - Vaso de Pressao",
            regulacao="nr13",
            versao="1.0",
            itens=[
                {"id": 1, "pergunta": "Placa de identificacao legivel?", "criticidade": "alta"},
                {"id": 2, "pergunta": "Valvula de seguranca lacrada e calibrada?", "criticidade": "critica"},
                {"id": 3, "pergunta": "Prontuario e ART disponiveis?", "criticidade": "alta"},
                {"id": 4, "pergunta": "Ha sinais de corrosao, trincas ou vazamentos?", "criticidade": "critica"},
            ],
        ),
        TemplateChecklist(
            nome="Checklist PMOC - HVAC",
            regulacao="pmoc",
            versao="1.0",
            itens=[
                {"id": 1, "pergunta": "Filtros limpos e identificados?", "criticidade": "media"},
                {"id": 2, "pergunta": "Drenos livres e sem vazamentos?", "criticidade": "media"},
                {"id": 3, "pergunta": "Temperatura de insuflamento registrada?", "criticidade": "alta"},
                {"id": 4, "pergunta": "Plano de manutencao atualizado?", "criticidade": "alta"},
            ],
        ),
        TemplateChecklist(
            nome="Checklist NR-12 - Maquinas",
            regulacao="nr12",
            versao="1.0",
            itens=[
                {"id": 1, "pergunta": "Protecoes mecanicas instaladas?", "criticidade": "critica"},
                {"id": 2, "pergunta": "Botoes de emergencia operacionais?", "criticidade": "critica"},
                {"id": 3, "pergunta": "Sinalizacao de risco presente?", "criticidade": "media"},
            ],
        ),
    ]
    db.session.add_all(templates)
    db.session.flush()

    empresas = crm["empresas"]
    ativos = [
        Ativo(nome="Vaso de Pressao VP-01", tag_identificacao="MR-VP-001", categoria="nr13", fabricante="Dedini", modelo="VP 12bar", numero_serie="DNI-2020-4481", dados_tecnicos={"pressao_projeto_bar": 12, "volume_litros": 1500}, localizacao="Galpao 2 - Utilidades", data_instalacao=TODAY - timedelta(days=900), status="ativo", empresa_id=empresas[0].id),
        Ativo(nome="Caldeira Flamotubular C-02", tag_identificacao="MR-CAL-002", categoria="nr13", fabricante="Aalborg", modelo="FT-4000", numero_serie="AAL-19-7782", dados_tecnicos={"pressao_trabalho_bar": 10, "capacidade_kg_h": 4000}, localizacao="Casa de Caldeiras", data_instalacao=TODAY - timedelta(days=1500), status="manutencao", empresa_id=empresas[0].id),
        Ativo(nome="Colhedora Industrial CH-07", tag_identificacao="AG-CH-007", categoria="nr12", fabricante="John Deere", modelo="CH950", numero_serie="JD-CH-950-07", dados_tecnicos={"potencia_cv": 352}, localizacao="Patio de Manutencao", data_instalacao=TODAY - timedelta(days=720), status="ativo", empresa_id=empresas[1].id),
        Ativo(nome="Chiller Central CHL-01", tag_identificacao="HSB-HVAC-001", categoria="hvac", fabricante="Carrier", modelo="AquaForce", numero_serie="CAR-2021-9911", dados_tecnicos={"capacidade_tr": 120, "gas": "R134a"}, localizacao="Cobertura Bloco A", data_instalacao=TODAY - timedelta(days=620), status="ativo", empresa_id=empresas[2].id),
    ]
    db.session.add_all(ativos)
    db.session.flush()

    contratos = [
        ContratoAMC(titulo="AMC AgroCerrado - Frota Industrial", plano="mensal", valor_recorrente=18500, data_inicio=TODAY - timedelta(days=5), data_fim=TODAY + timedelta(days=360), status="ativo", empresa_id=empresas[1].id),
        ContratoAMC(titulo="PMOC Hospital Sao Bento", plano="mensal", valor_recorrente=6400, data_inicio=TODAY + timedelta(days=10), data_fim=TODAY + timedelta(days=375), status="ativo", empresa_id=empresas[2].id),
    ]
    db.session.add_all(contratos)
    db.session.flush()

    ordens = [
        OrdemServico(codigo="OS-INS-0001", titulo="Inspecao NR-13 - Vaso VP-01", tipo="inspecao", status="em_campo", prioridade="alta", descricao="Inspecao externa e documental do vaso de pressao VP-01.", escopo={"norma": "NR-13", "entregaveis": ["relatorio tecnico", "registro fotografico", "plano de adequacao"]}, endereco_atendimento=empresas[0].endereco, latitude=-16.4709, longitude=-54.6356, data_agendada=NOW + timedelta(days=1), data_inicio=NOW - timedelta(hours=3), empresa_id=empresas[0].id, ativo_id=ativos[0].id, projeto_id=None, negocio_id=crm["negocios"][0].id, responsavel_id=usuarios["engenheira"].id, criado_por_id=usuarios["admin"].id),
        OrdemServico(codigo="OS-INS-0002", titulo="Rota AMC - Colhedora CH-07", tipo="manutencao", status="concluida", prioridade="normal", descricao="Inspecao preventiva mensal e ajustes de seguranca NR-12.", escopo={"rotina": "mensal", "itens": ["seguranca", "lubrificacao", "relatorio"]}, endereco_atendimento=empresas[1].endereco, latitude=-16.4668, longitude=-54.6371, data_agendada=NOW - timedelta(days=2), data_inicio=NOW - timedelta(days=2, hours=-1), data_fim=NOW - timedelta(days=2, hours=-5), empresa_id=empresas[1].id, ativo_id=ativos[2].id, contrato_amc_id=contratos[0].id, projeto_id=crm["projetos"][0].id, negocio_id=crm["negocios"][1].id, responsavel_id=usuarios["engenheiro"].id, criado_por_id=usuarios["admin"].id),
        OrdemServico(codigo="OS-INS-0003", titulo="PMOC - Chiller Central CHL-01", tipo="inspecao", status="planejada", prioridade="normal", descricao="Coleta inicial para laudo PMOC.", escopo={"norma": "PMOC", "ambientes": ["Bloco A", "UTI", "Centro cirurgico"]}, endereco_atendimento=empresas[2].endereco, latitude=-15.5989, longitude=-56.0949, data_agendada=NOW + timedelta(days=10), empresa_id=empresas[2].id, ativo_id=ativos[3].id, contrato_amc_id=contratos[1].id, projeto_id=crm["projetos"][1].id, negocio_id=crm["negocios"][2].id, responsavel_id=usuarios["engenheira"].id, criado_por_id=usuarios["admin"].id),
    ]
    db.session.add_all(ordens)
    db.session.flush()

    execucoes = [
        ExecucaoCampo(status="em_andamento", data_inicio=NOW - timedelta(hours=3), checklist_snapshot=templates[0].itens, respostas=[{"pergunta_id": 1, "resposta": "conforme", "observacao": "Placa legivel"}, {"pergunta_id": 2, "resposta": "nao_conforme", "observacao": "Calibracao vencida"}], observacoes="Inspecao em andamento com pendencia critica em valvula.", latitude_inicio=-16.4709, longitude_inicio=-54.6356, ordem_servico_id=ordens[0].id, executor_id=usuarios["engenheira"].id),
        ExecucaoCampo(status="concluida", data_inicio=NOW - timedelta(days=2, hours=-1), data_fim=NOW - timedelta(days=2, hours=-5), checklist_snapshot=templates[2].itens, respostas=[{"pergunta_id": 1, "resposta": "conforme"}, {"pergunta_id": 2, "resposta": "conforme"}, {"pergunta_id": 3, "resposta": "conforme"}], observacoes="Rota concluida sem pendencias impeditivas.", latitude_inicio=-16.4668, longitude_inicio=-54.6371, latitude_fim=-16.4668, longitude_fim=-54.6371, ordem_servico_id=ordens[1].id, executor_id=usuarios["engenheiro"].id),
    ]
    db.session.add_all(execucoes)
    db.session.flush()

    db.session.add_all([
        EvidenciaCampo(tipo="foto", url="https://example.com/evidencias/vp01-placa.jpg", legenda="Placa de identificacao VP-01", origem="campo", item_referencia="pergunta_1", latitude=-16.4709, longitude=-54.6356, metadados={"arquivo": "vp01-placa.jpg"}, ordem_servico_id=ordens[0].id, execucao_id=execucoes[0].id, criado_por_id=usuarios["engenheira"].id),
        EvidenciaCampo(tipo="foto", url="https://example.com/evidencias/ch07-protecao.jpg", legenda="Protecao mecanica da colhedora", origem="campo", item_referencia="pergunta_1", latitude=-16.4668, longitude=-54.6371, metadados={"arquivo": "ch07-protecao.jpg"}, ordem_servico_id=ordens[1].id, execucao_id=execucoes[1].id, criado_por_id=usuarios["engenheiro"].id),
        ApontamentoHora(data_inicio=NOW - timedelta(hours=3), data_fim=NOW - timedelta(hours=1), horas=2.0, tipo="campo", descricao="Inspecao externa VP-01", ordem_servico_id=ordens[0].id, usuario_id=usuarios["engenheira"].id),
        ApontamentoHora(data_inicio=NOW - timedelta(days=2, hours=-1), data_fim=NOW - timedelta(days=2, hours=-5), horas=4.0, tipo="campo", descricao="Rota preventiva CH-07", ordem_servico_id=ordens[1].id, usuario_id=usuarios["engenheiro"].id),
        MaterialUtilizado(nome="Lacre numerado para valvula", quantidade=2, unidade="un", valor_unitario=18.5, observacao="Aplicado apos conferencia", ordem_servico_id=ordens[1].id, registrado_por_id=usuarios["engenheiro"].id),
        AssinaturaCampo(nome="Paulo Henrique Souza", documento="123.456.789-00", cargo="Gerente de Operacoes", tipo="cliente", assinatura_url="https://example.com/assinaturas/paulo.png", aceite_texto="Servico recebido e evidencias conferidas.", latitude=-16.4668, longitude=-54.6371, ordem_servico_id=ordens[1].id, usuario_id=usuarios["cliente"].id),
        RelatorioTecnico(titulo="Relatorio Tecnico OS-INS-0002", status="emitido", conteudo={"resumo": "Rota AMC concluida", "nao_conformidades": 0, "recomendacoes": ["manter rotina mensal"]}, pdf_url="https://example.com/relatorios/os-ins-0002.pdf", emitido_em=NOW - timedelta(days=2), ordem_servico_id=ordens[1].id, emitido_por_id=usuarios["engenheiro"].id),
    ])

    inspecoes = [
        Inspecao(data_inspecao=TODAY, data_realizacao=NOW - timedelta(hours=1), status="em_campo", respostas=execucoes[0].respostas, observacoes_gerais="Pendencia em valvula de seguranca.", art_numero="ART-MT-2026-0001", ativo_id=ativos[0].id, template_id=templates[0].id, ordem_servico_id=ordens[0].id, inspetor_id=usuarios["engenheira"].id, criado_por_id=usuarios["admin"].id),
        Inspecao(data_inspecao=TODAY - timedelta(days=2), data_realizacao=NOW - timedelta(days=2), status="concluida", respostas=execucoes[1].respostas, observacoes_gerais="Sem nao conformidades criticas.", art_numero="ART-MT-2026-0002", pdf_laudo_url="https://example.com/laudos/ch07.pdf", ativo_id=ativos[2].id, template_id=templates[2].id, contrato_amc_id=contratos[0].id, ordem_servico_id=ordens[1].id, inspetor_id=usuarios["engenheiro"].id, criado_por_id=usuarios["admin"].id),
        Inspecao(data_inspecao=TODAY + timedelta(days=10), status="agendada", respostas=[], observacoes_gerais="Aguardando visita inicial.", ativo_id=ativos[3].id, template_id=templates[1].id, contrato_amc_id=contratos[1].id, ordem_servico_id=ordens[2].id, inspetor_id=usuarios["engenheira"].id, criado_por_id=usuarios["admin"].id),
    ]
    db.session.add_all(inspecoes)
    db.session.commit()

    return {
        "templates": templates,
        "ativos": ativos,
        "contratos": contratos,
        "ordens": ordens,
        "inspecoes": inspecoes,
    }


def seed():
    with app.app_context():
        print("=== SEED PUBLIC: Apex CRM + Apex Inspect ===")
        limpar_schema_public()
        usuarios = criar_usuarios()
        crm = criar_base_crm(usuarios)
        inspect = criar_base_inspect(usuarios, crm)

        print("\n=== SEED CONCLUIDO ===")
        print(f"Tenant:       {Tenant.query.count()}")
        print(f"Usuarios:     {Usuario.query.count()}")
        print(f"Empresas:     {Empresa.query.count()}")
        print(f"Leads:        {Lead.query.count()}")
        print(f"Negocios:     {Negocio.query.count()}")
        print(f"Projetos:     {Projeto.query.count()}")
        print(f"Ativos:       {Ativo.query.count()}")
        print(f"Contratos:    {ContratoAMC.query.count()}")
        print(f"Ordens:       {OrdemServico.query.count()}")
        print(f"Inspecoes:    {Inspecao.query.count()}")
        print(f"Relatorios:   {RelatorioTecnico.query.count()}")
        print("\nLogin admin:")
        print("  Workspace: apex")
        print("  Email:     admin@example.com")
        print("  Senha:     admin@example.com")
        print("\nUsuarios de exemplo:")
        print("  carlos@apex.com.br / eng123")
        print("  fernanda@apex.com.br / eng123")
        print("  mariana@apex.com.br / eng123")
        print("  roberto@apex.com.br / eng123")


if __name__ == "__main__":
    seed()

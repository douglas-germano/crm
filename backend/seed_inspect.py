from app import create_app, db
from app.models.template_checklist import TemplateChecklist
from app.models.ativo import Ativo
from app.models.contrato_amc import ContratoAMC
from app.models.inspecao import Inspecao
from app.models.empresa import Empresa
from app.models.usuario import Usuario
from datetime import datetime, date, timedelta
from sqlalchemy import text

app = create_app()

with app.app_context():
    # Garantir search_path em public
    db.session.execute(text("SET search_path TO public"))
    db.session.commit()

    print("Iniciando seed de dados do Apex Inspect...")

    # 1. Carregar Empresa padrão (Apex Engenharia ou qualquer outra)
    empresa = Empresa.query.filter_by(razao_social="Apex Engenharia").first()
    if not empresa:
        empresa = Empresa.query.first()
    
    if not empresa:
        print("Erro: Nenhuma empresa cadastrada no banco para associar os ativos!")
        exit(1)

    print(f"Empresa selecionada para seed: {empresa.razao_social} (ID: {empresa.id})")

    # 2. Carregar Usuário padrão (Inspetor / Engenheiro)
    usuario = Usuario.query.first()
    if not usuario:
        print("Erro: Nenhum usuário cadastrado no banco!")
        exit(1)

    print(f"Usuário/Inspetor selecionado: {usuario.nome} (ID: {usuario.id})")

    # 3. Criar Templates de Checklist Regulatórios
    template_pmoc = TemplateChecklist.query.filter_by(regulacao="pmoc").first()
    if not template_pmoc:
        template_pmoc = TemplateChecklist(
            nome="PMOC - Plano de Manutenção e Controle HVAC",
            regulacao="pmoc",
            versao="1.2",
            itens=[
                {"id": 1, "pergunta": "Verificação e limpeza do filtro de ar", "criticidade": "alta"},
                {"id": 2, "pergunta": "Limpeza e desinfecção da bandeja de drenagem", "criticidade": "alta"},
                {"id": 3, "pergunta": "Verificação do nível de ruído e vibração do motor compressor", "criticidade": "media"},
                {"id": 4, "pergunta": "Medição da corrente elétrica dos motores elétricos", "criticidade": "alta"},
                {"id": 5, "pergunta": "Medição da pressão do fluido refrigerante", "criticidade": "media"},
                {"id": 6, "pergunta": "Verificação do aperto das conexões elétricas", "criticidade": "baixa"}
            ],
            ativo=True
        )
        db.session.add(template_pmoc)
        print("Template PMOC criado.")

    template_nr12 = TemplateChecklist.query.filter_by(regulacao="nr12").first()
    if not template_nr12:
        template_nr12 = TemplateChecklist(
            nome="Inspeção NR-12 - Proteções de Prensas Mecânicas",
            regulacao="nr12",
            versao="2.0",
            itens=[
                {"id": 1, "pergunta": "Presença e integridade das proteções físicas fixas nas partes móveis", "criticidade": "alta"},
                {"id": 2, "pergunta": "Funcionamento correto dos botões de parada de emergência", "criticidade": "alta"},
                {"id": 3, "pergunta": "Estado físico dos sensores ópticos de barreira", "criticidade": "alta"},
                {"id": 4, "pergunta": "Presença de placas indicativas de risco", "criticidade": "baixa"},
                {"id": 5, "pergunta": "Estado do cabeamento elétrico de acionamento bi-manual", "criticidade": "media"}
            ],
            ativo=True
        )
        db.session.add(template_nr12)
        print("Template NR-12 criado.")

    db.session.commit()

    # 4. Criar Ativos Mecânicos
    ativo1 = Ativo.query.filter_by(tag_identificacao="CH-PMOC-01").first()
    if not ativo1:
        ativo1 = Ativo(
            nome="Condicionador de Ar Chiller Principal 50TR",
            tag_identificacao="CH-PMOC-01",
            categoria="hvac",
            fabricante="Carrier",
            modelo="AquaSnap 30RB",
            numero_serie="CAR123456789",
            dados_tecnicos={"capacidade": "50 TR", "fluido": "R-410A", "tensao": "380V"},
            localizacao="Cobertura - Bloco A",
            data_instalacao=date(2024, 1, 15),
            status="ativo",
            empresa_id=empresa.id
        )
        db.session.add(ativo1)
        print("Ativo Chiller PMOC criado.")

    ativo2 = Ativo.query.filter_by(tag_identificacao="PR-NR12-05").first()
    if not ativo2:
        ativo2 = Ativo(
            nome="Prensa Excêntrica de Estampagem 80T",
            tag_identificacao="PR-NR12-05",
            categoria="nr12",
            fabricante="Schuler",
            modelo="PE-80",
            numero_serie="SCH987654321",
            dados_tecnicos={"capacidade": "80 Toneladas", "potencia": "15 HP", "curso": "120 mm"},
            localizacao="Galpão Principal - Linha 2",
            data_instalacao=date(2023, 6, 20),
            status="ativo",
            empresa_id=empresa.id
        )
        db.session.add(ativo2)
        print("Ativo Prensa NR-12 criado.")

    db.session.commit()

    # 5. Criar Contrato AMC
    contrato = ContratoAMC.query.filter_by(titulo="Contrato Anual PMOC HVAC").first()
    if not contrato:
        contrato = ContratoAMC(
            titulo="Contrato Anual PMOC HVAC",
            plano="mensal",
            valor_recorrente=3500.00,
            data_inicio=date(2026, 1, 1),
            data_fim=date(2027, 1, 1),
            status="ativo",
            empresa_id=empresa.id
        )
        db.session.add(contrato)
        print("Contrato AMC criado.")

    db.session.commit()

    # 6. Agendar Inspeções de Teste
    inspecao1 = Inspecao.query.filter_by(status="agendada", ativo_id=ativo1.id).first()
    if not inspecao1:
        inspecao1 = Inspecao(
            data_inspecao=date.today(),
            status="agendada",
            ativo_id=ativo1.id,
            template_id=template_pmoc.id,
            contrato_amc_id=contrato.id,
            inspetor_id=usuario.id,
            criado_por_id=usuario.id
        )
        db.session.add(inspecao1)
        print("Inspeção agendada para Chiller criada.")

    inspecao2 = Inspecao.query.filter_by(status="agendada", ativo_id=ativo2.id).first()
    if not inspecao2:
        inspecao2 = Inspecao(
            data_inspecao=date.today() + timedelta(days=1),
            status="agendada",
            ativo_id=ativo2.id,
            template_id=template_nr12.id,
            inspetor_id=usuario.id,
            criado_por_id=usuario.id
        )
        db.session.add(inspecao2)
        print("Inspeção agendada para Prensa criada.")

    db.session.commit()
    print("Seed de dados concluído com sucesso!")

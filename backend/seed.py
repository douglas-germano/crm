"""
Seed script para popular o banco de dados do CRM Engetch com dados de exemplo.
Uso: python seed.py
"""
from app import create_app, db
from app.models.tenant import Tenant
from app.models import (
    Usuario, Perfil, Lead, Pipeline, Estagio, LeadEstagio,
    Negocio, AtividadeNegocio, Empresa, Contato, Servico,
    Projeto, Tarefa, ChecklistItem, Permissao
)
from datetime import datetime, timedelta
from sqlalchemy import text
import random

app = create_app()


def seed():
    with app.app_context():
        print("=== SEED (MULTI-TENANT): Preparando Postgres ===\n")

        # 1. Configurar banco principal (public)
        # Vamos criar pelo menos a tabela do Tenant explicitamente no public.
        db.create_all()

        # Configurar Tenant e Schema
        db.session.execute(text("CREATE SCHEMA IF NOT EXISTS engetch;"))
        db.session.commit()
        
        # Cria ou atualiza o tenant principal
        tenant = Tenant.query.filter_by(subdominio='engetch').first()
        if not tenant:
            tenant = Tenant(nome_fantasia='Engetch Engenharia', subdominio='engetch', db_schema='engetch')
            db.session.add(tenant)
            db.session.commit()
            print("[✓] Tenant 'engetch' registrado no schema public")

        # 2. Direcionar o ORM para atuar EXCLUSIVAMENTE dentro do novo schema isolado para criação das tabelas
        db.session.execute(text("SET search_path TO engetch;"))
        
        # 3. Limpar e recriar as tabelas desse tenant
        print("[✓] Derrubando tabelas antigas neste schema (se existirem)...")
        # Usamos metadata schema para garantir que tudo (exceto public) venha pro schema certo
        for table in reversed(db.metadata.sorted_tables):
            if table.schema != 'public':
                db.session.execute(text(f"DROP TABLE IF EXISTS engetch.{table.name} CASCADE;"))
        db.session.commit()

        print("[✓] Criando tabelas da arquitetura Multi-Tenant isolada em 'engetch'...")
        # Adicionar dinamicamente schema engetch nas tabelas pra forçar DDL
        for table in db.metadata.tables.values():
            if table.schema != 'public':
                table.schema = 'engetch'
                
        db.create_all()
        
        # Tirar a amarra forçada de schema da metadata para não quebrar queries de runtime
        for table in db.metadata.tables.values():
            if table.schema == 'engetch':
                table.schema = None

        # Agora voltamos o search_path normal pra popular os dados
        db.session.execute(text("SET search_path TO engetch, public;"))

        # 4. Inicializar dados globais que o __init__ não faz mais
        from app.utils.iniciar_dados import inicializar_dados
        inicializar_dados()
        
        Pipeline.criar_pipeline_padrao()
        
        # O admin já foi criado em inicializar_dados(), então aqui apenas pegamos os outros perfis
        admin_perfil = Perfil.query.filter_by(nome='Administrador').first()
        vendedor_perfil = Perfil.query.filter_by(nome='Vendedor').first()
        supervisor_perfil = Perfil.query.filter_by(nome='Supervisor').first()

        # --- Usuários ---
        print("[1/9] Criando usuários...")
        usuarios_data = [
            {'nome': 'Carlos Mendes', 'email': 'carlos@engetch.com', 'senha': 'eng123', 'perfil': supervisor_perfil},
            {'nome': 'Fernanda Lima', 'email': 'fernanda@engetch.com', 'senha': 'eng123', 'perfil': vendedor_perfil},
            {'nome': 'Ricardo Santos', 'email': 'ricardo@engetch.com', 'senha': 'eng123', 'perfil': vendedor_perfil},
            {'nome': 'Ana Paula Costa', 'email': 'ana@engetch.com', 'senha': 'eng123', 'perfil': vendedor_perfil},
        ]

        usuarios = []
        for u in usuarios_data:
            existing = Usuario.query.filter_by(email=u['email']).first()
            if not existing:
                user = Usuario(
                    nome=u['nome'],
                    email=u['email'],
                    perfil_id=u['perfil'].id if u['perfil'] else admin_perfil.id,
                    ativo=True,
                    deve_trocar_senha=False,
                )
                user.set_senha(u['senha'])
                db.session.add(user)
                usuarios.append(user)
            else:
                usuarios.append(existing)
        db.session.commit()

        # Include admin
        admin = Usuario.query.filter_by(email='admin@example.com').first()
        if admin:
            usuarios.insert(0, admin)

        print(f"   {len(usuarios)} usuários disponíveis")

        # --- Serviços ---
        print("[2/9] Criando serviços...")
        servicos_data = [
            {'nome': 'Projeto Mecânico', 'descricao': 'Desenvolvimento de projetos mecânicos completos', 'categoria': 'projeto'},
            {'nome': 'Manutenção Preventiva', 'descricao': 'Plano de manutenção preventiva industrial', 'categoria': 'manutencao'},
            {'nome': 'Manutenção Corretiva', 'descricao': 'Reparo e correção de equipamentos', 'categoria': 'manutencao'},
            {'nome': 'Consultoria Técnica', 'descricao': 'Consultoria em engenharia mecânica e processos', 'categoria': 'consultoria'},
            {'nome': 'Fabricação de Peças', 'descricao': 'Fabricação sob demanda de peças e componentes', 'categoria': 'fabricacao'},
            {'nome': 'Inspeção Técnica', 'descricao': 'Inspeção e laudo técnico de equipamentos', 'categoria': 'inspecao'},
            {'nome': 'Automação Industrial', 'descricao': 'Projetos de automação e controle de processos', 'categoria': 'projeto'},
            {'nome': 'Reforma de Equipamentos', 'descricao': 'Reforma e retrofit de máquinas industriais', 'categoria': 'manutencao'},
        ]

        servicos = []
        for s in servicos_data:
            existing = Servico.query.filter_by(nome=s['nome']).first()
            if not existing:
                servico = Servico(**s)
                db.session.add(servico)
                servicos.append(servico)
            else:
                servicos.append(existing)
        db.session.commit()
        print(f"   {len(servicos)} serviços criados")

        # --- Empresas ---
        print("[3/9] Criando empresas...")
        empresas_data = [
            {
                'razao_social': 'Indústria Metalúrgica Rondon Ltda',
                'nome_fantasia': 'MetalRondon',
                'cnpj': '12.345.678/0001-90',
                'ramo': 'Metalurgia',
                'porte': 'Medio',
                'cidade': 'Rondonópolis', 'estado': 'MT',
                'telefone': '(66) 3423-1000',
                'email': 'contato@metalrondon.com.br',
                'endereco': 'Av. Industrial, 1500 - Distrito Industrial',
            },
            {
                'razao_social': 'Agro Máquinas do Cerrado S.A.',
                'nome_fantasia': 'AgroCerrado',
                'cnpj': '23.456.789/0001-01',
                'ramo': 'Máquinas Agrícolas',
                'porte': 'Grande',
                'cidade': 'Rondonópolis', 'estado': 'MT',
                'telefone': '(66) 3411-2000',
                'email': 'comercial@agrocerrado.com.br',
                'endereco': 'Rod. BR-364 Km 12',
            },
            {
                'razao_social': 'Frigorífico Boi Forte Ltda',
                'nome_fantasia': 'Boi Forte',
                'cnpj': '34.567.890/0001-12',
                'ramo': 'Frigorífico',
                'porte': 'Grande',
                'cidade': 'Rondonópolis', 'estado': 'MT',
                'telefone': '(66) 3439-3000',
                'email': 'manutencao@boiforte.com.br',
                'endereco': 'Av. Amazonas, 3200',
            },
            {
                'razao_social': 'Cerealista Planalto ME',
                'nome_fantasia': 'Planalto Grãos',
                'cnpj': '45.678.901/0001-23',
                'ramo': 'Armazém de Grãos',
                'porte': 'Medio',
                'cidade': 'Primavera do Leste', 'estado': 'MT',
                'telefone': '(66) 3498-4000',
                'email': 'operacao@planaltograos.com.br',
                'endereco': 'Rua dos Armazéns, 800',
            },
            {
                'razao_social': 'Transportadora Rota Sul Ltda',
                'nome_fantasia': 'Rota Sul',
                'cnpj': '56.789.012/0001-34',
                'ramo': 'Transporte e Logística',
                'porte': 'Medio',
                'cidade': 'Rondonópolis', 'estado': 'MT',
                'telefone': '(66) 3421-5000',
                'email': 'frota@rotasul.com.br',
                'endereco': 'Rod. MT-270 Km 5',
            },
            {
                'razao_social': 'Usina de Etanol Verde Campo S.A.',
                'nome_fantasia': 'Verde Campo Energia',
                'cnpj': '67.890.123/0001-45',
                'ramo': 'Usina Sucroalcooleira',
                'porte': 'Grande',
                'cidade': 'Campo Verde', 'estado': 'MT',
                'telefone': '(66) 3419-6000',
                'email': 'engenharia@verdecampo.com.br',
                'endereco': 'Fazenda São Jorge, s/n',
            },
            {
                'razao_social': 'Construtora Progresso Eireli',
                'nome_fantasia': 'Progresso Construções',
                'cnpj': '78.901.234/0001-56',
                'ramo': 'Construção Civil',
                'porte': 'Pequeno',
                'cidade': 'Rondonópolis', 'estado': 'MT',
                'telefone': '(66) 3423-7000',
                'email': 'obras@progresso.com.br',
                'endereco': 'Rua Poxoréu, 450 - Centro',
            },
            {
                'razao_social': 'Mineração Serra Azul Ltda',
                'nome_fantasia': 'Serra Azul',
                'cnpj': '89.012.345/0001-67',
                'ramo': 'Mineração',
                'porte': 'Grande',
                'cidade': 'Itiquira', 'estado': 'MT',
                'telefone': '(66) 3491-8000',
                'email': 'operacoes@serraazul.com.br',
                'endereco': 'Estrada da Mina, Km 22',
            },
        ]

        empresas = []
        for e in empresas_data:
            existing = Empresa.query.filter_by(cnpj=e['cnpj']).first()
            if not existing:
                empresa = Empresa(**e)
                db.session.add(empresa)
                empresas.append(empresa)
            else:
                empresas.append(existing)
        db.session.commit()
        print(f"   {len(empresas)} empresas criadas")

        # --- Contatos ---
        print("[4/9] Criando contatos...")
        contatos_data = [
            # MetalRondon
            {'nome': 'José Roberto Almeida', 'cargo': 'Diretor Industrial', 'email': 'jose.roberto@metalrondon.com.br', 'telefone': '(66) 3423-1001', 'celular': '(66) 99901-1001', 'principal': True, 'empresa_id': 1},
            {'nome': 'Marcos Vinícius', 'cargo': 'Gerente de Manutenção', 'email': 'marcos@metalrondon.com.br', 'telefone': '(66) 3423-1002', 'celular': '(66) 99902-1002', 'principal': False, 'empresa_id': 1},
            # AgroCerrado
            {'nome': 'Paulo Henrique Souza', 'cargo': 'Gerente de Operações', 'email': 'paulo@agrocerrado.com.br', 'telefone': '(66) 3411-2001', 'celular': '(66) 99903-2001', 'principal': True, 'empresa_id': 2},
            {'nome': 'Tatiana Oliveira', 'cargo': 'Engenheira de Produção', 'email': 'tatiana@agrocerrado.com.br', 'telefone': '(66) 3411-2002', 'celular': '(66) 99904-2002', 'principal': False, 'empresa_id': 2},
            # Boi Forte
            {'nome': 'Eduardo Lima', 'cargo': 'Coordenador de Manutenção', 'email': 'eduardo@boiforte.com.br', 'telefone': '(66) 3439-3001', 'celular': '(66) 99905-3001', 'principal': True, 'empresa_id': 3},
            # Planalto
            {'nome': 'Renata Campos', 'cargo': 'Gerente Operacional', 'email': 'renata@planaltograos.com.br', 'telefone': '(66) 3498-4001', 'celular': '(66) 99906-4001', 'principal': True, 'empresa_id': 4},
            # Rota Sul
            {'nome': 'Antônio Pereira', 'cargo': 'Gerente de Frota', 'email': 'antonio@rotasul.com.br', 'telefone': '(66) 3421-5001', 'celular': '(66) 99907-5001', 'principal': True, 'empresa_id': 5},
            # Verde Campo
            {'nome': 'Luciana Ferreira', 'cargo': 'Diretora de Engenharia', 'email': 'luciana@verdecampo.com.br', 'telefone': '(66) 3419-6001', 'celular': '(66) 99908-6001', 'principal': True, 'empresa_id': 6},
            {'nome': 'Fernando Gomes', 'cargo': 'Supervisor de Manutenção', 'email': 'fernando@verdecampo.com.br', 'telefone': '(66) 3419-6002', 'celular': '(66) 99909-6002', 'principal': False, 'empresa_id': 6},
            # Progresso
            {'nome': 'Marcelo Dias', 'cargo': 'Engenheiro Civil', 'email': 'marcelo@progresso.com.br', 'telefone': '(66) 3423-7001', 'celular': '(66) 99910-7001', 'principal': True, 'empresa_id': 7},
            # Serra Azul
            {'nome': 'Roberto Nascimento', 'cargo': 'Gerente de Mina', 'email': 'roberto@serraazul.com.br', 'telefone': '(66) 3491-8001', 'celular': '(66) 99911-8001', 'principal': True, 'empresa_id': 8},
            {'nome': 'Adriana Moreira', 'cargo': 'Engenheira Mecânica', 'email': 'adriana@serraazul.com.br', 'telefone': '(66) 3491-8002', 'celular': '(66) 99912-8002', 'principal': False, 'empresa_id': 8},
        ]

        contatos_criados = 0
        for c in contatos_data:
            if not Contato.query.filter_by(email=c['email']).first():
                db.session.add(Contato(**c))
                contatos_criados += 1
        db.session.commit()
        print(f"   {contatos_criados} contatos criados")

        # --- Leads ---
        print("[5/9] Criando leads...")
        origens = ['Site', 'Indicação', 'Evento', 'LinkedIn', 'Outro']
        leads_data = [
            {'nome': 'José Roberto Almeida', 'email': 'jose.roberto@metalrondon.com.br', 'telefone': '(66) 99901-1001', 'empresa': 'MetalRondon', 'empresa_id': 1, 'cargo': 'Diretor Industrial', 'interesse': 'Manutenção preventiva de ponte rolante', 'origem': 'Indicação', 'status': 'qualificado'},
            {'nome': 'Paulo Henrique Souza', 'email': 'paulo@agrocerrado.com.br', 'telefone': '(66) 99903-2001', 'empresa': 'AgroCerrado', 'empresa_id': 2, 'cargo': 'Gerente de Operações', 'interesse': 'Projeto de esteira transportadora', 'origem': 'Evento', 'status': 'convertido'},
            {'nome': 'Eduardo Lima', 'email': 'eduardo@boiforte.com.br', 'telefone': '(66) 99905-3001', 'empresa': 'Boi Forte', 'empresa_id': 3, 'cargo': 'Coord. Manutenção', 'interesse': 'Reforma de câmara fria', 'origem': 'Site', 'status': 'qualificado'},
            {'nome': 'Renata Campos', 'email': 'renata@planaltograos.com.br', 'telefone': '(66) 99906-4001', 'empresa': 'Planalto Grãos', 'empresa_id': 4, 'cargo': 'Gerente Operacional', 'interesse': 'Inspeção de silos', 'origem': 'LinkedIn', 'status': 'contatado'},
            {'nome': 'Antônio Pereira', 'email': 'antonio@rotasul.com.br', 'telefone': '(66) 99907-5001', 'empresa': 'Rota Sul', 'empresa_id': 5, 'cargo': 'Gerente de Frota', 'interesse': 'Manutenção de implementos rodoviários', 'origem': 'Indicação', 'status': 'novo'},
            {'nome': 'Luciana Ferreira', 'email': 'luciana@verdecampo.com.br', 'telefone': '(66) 99908-6001', 'empresa': 'Verde Campo Energia', 'empresa_id': 6, 'cargo': 'Diretora de Engenharia', 'interesse': 'Automação de caldeira', 'origem': 'Evento', 'status': 'convertido'},
            {'nome': 'Marcelo Dias', 'email': 'marcelo@progresso.com.br', 'telefone': '(66) 99910-7001', 'empresa': 'Progresso Construções', 'empresa_id': 7, 'cargo': 'Engenheiro Civil', 'interesse': 'Estruturas metálicas para galpão', 'origem': 'Site', 'status': 'contatado'},
            {'nome': 'Roberto Nascimento', 'email': 'roberto@serraazul.com.br', 'telefone': '(66) 99911-8001', 'empresa': 'Serra Azul', 'empresa_id': 8, 'cargo': 'Gerente de Mina', 'interesse': 'Reforma de britador', 'origem': 'Indicação', 'status': 'qualificado'},
            {'nome': 'Adriana Moreira', 'email': 'adriana@serraazul.com.br', 'telefone': '(66) 99912-8002', 'empresa': 'Serra Azul', 'empresa_id': 8, 'cargo': 'Engenheira Mecânica', 'interesse': 'Projeto de correia transportadora', 'origem': 'LinkedIn', 'status': 'novo'},
            {'nome': 'Marcos Vinícius', 'email': 'marcos@metalrondon.com.br', 'telefone': '(66) 99902-1002', 'empresa': 'MetalRondon', 'empresa_id': 1, 'cargo': 'Gerente de Manutenção', 'interesse': 'Contrato anual de manutenção', 'origem': 'Indicação', 'status': 'convertido'},
            {'nome': 'Fernando Gomes', 'email': 'fernando@verdecampo.com.br', 'telefone': '(66) 99909-6002', 'empresa': 'Verde Campo Energia', 'empresa_id': 6, 'cargo': 'Supervisor de Manutenção', 'interesse': 'Troca de tubulação de vapor', 'origem': 'Site', 'status': 'contatado'},
            {'nome': 'Daniel Albuquerque', 'email': 'daniel@gmail.com', 'telefone': '(66) 99913-0001', 'empresa': '', 'cargo': 'Proprietário', 'interesse': 'Projeto de galpão industrial', 'origem': 'Site', 'status': 'novo'},
            {'nome': 'Patrícia Monteiro', 'email': 'patricia@fazendasm.com.br', 'telefone': '(66) 99914-0002', 'empresa': 'Fazenda Santa Maria', 'cargo': 'Administradora', 'interesse': 'Sistema de irrigação', 'origem': 'Evento', 'status': 'perdido'},
            {'nome': 'Gustavo Ribeiro', 'email': 'gustavo@ceramicamt.com.br', 'telefone': '(66) 99915-0003', 'empresa': 'Cerâmica MT', 'cargo': 'Diretor', 'interesse': 'Reforma de forno industrial', 'origem': 'LinkedIn', 'status': 'qualificado'},
            {'nome': 'Cláudia Martins', 'email': 'claudia@laticiniobr.com.br', 'telefone': '(66) 99916-0004', 'empresa': 'Laticínio Brasil', 'cargo': 'Gerente de Produção', 'interesse': 'Projeto de linha de produção', 'origem': 'Indicação', 'status': 'novo'},
        ]

        leads = []
        for l in leads_data:
            existing = Lead.query.filter_by(email=l['email']).first()
            if not existing:
                lead = Lead(
                    nome=l['nome'],
                    email=l['email'],
                    telefone=l.get('telefone'),
                    empresa=l.get('empresa', ''),
                    empresa_id=l.get('empresa_id'),
                    cargo=l.get('cargo'),
                    interesse=l.get('interesse'),
                    origem=l.get('origem'),
                    status=l.get('status', 'novo'),
                    responsavel_id=random.choice(usuarios).id,
                )
                db.session.add(lead)
                leads.append(lead)
            else:
                leads.append(existing)
        db.session.commit()
        print(f"   {len(leads)} leads criados")

        # --- Pipeline e LeadEstagios ---
        print("[6/9] Adicionando leads ao pipeline...")
        pipeline = Pipeline.query.first()
        estagios = Estagio.query.filter_by(pipeline_id=pipeline.id).order_by(Estagio.ordem).all()

        # Distribuir leads pelos estágios
        distribuicao = {
            'novo': 0,       # Prospecção
            'contatado': 1,  # Qualificação
            'qualificado': 2,  # Levantamento Técnico
            'convertido': 5, # Contrato/OS
            'perdido': 8,    # Perdido
        }

        lead_estagios_criados = 0
        for lead in leads:
            estagio_idx = distribuicao.get(lead.status, 0)
            if estagio_idx < len(estagios):
                existing = LeadEstagio.query.filter_by(lead_id=lead.id).first()
                if not existing:
                    le = LeadEstagio(
                        lead_id=lead.id,
                        estagio_id=estagios[estagio_idx].id,
                        posicao=lead_estagios_criados,
                    )
                    db.session.add(le)
                    lead_estagios_criados += 1
        db.session.commit()
        print(f"   {lead_estagios_criados} leads adicionados ao pipeline")

        # --- Negócios ---
        print("[7/9] Criando negócios...")
        negocios_data = [
            {'nome': 'Manutenção Ponte Rolante - MetalRondon', 'valor': 45000, 'tipo': 'unico', 'probabilidade': 80, 'status': 'aberto', 'lead_idx': 0, 'servico_idx': 1, 'estagio_idx': 3, 'dias_previsao': 30},
            {'nome': 'Projeto Esteira Transportadora - AgroCerrado', 'valor': 120000, 'tipo': 'unico', 'probabilidade': 95, 'status': 'ganho', 'lead_idx': 1, 'servico_idx': 0, 'estagio_idx': 7, 'dias_previsao': -15},
            {'nome': 'Reforma Câmara Fria - Boi Forte', 'valor': 78000, 'tipo': 'unico', 'probabilidade': 60, 'status': 'aberto', 'lead_idx': 2, 'servico_idx': 7, 'estagio_idx': 2, 'dias_previsao': 45},
            {'nome': 'Inspeção Silos - Planalto Grãos', 'valor': 15000, 'tipo': 'unico', 'probabilidade': 40, 'status': 'aberto', 'lead_idx': 3, 'servico_idx': 5, 'estagio_idx': 1, 'dias_previsao': 20},
            {'nome': 'Automação Caldeira - Verde Campo', 'valor': 250000, 'tipo': 'unico', 'probabilidade': 90, 'status': 'ganho', 'lead_idx': 5, 'servico_idx': 6, 'estagio_idx': 7, 'dias_previsao': -30},
            {'nome': 'Contrato Manutenção Anual - MetalRondon', 'valor': 8500, 'tipo': 'recorrente', 'periodicidade': 'mensal', 'probabilidade': 100, 'status': 'ganho', 'lead_idx': 9, 'servico_idx': 1, 'estagio_idx': 7, 'dias_previsao': -60},
            {'nome': 'Estrutura Metálica Galpão - Progresso', 'valor': 95000, 'tipo': 'unico', 'probabilidade': 30, 'status': 'aberto', 'lead_idx': 6, 'servico_idx': 4, 'estagio_idx': 1, 'dias_previsao': 60},
            {'nome': 'Reforma Britador - Serra Azul', 'valor': 180000, 'tipo': 'unico', 'probabilidade': 70, 'status': 'aberto', 'lead_idx': 7, 'servico_idx': 7, 'estagio_idx': 3, 'dias_previsao': 40},
            {'nome': 'Correia Transportadora - Serra Azul', 'valor': 65000, 'tipo': 'unico', 'probabilidade': 20, 'status': 'aberto', 'lead_idx': 8, 'servico_idx': 0, 'estagio_idx': 0, 'dias_previsao': 90},
            {'nome': 'Tubulação Vapor - Verde Campo', 'valor': 55000, 'tipo': 'unico', 'probabilidade': 50, 'status': 'aberto', 'lead_idx': 10, 'servico_idx': 2, 'estagio_idx': 2, 'dias_previsao': 35},
            {'nome': 'Manutenção Implementos - Rota Sul', 'valor': 32000, 'tipo': 'unico', 'probabilidade': 15, 'status': 'perdido', 'lead_idx': 4, 'servico_idx': 2, 'estagio_idx': 8, 'dias_previsao': -10},
            {'nome': 'Sistema Irrigação - Fazenda SM', 'valor': 42000, 'tipo': 'unico', 'probabilidade': 10, 'status': 'perdido', 'lead_idx': 12, 'servico_idx': 0, 'estagio_idx': 8, 'dias_previsao': -20},
            {'nome': 'Reforma Forno Industrial - Cerâmica MT', 'valor': 88000, 'tipo': 'unico', 'probabilidade': 65, 'status': 'aberto', 'lead_idx': 13, 'servico_idx': 7, 'estagio_idx': 3, 'dias_previsao': 50},
        ]

        negocios = []
        for n in negocios_data:
            lead = leads[n['lead_idx']] if n['lead_idx'] < len(leads) else leads[0]
            servico = servicos[n['servico_idx']] if n['servico_idx'] < len(servicos) else servicos[0]
            estagio = estagios[n['estagio_idx']] if n['estagio_idx'] < len(estagios) else estagios[0]

            existing = Negocio.query.filter_by(nome=n['nome']).first()
            if not existing:
                negocio = Negocio(
                    nome=n['nome'],
                    descricao=f"Negócio referente a {n['nome']}",
                    valor=n['valor'],
                    tipo=n['tipo'],
                    periodicidade=n.get('periodicidade'),
                    probabilidade=n['probabilidade'],
                    data_previsao_fechamento=datetime.utcnow().date() + timedelta(days=n['dias_previsao']),
                    status=n['status'],
                    lead_id=lead.id,
                    pipeline_id=pipeline.id,
                    estagio_id=estagio.id,
                    servico_id=servico.id,
                    responsavel_id=random.choice(usuarios).id,
                    criado_por_id=usuarios[0].id if usuarios else 1,
                )
                if n['status'] == 'ganho':
                    negocio.data_fechamento = datetime.utcnow() - timedelta(days=abs(n['dias_previsao']))
                elif n['status'] == 'perdido':
                    negocio.data_fechamento = datetime.utcnow() - timedelta(days=abs(n['dias_previsao']))
                    negocio.motivo = random.choice([
                        'Cliente optou por concorrente',
                        'Orçamento acima do esperado',
                        'Projeto cancelado pelo cliente',
                        'Prazo não atendeu',
                    ])

                db.session.add(negocio)
                negocios.append(negocio)
            else:
                negocios.append(existing)
        db.session.commit()
        print(f"   {len(negocios)} negócios criados")

        # --- Atividades ---
        print("[8/9] Criando atividades...")
        tipos_atividade = ['reunião', 'chamada', 'email', 'visita_tecnica', 'proposta']
        atividades_criadas = 0

        for negocio in negocios[:8]:
            num_atividades = random.randint(1, 4)
            for i in range(num_atividades):
                tipo = random.choice(tipos_atividade)
                titulos = {
                    'reunião': f'Reunião com {negocio.lead.nome if negocio.lead else "cliente"}',
                    'chamada': f'Ligação de follow-up',
                    'email': f'Envio de proposta por email',
                    'visita_tecnica': f'Visita técnica no local',
                    'proposta': f'Apresentação de proposta comercial',
                }
                dias_atras = random.randint(1, 60)
                status = random.choice(['concluida', 'concluida', 'concluida', 'pendente'])

                atividade = AtividadeNegocio(
                    tipo=tipo,
                    titulo=titulos.get(tipo, 'Atividade'),
                    descricao=f'Atividade relacionada ao negócio {negocio.nome}',
                    data_agendada=datetime.utcnow() - timedelta(days=dias_atras),
                    status=status,
                    negocio_id=negocio.id,
                    responsavel_id=random.choice(usuarios).id,
                )
                if status == 'concluida':
                    atividade.data_conclusao = atividade.data_agendada + timedelta(hours=random.randint(1, 48))
                    atividade.resultado = random.choice([
                        'Cliente demonstrou interesse',
                        'Alinhamento técnico realizado',
                        'Proposta aprovada internamente',
                        'Aguardando retorno do cliente',
                        'Visita técnica concluída com sucesso',
                    ])

                db.session.add(atividade)
                atividades_criadas += 1

        db.session.commit()
        print(f"   {atividades_criadas} atividades criadas")

        # --- Projetos ---
        print("[9/9] Criando projetos...")

        # Buscar negócios ganhos para vincular
        negocio_esteira = Negocio.query.filter_by(nome='Projeto Esteira Transportadora - AgroCerrado').first()
        negocio_caldeira = Negocio.query.filter_by(nome='Automação Caldeira - Verde Campo').first()
        negocio_manutencao = Negocio.query.filter_by(nome='Contrato Manutenção Anual - MetalRondon').first()

        projetos_data = [
            {
                'nome': 'Esteira Transportadora - AgroCerrado',
                'descricao': 'Projeto completo de esteira transportadora para linha de montagem de implementos agrícolas. Inclui projeto mecânico, fabricação e instalação.',
                'status': 'em_andamento',
                'prioridade': 'alta',
                'data_inicio': datetime.utcnow().date() - timedelta(days=20),
                'data_previsao_fim': datetime.utcnow().date() + timedelta(days=40),
                'valor_contrato': 120000,
                'negocio': negocio_esteira,
                'empresa_idx': 1,  # AgroCerrado
                'tarefas': [
                    {'titulo': 'Levantamento dimensional no local', 'status': 'concluida', 'prioridade': 'alta', 'dias_prazo': -15},
                    {'titulo': 'Elaboração do projeto mecânico 3D', 'status': 'concluida', 'prioridade': 'alta', 'dias_prazo': -5},
                    {'titulo': 'Aprovação do projeto pelo cliente', 'status': 'concluida', 'prioridade': 'media', 'dias_prazo': -2},
                    {'titulo': 'Compra de materiais e componentes', 'status': 'em_andamento', 'prioridade': 'alta', 'dias_prazo': 5,
                     'checklist': ['Aço estrutural SAE 1020', 'Rolamentos SKF', 'Motor WEG 5CV', 'Correia transportadora 800mm', 'Parafusos e fixadores']},
                    {'titulo': 'Fabricação da estrutura metálica', 'status': 'em_andamento', 'prioridade': 'alta', 'dias_prazo': 15},
                    {'titulo': 'Usinagem dos eixos e rolos', 'status': 'a_fazer', 'prioridade': 'media', 'dias_prazo': 20},
                    {'titulo': 'Montagem do conjunto', 'status': 'a_fazer', 'prioridade': 'media', 'dias_prazo': 28},
                    {'titulo': 'Pintura e acabamento', 'status': 'a_fazer', 'prioridade': 'baixa', 'dias_prazo': 32},
                    {'titulo': 'Transporte e instalação no cliente', 'status': 'a_fazer', 'prioridade': 'alta', 'dias_prazo': 36},
                    {'titulo': 'Testes de funcionamento e entrega', 'status': 'a_fazer', 'prioridade': 'critica', 'dias_prazo': 40},
                ],
            },
            {
                'nome': 'Automação Caldeira - Verde Campo Energia',
                'descricao': 'Projeto de automação e controle da caldeira principal da usina. Inclui instrumentação, programação de CLP e comissionamento.',
                'status': 'planejamento',
                'prioridade': 'critica',
                'data_inicio': datetime.utcnow().date() + timedelta(days=5),
                'data_previsao_fim': datetime.utcnow().date() + timedelta(days=90),
                'valor_contrato': 250000,
                'negocio': negocio_caldeira,
                'empresa_idx': 5,  # Verde Campo
                'tarefas': [
                    {'titulo': 'Análise P&ID da caldeira existente', 'status': 'em_andamento', 'prioridade': 'alta', 'dias_prazo': 10},
                    {'titulo': 'Especificação de instrumentos de campo', 'status': 'a_fazer', 'prioridade': 'alta', 'dias_prazo': 20},
                    {'titulo': 'Projeto elétrico dos painéis de controle', 'status': 'a_fazer', 'prioridade': 'alta', 'dias_prazo': 30},
                    {'titulo': 'Programação do CLP Siemens S7-1500', 'status': 'a_fazer', 'prioridade': 'critica', 'dias_prazo': 45,
                     'checklist': ['Lógica de intertravamento', 'Malhas de controle PID', 'Telas do IHM', 'Comunicação Profinet', 'Alarmes e histórico']},
                    {'titulo': 'Configuração do sistema SCADA', 'status': 'a_fazer', 'prioridade': 'alta', 'dias_prazo': 55},
                    {'titulo': 'Montagem e cabeamento em campo', 'status': 'a_fazer', 'prioridade': 'media', 'dias_prazo': 65},
                    {'titulo': 'Comissionamento e testes a frio', 'status': 'a_fazer', 'prioridade': 'critica', 'dias_prazo': 75},
                    {'titulo': 'Testes a quente e ajuste de malhas', 'status': 'a_fazer', 'prioridade': 'critica', 'dias_prazo': 85},
                    {'titulo': 'Treinamento da equipe de operação', 'status': 'a_fazer', 'prioridade': 'media', 'dias_prazo': 88},
                ],
            },
            {
                'nome': 'Manutenção Preventiva Anual - MetalRondon',
                'descricao': 'Contrato anual de manutenção preventiva dos equipamentos industriais da MetalRondon. Inclui ponte rolante, compressores e sistema pneumático.',
                'status': 'em_andamento',
                'prioridade': 'media',
                'data_inicio': datetime.utcnow().date() - timedelta(days=60),
                'data_previsao_fim': datetime.utcnow().date() + timedelta(days=305),
                'valor_contrato': 102000,
                'negocio': negocio_manutencao,
                'empresa_idx': 0,  # MetalRondon
                'tarefas': [
                    {'titulo': 'Inspeção mensal - Ponte Rolante 20t', 'status': 'concluida', 'prioridade': 'alta', 'dias_prazo': -30},
                    {'titulo': 'Troca de cabos de aço da ponte rolante', 'status': 'concluida', 'prioridade': 'critica', 'dias_prazo': -25},
                    {'titulo': 'Manutenção compressor Atlas Copco GA30', 'status': 'concluida', 'prioridade': 'media', 'dias_prazo': -20},
                    {'titulo': 'Inspeção mensal - Ponte Rolante 20t (Fev)', 'status': 'concluida', 'prioridade': 'alta', 'dias_prazo': -5},
                    {'titulo': 'Revisão sistema pneumático geral', 'status': 'em_revisao', 'prioridade': 'media', 'dias_prazo': 2,
                     'checklist': ['Verificar válvulas solenoides', 'Testar cilindros pneumáticos', 'Inspecionar mangueiras', 'Calibrar reguladores de pressão']},
                    {'titulo': 'Inspeção mensal - Ponte Rolante 20t (Mar)', 'status': 'em_andamento', 'prioridade': 'alta', 'dias_prazo': 5},
                    {'titulo': 'Lubrificação geral de equipamentos', 'status': 'a_fazer', 'prioridade': 'media', 'dias_prazo': 10},
                    {'titulo': 'Análise de vibração dos motores', 'status': 'a_fazer', 'prioridade': 'alta', 'dias_prazo': 20},
                ],
            },
        ]

        projetos_criados = 0
        for p_data in projetos_data:
            existing = Projeto.query.filter_by(nome=p_data['nome']).first()
            if existing:
                continue

            empresa = empresas[p_data['empresa_idx']] if p_data['empresa_idx'] < len(empresas) else None

            projeto = Projeto(
                nome=p_data['nome'],
                descricao=p_data['descricao'],
                status=p_data['status'],
                prioridade=p_data['prioridade'],
                data_inicio=p_data['data_inicio'],
                data_previsao_fim=p_data['data_previsao_fim'],
                valor_contrato=p_data['valor_contrato'],
                negocio_id=p_data['negocio'].id if p_data['negocio'] else None,
                empresa_id=empresa.id if empresa else None,
                gerente_id=random.choice(usuarios).id,
                criado_por_id=usuarios[0].id if usuarios else 1,
            )
            db.session.add(projeto)
            db.session.flush()  # Get the ID

            # Criar tarefas
            for i, t_data in enumerate(p_data['tarefas']):
                tarefa = Tarefa(
                    titulo=t_data['titulo'],
                    status=t_data['status'],
                    prioridade=t_data['prioridade'],
                    data_prazo=datetime.utcnow().date() + timedelta(days=t_data['dias_prazo']),
                    ordem=i,
                    projeto_id=projeto.id,
                    responsavel_id=random.choice(usuarios).id,
                )
                if t_data['status'] == 'concluida':
                    tarefa.data_conclusao = datetime.utcnow() - timedelta(days=abs(t_data['dias_prazo']))

                db.session.add(tarefa)
                db.session.flush()

                # Criar checklist se houver
                if 'checklist' in t_data:
                    for j, item_text in enumerate(t_data['checklist']):
                        item = ChecklistItem(
                            descricao=item_text,
                            concluido=random.random() < 0.4,  # ~40% concluídos
                            ordem=j,
                            tarefa_id=tarefa.id,
                        )
                        db.session.add(item)

            # Atualizar percentual
            projeto.atualizar_percentual()
            projetos_criados += 1

        db.session.commit()
        print(f"   {projetos_criados} projetos criados")

        # --- Resumo ---
        print("\n=== SEED CONCLUÍDO ===")
        print(f"  Usuários:    {Usuario.query.count()}")
        print(f"  Serviços:    {Servico.query.count()}")
        print(f"  Empresas:    {Empresa.query.count()}")
        print(f"  Contatos:    {Contato.query.count()}")
        print(f"  Leads:       {Lead.query.count()}")
        print(f"  Negócios:    {Negocio.query.count()}")
        print(f"  Atividades:  {AtividadeNegocio.query.count()}")
        print(f"  Projetos:    {Projeto.query.count()}")
        print(f"  Tarefas:     {Tarefa.query.count()}")
        print(f"\n  Login: admin@example.com / admin123")


if __name__ == '__main__':
    seed()

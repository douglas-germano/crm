from app import create_app, db
from app.models import Inspecao
from app.utils.pdf_generator import gerar_pdf_laudo
from sqlalchemy import text

app = create_app()

with app.app_context():
    # Garantir search_path
    db.session.execute(text("SET search_path TO public"))
    db.session.commit()

    print("Buscando uma inspeção para testar geração de PDF...")
    inspecao = Inspecao.query.first()
    if not inspecao:
        print("Erro: Nenhuma inspeção encontrada no banco!")
        exit(1)

    print(f"Inspeção encontrada: ID {inspecao.id} para Ativo {inspecao.ativo.nome}")

    # Simular preenchimento se estiver vazia
    if not inspecao.respostas:
        print("Simulando preenchimento do checklist regulatório...")
        inspecao.respostas = [
            {"pergunta_id": 1, "resposta": "conforme", "observacao": "Filtro limpo com ar comprimido e higienizado."},
            {"pergunta_id": 2, "resposta": "conforme", "observacao": "Dreno totalmente desobstruído."},
            {"pergunta_id": 3, "resposta": "nao_conforme", "observacao": "Rolamento com ruído excessivo, requer substituição imediata."},
            {"pergunta_id": 4, "resposta": "conforme", "observacao": "Corrente elétrica de 12.5A, dentro da faixa nominal."},
            {"pergunta_id": 5, "resposta": "conforme", "observacao": "Pressão de 120 PSI, regular."},
            {"pergunta_id": 6, "resposta": "nao_se_aplica", "observacao": "Item não aplicável a esta unidade evaporadora."}
        ]
        inspecao.observacoes_gerais = (
            "Foi constatada uma não-conformidade de gravidade MÉDIA-ALTA no motor compressor principal (rolamento).\n"
            "Recomenda-se a parada programada em até 15 dias para manutenção corretiva e substituição da peça.\n"
            "Os demais itens atendem plenamente às exigências da ANVISA e regulamentos técnicos de PMOC."
        )
        inspecao.art_numero = "ART-2026-MECH-99"
        inspecao.status = "concluida"
        db.session.commit()
        print("Respostas salvas com sucesso.")

    print("Iniciando geração de PDF...")
    try:
        pdf_buffer = gerar_pdf_laudo(inspecao)
        
        # Salvar o PDF no disco para verificação manual
        with open("test_laudo.pdf", "wb") as f:
            f.write(pdf_buffer.read())
        
        print("Sucesso! PDF gerado e salvo como 'test_laudo.pdf' no diretório backend.")
    except Exception as e:
        print("Erro durante a geração do PDF:", str(e))
        import traceback
        traceback.print_exc()

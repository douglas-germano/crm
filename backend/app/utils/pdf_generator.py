import io
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch

def gerar_pdf_laudo(inspecao):
    """
    Gera um relatório PDF técnico profissional para uma inspeção concluída.
    Retorna um buffer BytesIO contendo o PDF.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=40
    )

    story = []
    styles = getSampleStyleSheet()

    # Cores customizadas da paleta Apex Inspect
    primary_color = colors.HexColor('#0F172A')  # Slate 900
    secondary_color = colors.HexColor('#0284C7')  # Sky 600
    accent_color = colors.HexColor('#E2E8F0')  # Slate 200
    text_color = colors.HexColor('#334155')  # Slate 700
    success_color = colors.HexColor('#16A34A')  # Green 600
    danger_color = colors.HexColor('#DC2626')  # Red 600

    # Estilos customizados de texto
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=24,
        textColor=primary_color,
        spaceAfter=15
    )

    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=12,
        textColor=secondary_color,
        spaceAfter=15
    )

    section_heading = ParagraphStyle(
        'SectionHeading',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=14,
        textColor=primary_color,
        spaceBefore=15,
        spaceAfter=8,
        keepWithNext=True
    )

    normal_text = ParagraphStyle(
        'NormalText',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        textColor=text_color,
        leading=14
    )

    bold_text = ParagraphStyle(
        'BoldText',
        parent=normal_text,
        fontName='Helvetica-Bold'
    )

    table_header_style = ParagraphStyle(
        'TableHeader',
        parent=normal_text,
        fontName='Helvetica-Bold',
        textColor=colors.white,
        fontSize=9
    )

    # ─── CABEÇALHO ────────────────────────────────────────────────────────────
    story.append(Paragraph("APEX INSPECT", title_style))
    story.append(Paragraph("LAUDO TÉCNICO DE CONFORMIDADE REGULATÓRIA", subtitle_style))
    story.append(Spacer(1, 10))

    # ─── METADADOS DA INSPEÇÃO ────────────────────────────────────────────────
    # Determinar se a inspeção foi aprovada (sem inconformidades)
    aprovado = True
    total_inconformes = 0
    respostas = inspecao.respostas or []
    for resp in respostas:
        if resp.get('resposta') == 'nao_conforme':
            aprovado = False
            total_inconformes += 1

    status_texto = "CONFORME / REGULAR" if aprovado else f"INCONFORME ({total_inconformes} Falhas)"
    status_bg = success_color if aprovado else danger_color

    data_meta = [
        [
            Paragraph("<b>TAG do Ativo:</b>", normal_text), Paragraph(inspecao.ativo.tag_identificacao, bold_text),
            Paragraph("<b>Data de Realização:</b>", normal_text), Paragraph(inspecao.data_realizacao.strftime('%d/%m/%Y %H:%M') if inspecao.data_realizacao else inspecao.data_inspecao.strftime('%d/%m/%Y'), normal_text)
        ],
        [
            Paragraph("<b>Equipamento:</b>", normal_text), Paragraph(inspecao.ativo.nome, normal_text),
            Paragraph("<b>Status Geral:</b>", normal_text), Paragraph(f"<font color='white'><b>{status_texto}</b></font>", ParagraphStyle('StatusStyle', parent=normal_text, fontName='Helvetica-Bold', backColor=status_bg, borderPadding=4))
        ],
        [
            Paragraph("<b>Cliente:</b>", normal_text), Paragraph(inspecao.ativo.empresa.razao_social, normal_text),
            Paragraph("<b>ART Vinculada:</b>", normal_text), Paragraph(inspecao.art_numero or "Pendente", bold_text)
        ],
        [
            Paragraph("<b>Responsável Técnico:</b>", normal_text), Paragraph(inspecao.inspetor.nome if inspecao.inspetor else "Não atribuído", normal_text),
            Paragraph("<b>Regulação Técnica:</b>", normal_text), Paragraph(inspecao.template.nome, normal_text)
        ]
    ]

    t_meta = Table(data_meta, colWidths=[110, 150, 110, 150])
    t_meta.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('LINEBELOW', (0,0), (-1,-1), 0.5, accent_color),
    ]))
    story.append(t_meta)
    story.append(Spacer(1, 20))

    # ─── DESCRIÇÃO DO ATIVO ───────────────────────────────────────────────────
    story.append(Paragraph("1. Dados Técnicos do Ativo", section_heading))
    dados_ativos = [
        [Paragraph("<b>Fabricante:</b>", normal_text), Paragraph(inspecao.ativo.fabricante or "N/A", normal_text),
         Paragraph("<b>Modelo:</b>", normal_text), Paragraph(inspecao.ativo.modelo or "N/A", normal_text)],
        [Paragraph("<b>Número de Série:</b>", normal_text), Paragraph(inspecao.ativo.numero_serie or "N/A", normal_text),
         Paragraph("<b>Localização:</b>", normal_text), Paragraph(inspecao.ativo.localizacao or "N/A", normal_text)]
    ]

    # Adicionar parâmetros específicos de JSON
    dados_tecnicos_json = inspecao.ativo.dados_tecnicos or {}
    for k, v in list(dados_tecnicos_json.items())[:4]:  # Limitar a 4 para não desformatar
        dados_ativos.append([
            Paragraph(f"<b>{k.capitalize()}:</b>", normal_text), Paragraph(str(v), normal_text),
            Paragraph("", normal_text), Paragraph("", normal_text)
        ])

    t_ativo = Table(dados_ativos, colWidths=[110, 150, 110, 150])
    t_ativo.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('TOPPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(t_ativo)
    story.append(Spacer(1, 20))

    # ─── RESULTADO DO CHECKLIST ───────────────────────────────────────────────
    story.append(Paragraph("2. Avaliação Detalhada dos Itens de Conformidade", section_heading))
    
    # Criar tabela de checklist
    t_checklist_data = [
        [
            Paragraph("Item / Pergunta", table_header_style), 
            Paragraph("Resultado", table_header_style), 
            Paragraph("Observações Técnicas", table_header_style)
        ]
    ]

    # Mapeamento do template original para obter os textos das perguntas
    itens_template = {item['id']: item for item in (inspecao.template.itens or [])}

    for resp in respostas:
        item_id = resp.get('pergunta_id') or resp.get('id')
        item_template = itens_template.get(item_id, {})
        pergunta_texto = item_template.get('pergunta') or resp.get('pergunta') or f"Item de Avaliação #{item_id}"
        
        resultado_bruto = resp.get('resposta', 'nao_se_aplica')
        if resultado_bruto == 'conforme':
            resultado_texto = f"<font color='{success_color}'><b>CONFORME</b></font>"
        elif resultado_bruto == 'nao_conforme':
            resultado_texto = f"<font color='{danger_color}'><b>INCONFORME</b></font>"
        else:
            resultado_texto = "NÃO SE APLICA"

        observacao_texto = resp.get('observacao') or "Sem observações adicionais."

        t_checklist_data.append([
            Paragraph(pergunta_texto, normal_text),
            Paragraph(resultado_texto, normal_text),
            Paragraph(observacao_texto, normal_text)
        ])

    t_checklist = Table(t_checklist_data, colWidths=[240, 90, 190])
    t_checklist.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), primary_color),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
    ]))
    story.append(t_checklist)
    story.append(Spacer(1, 20))

    # ─── OBSERVAÇÕES GERAIS E PARECER TÉCNICO ──────────────────────────────────
    if inspecao.observacoes_gerais:
        story.append(Paragraph("3. Parecer Técnico & Recomendações", section_heading))
        story.append(Paragraph(inspecao.observacoes_gerais.replace('\n', '<br/>'), normal_text))
        story.append(Spacer(1, 25))

    # ─── ASSINATURAS E RESPONSABILIDADE TÉCNICA ──────────────────────────────
    assinaturas = [
        [
            Paragraph("__________________________________________<br/><b>Responsável Técnico (Engenheiro Mecânico)</b><br/>CREA / ART Nº: " + (inspecao.art_numero or "Pendente"), ParagraphStyle('Ass1', parent=normal_text, alignment=1)),
            Paragraph("__________________________________________<br/><b>Representante do Cliente</b><br/>" + inspecao.ativo.empresa.razao_social, ParagraphStyle('Ass2', parent=normal_text, alignment=1))
        ]
    ]
    t_ass = Table(assinaturas, colWidths=[260, 260])
    t_ass.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'BOTTOM'),
        ('TOPPADDING', (0,0), (-1,-1), 20),
    ]))
    
    story.append(KeepTogether([
        Spacer(1, 20),
        t_ass
    ]))

    doc.build(story)
    buffer.seek(0)
    return buffer

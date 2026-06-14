"""Utilitários de conformidade com a LGPD (Lei 13.709/2018).

Centraliza as operações de tratamento de dados pessoais exigidas pela lei:
- anonimização (art. 16) de leads e contatos;
- exportação consolidada para atender ao direito de acesso e portabilidade (art. 18, II e V);
- rotinas de retenção (art. 15/16) para anonimizar registros antigos e remover IPs de logs.
"""

from datetime import datetime, timezone, timedelta
import uuid

from app import db
from app.domains.crm.models import Lead, Contato, Negocio
from app.domains.core.models import LogAtividade


def _agora():
    return datetime.now(timezone.utc)


def _token_anonimo(prefixo='ANONIMIZADO'):
    return f'{prefixo}-{uuid.uuid4().hex[:8]}'


def anonimizar_lead(lead: Lead) -> Lead:
    """Substitui os dados pessoais do lead por valores anônimos irreversíveis.

    Preserva a linha (e métricas/relacionamentos com negócios) mas elimina a
    identificação do titular, atendendo ao direito de eliminação (art. 18, VI).
    """
    if lead.anonimizado:
        return lead

    lead.nome = _token_anonimo('TITULAR')
    lead.email = f'{_token_anonimo("anon")}@anonimizado.local'
    lead.telefone = None
    lead.cargo = None
    lead.observacoes = None
    lead.empresa_nome = None
    lead.consentimento = False
    lead.consentimento_origem = None
    lead.anonimizado = True
    lead.anonimizado_em = _agora()
    return lead


def anonimizar_contato(contato: Contato) -> Contato:
    """Anonimiza os dados pessoais de um contato preservando o vínculo com a empresa."""
    if contato.anonimizado:
        return contato

    contato.nome = _token_anonimo('CONTATO')
    contato.email = None
    contato.telefone = None
    contato.celular = None
    contato.cargo = None
    contato.observacoes = None
    contato.consentimento = False
    contato.consentimento_origem = None
    contato.anonimizado = True
    contato.anonimizado_em = _agora()
    return contato


def exportar_dados_titular(email: str) -> dict:
    """Reúne todos os dados pessoais associados a um e-mail (acesso + portabilidade).

    Retorna um dicionário estruturado e legível por máquina, conforme art. 18, V e
    art. 19 da LGPD. A busca é feita pelo e-mail (identificador do titular) nos
    leads e contatos, incluindo os negócios vinculados aos leads encontrados.
    """
    email = (email or '').strip().lower()
    if not email:
        return {'erro': 'email obrigatório'}

    leads = Lead.query.filter(db.func.lower(Lead.email) == email).all()
    contatos = Contato.query.filter(db.func.lower(Contato.email) == email).all()

    lead_ids = [l.id for l in leads]
    negocios = []
    if lead_ids:
        negocios = Negocio.query.filter(Negocio.lead_id.in_(lead_ids)).all()

    return {
        'titular': email,
        'gerado_em': _agora().isoformat(),
        'leads': [l.to_dict() for l in leads],
        'contatos': [c.to_dict() for c in contatos],
        'negocios': [n.to_dict() for n in negocios],
        'total_registros': len(leads) + len(contatos) + len(negocios),
    }


def revogar_consentimento_titular(email: str) -> int:
    """Revoga o consentimento de todos os leads/contatos de um titular (art. 8, §5).

    Retorna o número de registros afetados.
    """
    email = (email or '').strip().lower()
    afetados = 0
    for lead in Lead.query.filter(db.func.lower(Lead.email) == email).all():
        lead.consentimento = False
        lead.base_legal = 'legitimo_interesse'
        afetados += 1
    for contato in Contato.query.filter(db.func.lower(Contato.email) == email).all():
        contato.consentimento = False
        afetados += 1
    return afetados


def anonimizar_leads_inativos(dias: int = 730) -> int:
    """Anonimiza leads perdidos/inativos sem atualização há mais de `dias` (padrão 2 anos).

    Política de retenção: dados que não são mais necessários para a finalidade
    devem ser eliminados (art. 15, I e art. 16). Retorna a quantidade anonimizada.
    """
    limite = _agora() - timedelta(days=dias)
    candidatos = Lead.query.filter(
        Lead.anonimizado.is_(False),
        Lead.status.in_(['perdido', 'novo']),
        Lead.data_atualizacao < limite,
    ).all()
    for lead in candidatos:
        anonimizar_lead(lead)
    db.session.commit()
    return len(candidatos)


def purgar_ip_logs(dias: int = 180) -> int:
    """Remove o IP de logs de atividade com mais de `dias` (padrão 6 meses).

    O IP é dado pessoal; mantém-se a trilha de auditoria (ação/usuário/data) mas
    minimiza-se a retenção do dado identificável (art. 6, III - necessidade).
    Retorna a quantidade de logs ajustados.
    """
    limite = _agora() - timedelta(days=dias)
    logs = LogAtividade.query.filter(
        LogAtividade.data_hora < limite,
        LogAtividade.ip.isnot(None),
    ).all()
    for log in logs:
        log.ip = None
    db.session.commit()
    return len(logs)

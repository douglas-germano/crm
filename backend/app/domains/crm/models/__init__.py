"""CRM model exports."""

from app.domains.crm.models.contato import Contato
from app.domains.crm.models.empresa import Empresa
from app.domains.crm.models.lead import Lead
from app.domains.crm.models.negocio import AtividadeNegocio, Negocio
from app.domains.crm.models.pipeline import Estagio, LeadEstagio, Pipeline
from app.domains.crm.models.projeto import Projeto
from app.domains.crm.models.servico import Servico
from app.domains.crm.models.tarefa import ChecklistItem, ComentarioTarefa, Tarefa

__all__ = [
    "AtividadeNegocio",
    "ChecklistItem",
    "ComentarioTarefa",
    "Contato",
    "Empresa",
    "Estagio",
    "Lead",
    "LeadEstagio",
    "Negocio",
    "Pipeline",
    "Projeto",
    "Servico",
    "Tarefa",
]

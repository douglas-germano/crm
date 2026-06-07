"""Inspect model exports."""

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
from app.domains.inspect.models.template_checklist import TemplateChecklist

__all__ = [
    "Ativo",
    "ContratoAMC",
    "Inspecao",
    "OrdemServico",
    "ExecucaoCampo",
    "EvidenciaCampo",
    "ApontamentoHora",
    "MaterialUtilizado",
    "AssinaturaCampo",
    "RelatorioTecnico",
    "TemplateChecklist",
]

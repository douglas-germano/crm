from app.domains.core.models.tenant import Tenant
from app.domains.core.models.usuario import Usuario
from app.domains.core.models.perfil import Perfil, Permissao
from app.domains.core.models.log_atividade import LogAtividade
from app.domains.core.models.platform_user import PlatformAuditLog, PlatformConfig, PlatformUser
from app.domains.crm.models.lead import Lead
from app.domains.crm.models.pipeline import Pipeline, Estagio, LeadEstagio
from app.domains.crm.models.negocio import Negocio, AtividadeNegocio
from app.domains.crm.models.empresa import Empresa
from app.domains.crm.models.contato import Contato
from app.domains.crm.models.servico import Servico
from app.domains.crm.models.projeto import Projeto
from app.domains.crm.models.tarefa import Tarefa, ChecklistItem, ComentarioTarefa
from app.domains.inspect.models.ativo import Ativo
from app.domains.inspect.models.contrato_amc import ContratoAMC
from app.domains.inspect.models.template_checklist import TemplateChecklist
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
from app.domains.core.models.webhook_integracao import WebhookIntegracao

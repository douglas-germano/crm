"""CRM blueprint exports."""

from app.domains.crm.blueprints.dashboard import dashboard_bp
from app.domains.crm.blueprints.empresas import empresas_bp
from app.domains.crm.blueprints.leads import leads_bp
from app.domains.crm.blueprints.negocios import negocios_bp
from app.domains.crm.blueprints.pipelines import pipelines_bp
from app.domains.crm.blueprints.projetos import projetos_bp
from app.domains.crm.blueprints.servicos import servicos_bp
from app.domains.types import BlueprintRegistration

CRM_BLUEPRINTS = (
    BlueprintRegistration(dashboard_bp, "/api/v1/crm/dashboard", "crm"),
    BlueprintRegistration(leads_bp, "/api/v1/crm/leads", "crm"),
    BlueprintRegistration(pipelines_bp, "/api/v1/crm/pipelines", "crm"),
    BlueprintRegistration(negocios_bp, "/api/v1/crm/negocios", "crm"),
    BlueprintRegistration(empresas_bp, "/api/v1/crm/empresas", "crm"),
    BlueprintRegistration(servicos_bp, "/api/v1/crm/servicos", "crm"),
    BlueprintRegistration(projetos_bp, "/api/v1/crm/projetos", "crm"),
)

__all__ = [
    "CRM_BLUEPRINTS",
    "dashboard_bp",
    "leads_bp",
    "pipelines_bp",
    "negocios_bp",
    "empresas_bp",
    "servicos_bp",
    "projetos_bp",
]

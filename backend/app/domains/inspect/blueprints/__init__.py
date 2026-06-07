"""Inspect blueprint exports."""

from app.domains.inspect.blueprints.ativos import ativos_bp
from app.domains.inspect.blueprints.inspecoes import inspecoes_bp
from app.domains.inspect.blueprints.ordens import ordens_bp
from app.domains.types import BlueprintRegistration

INSPECT_BLUEPRINTS = (
    BlueprintRegistration(ativos_bp, "/api/v1/inspect/ativos", "inspect"),
    BlueprintRegistration(inspecoes_bp, "/api/v1/inspect/inspecoes", "inspect"),
    BlueprintRegistration(ordens_bp, "/api/v1/inspect/ordens", "inspect"),
)

__all__ = ["INSPECT_BLUEPRINTS", "ativos_bp", "inspecoes_bp", "ordens_bp"]

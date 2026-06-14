"""Core blueprint exports."""

from app.domains.core.blueprints.admin import admin_bp
from app.domains.core.blueprints.privacidade import privacidade_bp
from app.domains.core.blueprints.super_admin import super_admin_bp
from app.domains.core.blueprints.tenants import tenants_bp
from app.domains.core.blueprints.usuarios import usuarios_bp
from app.domains.core.blueprints.webhook import webhook_bp
from app.domains.types import BlueprintRegistration

CORE_BLUEPRINTS = (
    BlueprintRegistration(usuarios_bp, "/api/v1/core/usuarios", "core"),
    BlueprintRegistration(tenants_bp, "/api/v1/core/tenants", "core"),
    BlueprintRegistration(admin_bp, "/api/v1/core/admin", "core"),
    BlueprintRegistration(super_admin_bp, "/api/v1/core/super-admin", "core"),
    BlueprintRegistration(webhook_bp, "/api/v1/core/webhook", "core"),
    BlueprintRegistration(privacidade_bp, "/api/v1/core/privacidade", "core"),
)

__all__ = [
    "CORE_BLUEPRINTS",
    "usuarios_bp",
    "tenants_bp",
    "admin_bp",
    "super_admin_bp",
    "webhook_bp",
    "privacidade_bp",
]

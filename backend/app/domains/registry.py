"""Blueprint registry grouped by application domain."""

from __future__ import annotations

from typing import Iterable

from flask import Flask

from app.domains.core.blueprints import CORE_BLUEPRINTS
from app.domains.crm.blueprints import CRM_BLUEPRINTS
from app.domains.inspect.blueprints import INSPECT_BLUEPRINTS
from app.domains.types import BlueprintRegistration


BLUEPRINT_REGISTRATIONS: tuple[BlueprintRegistration, ...] = (
    *CORE_BLUEPRINTS,
    *CRM_BLUEPRINTS,
    *INSPECT_BLUEPRINTS,
)


def register_domain_blueprints(app: Flask) -> None:
    """Register API blueprints with versioned domain prefixes.

    The public API contract is `/api/v1/<domain>/<resource>`.
    """

    for item in BLUEPRINT_REGISTRATIONS:
        app.register_blueprint(item.blueprint, url_prefix=item.url_prefix)


def domain_endpoint_prefixes(endpoint_names: Iterable[str]) -> set[str]:
    """Return endpoint prefixes for route checks."""

    prefixes = set(endpoint_names)
    return prefixes

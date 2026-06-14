from flask import Blueprint

privacidade_bp = Blueprint("privacidade", __name__)

from app.domains.core.blueprints.privacidade import routes  # noqa: E402,F401

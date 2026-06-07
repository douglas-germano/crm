from flask import Blueprint

ordens_bp = Blueprint('ordens_inspect', __name__)

from app.domains.inspect.blueprints.ordens import routes

__all__ = ["ordens_bp"]

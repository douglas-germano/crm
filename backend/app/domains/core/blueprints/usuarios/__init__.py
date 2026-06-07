from flask import Blueprint

usuarios_bp = Blueprint("usuarios", __name__)

from app.domains.core.blueprints.usuarios import routes


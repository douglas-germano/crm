from flask import Blueprint

inspecoes_bp = Blueprint("inspecoes", __name__)

from app.domains.inspect.blueprints.inspecoes import routes


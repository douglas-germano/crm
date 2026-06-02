from flask import Blueprint

inspecoes_bp = Blueprint('inspecoes', __name__)

from app.blueprints.inspecoes import routes

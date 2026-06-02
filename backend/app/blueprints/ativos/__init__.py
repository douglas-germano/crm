from flask import Blueprint

ativos_bp = Blueprint('ativos', __name__)

from app.blueprints.ativos import routes

from flask import Blueprint

ativos_bp = Blueprint("ativos", __name__)

from app.domains.inspect.blueprints.ativos import routes


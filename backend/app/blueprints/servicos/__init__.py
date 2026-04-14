from flask import Blueprint

servicos_bp = Blueprint('servicos', __name__)

from app.blueprints.servicos import routes

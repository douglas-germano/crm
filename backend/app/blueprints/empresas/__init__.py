from flask import Blueprint

empresas_bp = Blueprint('empresas', __name__)

from app.blueprints.empresas import routes

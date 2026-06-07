from flask import Blueprint

empresas_bp = Blueprint("empresas", __name__)

from app.domains.crm.blueprints.empresas import routes


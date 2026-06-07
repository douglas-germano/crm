from flask import Blueprint

projetos_bp = Blueprint("projetos", __name__)

from app.domains.crm.blueprints.projetos import routes


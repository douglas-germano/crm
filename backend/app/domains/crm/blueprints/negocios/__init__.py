from flask import Blueprint

negocios_bp = Blueprint("negocios", __name__)

from app.domains.crm.blueprints.negocios import routes


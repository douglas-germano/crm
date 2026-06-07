from flask import Blueprint

servicos_bp = Blueprint("servicos", __name__)

from app.domains.crm.blueprints.servicos import routes


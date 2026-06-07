from flask import Blueprint

leads_bp = Blueprint("leads", __name__)

from app.domains.crm.blueprints.leads import routes


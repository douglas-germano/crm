from flask import Blueprint

dashboard_bp = Blueprint("dashboard", __name__)

from app.domains.crm.blueprints.dashboard import routes


from flask import Blueprint

tenants_bp = Blueprint("tenants", __name__)

from app.domains.core.blueprints.tenants import routes


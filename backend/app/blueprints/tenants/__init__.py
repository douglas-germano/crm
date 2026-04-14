from flask import Blueprint

tenants_bp = Blueprint('tenants', __name__)

from app.blueprints.tenants import routes

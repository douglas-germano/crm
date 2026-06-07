from flask import Blueprint

admin_bp = Blueprint("admin", __name__)

from app.domains.core.blueprints.admin import routes


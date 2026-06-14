from flask import Blueprint

super_admin_bp = Blueprint("super_admin", __name__)

from app.domains.core.blueprints.super_admin import routes

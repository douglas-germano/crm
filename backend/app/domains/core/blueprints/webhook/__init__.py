from flask import Blueprint

webhook_bp = Blueprint("webhook", __name__)

from app.domains.core.blueprints.webhook import routes


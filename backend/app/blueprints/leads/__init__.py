from flask import Blueprint

leads_bp = Blueprint('leads', __name__)

from app.blueprints.leads import routes 
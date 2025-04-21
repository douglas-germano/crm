from flask import Blueprint

negocios_bp = Blueprint('negocios', __name__)

from app.blueprints.negocios import routes 
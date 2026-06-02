from flask import Flask, request
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_cors import CORS
from flask_login import LoginManager
from flask_jwt_extended import JWTManager
import os
import json
from datetime import datetime

class CustomJSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, datetime):
            return obj.isoformat()
        return super().default(obj)

# Inicializar extensões
db = SQLAlchemy()
migrate = Migrate()
login_manager = LoginManager()
jwt = JWTManager()

def create_app(config_name='development'):
    app = Flask(__name__)
    app.url_map.strict_slashes = False

    # Configuração
    if config_name == 'development':
        app.config.from_pyfile('../config/development.py')
    else:
        app.config.from_pyfile('../config/production.py')
    
    # Configurações adicionais para Flask-JWT-Extended
    app.config['JWT_JSON_KEY'] = 'sub'
    
    # Configurar JSON encoder
    app.json_encoder = CustomJSONEncoder
    
    # Inicializar extensões com app
    db.init_app(app)
    migrate.init_app(app, db)
    login_manager.init_app(app)
    jwt.init_app(app)
    CORS(app, origins=app.config.get('CORS_ORIGINS', '*'))
    
    # Configurar login
    login_manager.login_view = 'usuarios.login'
    login_manager.login_message = 'Por favor, faça login para acessar esta página.'
    
    # Registrar blueprints
    from app.blueprints.usuarios import usuarios_bp
    from app.blueprints.leads import leads_bp
    from app.blueprints.pipelines import pipelines_bp
    from app.blueprints.negocios import negocios_bp
    from app.blueprints.empresas import empresas_bp
    from app.blueprints.servicos import servicos_bp
    from app.blueprints.dashboard import dashboard_bp
    from app.blueprints.projetos import projetos_bp
    from app.blueprints.tenants import tenants_bp
    from app.blueprints.admin import admin_bp

    app.register_blueprint(usuarios_bp, url_prefix='/api/usuarios')
    app.register_blueprint(tenants_bp, url_prefix='/api/tenants')
    app.register_blueprint(leads_bp, url_prefix='/api/leads')
    app.register_blueprint(pipelines_bp, url_prefix='/api/pipelines')
    app.register_blueprint(negocios_bp, url_prefix='/api/negocios')
    app.register_blueprint(empresas_bp, url_prefix='/api/empresas')
    app.register_blueprint(servicos_bp, url_prefix='/api/servicos')
    app.register_blueprint(dashboard_bp, url_prefix='/api/dashboard')
    app.register_blueprint(projetos_bp, url_prefix='/api/projetos')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')
    
    from flask_jwt_extended import verify_jwt_in_request, get_jwt
    from flask_jwt_extended.exceptions import NoAuthorizationError
    from sqlalchemy import text

    @app.before_request
    def set_tenant_schema():
        exempt_endpoints = ['usuarios.login', 'usuarios.esqueci_senha', 'usuarios.redefinir_senha']
        if request.endpoint:
            if any(request.endpoint.startswith(ep) for ep in exempt_endpoints) or request.endpoint.startswith('tenants.'):
                return
            
            
        try:
            # Tentar extrair token na mão para rotas que podem ou não ser públicas
            verify_jwt_in_request(optional=True)
            claims = get_jwt()
            if claims and 'schema' in claims:
                import re
                schema = claims['schema']
                if not re.match(r'^[a-z_][a-z0-9_]*$', schema):
                    from flask import abort
                    abort(400)
                db.session.execute(text(f"SET search_path TO {schema}, public"))
        except Exception as e:
            # Em caso de erro com token, ignora e deixa o decorador da rota lidar
            pass

    # Criar banco de dados se não existir
    with app.app_context():
        # A inicialização de dados agora ocorre estritamente via seed.py do Tenant.
        pass
    
    return app
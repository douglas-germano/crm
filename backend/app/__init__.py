from flask import Flask, request
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask.json.provider import DefaultJSONProvider
from datetime import datetime
import os
import re


class CustomJSONProvider(DefaultJSONProvider):
    def default(self, obj):
        if isinstance(obj, datetime):
            return obj.isoformat()
        return super().default(obj)


# Inicializar extensões
db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()


def create_app(config_name=None):
    app = Flask(__name__)
    app.url_map.strict_slashes = False
    app.json = CustomJSONProvider(app)

    # Configuração
    config_name = config_name or os.environ.get('FLASK_ENV') or os.environ.get('APP_ENV') or 'development'
    if config_name == 'development':
        app.config.from_pyfile('../config/development.py')
    else:
        app.config.from_pyfile('../config/production.py')

    # Configurações adicionais para Flask-JWT-Extended
    app.config['JWT_JSON_KEY'] = 'sub'

    # Inicializar extensões com app
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    CORS(app, origins=app.config.get('CORS_ORIGINS', '*'))

    # Registrar blueprints por dominio no contrato versionado /api/v1.
    from app.domains.registry import domain_endpoint_prefixes, register_domain_blueprints

    register_domain_blueprints(app)

    @app.get('/api/v1/health')
    def health_check():
        return {
            'status': 'ok',
            'environment': config_name,
        }, 200

    from app.docs.swagger import init_swagger

    init_swagger(app)

    from flask_jwt_extended import verify_jwt_in_request, get_jwt
    from flask_jwt_extended.exceptions import NoAuthorizationError
    from sqlalchemy import text
    from werkzeug.exceptions import HTTPException

    @app.before_request
    def set_tenant_schema():
        usuarios_endpoints = domain_endpoint_prefixes(['usuarios'])
        tenants_endpoints = domain_endpoint_prefixes(['tenants'])
        webhook_endpoints = domain_endpoint_prefixes(['webhook'])

        exempt_endpoints = {
            f'{prefix}.login' for prefix in usuarios_endpoints
        } | {
            f'{prefix}.esqueci_senha' for prefix in usuarios_endpoints
        } | {
            f'{prefix}.redefinir_senha' for prefix in usuarios_endpoints
        }
        exempt_prefixes = tuple(f'{prefix}.' for prefix in tenants_endpoints)
        exempt_webhook_endpoints = {
            f'{prefix}.receber_lead' for prefix in webhook_endpoints
        }

        if request.endpoint:
            if (any(request.endpoint.startswith(ep) for ep in exempt_endpoints)
                    or request.endpoint.startswith(exempt_prefixes)
                    or request.endpoint in exempt_webhook_endpoints):
                return

        try:
            verify_jwt_in_request(optional=True)
            claims = get_jwt()
            if claims and 'schema' in claims:
                schema = claims['schema']
                if not re.match(r'^[a-z_][a-z0-9_]*$', schema):
                    from flask import abort
                    abort(400)
                db.session.execute(text(f"SET search_path TO {schema}, public"))
        except HTTPException:
            raise
        except Exception:
            app.logger.debug("Token processing skipped in before_request", exc_info=True)

    return app

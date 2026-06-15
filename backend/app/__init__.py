from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
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
# Rate limiting (LGPD art. 46 — proteção contra força bruta/abuso).
# Limites específicos são aplicados por rota via @limiter.limit nos blueprints.
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=[],
    storage_uri=os.environ.get('RATELIMIT_STORAGE_URI', 'memory://'),
)


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
    limiter.init_app(app)

    # CORS — em produção exige origens explícitas (fail-closed). Curinga '*' só em dev.
    cors_origins = app.config.get('CORS_ORIGINS', '*')
    if not app.config.get('DEBUG') and cors_origins == '*':
        app.logger.warning(
            'CORS_ORIGINS não configurado em produção; bloqueando origens cruzadas. '
            'Defina a variável de ambiente CORS_ORIGINS.'
        )
        cors_origins = []
    CORS(app, origins=cors_origins, supports_credentials=True)

    # Cabeçalhos de segurança (LGPD art. 46 — medidas técnicas)
    @app.after_request
    def aplicar_headers_seguranca(response):
        response.headers.setdefault('X-Content-Type-Options', 'nosniff')
        response.headers.setdefault('X-Frame-Options', 'DENY')
        response.headers.setdefault('Referrer-Policy', 'strict-origin-when-cross-origin')
        response.headers.setdefault('X-XSS-Protection', '1; mode=block')
        response.headers.setdefault('Permissions-Policy', 'geolocation=(), microphone=(), camera=()')
        if not app.config.get('DEBUG'):
            response.headers.setdefault(
                'Strict-Transport-Security', 'max-age=31536000; includeSubDomains'
            )
        return response

    # Senha fraca → 400 (validada no setter Usuario.senha)
    from app.utils.validadores import SenhaFracaError

    @app.errorhandler(SenhaFracaError)
    def tratar_senha_fraca(erro):
        return jsonify({'erro': str(erro)}), 400

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

        super_admin_endpoints = domain_endpoint_prefixes(['super_admin'])
        super_admin_prefixes = tuple(f'{prefix}.' for prefix in super_admin_endpoints)

        try:
            verify_jwt_in_request(optional=True)
            claims = get_jwt()
            if claims and claims.get('tipo') == 'platform':
                # Defesa em profundidade: token de plataforma só acessa rotas super-admin.
                # Não troca de schema — opera sempre no schema público global.
                if request.endpoint and not request.endpoint.startswith(super_admin_prefixes):
                    from flask import abort
                    abort(403)
            elif claims and 'schema' in claims:
                schema = claims['schema']
                if not re.match(r'^[a-z_][a-z0-9_]*$', schema):
                    from flask import abort
                    abort(400)
                db.session.execute(text(f"SET search_path TO {schema}, public"))
        except HTTPException:
            raise
        except Exception:
            app.logger.debug("Token processing skipped in before_request", exc_info=True)

    _registrar_comandos_lgpd(app)

    return app


def _registrar_comandos_lgpd(app):
    """Comandos CLI de retenção de dados (LGPD art. 15/16).

    Executam, para cada schema de tenant, as rotinas de anonimização/minimização:
        flask lgpd-retencao-leads [--dias N]
        flask lgpd-purgar-ip-logs [--dias N]
    """
    import click
    from sqlalchemy import text

    def _para_cada_tenant(callback):
        from app.domains.core.models import Tenant
        total = 0
        for tenant in Tenant.query.all():
            if not re.match(r'^[a-z_][a-z0-9_]*$', tenant.db_schema):
                continue
            db.session.execute(text(f"SET search_path TO {tenant.db_schema}, public"))
            total += callback(tenant)
        return total

    @app.cli.command('lgpd-retencao-leads')
    @click.option('--dias', default=730, show_default=True, help='Anonimiza leads inativos há mais de N dias.')
    def lgpd_retencao_leads(dias):
        from app.utils.lgpd import anonimizar_leads_inativos
        total = _para_cada_tenant(lambda t: anonimizar_leads_inativos(dias))
        click.echo(f'LGPD: {total} lead(s) anonimizado(s) por retenção (> {dias} dias).')

    @app.cli.command('lgpd-purgar-ip-logs')
    @click.option('--dias', default=180, show_default=True, help='Remove IP de logs com mais de N dias.')
    def lgpd_purgar_ip_logs(dias):
        from app.utils.lgpd import purgar_ip_logs
        total = _para_cada_tenant(lambda t: purgar_ip_logs(dias))
        click.echo(f'LGPD: IP removido de {total} log(s) de atividade (> {dias} dias).')

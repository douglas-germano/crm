import os
from datetime import timedelta

def get_database_url():
    database_url = os.environ.get('DATABASE_URL')
    if not database_url:
        raise RuntimeError('DATABASE_URL is required in production')
    if database_url.startswith('postgres://'):
        database_url = database_url.replace('postgres://', 'postgresql://', 1)
    return database_url

# Configurações básicas
DEBUG = False
SECRET_KEY = os.environ.get('SECRET_KEY')
if not SECRET_KEY:
    raise RuntimeError('SECRET_KEY is required in production')
SQLALCHEMY_DATABASE_URI = get_database_url()
SQLALCHEMY_TRACK_MODIFICATIONS = False

# Configurações JWT — tokens em cookies httpOnly (não acessíveis a JS)
JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY')
if not JWT_SECRET_KEY:
    raise RuntimeError('JWT_SECRET_KEY is required in production')
JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=15)   # curto: confiado pelas claims
JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)     # revalida usuário + token_version

JWT_TOKEN_LOCATION = ['cookies']
JWT_COOKIE_SECURE = True            # exige HTTPS
JWT_COOKIE_SAMESITE = 'Lax'        # app.* e api.* compartilham o domínio-pai
JWT_COOKIE_CSRF_PROTECT = True     # double-submit CSRF
# Compartilha o cookie entre subdomínios (ex.: .douglasgermano.com) — definido por env
JWT_COOKIE_DOMAIN = os.environ.get('JWT_COOKIE_DOMAIN')
JWT_ACCESS_COOKIE_PATH = '/api/'
JWT_REFRESH_COOKIE_PATH = '/api/v1/core/auth/refresh'

# CORS — se CORS_ORIGINS não estiver definido, permite todas as origens
_cors_list = [o.strip() for o in os.environ.get('CORS_ORIGINS', '').split(',') if o.strip()]
CORS_ORIGINS = _cors_list if _cors_list else '*'

# Frontend URL (usado em e-mails de recuperação de senha)
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'https://app.apexcrm.com.br')

# Master Super Admin Workspace
MASTER_WORKSPACE = os.environ.get('MASTER_WORKSPACE', 'apex')

# Email Settings (Brevo)
BREVO_API_KEY = os.environ.get('BREVO_API_KEY')
MAIL_DEFAULT_SENDER_NAME = os.environ.get('MAIL_DEFAULT_SENDER_NAME', 'Apex CRM')
MAIL_DEFAULT_SENDER_EMAIL = os.environ.get('MAIL_DEFAULT_SENDER_EMAIL', 'suporte@apexcrm.com.br')

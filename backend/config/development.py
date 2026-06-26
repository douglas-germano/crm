import os
from datetime import timedelta

# Configurações básicas
DEBUG = True
SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-key-CHANGE-ME')
SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL', 'sqlite:///crm.sqlite')
SQLALCHEMY_TRACK_MODIFICATIONS = False

# Configurações JWT — tokens em cookies httpOnly (não acessíveis a JS)
JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'dev-secret-key-CHANGE-ME')
JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=15)   # curto: confiado pelas claims
JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)     # revalida usuário + token_version

JWT_TOKEN_LOCATION = ['cookies']
JWT_COOKIE_SECURE = False          # dev em http
JWT_COOKIE_SAMESITE = 'Lax'        # app.* e api.* são same-site
JWT_COOKIE_CSRF_PROTECT = True     # double-submit CSRF
JWT_COOKIE_DOMAIN = os.environ.get('JWT_COOKIE_DOMAIN')  # None em dev (host-only)
JWT_ACCESS_COOKIE_PATH = '/api/'
JWT_REFRESH_COOKIE_PATH = '/api/v1/core/auth/refresh'

# CORS
CORS_ORIGINS = '*'

# Master Super Admin Workspace
MASTER_WORKSPACE = os.environ.get('MASTER_WORKSPACE', 'apex')

# Frontend URL (usado em e-mails de recuperação de senha)
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:3000')

# Email Settings (Brevo)
BREVO_API_KEY = os.environ.get('BREVO_API_KEY', 'your-brevo-api-key-here')
MAIL_DEFAULT_SENDER_NAME = os.environ.get('MAIL_DEFAULT_SENDER_NAME', 'Apex CRM')
MAIL_DEFAULT_SENDER_EMAIL = os.environ.get('MAIL_DEFAULT_SENDER_EMAIL', 'suporte@apexcrm.com.br')
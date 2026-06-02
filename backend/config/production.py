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

# Configurações JWT
JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY')
if not JWT_SECRET_KEY:
    raise RuntimeError('JWT_SECRET_KEY is required in production')
JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=1)
JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)

# CORS
CORS_ORIGINS = [origin.strip() for origin in os.environ.get('CORS_ORIGINS', '').split(',') if origin.strip()]

# Frontend URL (usado em e-mails de recuperação de senha)
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'https://app.apexcrm.com.br')

# Master Super Admin Workspace
MASTER_WORKSPACE = os.environ.get('MASTER_WORKSPACE', 'apex')

# Email Settings (Brevo)
BREVO_API_KEY = os.environ.get('BREVO_API_KEY')
MAIL_DEFAULT_SENDER_NAME = os.environ.get('MAIL_DEFAULT_SENDER_NAME', 'Apex CRM')
MAIL_DEFAULT_SENDER_EMAIL = os.environ.get('MAIL_DEFAULT_SENDER_EMAIL', 'suporte@apexcrm.com.br')

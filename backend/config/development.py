import os
from datetime import timedelta

# Configurações básicas
DEBUG = True
SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-key-CHANGE-ME')
SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL', 'sqlite:///crm.sqlite')
SQLALCHEMY_TRACK_MODIFICATIONS = False

# Configurações JWT
JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'dev-secret-key-CHANGE-ME')
JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=1)
JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)

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
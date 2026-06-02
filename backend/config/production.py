import os
from datetime import timedelta

# Configurações básicas
DEBUG = False
SECRET_KEY = os.environ.get('SECRET_KEY', 'production-secret-key')
SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL', 'sqlite:///' + os.path.join(os.path.abspath(os.path.dirname(os.path.dirname(__file__))), 'crm.sqlite'))
SQLALCHEMY_TRACK_MODIFICATIONS = False

# Configurações JWT
JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'production-jwt-secret-key')
JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=1)
JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)

# CORS
CORS_ORIGINS = os.environ.get('CORS_ORIGINS', 'http://localhost:3000').split(',')

# Frontend URL (usado em e-mails de recuperação de senha)
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'https://app.apexcrm.com.br')

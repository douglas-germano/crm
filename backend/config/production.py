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
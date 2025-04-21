import os
from datetime import timedelta

# Este arquivo contém as configurações específicas para o ambiente de desenvolvimento.

# Configurações básicas
DEBUG = True  # Ativa o modo de depuração para facilitar o desenvolvimento.
SECRET_KEY = 'dev-secret-key-change-in-production'  # Chave secreta para a aplicação.
SQLALCHEMY_DATABASE_URI = 'sqlite:///' + os.path.join(os.path.abspath(os.path.dirname(os.path.dirname(__file__))), 'crm.sqlite')  # Caminho para o banco de dados SQLite.
SQLALCHEMY_TRACK_MODIFICATIONS = False  # Desativa notificações de alterações no SQLAlchemy para melhorar o desempenho.

# Configurações JWT
JWT_SECRET_KEY = 'jwt-secret-key-change-in-production'  # Chave secreta para geração de tokens JWT.
JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=1)  # Tempo de expiração para tokens de acesso.
JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)  # Tempo de expiração para tokens de atualização.
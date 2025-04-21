# Este arquivo inicializa a aplicação Flask e configura suas extensões, blueprints e banco de dados.

from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_cors import CORS
from flask_login import LoginManager
from flask_jwt_extended import JWTManager
import os
import json
from datetime import datetime

class CustomJSONEncoder(json.JSONEncoder):
    # Classe personalizada para serializar objetos datetime em formato ISO 8601.
    def default(self, obj):
        if isinstance(obj, datetime):
            return obj.isoformat()
        return super().default(obj)

# Inicializar extensões
# db: Gerencia o banco de dados.
# migrate: Gerencia migrações do banco de dados.
# login_manager: Gerencia autenticação de usuários.
# jwt: Gerencia tokens JWT para autenticação.
# CORS: Permite requisições de diferentes origens.
db = SQLAlchemy()
migrate = Migrate()
login_manager = LoginManager()
jwt = JWTManager()

def create_app(config_name='development'):
    # Função para criar e configurar a aplicação Flask.
    app = Flask(__name__)
    
    # Configuração da aplicação com base no ambiente (desenvolvimento ou produção).
    if config_name == 'development':
        app.config.from_pyfile('../config/development.py')
    else:
        app.config.from_pyfile('../config/production.py')
    
    # Configurações adicionais para Flask-JWT-Extended
    app.config['JWT_JSON_KEY'] = 'sub'
    
    # Configurar JSON encoder personalizado
    app.json_encoder = CustomJSONEncoder
    
    # Inicializar extensões com a aplicação
    db.init_app(app)
    migrate.init_app(app, db)
    login_manager.init_app(app)
    jwt.init_app(app)
    CORS(app)
    
    # Configurar login
    login_manager.login_view = 'usuarios.login'  # Rota para login
    login_manager.login_message = 'Por favor, faça login para acessar esta página.'
    
    # Registrar blueprints (módulos da aplicação)
    from app.blueprints.usuarios import usuarios_bp
    from app.blueprints.leads import leads_bp
    from app.blueprints.pipelines import pipelines_bp
    from app.blueprints.negocios import negocios_bp
    
    app.register_blueprint(usuarios_bp, url_prefix='/api/usuarios')
    app.register_blueprint(leads_bp, url_prefix='/api/leads')
    app.register_blueprint(pipelines_bp, url_prefix='/api/pipelines')
    app.register_blueprint(negocios_bp, url_prefix='/api/negocios')
    
    # Criar banco de dados e dados iniciais, se necessário
    with app.app_context():
        db.create_all()  # Cria tabelas no banco de dados
        
        # Criar pipeline padrão, se necessário
        from app.models.pipeline import Pipeline
        pipeline_criado = Pipeline.criar_pipeline_padrao()
        
        if pipeline_criado:
            print("Pipeline padrão criado com sucesso!")
            
            # Criar perfil e usuário administrador padrão, se necessário
            from app.models.usuario import Usuario, Perfil
            from app.models.permissao import Permissao
            
            # Criar perfil de administrador
            admin_perfil = Perfil.query.filter_by(nome='Administrador').first()
            if not admin_perfil:
                admin_perfil = Perfil(nome='Administrador', descricao='Acesso total ao sistema')
                db.session.add(admin_perfil)
                db.session.commit()
                print("Perfil de Administrador criado com sucesso!")
            
            # Criar usuário administrador
            admin_user = Usuario.query.filter_by(email='admin@example.com').first()
            if not admin_user:
                admin_user = Usuario(
                    nome='Administrador',
                    email='admin@example.com',
                    ativo=True,
                    perfil_id=admin_perfil.id
                )
                admin_user.set_senha('admin123')
                db.session.add(admin_user)
                db.session.commit()
                print("Usuário administrador criado com sucesso! (Email: admin@example.com, Senha: admin123)")
    
    return app
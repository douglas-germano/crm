from flask import request, jsonify, current_app
from app import db
from app.models.tenant import Tenant
from app.models import Usuario, Perfil, Permissao, Pipeline
from app.blueprints.tenants import tenants_bp
from sqlalchemy import text
from werkzeug.security import generate_password_hash
import uuid
import re

@tenants_bp.route('/registro', methods=['POST'])
def registrar_tenant():
    data = request.get_json()
    
    # 1. Validações Iniciais
    required_fields = ['nome_empresa', 'workspace', 'nome_admin', 'email_admin', 'senha_admin']
    if not data or not all(k in data for k in required_fields):
        return jsonify({'erro': 'Todos os campos (nome da empresa, workspace, nome, email e senha) são obrigatórios.'}), 400
    
    workspace = data['workspace'].lower().strip()
    
    # Valida formato do Workspace (apenas letras minusculas, num, sem espacos)
    if not re.match(r'^[a-z0-9]+$', workspace):
        return jsonify({'erro': 'O workspace deve conter apenas letras minúsculas e números, sem espaços.'}), 400
    
    if workspace in ('public', 'information_schema', 'pg_catalog', 'api', 'admin'):
        return jsonify({'erro': 'Palavra reservada. Escolha outro Workspace.'}), 400
        
    # Verificar unicidade
    if Tenant.query.filter_by(subdominio=workspace).first():
        return jsonify({'erro': 'Este Workspace já está em uso.'}), 409
        
    try:
        # Iniciamos a Criação da Infraestrutura
        
        # 1. Cria na tabela MASTER (public.tenant)
        novo_tenant = Tenant(
            nome_fantasia=data['nome_empresa'],
            subdominio=workspace,
            db_schema=workspace
        )
        db.session.add(novo_tenant)
        db.session.commit()
        
        # 2. Cria DB Schema Fisio
        db.session.execute(text(f"CREATE SCHEMA IF NOT EXISTS {workspace};"))
        db.session.commit()
        
        # 3. Força Criação de Tabelas isoladamente
        db.session.execute(text(f"SET search_path TO {workspace};"))
        
        # Usamos metadata schema injection
        for table in db.metadata.tables.values():
            if table.schema != 'public':
                table.schema = workspace
                
        db.create_all()
        
        # Restaura metadados originais
        for table in db.metadata.tables.values():
            if table.schema == workspace:
                table.schema = None
                
        # Define search path definitivo para popular os dados
        db.session.execute(text(f"SET search_path TO {workspace}, public;"))
        
        # 4. Injeta Permissões base do sistema
        from app.utils.iniciar_dados import criar_permissoes, criar_perfis
        permissoes = criar_permissoes()
        perfis = criar_perfis(permissoes)
        
        # 5. Pipeline padrao
        db.session.execute(text(f"SET search_path TO {workspace}, public;"))
        Pipeline.criar_pipeline_padrao()
        
        # 6. Admin customizado
        db.session.execute(text(f"SET search_path TO {workspace}, public;"))
        perfil_admin = Perfil.query.filter_by(nome='Administrador').first()
        
        admin_user = Usuario(
            nome=data['nome_admin'],
            email=data['email_admin'].lower(),
            perfil_id=perfil_admin.id,
            ativo=True,
            deve_trocar_senha=False
        )
        admin_user.set_senha(data['senha_admin'])
        db.session.add(admin_user)
        db.session.commit()
        
        current_app.logger.info(f"Tenant provisionado com sucesso: {workspace}")
        
        return jsonify({
            'mensagem': 'Conta criada e infraestrutura provisionada com sucesso!',
            'tenant': novo_tenant.to_dict(),
        }), 201

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Erro ao provisionar tenant {workspace}: {str(e)}")
        # Em produção idealmente fariamos ROLLBACK DDL / DROP SCHEMA,
        # mas como é try...except, a falha vai acusar logs.
        return jsonify({'erro': f'Falha ao provisionar sistema: {str(e)}'}), 500

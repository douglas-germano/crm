from flask import request, jsonify, current_app
from app import db
from app.models.tenant import Tenant
from app.models import Usuario, Perfil, Permissao, Pipeline
from app.blueprints.tenants import tenants_bp
from sqlalchemy import text
import uuid
import re
import threading

# Garante exclusividade na mutação do metadata global durante provisionamento
_provision_lock = threading.Lock()


@tenants_bp.route('/registro', methods=['POST'])
def registrar_tenant():
    data = request.get_json()

    required_fields = ['nome_empresa', 'workspace', 'nome_admin', 'email_admin', 'senha_admin']
    if not data or not all(k in data for k in required_fields):
        return jsonify({'erro': 'Todos os campos (nome da empresa, workspace, nome, email e senha) são obrigatórios.'}), 400

    workspace = data['workspace'].lower().strip()

    if not re.match(r'^[a-z0-9]+$', workspace):
        return jsonify({'erro': 'O workspace deve conter apenas letras minúsculas e números, sem espaços.'}), 400

    if workspace in ('public', 'information_schema', 'pg_catalog', 'api', 'admin'):
        return jsonify({'erro': 'Palavra reservada. Escolha outro Workspace.'}), 400

    if Tenant.query.filter_by(subdominio=workspace).first():
        return jsonify({'erro': 'Este Workspace já está em uso.'}), 409

    try:
        novo_tenant = Tenant(
            nome_fantasia=data['nome_empresa'],
            subdominio=workspace,
            db_schema=workspace
        )
        db.session.add(novo_tenant)
        db.session.commit()

        db.session.execute(text(f"CREATE SCHEMA IF NOT EXISTS {workspace};"))
        db.session.commit()

        db.session.execute(text(f"SET search_path TO {workspace};"))

        # Thread-safe: bloqueia mutação global do metadata durante create_all
        with _provision_lock:
            for table in db.metadata.tables.values():
                if table.schema != 'public':
                    table.schema = workspace

            db.create_all()

            for table in db.metadata.tables.values():
                if table.schema == workspace:
                    table.schema = None

        db.session.execute(text(f"SET search_path TO {workspace}, public;"))

        from app.utils.iniciar_dados import criar_permissoes, criar_perfis
        permissoes = criar_permissoes()
        perfis = criar_perfis(permissoes)

        db.session.execute(text(f"SET search_path TO {workspace}, public;"))
        Pipeline.criar_pipeline_padrao()

        db.session.execute(text(f"SET search_path TO {workspace}, public;"))
        perfil_admin = next((p for p in perfis if p.nome == 'Administrador'), None)
        if perfil_admin is None:
            perfil_admin = Perfil.query.filter_by(nome='Administrador').first()
        if perfil_admin is None:
            raise Exception("Perfil 'Administrador' não encontrado após criação dos perfis.")

        admin_user = Usuario(
            nome=data['nome_admin'],
            email=data['email_admin'].lower(),
            perfil_id=perfil_admin.id,
            ativo=True,
            deve_trocar_senha=False
        )
        admin_user.senha = data['senha_admin']
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
        return jsonify({'erro': f'Falha ao provisionar sistema: {str(e)}'}), 500

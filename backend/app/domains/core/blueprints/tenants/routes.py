from flask import request, jsonify, current_app
from app import db
from app.domains.core.blueprints.tenants import tenants_bp
from app.domains.core.blueprints.super_admin import service as super_admin_service
from sqlalchemy import text


@tenants_bp.route('/registro', methods=['POST'])
def registrar_tenant():
    data = request.get_json()

    # Respeita a política global de inscrições da plataforma
    if not super_admin_service.obter_config().inscricoes_abertas:
        return jsonify({'erro': 'As inscrições estão temporariamente fechadas.'}), 403

    required_fields = ['nome_empresa', 'workspace', 'nome_admin', 'email_admin', 'senha_admin']
    if not data or not all(k in data for k in required_fields):
        return jsonify({'erro': 'Todos os campos (nome da empresa, workspace, nome, email e senha) são obrigatórios.'}), 400

    workspace = data['workspace'].lower().strip()

    try:
        novo_tenant, erro = super_admin_service.criar_tenant(
            nome_empresa=data['nome_empresa'],
            workspace=workspace,
            nome_admin=data['nome_admin'],
            email_admin=data['email_admin'],
            senha_admin=data['senha_admin'],
        )
    except Exception as e:
        db.session.rollback()
        db.session.execute(text('SET search_path TO public'))
        current_app.logger.error(f"Erro ao provisionar tenant {workspace}: {str(e)}")
        return jsonify({'erro': f'Falha ao provisionar sistema: {str(e)}'}), 500

    if erro:
        return jsonify({'erro': erro[0]}), erro[1]

    current_app.logger.info(f"Tenant provisionado com sucesso: {workspace}")
    return jsonify({
        'mensagem': 'Conta criada e infraestrutura provisionada com sucesso!',
        'tenant': novo_tenant.to_dict(),
    }), 201

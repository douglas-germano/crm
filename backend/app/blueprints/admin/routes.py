from flask import request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt, get_jwt_identity
from functools import wraps
from sqlalchemy import text
from app import db
from app.models.tenant import Tenant
from app.models import Usuario, Empresa, Lead, Projeto
from . import admin_bp

def requer_master_workspace(f):
    """
    Verifica se a requisição está vindo de um Administrador
    do Workspace classificado como Mestre (Dono do SaaS).
    """
    @wraps(f)
    @jwt_required()
    def decorated_function(*args, **kwargs):
        claims = get_jwt()
        schema_ativo = claims.get('schema')
        master_ws = current_app.config.get('MASTER_WORKSPACE')
        
        if not schema_ativo or schema_ativo != master_ws:
            return jsonify({'erro': 'Acesso negado. Apenas a administração global pode acessar este recurso.'}), 403
            
        usuario_id = int(get_jwt_identity())
        
        # O search_path já deve ser o do Master WS graças ao app.before_request!
        # Garantindo que é Administrator
        admin = Usuario.query.get(usuario_id)
        if not admin or admin.perfil.nome != 'Administrador':
            return jsonify({'erro': 'Permissões insuficientes.'}), 403
            
        return f(*args, **kwargs)
    return decorated_function

@admin_bp.route('/tenants', methods=['GET'])
@requer_master_workspace
def listar_tenants():
    """Retorna todos os tenants e puxa estatísticas na hora."""
    # Listamos todos do public.tenant
    tenants_db = Tenant.query.all()
    resultado = []
    
    # Armazenamos o workspace original por seguranca
    master_ws = current_app.config.get('MASTER_WORKSPACE')
    
    try:
        for t in tenants_db:
            # Bypass do search path pro schema do cliente
            db.session.execute(text(f"SET search_path TO {t.db_schema}, public;"))
            
            # Counts dinâmicos diretos do DB para economizar RAM
            qtd_usuarios = db.session.scalar(text("SELECT count(*) FROM usuarios"))
            qtd_empresas = db.session.scalar(text("SELECT count(*) FROM empresas"))
            qtd_leads = db.session.scalar(text("SELECT count(*) FROM leads"))
            
            resultado.append({
                'id': t.id,
                'nome_fantasia': t.nome_fantasia,
                'subdominio': t.subdominio,
                'db_schema': t.db_schema,
                'criado_em': t.data_criacao.isoformat() if t.data_criacao else None,
                'estatisticas': {
                    'usuarios': qtd_usuarios,
                    'empresas': qtd_empresas,
                    'leads': qtd_leads
                }
            })
            
    finally:
        # Importante: Restaura o session context pro Mestre
        db.session.execute(text(f"SET search_path TO {master_ws}, public;"))
        db.session.commit() # Clear pool
        
    return jsonify({'tenants': resultado}), 200

@admin_bp.route('/tenants/<int:tenant_id>/<recurso>', methods=['GET'])
@requer_master_workspace
def listar_recurso_do_tenant(tenant_id, recurso):
    """Permite ao master extrair uma grade especifica de um tenant ex: 'leads', 'usuarios'. """
    
    tenant = Tenant.query.get_or_404(tenant_id)
    master_ws = current_app.config.get('MASTER_WORKSPACE')
    
    try:
        db.session.execute(text(f"SET search_path TO {tenant.db_schema}, public;"))
        
        data = []
        if recurso == 'usuarios':
            items = Usuario.query.all()
            data = [i.to_dict() for i in items]
        elif recurso == 'empresas':
            items = Empresa.query.all()
            data = [i.to_dict() for i in items]
        elif recurso == 'leads':
            items = Lead.query.all()
            data = [i.to_dict() for i in items]
        else:
            return jsonify({'erro': 'Recurso desconhecido'}), 400
            
    finally:
         db.session.execute(text(f"SET search_path TO {master_ws}, public;"))
         db.session.commit()
         
    return jsonify({
         'tenant': tenant.nome_fantasia,
         'recurso': recurso,
         'dados': data
    }), 200

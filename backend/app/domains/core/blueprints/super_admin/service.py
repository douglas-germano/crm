"""Camada de serviço do Super Admin (gestão global da plataforma).

Concentra a lógica de negócio — provisionamento de tenants, estatísticas,
operadores da plataforma, auditoria e proteção de login — mantendo as rotas
finas e testáveis.
"""

import threading
from datetime import datetime, timedelta, timezone

from flask import request
from sqlalchemy import text

from app import db
from app.domains.core.models import (
    Perfil,
    PlatformAuditLog,
    PlatformConfig,
    PlatformUser,
    Tenant,
    Usuario,
)
from app.domains.crm.models import Empresa, Lead
from app.utils.db_schema import schema_valido, usar_schema

# Proteção contra força bruta no login da plataforma
MAX_TENTATIVAS_LOGIN = 5
BLOQUEIO_MINUTOS = 15

# Garante exclusividade ao mutar o metadata global durante o provisionamento
_provision_lock = threading.Lock()

WORKSPACES_RESERVADOS = ('public', 'information_schema', 'pg_catalog', 'api', 'admin')


# ---------------------------------------------------------------------------
# Auditoria
# ---------------------------------------------------------------------------

def registrar_auditoria(acao, alvo_tipo=None, alvo_id=None, descricao=None, platform_user_id=None):
    """Persiste um registro na trilha de auditoria da plataforma (best-effort)."""
    try:
        log = PlatformAuditLog(
            platform_user_id=platform_user_id,
            acao=acao,
            alvo_tipo=alvo_tipo,
            alvo_id=str(alvo_id) if alvo_id is not None else None,
            descricao=descricao,
            ip=request.remote_addr if request else None,
        )
        db.session.add(log)
        db.session.commit()
    except Exception:
        db.session.rollback()


def consultar_logs(page=1, per_page=50, acao=None, platform_user_id=None, data_inicio=None, data_fim=None):
    query = PlatformAuditLog.query
    if acao:
        query = query.filter(PlatformAuditLog.acao == acao)
    if platform_user_id:
        query = query.filter(PlatformAuditLog.platform_user_id == platform_user_id)
    if data_inicio:
        query = query.filter(PlatformAuditLog.data_criacao >= data_inicio)
    if data_fim:
        query = query.filter(PlatformAuditLog.data_criacao <= data_fim)
    per_page = min(max(per_page, 1), 200)
    return query.order_by(PlatformAuditLog.data_criacao.desc()).paginate(page=page, per_page=per_page)


# ---------------------------------------------------------------------------
# Estatísticas / payloads de tenant
# ---------------------------------------------------------------------------

def tenant_stats(tenant):
    if not schema_valido(tenant.db_schema):
        return {'erro': 'schema_invalido'}
    with usar_schema(tenant.db_schema):
        ultimo = db.session.scalar(text('SELECT max(ultimo_login) FROM usuarios'))
        return {
            'usuarios': db.session.scalar(text('SELECT count(*) FROM usuarios')),
            'empresas': db.session.scalar(text('SELECT count(*) FROM empresas')),
            'leads': db.session.scalar(text('SELECT count(*) FROM leads')),
            'negocios': db.session.scalar(text('SELECT count(*) FROM negocios')),
            'ultimo_acesso': ultimo.isoformat() if ultimo else None,
        }


def tenant_payload(tenant, com_stats=True):
    dados = {
        'id': tenant.id,
        'nome_fantasia': tenant.nome_fantasia,
        'subdominio': tenant.subdominio,
        'db_schema': tenant.db_schema,
        'ativo': tenant.ativo,
        'motivo_inativacao': tenant.motivo_inativacao,
        'criado_em': tenant.data_criacao.isoformat() if tenant.data_criacao else None,
    }
    if com_stats:
        dados['estatisticas'] = tenant_stats(tenant)
    return dados


def listar_tenants(com_stats=True):
    tenants = Tenant.query.order_by(Tenant.id).all()
    payloads = [tenant_payload(t, com_stats=com_stats) for t in tenants]
    db.session.execute(text('SET search_path TO public'))
    return tenants, payloads


def calcular_totais(tenants, payloads):
    def soma(chave):
        return sum(
            (p.get('estatisticas', {}).get(chave) or 0)
            for p in payloads
            if isinstance(p.get('estatisticas'), dict)
        )

    return {
        'tenants': len(payloads),
        'tenants_ativos': sum(1 for t in tenants if t.ativo),
        'usuarios': soma('usuarios'),
        'empresas': soma('empresas'),
        'leads': soma('leads'),
    }


# ---------------------------------------------------------------------------
# Provisionamento de tenant
# ---------------------------------------------------------------------------

def provisionar_infraestrutura(tenant):
    """Cria o schema do tenant, replica as tabelas e semeia perfis/pipeline.

    Retorna a lista de perfis criados. Deve ser chamado dentro de uma transação
    cujo commit/rollback é responsabilidade do chamador.
    """
    from app.domains.crm.models import Pipeline
    from app.utils.iniciar_dados import criar_permissoes, criar_perfis

    schema = tenant.db_schema
    if not schema_valido(schema):
        raise ValueError('Schema do tenant inválido.')

    db.session.execute(text(f'CREATE SCHEMA IF NOT EXISTS {schema};'))
    db.session.commit()

    db.session.execute(text(f'SET search_path TO {schema};'))

    with _provision_lock:
        for table in db.metadata.tables.values():
            if table.schema != 'public':
                table.schema = schema
        db.create_all()
        for table in db.metadata.tables.values():
            if table.schema == schema:
                table.schema = None

    db.session.execute(text(f'SET search_path TO {schema}, public;'))
    permissoes = criar_permissoes()
    perfis = criar_perfis(permissoes)

    db.session.execute(text(f'SET search_path TO {schema}, public;'))
    Pipeline.criar_pipeline_padrao()

    db.session.execute(text(f'SET search_path TO {schema}, public;'))
    return perfis


def criar_tenant(nome_empresa, workspace, nome_admin, email_admin, senha_admin):
    """Cria um novo tenant completo (schema + perfis + usuário admin).

    Retorna (tenant, None) em sucesso ou (None, (mensagem, status)) em erro de validação.
    """
    workspace = (workspace or '').lower().strip()
    import re
    if not re.match(r'^[a-z0-9]+$', workspace):
        return None, ('O workspace deve conter apenas letras minúsculas e números.', 400)
    if workspace in WORKSPACES_RESERVADOS:
        return None, ('Palavra reservada. Escolha outro workspace.', 400)
    if Tenant.query.filter_by(subdominio=workspace).first():
        return None, ('Este workspace já está em uso.', 409)

    tenant = Tenant(nome_fantasia=nome_empresa, subdominio=workspace, db_schema=workspace)
    db.session.add(tenant)
    db.session.commit()

    perfis = provisionar_infraestrutura(tenant)

    perfil_admin = next((p for p in perfis if p.nome == 'Administrador'), None)
    if perfil_admin is None:
        perfil_admin = Perfil.query.filter_by(nome='Administrador').first()
    if perfil_admin is None:
        raise RuntimeError("Perfil 'Administrador' não encontrado após provisionamento.")

    admin = Usuario(
        nome=nome_admin,
        email=(email_admin or '').lower(),
        perfil_id=perfil_admin.id,
        ativo=True,
        deve_trocar_senha=False,
    )
    admin.senha = senha_admin
    db.session.add(admin)
    db.session.commit()

    db.session.execute(text('SET search_path TO public'))
    return tenant, None


# ---------------------------------------------------------------------------
# Inspeção / suporte a um tenant específico
# ---------------------------------------------------------------------------

_RECURSOS = {
    'usuarios': Usuario,
    'empresas': Empresa,
    'leads': Lead,
}


def inspecionar_recurso(tenant, recurso):
    modelo = _RECURSOS.get(recurso)
    if modelo is None:
        return None
    with usar_schema(tenant.db_schema):
        items = modelo.query.order_by(modelo.id).all()
        return [i.to_dict() for i in items]


def resetar_senha_usuario_tenant(tenant, usuario_id, nova_senha):
    """Redefine a senha de um usuário interno de um tenant (ação de suporte)."""
    with usar_schema(tenant.db_schema):
        usuario = db.session.get(Usuario, usuario_id)
        if not usuario:
            return None
        usuario.senha = nova_senha  # valida força via setter do model
        usuario.deve_trocar_senha = True
        usuario.revogar_tokens()    # encerra sessões existentes do usuário
        db.session.commit()
        return usuario.to_dict()


def gerar_tokens_impersonacao(tenant, platform_user, usuario_id):
    """Gera (access, refresh, alvo) de tenant para o Super Admin atuar como usuário.

    Os tokens carregam `impersonado_por`/`impersonacao` para rastreabilidade.
    Construídos dentro do schema para resolver as claims (papel/versão) corretamente.
    """
    from flask_jwt_extended import create_access_token, create_refresh_token
    from app.utils.auth_tokens import claims_tenant

    with usar_schema(tenant.db_schema):
        usuario = db.session.get(Usuario, usuario_id)
        if not usuario or not usuario.ativo:
            return None, None, None
        alvo = usuario.to_dict()
        claims = claims_tenant(usuario, tenant)
        claims.update({'impersonado_por': platform_user.id, 'impersonacao': True})
        identity = str(usuario_id)
        access = create_access_token(identity=identity, additional_claims=claims)
        refresh = create_refresh_token(identity=identity, additional_claims=claims)
    return access, refresh, alvo


# ---------------------------------------------------------------------------
# Operadores da plataforma (platform users)
# ---------------------------------------------------------------------------

def listar_operadores():
    return [u.to_dict() for u in PlatformUser.query.order_by(PlatformUser.id).all()]


def criar_operador(nome, email, senha, papel='super_admin'):
    email = (email or '').strip().lower()
    if not nome or not email or not senha:
        return None, ('Nome, email e senha são obrigatórios.', 400)
    if papel not in PlatformUser.PAPEIS_VALIDOS:
        return None, ('Papel inválido.', 400)
    if PlatformUser.query.filter_by(email=email).first():
        return None, ('Já existe um operador com este email.', 409)
    operador = PlatformUser(nome=nome, email=email, papel=papel, ativo=True)
    operador.senha = senha  # valida força via setter
    db.session.add(operador)
    db.session.commit()
    return operador, None


def atualizar_operador(operador, data):
    if 'nome' in data:
        operador.nome = data['nome']
    if 'papel' in data:
        if data['papel'] not in PlatformUser.PAPEIS_VALIDOS:
            return None, ('Papel inválido.', 400)
        if data['papel'] != operador.papel:
            operador.revogar_tokens()  # mudança de papel invalida sessões
        operador.papel = data['papel']
    if 'ativo' in data:
        if not data['ativo']:
            operador.revogar_tokens()  # desativação encerra sessões
        operador.ativo = bool(data['ativo'])
    if data.get('senha'):
        operador.senha = data['senha']
        operador.revogar_tokens()
    db.session.commit()
    return operador, None


# ---------------------------------------------------------------------------
# Configuração global da plataforma
# ---------------------------------------------------------------------------

def obter_config():
    """Retorna a linha única de configuração, criando-a se ainda não existir."""
    config = db.session.get(PlatformConfig, 1)
    if config is None:
        config = PlatformConfig(id=1)
        db.session.add(config)
        db.session.commit()
    return config


def atualizar_config(data):
    config = obter_config()
    for campo in ('inscricoes_abertas', 'modo_manutencao', 'forcar_2fa'):
        if campo in data:
            setattr(config, campo, bool(data[campo]))
    db.session.commit()
    return config


# ---------------------------------------------------------------------------
# Login: lockout
# ---------------------------------------------------------------------------

def registrar_falha_login(operador):
    operador.tentativas_falhas = (operador.tentativas_falhas or 0) + 1
    if operador.tentativas_falhas >= MAX_TENTATIVAS_LOGIN:
        operador.bloqueado_ate = datetime.now(timezone.utc) + timedelta(minutes=BLOQUEIO_MINUTOS)
    db.session.commit()


def registrar_sucesso_login(operador):
    operador.tentativas_falhas = 0
    operador.bloqueado_ate = None
    operador.ultimo_login = datetime.now(timezone.utc)
    db.session.commit()

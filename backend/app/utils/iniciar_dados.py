from app import db
from app.models import Usuario, Perfil, Permissao
import os
import secrets
import string
from datetime import datetime

def criar_permissoes():
    """Cria as permissões padrão do sistema."""
    
    # Lista de permissões por módulo
    permissoes_por_modulo = {
        'usuarios': [
            {'codigo': 'listar_usuarios', 'descricao': 'Listar todos os usuários'},
            {'codigo': 'visualizar_usuario', 'descricao': 'Visualizar detalhes de um usuário'},
            {'codigo': 'criar_usuario', 'descricao': 'Criar um novo usuário'},
            {'codigo': 'editar_usuario', 'descricao': 'Editar um usuário existente'},
            {'codigo': 'excluir_usuario', 'descricao': 'Excluir/desativar um usuário'},
            {'codigo': 'listar_perfis', 'descricao': 'Listar todos os perfis'},
            {'codigo': 'visualizar_perfil', 'descricao': 'Visualizar detalhes de um perfil'},
            {'codigo': 'criar_perfil', 'descricao': 'Criar um novo perfil'},
            {'codigo': 'editar_perfil', 'descricao': 'Editar um perfil existente'},
            {'codigo': 'excluir_perfil', 'descricao': 'Excluir um perfil'},
            {'codigo': 'listar_permissoes', 'descricao': 'Listar todas as permissões'},
            {'codigo': 'visualizar_logs', 'descricao': 'Visualizar logs de atividade'}
        ]
        # Adicionar permissões para outros módulos aqui
    }
    
    permissoes_criadas = []
    
    for modulo, permissoes in permissoes_por_modulo.items():
        for p in permissoes:
            # Verificar se já existe
            permissao = Permissao.query.filter_by(codigo=p['codigo']).first()
            if not permissao:
                permissao = Permissao(
                    codigo=p['codigo'],
                    descricao=p['descricao'],
                    modulo=modulo
                )
                db.session.add(permissao)
                permissoes_criadas.append(permissao)
    
    if permissoes_criadas:
        db.session.commit()
        print(f"Criadas {len(permissoes_criadas)} novas permissões")
    
    return Permissao.query.all()

def criar_perfis(permissoes):
    """Cria os perfis padrão do sistema."""
    
    # Perfil Admin (com todas as permissões)
    admin = Perfil.query.filter_by(nome='Administrador').first()
    if not admin:
        admin = Perfil(
            nome='Administrador',
            descricao='Acesso total ao sistema'
        )
        admin.permissoes = permissoes
        db.session.add(admin)
    else:
        # Garantir que admin tem todas as permissões
        admin.permissoes = permissoes
    
    # Perfil Vendedor
    vendedor = Perfil.query.filter_by(nome='Vendedor').first()
    if not vendedor:
        vendedor = Perfil(
            nome='Vendedor',
            descricao='Acesso às funcionalidades de vendas'
        )
        db.session.add(vendedor)

    # Perfil Supervisor
    supervisor = Perfil.query.filter_by(nome='Supervisor').first()
    if not supervisor:
        supervisor = Perfil(
            nome='Supervisor',
            descricao='Supervisão de equipe e relatórios'
        )
        db.session.add(supervisor)
    
    db.session.commit()
    return Perfil.query.all()

def criar_usuario_admin(perfil_admin):
    """Cria um usuário administrador se não existir."""
    
    admin = Usuario.query.filter_by(email='admin@example.com').first()
    if not admin:
        alphabet = string.ascii_letters + string.digits + string.punctuation
        senha_gerada = ''.join(secrets.choice(alphabet) for _ in range(16))
        admin = Usuario(
            nome='Administrador',
            email='admin@example.com',
            perfil_id=perfil_admin.id,
            ativo=True
        )
        admin.senha = senha_gerada
        db.session.add(admin)
        db.session.commit()
        print(f"Usuário administrador criado — senha inicial: {senha_gerada}")
        print("IMPORTANTE: altere esta senha imediatamente após o primeiro login.")

    return admin

def inicializar_dados():
    """Inicializa todos os dados padrão do sistema."""
    
    permissoes = criar_permissoes()
    perfis = criar_perfis(permissoes)
    perfil_admin = Perfil.query.filter_by(nome='Administrador').first()
    admin = criar_usuario_admin(perfil_admin)
    
    return {
        'permissoes': permissoes,
        'perfis': perfis,
        'admin': admin
    } 
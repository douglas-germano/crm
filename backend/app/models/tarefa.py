from app import db
from datetime import datetime, timezone
import uuid


class Tarefa(db.Model):
    __tablename__ = 'tarefas'

    id = db.Column(db.Integer, primary_key=True)
    uuid = db.Column(db.String(36), unique=True, default=lambda: str(uuid.uuid4()))
    titulo = db.Column(db.String(200), nullable=False)
    descricao = db.Column(db.Text)

    # Status: a_fazer, em_andamento, em_revisao, concluida
    status = db.Column(db.String(20), default='a_fazer')

    # Prioridade: baixa, media, alta, critica
    prioridade = db.Column(db.String(20), default='media')

    # Datas
    data_inicio = db.Column(db.Date)
    data_prazo = db.Column(db.Date)
    data_conclusao = db.Column(db.DateTime)

    # Ordem para exibição no Kanban
    ordem = db.Column(db.Integer, default=0)

    # Relacionamentos
    projeto_id = db.Column(db.Integer, db.ForeignKey('projetos.id'), nullable=False)
    projeto = db.relationship('Projeto', backref=db.backref('tarefas', lazy='dynamic',
                                                             cascade='all, delete-orphan'))

    responsavel_id = db.Column(db.Integer, db.ForeignKey('usuarios.id'), nullable=True)
    responsavel = db.relationship('Usuario', foreign_keys=[responsavel_id],
                                  backref=db.backref('tarefas_atribuidas', lazy='dynamic'))

    # Subtarefas (auto-referência)
    tarefa_pai_id = db.Column(db.Integer, db.ForeignKey('tarefas.id'), nullable=True)
    subtarefas = db.relationship('Tarefa', backref=db.backref('tarefa_pai', remote_side='Tarefa.id'),
                                  lazy='dynamic', cascade='all, delete-orphan')

    # Rastreamento
    data_criacao = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    data_atualizacao = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            'id': self.id,
            'uuid': self.uuid,
            'titulo': self.titulo,
            'descricao': self.descricao,
            'status': self.status,
            'prioridade': self.prioridade,
            'data_inicio': self.data_inicio.isoformat() if self.data_inicio else None,
            'data_prazo': self.data_prazo.isoformat() if self.data_prazo else None,
            'data_conclusao': self.data_conclusao.isoformat() if self.data_conclusao else None,
            'ordem': self.ordem,
            'projeto_id': self.projeto_id,
            'responsavel_id': self.responsavel_id,
            'responsavel_nome': self.responsavel.nome if self.responsavel else None,
            'tarefa_pai_id': self.tarefa_pai_id,
            'subtarefas': [s.to_dict() for s in self.subtarefas.order_by(Tarefa.ordem).all()],
            'checklist': [item.to_dict() for item in self.checklist_items],
            'total_comentarios': len(self.comentarios),
            'data_criacao': self.data_criacao.isoformat() if self.data_criacao else None,
            'data_atualizacao': self.data_atualizacao.isoformat() if self.data_atualizacao else None,
        }

    def __repr__(self):
        return f'<Tarefa {self.titulo}>'


class ChecklistItem(db.Model):
    __tablename__ = 'checklist_items'

    id = db.Column(db.Integer, primary_key=True)
    descricao = db.Column(db.String(300), nullable=False)
    concluido = db.Column(db.Boolean, default=False)
    ordem = db.Column(db.Integer, default=0)

    tarefa_id = db.Column(db.Integer, db.ForeignKey('tarefas.id'), nullable=False)
    tarefa = db.relationship('Tarefa', backref=db.backref('checklist_items', lazy='joined',
                                                           cascade='all, delete-orphan',
                                                           order_by='ChecklistItem.ordem'))

    data_criacao = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            'id': self.id,
            'descricao': self.descricao,
            'concluido': self.concluido,
            'ordem': self.ordem,
        }

    def __repr__(self):
        return f'<ChecklistItem {self.descricao[:30]}>'


class ComentarioTarefa(db.Model):
    __tablename__ = 'comentarios_tarefa'

    id = db.Column(db.Integer, primary_key=True)
    conteudo = db.Column(db.Text, nullable=False)

    tarefa_id = db.Column(db.Integer, db.ForeignKey('tarefas.id'), nullable=False)
    tarefa = db.relationship('Tarefa', backref=db.backref('comentarios', lazy='joined',
                                                           cascade='all, delete-orphan',
                                                           order_by='ComentarioTarefa.data_criacao'))

    autor_id = db.Column(db.Integer, db.ForeignKey('usuarios.id'), nullable=False)
    autor = db.relationship('Usuario', backref=db.backref('comentarios_tarefa', lazy='dynamic'))

    data_criacao = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    data_atualizacao = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            'id': self.id,
            'conteudo': self.conteudo,
            'tarefa_id': self.tarefa_id,
            'autor_id': self.autor_id,
            'autor_nome': self.autor.nome if self.autor else None,
            'data_criacao': self.data_criacao.isoformat() if self.data_criacao else None,
            'data_atualizacao': self.data_atualizacao.isoformat() if self.data_atualizacao else None,
        }

    def __repr__(self):
        return f'<ComentarioTarefa {self.id}>'

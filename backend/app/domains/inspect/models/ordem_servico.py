from app import db
from datetime import datetime, timezone
import uuid


class OrdemServico(db.Model):
    __tablename__ = 'ordens_servico'

    id = db.Column(db.Integer, primary_key=True)
    uuid = db.Column(db.String(36), unique=True, default=lambda: str(uuid.uuid4()))
    codigo = db.Column(db.String(30), unique=True)
    titulo = db.Column(db.String(150), nullable=False)
    tipo = db.Column(db.String(40), default='inspecao')
    status = db.Column(db.String(30), default='rascunho')
    prioridade = db.Column(db.String(20), default='normal')
    descricao = db.Column(db.Text)
    escopo = db.Column(db.JSON)
    endereco_atendimento = db.Column(db.String(255))
    latitude = db.Column(db.Float)
    longitude = db.Column(db.Float)
    data_agendada = db.Column(db.DateTime)
    data_inicio = db.Column(db.DateTime)
    data_fim = db.Column(db.DateTime)
    observacoes_internas = db.Column(db.Text)
    observacoes_cliente = db.Column(db.Text)

    empresa_id = db.Column(db.Integer, db.ForeignKey('empresas.id'), nullable=False)
    empresa = db.relationship('Empresa', backref=db.backref('ordens_servico_inspect', lazy='dynamic'))

    ativo_id = db.Column(db.Integer, db.ForeignKey('ativos.id'), nullable=True)
    ativo = db.relationship('Ativo', backref=db.backref('ordens_servico', lazy='dynamic'))

    contrato_amc_id = db.Column(db.Integer, db.ForeignKey('contratos_amc.id'), nullable=True)
    contrato_amc = db.relationship('ContratoAMC', backref=db.backref('ordens_servico', lazy='dynamic'))

    projeto_id = db.Column(db.Integer, db.ForeignKey('projetos.id'), nullable=True)
    projeto = db.relationship('Projeto', backref=db.backref('ordens_servico_inspect', lazy='dynamic'))

    negocio_id = db.Column(db.Integer, db.ForeignKey('negocios.id'), nullable=True)
    negocio = db.relationship('Negocio', backref=db.backref('ordens_servico_inspect', lazy='dynamic'))

    responsavel_id = db.Column(db.Integer, db.ForeignKey('usuarios.id'), nullable=True)
    responsavel = db.relationship('Usuario', foreign_keys=[responsavel_id],
                                  backref=db.backref('ordens_servico_responsavel', lazy='dynamic'))

    criado_por_id = db.Column(db.Integer, db.ForeignKey('usuarios.id'), nullable=True)
    criado_por = db.relationship('Usuario', foreign_keys=[criado_por_id])

    data_criacao = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    data_atualizacao = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    execucoes = db.relationship('ExecucaoCampo', backref='ordem_servico', lazy='dynamic', cascade='all, delete-orphan')
    evidencias = db.relationship('EvidenciaCampo', backref='ordem_servico', lazy='dynamic', cascade='all, delete-orphan')
    apontamentos_hora = db.relationship('ApontamentoHora', backref='ordem_servico', lazy='dynamic', cascade='all, delete-orphan')
    materiais = db.relationship('MaterialUtilizado', backref='ordem_servico', lazy='dynamic', cascade='all, delete-orphan')
    assinaturas = db.relationship('AssinaturaCampo', backref='ordem_servico', lazy='dynamic', cascade='all, delete-orphan')
    relatorios = db.relationship('RelatorioTecnico', backref='ordem_servico', lazy='dynamic', cascade='all, delete-orphan')

    def to_dict(self, incluir_relacionamentos=False):
        dados = {
            'id': self.id,
            'uuid': self.uuid,
            'codigo': self.codigo,
            'titulo': self.titulo,
            'tipo': self.tipo,
            'status': self.status,
            'prioridade': self.prioridade,
            'descricao': self.descricao,
            'escopo': self.escopo,
            'endereco_atendimento': self.endereco_atendimento,
            'latitude': self.latitude,
            'longitude': self.longitude,
            'data_agendada': self.data_agendada.isoformat() if self.data_agendada else None,
            'data_inicio': self.data_inicio.isoformat() if self.data_inicio else None,
            'data_fim': self.data_fim.isoformat() if self.data_fim else None,
            'observacoes_internas': self.observacoes_internas,
            'observacoes_cliente': self.observacoes_cliente,
            'empresa_id': self.empresa_id,
            'empresa_nome': self.empresa.razao_social if self.empresa else None,
            'ativo_id': self.ativo_id,
            'ativo_nome': self.ativo.nome if self.ativo else None,
            'ativo_tag': self.ativo.tag_identificacao if self.ativo else None,
            'contrato_amc_id': self.contrato_amc_id,
            'contrato_amc_titulo': self.contrato_amc.titulo if self.contrato_amc else None,
            'projeto_id': self.projeto_id,
            'projeto_nome': self.projeto.nome if self.projeto else None,
            'negocio_id': self.negocio_id,
            'negocio_nome': self.negocio.nome if self.negocio else None,
            'responsavel_id': self.responsavel_id,
            'responsavel_nome': self.responsavel.nome if self.responsavel else None,
            'criado_por_id': self.criado_por_id,
            'data_criacao': self.data_criacao.isoformat() if self.data_criacao else None,
            'data_atualizacao': self.data_atualizacao.isoformat() if self.data_atualizacao else None
        }

        if incluir_relacionamentos:
            dados.update({
                'execucoes': [execucao.to_dict() for execucao in self.execucoes.order_by(ExecucaoCampo.data_inicio.desc()).all()],
                'evidencias': [evidencia.to_dict() for evidencia in self.evidencias.order_by(EvidenciaCampo.data_criacao.desc()).all()],
                'apontamentos_hora': [apontamento.to_dict() for apontamento in self.apontamentos_hora.order_by(ApontamentoHora.data_inicio.desc()).all()],
                'materiais': [material.to_dict() for material in self.materiais.order_by(MaterialUtilizado.data_criacao.desc()).all()],
                'assinaturas': [assinatura.to_dict() for assinatura in self.assinaturas.order_by(AssinaturaCampo.data_criacao.desc()).all()],
                'relatorios': [relatorio.to_dict() for relatorio in self.relatorios.order_by(RelatorioTecnico.data_criacao.desc()).all()],
            })

        return dados

    def __repr__(self):
        return f'<OrdemServico {self.codigo or self.id} - {self.status}>'


class ExecucaoCampo(db.Model):
    __tablename__ = 'execucoes_campo'

    id = db.Column(db.Integer, primary_key=True)
    uuid = db.Column(db.String(36), unique=True, default=lambda: str(uuid.uuid4()))
    status = db.Column(db.String(30), default='em_andamento')
    data_inicio = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    data_fim = db.Column(db.DateTime)
    checklist_snapshot = db.Column(db.JSON)
    respostas = db.Column(db.JSON)
    observacoes = db.Column(db.Text)
    latitude_inicio = db.Column(db.Float)
    longitude_inicio = db.Column(db.Float)
    latitude_fim = db.Column(db.Float)
    longitude_fim = db.Column(db.Float)

    ordem_servico_id = db.Column(db.Integer, db.ForeignKey('ordens_servico.id'), nullable=False)
    executor_id = db.Column(db.Integer, db.ForeignKey('usuarios.id'), nullable=True)
    executor = db.relationship('Usuario', backref=db.backref('execucoes_campo', lazy='dynamic'))

    data_criacao = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    data_atualizacao = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            'id': self.id,
            'uuid': self.uuid,
            'status': self.status,
            'data_inicio': self.data_inicio.isoformat() if self.data_inicio else None,
            'data_fim': self.data_fim.isoformat() if self.data_fim else None,
            'checklist_snapshot': self.checklist_snapshot,
            'respostas': self.respostas,
            'observacoes': self.observacoes,
            'latitude_inicio': self.latitude_inicio,
            'longitude_inicio': self.longitude_inicio,
            'latitude_fim': self.latitude_fim,
            'longitude_fim': self.longitude_fim,
            'ordem_servico_id': self.ordem_servico_id,
            'executor_id': self.executor_id,
            'executor_nome': self.executor.nome if self.executor else None,
            'data_criacao': self.data_criacao.isoformat() if self.data_criacao else None,
            'data_atualizacao': self.data_atualizacao.isoformat() if self.data_atualizacao else None
        }


class EvidenciaCampo(db.Model):
    __tablename__ = 'evidencias_campo'

    id = db.Column(db.Integer, primary_key=True)
    uuid = db.Column(db.String(36), unique=True, default=lambda: str(uuid.uuid4()))
    tipo = db.Column(db.String(30), default='foto')
    url = db.Column(db.String(500), nullable=False)
    legenda = db.Column(db.String(255))
    origem = db.Column(db.String(50), default='campo')
    item_referencia = db.Column(db.String(100))
    latitude = db.Column(db.Float)
    longitude = db.Column(db.Float)
    metadados = db.Column(db.JSON)

    ordem_servico_id = db.Column(db.Integer, db.ForeignKey('ordens_servico.id'), nullable=False)
    execucao_id = db.Column(db.Integer, db.ForeignKey('execucoes_campo.id'), nullable=True)
    execucao = db.relationship('ExecucaoCampo', backref=db.backref('evidencias', lazy='dynamic'))
    criado_por_id = db.Column(db.Integer, db.ForeignKey('usuarios.id'), nullable=True)
    criado_por = db.relationship('Usuario')

    data_criacao = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            'id': self.id,
            'uuid': self.uuid,
            'tipo': self.tipo,
            'url': self.url,
            'legenda': self.legenda,
            'origem': self.origem,
            'item_referencia': self.item_referencia,
            'latitude': self.latitude,
            'longitude': self.longitude,
            'metadados': self.metadados,
            'ordem_servico_id': self.ordem_servico_id,
            'execucao_id': self.execucao_id,
            'criado_por_id': self.criado_por_id,
            'criado_por_nome': self.criado_por.nome if self.criado_por else None,
            'data_criacao': self.data_criacao.isoformat() if self.data_criacao else None
        }


class ApontamentoHora(db.Model):
    __tablename__ = 'apontamentos_hora'

    id = db.Column(db.Integer, primary_key=True)
    data_inicio = db.Column(db.DateTime, nullable=False)
    data_fim = db.Column(db.DateTime)
    horas = db.Column(db.Float, default=0.0)
    tipo = db.Column(db.String(30), default='campo')
    descricao = db.Column(db.Text)

    ordem_servico_id = db.Column(db.Integer, db.ForeignKey('ordens_servico.id'), nullable=False)
    usuario_id = db.Column(db.Integer, db.ForeignKey('usuarios.id'), nullable=True)
    usuario = db.relationship('Usuario', backref=db.backref('apontamentos_hora', lazy='dynamic'))

    data_criacao = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            'id': self.id,
            'data_inicio': self.data_inicio.isoformat() if self.data_inicio else None,
            'data_fim': self.data_fim.isoformat() if self.data_fim else None,
            'horas': self.horas,
            'tipo': self.tipo,
            'descricao': self.descricao,
            'ordem_servico_id': self.ordem_servico_id,
            'usuario_id': self.usuario_id,
            'usuario_nome': self.usuario.nome if self.usuario else None,
            'data_criacao': self.data_criacao.isoformat() if self.data_criacao else None
        }


class MaterialUtilizado(db.Model):
    __tablename__ = 'materiais_utilizados'

    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(150), nullable=False)
    quantidade = db.Column(db.Float, default=1.0)
    unidade = db.Column(db.String(20), default='un')
    valor_unitario = db.Column(db.Float, default=0.0)
    observacao = db.Column(db.Text)

    ordem_servico_id = db.Column(db.Integer, db.ForeignKey('ordens_servico.id'), nullable=False)
    registrado_por_id = db.Column(db.Integer, db.ForeignKey('usuarios.id'), nullable=True)
    registrado_por = db.relationship('Usuario')

    data_criacao = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            'id': self.id,
            'nome': self.nome,
            'quantidade': self.quantidade,
            'unidade': self.unidade,
            'valor_unitario': self.valor_unitario,
            'valor_total': (self.quantidade or 0) * (self.valor_unitario or 0),
            'observacao': self.observacao,
            'ordem_servico_id': self.ordem_servico_id,
            'registrado_por_id': self.registrado_por_id,
            'registrado_por_nome': self.registrado_por.nome if self.registrado_por else None,
            'data_criacao': self.data_criacao.isoformat() if self.data_criacao else None
        }


class AssinaturaCampo(db.Model):
    __tablename__ = 'assinaturas_campo'

    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(150), nullable=False)
    documento = db.Column(db.String(50))
    cargo = db.Column(db.String(100))
    tipo = db.Column(db.String(30), default='cliente')
    assinatura_url = db.Column(db.String(500))
    aceite_texto = db.Column(db.Text)
    latitude = db.Column(db.Float)
    longitude = db.Column(db.Float)

    ordem_servico_id = db.Column(db.Integer, db.ForeignKey('ordens_servico.id'), nullable=False)
    usuario_id = db.Column(db.Integer, db.ForeignKey('usuarios.id'), nullable=True)
    usuario = db.relationship('Usuario')

    data_criacao = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            'id': self.id,
            'nome': self.nome,
            'documento': self.documento,
            'cargo': self.cargo,
            'tipo': self.tipo,
            'assinatura_url': self.assinatura_url,
            'aceite_texto': self.aceite_texto,
            'latitude': self.latitude,
            'longitude': self.longitude,
            'ordem_servico_id': self.ordem_servico_id,
            'usuario_id': self.usuario_id,
            'usuario_nome': self.usuario.nome if self.usuario else None,
            'data_criacao': self.data_criacao.isoformat() if self.data_criacao else None
        }


class RelatorioTecnico(db.Model):
    __tablename__ = 'relatorios_tecnicos'

    id = db.Column(db.Integer, primary_key=True)
    titulo = db.Column(db.String(150), nullable=False)
    status = db.Column(db.String(30), default='rascunho')
    conteudo = db.Column(db.JSON)
    pdf_url = db.Column(db.String(500))
    emitido_em = db.Column(db.DateTime)

    ordem_servico_id = db.Column(db.Integer, db.ForeignKey('ordens_servico.id'), nullable=False)
    emitido_por_id = db.Column(db.Integer, db.ForeignKey('usuarios.id'), nullable=True)
    emitido_por = db.relationship('Usuario')

    data_criacao = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    data_atualizacao = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            'id': self.id,
            'titulo': self.titulo,
            'status': self.status,
            'conteudo': self.conteudo,
            'pdf_url': self.pdf_url,
            'emitido_em': self.emitido_em.isoformat() if self.emitido_em else None,
            'ordem_servico_id': self.ordem_servico_id,
            'emitido_por_id': self.emitido_por_id,
            'emitido_por_nome': self.emitido_por.nome if self.emitido_por else None,
            'data_criacao': self.data_criacao.isoformat() if self.data_criacao else None,
            'data_atualizacao': self.data_atualizacao.isoformat() if self.data_atualizacao else None
        }

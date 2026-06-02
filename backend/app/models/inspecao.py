from app import db
from datetime import datetime
import uuid

class Inspecao(db.Model):
    __tablename__ = 'inspecoes'

    id = db.Column(db.Integer, primary_key=True)
    uuid = db.Column(db.String(36), unique=True, default=lambda: str(uuid.uuid4()))
    data_inspecao = db.Column(db.Date)
    data_realizacao = db.Column(db.DateTime)
    status = db.Column(db.String(20), default='agendada')  # agendada, em_campo, concluida, cancelada
    respostas = db.Column(db.JSON)  # [{'pergunta_id': 1, 'resposta': 'conforme/nao_conforme/nao_se_aplica', 'observacao': '...', 'foto_url': '...'}]
    observacoes_gerais = db.Column(db.Text)
    art_numero = db.Column(db.String(50))
    art_pdf_url = db.Column(db.String(255))
    pdf_laudo_url = db.Column(db.String(255))

    # Relacionamento com o Ativo (Máquina/Equipamento)
    ativo_id = db.Column(db.Integer, db.ForeignKey('ativos.id'), nullable=False)
    ativo = db.relationship('Ativo', backref=db.backref('inspecoes', lazy='dynamic', cascade='all, delete-orphan'))

    # Relacionamento com o Template do Checklist
    template_id = db.Column(db.Integer, db.ForeignKey('templates_checklist.id'), nullable=False)
    template = db.relationship('TemplateChecklist')

    # Relacionamento com o Contrato AMC (opcional - se for recorrência)
    contrato_amc_id = db.Column(db.Integer, db.ForeignKey('contratos_amc.id'), nullable=True)
    contrato_amc = db.relationship('ContratoAMC', backref=db.backref('inspecoes', lazy='dynamic'))

    # Relacionamento com o Inspetor (Engenheiro Mecânico)
    inspetor_id = db.Column(db.Integer, db.ForeignKey('usuarios.id'), nullable=True)
    inspetor = db.relationship('Usuario', foreign_keys=[inspetor_id],
                               backref=db.backref('inspecoes_atribuidas', lazy='dynamic'))

    # Usuário que agendou
    criado_por_id = db.Column(db.Integer, db.ForeignKey('usuarios.id'), nullable=True)
    criado_por = db.relationship('Usuario', foreign_keys=[criado_por_id])

    data_criacao = db.Column(db.DateTime, default=datetime.utcnow)
    data_atualizacao = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'uuid': self.uuid,
            'data_inspecao': self.data_inspecao.isoformat() if self.data_inspecao else None,
            'data_realizacao': self.data_realizacao.isoformat() if self.data_realizacao else None,
            'status': self.status,
            'respostas': self.respostas,
            'observacoes_gerais': self.observacoes_gerais,
            'art_numero': self.art_numero,
            'art_pdf_url': self.art_pdf_url,
            'pdf_laudo_url': self.pdf_laudo_url,
            'ativo_id': self.ativo_id,
            'ativo_nome': self.ativo.nome if self.ativo else None,
            'ativo_tag': self.ativo.tag_identificacao if self.ativo else None,
            'ativo_empresa_id': self.ativo.empresa_id if self.ativo else None,
            'ativo_empresa_nome': self.ativo.empresa.razao_social if self.ativo and self.ativo.empresa else None,
            'template_id': self.template_id,
            'template_nome': self.template.nome if self.template else None,
            'contrato_amc_id': self.contrato_amc_id,
            'contrato_amc_titulo': self.contrato_amc.titulo if self.contrato_amc else None,
            'inspetor_id': self.inspetor_id,
            'inspetor_nome': self.inspetor.nome if self.inspetor else None,
            'data_criacao': self.data_criacao.isoformat() if self.data_criacao else None,
            'data_atualizacao': self.data_atualizacao.isoformat() if self.data_atualizacao else None
        }

    def __repr__(self):
        return f'<Inspecao {self.id} - Ativo {self.ativo_id} - Status {self.status}>'

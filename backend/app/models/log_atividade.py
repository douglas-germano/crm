from app import db
from datetime import datetime

class LogAtividade(db.Model):
    __tablename__ = 'logs_atividade'
    
    id = db.Column(db.Integer, primary_key=True)
    usuario_id = db.Column(db.Integer, db.ForeignKey('usuarios.id'), nullable=False)
    acao = db.Column(db.String(100), nullable=False)
    modulo = db.Column(db.String(50), nullable=False)
    descricao = db.Column(db.Text)
    data_hora = db.Column(db.DateTime, default=datetime.utcnow)
    ip = db.Column(db.String(50))
    
    # Relacionamentos
    usuario = db.relationship('Usuario', back_populates='logs')
    
    def to_dict(self):
        return {
            'id': self.id,
            'usuario': self.usuario.nome if self.usuario else None,
            'acao': self.acao,
            'modulo': self.modulo,
            'descricao': self.descricao,
            'data_hora': self.data_hora.isoformat() if self.data_hora else None,
            'ip': self.ip
        }
    
    def __repr__(self):
        return f'<LogAtividade {self.acao} - {self.data_hora}>' 
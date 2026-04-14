from flask import request, jsonify, current_app
from app import db
from app.models import Lead, Negocio, Empresa, Estagio, LogAtividade, Pipeline
from app.blueprints.dashboard import dashboard_bp
from app.utils.decorators import token_required
from sqlalchemy import func
from datetime import datetime, timedelta


@dashboard_bp.route('/stats', methods=['GET'])
@token_required
def obter_stats(usuario_atual):
    try:
        total_leads = Lead.query.count()
        total_empresas = Empresa.query.filter_by(ativo=True).count()

        total_negocios = Negocio.query.count()
        total_abertos = Negocio.query.filter_by(status='aberto').count()
        total_ganhos = Negocio.query.filter_by(status='ganho').count()
        total_perdidos = Negocio.query.filter_by(status='perdido').count()

        valor_total = db.session.query(func.sum(Negocio.valor)).scalar() or 0
        valor_ganho = db.session.query(func.sum(Negocio.valor)).filter(Negocio.status == 'ganho').scalar() or 0
        valor_aberto = db.session.query(func.sum(Negocio.valor)).filter(Negocio.status == 'aberto').scalar() or 0
        valor_perdido = db.session.query(func.sum(Negocio.valor)).filter(Negocio.status == 'perdido').scalar() or 0

        # Leads por status
        leads_por_status = db.session.query(
            Lead.status, func.count(Lead.id)
        ).group_by(Lead.status).all()

        # Leads por origem
        leads_por_origem = db.session.query(
            Lead.origem, func.count(Lead.id)
        ).filter(Lead.origem.isnot(None)).group_by(Lead.origem).all()

        # Taxa de conversão
        taxa_conversao = 0
        if total_leads > 0:
            convertidos = Lead.query.filter_by(status='convertido').count()
            taxa_conversao = round((convertidos / total_leads) * 100, 1)

        return jsonify({
            'total_leads': total_leads,
            'total_empresas': total_empresas,
            'total_negocios': total_negocios,
            'total_abertos': total_abertos,
            'total_ganhos': total_ganhos,
            'total_perdidos': total_perdidos,
            'valor_total': float(valor_total),
            'valor_ganho': float(valor_ganho),
            'valor_aberto': float(valor_aberto),
            'valor_perdido': float(valor_perdido),
            'taxa_conversao': taxa_conversao,
            'leads_por_status': [{'status': s, 'total': t} for s, t in leads_por_status],
            'leads_por_origem': [{'origem': o or 'Não informado', 'total': t} for o, t in leads_por_origem],
        }), 200
    except Exception as e:
        current_app.logger.error(f"Erro ao obter stats: {str(e)}")
        return jsonify({'erro': 'Erro ao obter estatísticas'}), 500


@dashboard_bp.route('/funil', methods=['GET'])
@token_required
def obter_funil(usuario_atual):
    try:
        pipeline = Pipeline.query.filter_by(ativo=True).first()
        if not pipeline:
            return jsonify({'funil': []}), 200

        funil = []
        for estagio in pipeline.estagios:
            total = Negocio.query.filter_by(estagio_id=estagio.id, status='aberto').count()
            valor = db.session.query(func.sum(Negocio.valor)).filter(
                Negocio.estagio_id == estagio.id, Negocio.status == 'aberto'
            ).scalar() or 0
            funil.append({
                'estagio': estagio.nome,
                'cor': estagio.cor,
                'total': total,
                'valor': float(valor),
            })

        return jsonify({'pipeline': pipeline.nome, 'funil': funil}), 200
    except Exception as e:
        current_app.logger.error(f"Erro ao obter funil: {str(e)}")
        return jsonify({'erro': 'Erro ao obter funil'}), 500


@dashboard_bp.route('/atividades-recentes', methods=['GET'])
@token_required
def atividades_recentes(usuario_atual):
    try:
        limite = request.args.get('limite', 10, type=int)
        logs = LogAtividade.query.order_by(LogAtividade.data_hora.desc()).limit(limite).all()

        return jsonify([{
            'id': log.id,
            'acao': log.acao,
            'modulo': log.modulo,
            'descricao': log.descricao,
            'data_hora': log.data_hora.isoformat() if log.data_hora else None,
            'usuario': log.usuario.nome if log.usuario else None,
        } for log in logs]), 200
    except Exception as e:
        current_app.logger.error(f"Erro ao obter atividades: {str(e)}")
        return jsonify({'erro': 'Erro ao obter atividades recentes'}), 500

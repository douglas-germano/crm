from flask import request, jsonify, current_app
from app import db
from app.domains.core.models import LogAtividade
from app.domains.crm.models import Empresa, Estagio, Lead, Negocio, Pipeline
from app.domains.crm.blueprints.dashboard import dashboard_bp
from app.utils.decorators import token_required
from sqlalchemy import func, case


@dashboard_bp.route('/stats', methods=['GET'])
@token_required
def obter_stats(usuario_atual):
    try:
        total_leads = Lead.query.count()
        total_empresas = Empresa.query.filter_by(ativo=True).count()

        # Uma única query consolidada para todos os stats de negócios
        stats = db.session.query(
            func.count(Negocio.id).label('total'),
            func.sum(case((Negocio.status == 'aberto', 1), else_=0)).label('abertos'),
            func.sum(case((Negocio.status == 'ganho', 1), else_=0)).label('ganhos'),
            func.sum(case((Negocio.status == 'perdido', 1), else_=0)).label('perdidos'),
            func.coalesce(func.sum(Negocio.valor), 0).label('valor_total'),
            func.coalesce(func.sum(case((Negocio.status == 'ganho', Negocio.valor), else_=0)), 0).label('valor_ganho'),
            func.coalesce(func.sum(case((Negocio.status == 'aberto', Negocio.valor), else_=0)), 0).label('valor_aberto'),
            func.coalesce(func.sum(case((Negocio.status == 'perdido', Negocio.valor), else_=0)), 0).label('valor_perdido'),
        ).first()

        leads_por_status = db.session.query(
            Lead.status, func.count(Lead.id)
        ).group_by(Lead.status).all()

        leads_por_origem = db.session.query(
            Lead.origem, func.count(Lead.id)
        ).filter(Lead.origem.isnot(None)).group_by(Lead.origem).all()

        taxa_conversao = 0
        if total_leads > 0:
            convertidos = Lead.query.filter_by(status='convertido').count()
            taxa_conversao = round((convertidos / total_leads) * 100, 1)

        return jsonify({
            'total_leads': total_leads,
            'total_empresas': total_empresas,
            'total_negocios': stats.total or 0,
            'total_abertos': stats.abertos or 0,
            'total_ganhos': stats.ganhos or 0,
            'total_perdidos': stats.perdidos or 0,
            'valor_total': float(stats.valor_total or 0),
            'valor_ganho': float(stats.valor_ganho or 0),
            'valor_aberto': float(stats.valor_aberto or 0),
            'valor_perdido': float(stats.valor_perdido or 0),
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

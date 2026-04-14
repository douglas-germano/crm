import requests
from flask import current_app

def enviar_email(para_email, assunto, html_content, para_nome=None):
    """
    Despacha um email utilizando a API V3 do Brevo (antigo SendinBlue).
    
    :param para_email: Endereço do destinatário
    :param assunto: Título do e-mail
    :param html_content: Conteúdo do e-mail fomatado em HTML
    :param para_nome: (Opcional) O nome do destinatário para personalização
    :return: (sucesso_boolean, mensagem_ou_erro)
    """
    
    api_key = current_app.config.get('BREVO_API_KEY')
    sender_name = current_app.config.get('MAIL_DEFAULT_SENDER_NAME')
    sender_email = current_app.config.get('MAIL_DEFAULT_SENDER_EMAIL')
    
    if not api_key:
        current_app.logger.error("Chave API do Brevo não configurada no ambiente.")
        return False, "Erro de configuração de e-mail no servidor."
        
    url = "https://api.brevo.com/v3/smtp/email"
    
    headers = {
        "accept": "application/json",
        "api-key": api_key,
        "content-type": "application/json"
    }
    
    # Montando a representação V3 do Envio
    payload = {
        "sender": {
            "name": sender_name,
            "email": sender_email
        },
        "to": [
            {
                "email": para_email,
                "name": para_nome if para_nome else para_email.split('@')[0]
            }
        ],
        "subject": assunto,
        "htmlContent": html_content
    }

    try:
        response = requests.post(url, json=payload, headers=headers, timeout=10)
        
        if response.status_code in [200, 201, 202]:
            current_app.logger.info(f"E-mail disparado via Brevo para: {para_email} com sucesso.")
            return True, "E-mail enviado"
        else:
            erro = response.json()
            current_app.logger.error(f"Falha na API Brevo ao disparar para {para_email}: {erro}")
            return False, f"Falha no gateway provedor de e-mail."
            
    except Exception as e:
        current_app.logger.error(f"Erro de conectividade com a Brevo disparando para {para_email}: {str(e)}")
        return False, "Serviço de mensageria temporariamente invisível."

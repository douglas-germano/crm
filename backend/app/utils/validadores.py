"""
Funções de validação para dados recebidos nas APIs
"""

def validar_campos(dados, campos_obrigatorios):
    """
    Verifica se os campos obrigatórios estão presentes nos dados.
    
    Args:
        dados (dict): Dicionário com os dados recebidos
        campos_obrigatorios (list): Lista de campos que devem estar presentes
        
    Returns:
        list: Lista de mensagens de erro para campos ausentes ou vazios
    """
    mensagens_erro = []
    
    for campo in campos_obrigatorios:
        # Se o campo não existe ou é None
        if campo not in dados or dados[campo] is None:
            mensagens_erro.append(f"O campo '{campo}' é obrigatório")
        # Se o campo é uma string vazia
        elif isinstance(dados[campo], str) and dados[campo].strip() == "":
            mensagens_erro.append(f"O campo '{campo}' não pode ser vazio")
            
    return mensagens_erro

def validar_email(email):
    """
    Verifica se o email fornecido é válido.
    
    Args:
        email (str): Email a ser validado
        
    Returns:
        bool: True se o email é válido, False caso contrário
    """
    import re
    
    # Padrão simples para validação de email
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    
    if re.match(pattern, email):
        return True
    
    return False

def validar_formato_data(data_str, formato='%Y-%m-%d'):
    """
    Verifica se a string de data está no formato esperado.
    
    Args:
        data_str (str): String de data a ser validada
        formato (str): Formato esperado da data
        
    Returns:
        bool: True se a data está no formato correto, False caso contrário
    """
    from datetime import datetime
    
    try:
        datetime.strptime(data_str, formato)
        return True
    except ValueError:
        return False 
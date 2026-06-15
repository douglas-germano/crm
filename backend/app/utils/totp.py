"""TOTP (RFC 6238) implementado com a biblioteca padrão.

Usado para o segundo fator (2FA) das contas Super Admin da plataforma. Compatível
com Google Authenticator / Authy (SHA1, 6 dígitos, período de 30s).
Evita uma dependência externa (pyotp) mantendo o algoritmo auditável.
"""

import base64
import hashlib
import hmac
import os
import struct
import time
from urllib.parse import quote

PERIODO = 30
DIGITOS = 6


def gerar_secret():
    """Gera um segredo base32 (160 bits) para um novo dispositivo TOTP."""
    return base64.b32encode(os.urandom(20)).decode('utf-8').rstrip('=')


def _hotp(secret, counter):
    chave = base64.b32decode(secret + '=' * (-len(secret) % 8), casefold=True)
    mensagem = struct.pack('>Q', counter)
    digest = hmac.new(chave, mensagem, hashlib.sha1).digest()
    offset = digest[-1] & 0x0F
    codigo = (struct.unpack('>I', digest[offset:offset + 4])[0] & 0x7FFFFFFF) % (10 ** DIGITOS)
    return str(codigo).zfill(DIGITOS)


def verificar_codigo(secret, codigo, janela=1):
    """Valida um código TOTP, tolerando `janela` períodos de defasagem de relógio."""
    if not secret or not codigo:
        return False
    codigo = str(codigo).strip().replace(' ', '')
    if not codigo.isdigit() or len(codigo) != DIGITOS:
        return False
    contador = int(time.time()) // PERIODO
    for delta in range(-janela, janela + 1):
        if hmac.compare_digest(_hotp(secret, contador + delta), codigo):
            return True
    return False


def uri_provisionamento(secret, email, emissor='Apex CRM Super Admin'):
    """Monta a URI otpauth:// para gerar o QR Code no app autenticador."""
    rotulo = quote(f'{emissor}:{email}')
    issuer = quote(emissor)
    return (
        f'otpauth://totp/{rotulo}?secret={secret}'
        f'&issuer={issuer}&algorithm=SHA1&digits={DIGITOS}&period={PERIODO}'
    )

"""Testes do núcleo sensível do Super Admin (sem dependência de banco).

Executar:  python -m unittest tests.test_super_admin
"""
import time
import unittest
from datetime import datetime, timedelta, timezone


class TestTOTP(unittest.TestCase):
    def setUp(self):
        from app.utils import totp
        self.totp = totp

    def test_secret_tem_tamanho_base32(self):
        secret = self.totp.gerar_secret()
        self.assertGreaterEqual(len(secret), 32)
        # base32 sem padding usa A-Z2-7
        self.assertTrue(all(c in 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567' for c in secret))

    def test_codigo_valido_verifica(self):
        secret = self.totp.gerar_secret()
        contador = int(time.time()) // self.totp.PERIODO
        codigo = self.totp._hotp(secret, contador)
        self.assertTrue(self.totp.verificar_codigo(secret, codigo))

    def test_codigo_errado_rejeitado(self):
        secret = self.totp.gerar_secret()
        self.assertFalse(self.totp.verificar_codigo(secret, '000000'))

    def test_entrada_invalida_rejeitada(self):
        secret = self.totp.gerar_secret()
        self.assertFalse(self.totp.verificar_codigo(secret, 'abc'))
        self.assertFalse(self.totp.verificar_codigo(secret, ''))
        self.assertFalse(self.totp.verificar_codigo('', '123456'))

    def test_uri_provisionamento_otpauth(self):
        uri = self.totp.uri_provisionamento('ABC234', 'op@ex.com')
        self.assertTrue(uri.startswith('otpauth://totp/'))
        self.assertIn('secret=ABC234', uri)
        self.assertIn('issuer=', uri)


class TestSchemaValido(unittest.TestCase):
    def setUp(self):
        from app.utils.db_schema import schema_valido
        self.schema_valido = schema_valido

    def test_validos(self):
        for s in ('apex', 'tenant_1', '_priv', 'abc123'):
            self.assertTrue(self.schema_valido(s), s)

    def test_invalidos(self):
        for s in ('', None, '1abc', 'a-b', 'public; DROP', 'A bc', 'tab\t'):
            self.assertFalse(self.schema_valido(s), s)


class TestBloqueioPlatformUser(unittest.TestCase):
    def setUp(self):
        from app.domains.core.models import PlatformUser
        self.PlatformUser = PlatformUser

    def test_sem_bloqueio_quando_nulo(self):
        u = self.PlatformUser()
        u.bloqueado_ate = None
        self.assertFalse(u.esta_bloqueado)

    def test_bloqueado_no_futuro(self):
        u = self.PlatformUser()
        u.bloqueado_ate = datetime.now(timezone.utc) + timedelta(minutes=10)
        self.assertTrue(u.esta_bloqueado)

    def test_bloqueio_expirado(self):
        u = self.PlatformUser()
        u.bloqueado_ate = datetime.now(timezone.utc) - timedelta(minutes=1)
        self.assertFalse(u.esta_bloqueado)

    def test_bloqueio_naive_tratado_como_utc(self):
        u = self.PlatformUser()
        u.bloqueado_ate = datetime.utcnow() + timedelta(minutes=10)  # naive
        self.assertTrue(u.esta_bloqueado)

    def test_is_super_admin_exige_ativo(self):
        u = self.PlatformUser()
        u.papel = 'super_admin'
        u.ativo = True
        self.assertTrue(u.is_super_admin)
        u.ativo = False
        self.assertFalse(u.is_super_admin)
        u.ativo = True
        u.papel = 'suporte'
        self.assertFalse(u.is_super_admin)


class TestPlatformConfig(unittest.TestCase):
    def setUp(self):
        from app.domains.core.models import PlatformConfig
        self.PlatformConfig = PlatformConfig

    def test_to_dict_chaves(self):
        c = self.PlatformConfig()
        c.inscricoes_abertas = True
        c.modo_manutencao = False
        c.forcar_2fa = True
        d = c.to_dict()
        self.assertEqual(
            set(d.keys()),
            {'inscricoes_abertas', 'modo_manutencao', 'forcar_2fa', 'atualizado_em'},
        )
        self.assertTrue(d['inscricoes_abertas'])
        self.assertFalse(d['modo_manutencao'])
        self.assertTrue(d['forcar_2fa'])


if __name__ == '__main__':
    unittest.main()

"""Helpers para troca segura de schema PostgreSQL (multi-tenant).

Centraliza a validação do nome do schema e o `SET search_path`, garantindo que
o `search_path` sempre seja restaurado para `public` ao final — evita vazamento
de contexto entre tenants quando várias rotas executam na mesma conexão.
"""

import re
from contextlib import contextmanager

from sqlalchemy import text

from app import db

_SCHEMA_RE = re.compile(r'^[a-z_][a-z0-9_]*$')


def schema_valido(schema):
    """Retorna True se `schema` é um identificador PostgreSQL seguro."""
    return bool(schema) and bool(_SCHEMA_RE.match(schema))


def definir_search_path(schema):
    """Aplica `SET search_path TO <schema>, public` validando o identificador."""
    if not schema_valido(schema):
        raise ValueError(f'Schema inválido: {schema!r}')
    db.session.execute(text(f'SET search_path TO {schema}, public'))


def restaurar_search_path():
    """Restaura o `search_path` para o schema público global."""
    db.session.execute(text('SET search_path TO public'))


@contextmanager
def usar_schema(schema):
    """Context manager que entra no schema do tenant e sempre volta para public.

    Uso:
        with usar_schema(tenant.db_schema):
            Usuario.query.all()
    """
    definir_search_path(schema)
    try:
        yield
    finally:
        restaurar_search_path()

"""Swagger/OpenAPI setup for the versioned API contract."""

from __future__ import annotations

from typing import Any

from flasgger import Swagger
from flask import Flask
from werkzeug.routing import Rule


API_PREFIX = "/api/v1"
DOCS_ROUTE = f"{API_PREFIX}/docs/"
SPEC_ROUTE = f"{API_PREFIX}/openapi.json"

PUBLIC_ENDPOINT_SUFFIXES = (
    ".login",
    ".esqueci_senha",
    ".redefinir_senha",
    ".receber_lead",
)


def init_swagger(app: Flask) -> None:
    """Register Swagger UI and a generated OpenAPI map for all API routes."""

    Swagger(
        app,
        config={
            "headers": [],
            "specs": [
                {
                    "endpoint": "openapi",
                    "route": SPEC_ROUTE,
                    "rule_filter": lambda rule: _is_documented_rule(rule),
                    "model_filter": lambda tag: True,
                }
            ],
            "static_url_path": "/flasgger_static",
            "swagger_ui": True,
            "specs_route": DOCS_ROUTE,
        },
        template=_build_template(app),
    )


def _build_template(app: Flask) -> dict[str, Any]:
    paths: dict[str, Any] = {}
    tags: dict[str, dict[str, str]] = {}

    for rule in sorted(app.url_map.iter_rules(), key=lambda item: item.rule):
        if not _is_documented_rule(rule):
            continue

        path = _swagger_path(rule)
        operations = _operations_for_rule(rule)
        if not operations:
            continue

        paths.setdefault(path, {}).update(operations)
        for operation in operations.values():
            tag = operation["tags"][0]
            tags.setdefault(tag, {"name": tag, "description": _tag_description(tag)})

    return {
        "swagger": "2.0",
        "info": {
            "title": "Apex Platform API",
            "description": "Mapa da API versionada do Apex CRM e Apex Inspect.",
            "version": "1.0.0",
        },
        "basePath": "/",
        "schemes": ["http", "https"],
        "tags": list(tags.values()),
        "securityDefinitions": {
            "Bearer": {
                "type": "apiKey",
                "name": "Authorization",
                "in": "header",
                "description": "Use o formato: Bearer <access_token>",
            }
        },
        "paths": paths,
    }


def _is_documented_rule(rule: Rule) -> bool:
    if not rule.rule.startswith(API_PREFIX):
        return False
    if rule.rule in {DOCS_ROUTE.rstrip("/"), DOCS_ROUTE, SPEC_ROUTE}:
        return False
    return rule.endpoint != "static" and not rule.endpoint.startswith("flasgger.")


def _operations_for_rule(rule: Rule) -> dict[str, Any]:
    operations: dict[str, Any] = {}

    for method in sorted(rule.methods or []):
        if method in {"HEAD", "OPTIONS"}:
            continue

        operation = {
            "tags": [_tag_for_rule(rule)],
            "summary": _summary_for_rule(rule, method),
            "operationId": f"{rule.endpoint}.{method.lower()}",
            "parameters": _parameters_for_rule(rule, method),
            "responses": {
                "200": {"description": "Resposta bem-sucedida"},
                "400": {"description": "Requisição inválida"},
                "401": {"description": "Não autenticado"},
                "404": {"description": "Recurso não encontrado"},
            },
        }

        if _requires_auth(rule):
            operation["security"] = [{"Bearer": []}]

        operations[method.lower()] = operation

    return operations


def _swagger_path(rule: Rule) -> str:
    path = rule.rule
    for argument in rule.arguments:
        path = path.replace(f"<{argument}>", f"{{{argument}}}")
        path = path.replace(f"<int:{argument}>", f"{{{argument}}}")
        path = path.replace(f"<string:{argument}>", f"{{{argument}}}")
        path = path.replace(f"<uuid:{argument}>", f"{{{argument}}}")
    return path


def _parameters_for_rule(rule: Rule, method: str) -> list[dict[str, Any]]:
    parameters: list[dict[str, Any]] = []

    for argument in sorted(rule.arguments):
        parameters.append(
            {
                "name": argument,
                "in": "path",
                "required": True,
                "type": "string",
            }
        )

    if method in {"POST", "PUT", "PATCH"}:
        parameters.append(
            {
                "name": "body",
                "in": "body",
                "required": method == "POST",
                "schema": {
                    "type": "object",
                    "additionalProperties": True,
                },
            }
        )

    return parameters


def _tag_for_rule(rule: Rule) -> str:
    parts = rule.rule.strip("/").split("/")
    if len(parts) >= 3 and parts[0] == "api" and parts[1] == "v1":
        return parts[2]
    return "core"


def _tag_description(tag: str) -> str:
    descriptions = {
        "core": "Autenticação, usuários, tenants, administração e integrações.",
        "crm": "Relacionamento, leads, negócios, empresas, serviços e projetos.",
        "health": "Monitoramento básico de disponibilidade da API.",
        "inspect": "Campo, ativos, inspeções, ordens de serviço e gestão técnica.",
    }
    return descriptions.get(tag, f"Rotas do domínio {tag}.")


def _summary_for_rule(rule: Rule, method: str) -> str:
    resource = rule.rule.removeprefix(API_PREFIX).strip("/") or "health"
    action = {
        "GET": "Consultar",
        "POST": "Criar/executar",
        "PUT": "Atualizar",
        "PATCH": "Atualizar parcialmente",
        "DELETE": "Excluir",
    }.get(method, method.title())
    return f"{action} {resource}"


def _requires_auth(rule: Rule) -> bool:
    if rule.rule == f"{API_PREFIX}/health":
        return False
    return not any(rule.endpoint.endswith(suffix) for suffix in PUBLIC_ENDPOINT_SUFFIXES)

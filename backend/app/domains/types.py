"""Shared domain registry types."""

from __future__ import annotations

from dataclasses import dataclass

from flask import Blueprint


@dataclass(frozen=True)
class BlueprintRegistration:
    blueprint: Blueprint
    url_prefix: str
    domain: str

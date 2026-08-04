"""
Schémas de validation stricte pour l'étape 4 (critique).
Aucune donnée non validée n'atteint le moteur de rendu HTML.
"""

from __future__ import annotations

from typing import Dict, List

from pydantic import BaseModel, Field


class CritiquePatch(BaseModel):
    """Corrections structurées proposées par la critique."""
    text_patches: Dict[str, str] = Field(
        default_factory=dict,
        description="Clé = chemin du champ texte (ex: 'content.hero_tagline'), valeur = nouveau texte",
    )


class CritiqueOutput(BaseModel):
    """Sortie complète attendue du LLM après relecture du site assemblé."""
    generic_ai_signals: List[str] = Field(default_factory=list)
    patches: CritiquePatch
    approved: bool

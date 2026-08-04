"""
Étape 4 — Critique.

Relit le contenu textuel généré (pas le HTML — le rendu reste toujours produit
de façon déterministe par step3_composition.py, donc pas de risque d'y injecter
du HTML non échappé). Propose des corrections de texte si le contenu "sonne"
générique. Applique les patches puis relance le rendu déterministe.

Idée reprise du travail initial de mon coéquipier (boucle de patches structurés),
mais adaptée pour :
- utiliser notre client LLM partagé (call_structured) au lieu d'un client dupliqué
- patcher le contenu de business_need (donc rester compatible avec le vrai schéma
  produit par l'étape 1), plutôt qu'un schéma de tokens/composants inventé
"""

from __future__ import annotations

import json
from pathlib import Path

from src.services.structured_llm import call_structured
from src.pipeline.schemas import CritiqueOutput
from src.pipeline.step3_composition import compose_site

PROMPT_PATH = Path(__file__).resolve().parent.parent / "prompts" / "critique.prompt"

MAX_ROUNDS = 2


def review_and_fix(business_need: dict, variant: dict) -> dict:
    """
    :param business_need: sortie de extract_need() (étape 1)
    :param variant: la variante de direction artistique choisie
    :return: {
        "html": str,                 # site final, après corrections éventuelles
        "skipped_sections": [str],
        "business_need": dict,       # version potentiellement patchée du besoin
        "signals_history": [str],    # tous les signaux "générique" détectés au fil des rounds
    }
    """
    current_need = json.loads(json.dumps(business_need))  # copie profonde simple
    signals_history: list[str] = []

    prompt_template = PROMPT_PATH.read_text(encoding="utf-8")

    for _ in range(MAX_ROUNDS):
        reviewable_content = {
            "sector": current_need.get("sector"),
            "brand_tone": current_need.get("brand_tone"),
            "content": {
                "hero_tagline": current_need.get("content", {}).get("hero_tagline"),
                "long_description": current_need.get("content", {}).get("long_description"),
            },
        }
        final_prompt = prompt_template.replace(
            "{{BUSINESS_CONTENT_JSON}}",
            json.dumps(reviewable_content, indent=2, ensure_ascii=False),
        )

        critique = call_structured(
            final_prompt,
            schema=CritiqueOutput,
            temperature=0.4,
            primary_provider="gemini",
        )
        signals_history.extend(critique.generic_ai_signals)

        if critique.approved or not critique.patches.text_patches:
            break

        _apply_patches(current_need, critique.patches.text_patches)

    composition = compose_site(current_need, variant)

    return {
        "html": composition["html"],
        "skipped_sections": composition["skipped_sections"],
        "business_need": current_need,
        "signals_history": signals_history,
    }


def _apply_patches(business_need: dict, text_patches: dict) -> None:
    """Applique les patches sur business_need, en suivant un chemin en notation pointée
    limité à ce que le prompt autorise ('content.hero_tagline', 'content.long_description')."""
    allowed_paths = {"content.hero_tagline", "content.long_description"}

    for path, new_value in text_patches.items():
        if path not in allowed_paths:
            continue  # ignore silencieusement toute clé non autorisée (défense en profondeur)
        _, field = path.split(".")
        business_need.setdefault("content", {})[field] = new_value

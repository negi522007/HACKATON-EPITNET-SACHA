"""
Wrapper au-dessus de call_llm() (src/services/llm_client.py) qui ajoute :
- parsing JSON robuste
- validation stricte via un schéma Pydantic
- un re-prompt correctif automatique si la réponse est invalide (1 tentative de plus)

Idée reprise et adaptée du travail initial sur les étapes 3/4 — bonne pratique
(aucune donnée non validée n'atteint le moteur de rendu), mais rebranchée sur
notre client LLM unique (Gemini + fallback Groq) plutôt qu'un client dupliqué.
"""

from __future__ import annotations

import json
import re
from typing import Type, TypeVar

from pydantic import BaseModel, ValidationError

from src.services.llm_client import call_llm

T = TypeVar("T", bound=BaseModel)


def call_structured(
    prompt: str,
    schema: Type[T],
    temperature: float = 0.5,
    primary_provider: str = "gemini",
    max_attempts: int = 2,
) -> T:
    """
    Appelle le LLM et valide strictement la réponse contre `schema`.
    Si le JSON est invalide ou ne respecte pas le schéma, un re-prompt correctif
    est envoyé automatiquement (jusqu'à max_attempts tentatives au total).

    :raises ValueError: si toutes les tentatives échouent
    """
    last_error: Exception | None = None
    current_prompt = prompt

    for attempt in range(max_attempts):
        raw = call_llm(current_prompt, temperature=temperature, primary_provider=primary_provider)
        cleaned = re.sub(r"```json|```", "", raw).strip()

        try:
            parsed = json.loads(cleaned)
            return schema.model_validate(parsed)
        except (json.JSONDecodeError, ValidationError) as err:
            last_error = err
            current_prompt = (
                f"{prompt}\n\n"
                f"[Ta réponse précédente était invalide : {err}]\n"
                f"Renvoie UNIQUEMENT le JSON corrigé, strictement conforme au schéma, "
                f"sans aucun texte autour."
            )

    raise ValueError(f"Échec de validation structurée après {max_attempts} tentatives : {last_error}")

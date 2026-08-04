"""
Étape 1 du pipeline — Extraction.

Transforme le texte libre d'un utilisateur (+ champs optionnels de formulaire)
en un JSON structuré et fiable, exploitable par le reste du pipeline.
Utilise Groq en provider primaire (rapidité, fiabilité JSON), fallback Gemini.
"""

import json
import re
from pathlib import Path

from src.services.llm_client import call_llm

PROMPT_PATH = Path(__file__).resolve().parent.parent / "prompts" / "extraction.prompt"

REQUIRED_FIELDS = ["business_name", "sector", "brand_tone", "required_sections", "content"]


def extract_need(user_input: str, optional_fields: dict | None = None) -> dict:
    """
    :param user_input: La description libre du besoin (en français)
    :param optional_fields: Champs optionnels remplis via formulaire
        (ex: {"preferred_colors": "terracotta", "style_keywords": "chaleureux, artisanal"})
    :return: Le besoin structuré (clés en anglais, contenu en français)
    """
    optional_fields = optional_fields or {}

    if not user_input or len(user_input.strip()) < 10:
        raise ValueError("Description utilisateur trop courte ou vide")

    prompt_template = PROMPT_PATH.read_text(encoding="utf-8")
    combined_input = _build_combined_input(user_input, optional_fields)
    final_prompt = prompt_template.replace("{{USER_INPUT}}", combined_input)

    raw_response = call_llm(final_prompt, temperature=0.3, primary_provider="groq")

    cleaned = re.sub(r"```json|```", "", raw_response).strip()

    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError as err:
        print("Échec du parsing JSON. Réponse brute reçue :", cleaned)
        raise ValueError("Le LLM n'a pas retourné un JSON valide") from err

    _validate_structure(parsed)
    return parsed


def _build_combined_input(user_input: str, optional_fields: dict) -> str:
    """
    Combine le texte libre et les champs optionnels du formulaire en un seul bloc,
    pour qu'ils soient traités ensemble par le prompt (toujours dans <user_input>).
    """
    entries = {k: v for k, v in optional_fields.items() if v not in (None, "")}

    if not entries:
        return user_input.strip()

    form_fields_text = "\n".join(f"- {key}: {value}" for key, value in entries.items())
    return (
        f"{user_input.strip()}\n\n"
        f"[Champs de formulaire optionnels renseignés par l'utilisateur]\n{form_fields_text}"
    )


def _validate_structure(data: dict) -> None:
    for field in REQUIRED_FIELDS:
        if field not in data:
            raise ValueError(f"Champ requis manquant dans la réponse LLM : {field}")

    required_sections = data.get("required_sections")
    if not isinstance(required_sections, list) or len(required_sections) < 3:
        raise ValueError("required_sections doit contenir au moins 3 sections")

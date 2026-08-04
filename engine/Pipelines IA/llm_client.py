"""
Client LLM unique pour tout le pipeline : Gemini en primaire, Groq en fallback
automatique si Gemini échoue (erreur réseau, quota, timeout). Le parsing JSON
est strict avec une tentative de correction (re-prompt) en cas d'échec.
"""
from __future__ import annotations

# Imports de base
import json
import os
import re

# Requête HTTP externe pour appeler les APIs LLM
import requests

# Typage générique pour les modèles Pydantic
from typing import Type, TypeVar
from pydantic import BaseModel, ValidationError

# Type générique lié aux modèles Pydantic pour validation structurée
T = TypeVar("T", bound=BaseModel)

# Clés d'API lues depuis les variables d'environnement
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
GROQ_API_KEY = os.environ.get("GROQ_API_KEY")

# URL des endpoints LLM
GEMINI_URL = (
    "https://generativelanguage.googleapis.com/v1beta/models/"
    "gemini-2.0-flash:generateContent?key={key}"
)
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"


class LLMError(Exception):
    """Exception personnalisée pour les erreurs LLM."""
    pass


def _call_gemini(system_prompt: str, user_prompt: str) -> str:
    """Appelle l'API Gemini et retourne le texte généré."""
    if not GEMINI_API_KEY:
        # Erreur dès le début si la clé Gemini n'est pas configurée
        raise LLMError("GEMINI_API_KEY absente")

    # Corps JSON attendu par Gemini
    payload = {
        "system_instruction": {"parts": [{"text": system_prompt}]},
        "contents": [{"role": "user", "parts": [{"text": user_prompt}]}],
        "generationConfig": {"temperature": 0.4, "response_mime_type": "application/json"},
    }

    # Envoi de la requête POST vers Gemini
    resp = requests.post(GEMINI_URL.format(key=GEMINI_API_KEY), json=payload, timeout=30)
    resp.raise_for_status()

    # Extraction du texte de la réponse
    data = resp.json()
    return data["candidates"][0]["content"]["parts"][0]["text"]


def _call_groq(system_prompt: str, user_prompt: str) -> str:
    """Appelle l'API Groq et retourne le texte généré."""
    if not GROQ_API_KEY:
        # Erreur si la clé Groq n'est pas configurée
        raise LLMError("GROQ_API_KEY absente")

    headers = {"Authorization": f"Bearer {GROQ_API_KEY}"}

    # Payload compatible avec l'endpoint OpenAI-like de Groq
    payload = {
        "model": "llama-3.3-70b-versatile",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": 0.4,
        "response_format": {"type": "json_object"},
    }

    # Envoi de la requête POST vers Groq
    resp = requests.post(GROQ_URL, json=payload, headers=headers, timeout=30)
    resp.raise_for_status()

    # Extraction du contenu JSON retourné
    data = resp.json()
    return data["choices"][0]["message"]["content"]


def _extract_json(raw: str) -> dict:
    """Nettoie le texte brut pour en extraire un JSON valide."""
    # Retire les balises markdown ```json ou ``` si présentes
    cleaned = re.sub(r"^```(json)?|```$", "", raw.strip(), flags=re.MULTILINE).strip()
    return json.loads(cleaned)


def call_llm_structured(system_prompt: str, user_prompt: str, schema: Type[T]) -> T:
    """
    Appelle Gemini puis Groq en fallback. Analyse la réponse JSON et valide
    le résultat avec un modèle Pydantic.

    Si la réponse n'est pas décodable ou ne correspond pas au schéma, un
    second essai de re-prompt est effectué pour demander uniquement le JSON.
    """
    last_error: Exception | None = None

    # Deux tentatives : première réponse et re-prompt correctif si nécessaire
    for attempt in range(2):
        raw = None

        try:
            # Essai principal sur Gemini
            raw = _call_gemini(system_prompt, user_prompt)
        except Exception as e:
            # Si Gemini échoue, on retient l'erreur puis on bascule sur Groq
            last_error = e
            try:
                raw = _call_groq(system_prompt, user_prompt)
            except Exception as e2:
                # Si Groq échoue aussi, on retient la dernière erreur
                last_error = e2
                raw = None

        if raw is None:
            # Aucun texte valide reçu, on retente si possible
            continue

        try:
            # Nettoyage et parsing strict du JSON
            parsed = _extract_json(raw)
            # Validation du JSON selon le schéma Pydantic fourni
            return schema.model_validate(parsed)
        except (json.JSONDecodeError, ValidationError) as e:
            last_error = e
            # Re-prompt correctif : demander à l'API de renvoyer uniquement du JSON
            user_prompt = (
                user_prompt
                + f"\n\nTa réponse précédente était invalide ({e}). "
                "Renvoie UNIQUEMENT le JSON corrigé, sans aucun texte autour."
            )

    # Si les tentatives échouent, on lève une exception personnalisée
    raise LLMError(f"Échec Gemini + Groq après retry: {last_error}")

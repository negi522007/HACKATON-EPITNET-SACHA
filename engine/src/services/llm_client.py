"""
Wrapper centralisé pour les appels LLM.
Tout le reste du pipeline appelle call_llm() sans connaître le provider derrière
(Gemini ou Groq) — découplage total, bascule automatique en cas d'échec.
"""

import os
import requests
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"


def call_llm(
    prompt: str,
    temperature: float = 0.5,
    primary_provider: str = "gemini",
    image_base64: str | None = None,
    image_mime_type: str | None = None,
) -> str:
    """
    Appelle le LLM, avec un provider primaire choisi et fallback automatique sur l'autre.

    :param prompt: Le prompt complet à envoyer
    :param temperature: Température de génération
    :param primary_provider: 'gemini' ou 'groq' — provider à essayer en premier
    :param image_base64: Image encodée en base64 (sans préfixe data:...), optionnel
    :param image_mime_type: Ex: 'image/png', 'image/jpeg'
    :return: La réponse texte brute du modèle
    """
    providers = [_call_groq, _call_gemini] if primary_provider == "groq" else [_call_gemini, _call_groq]

    last_error = None
    for provider_fn in providers:
        try:
            if provider_fn is _call_gemini:
                return provider_fn(prompt, temperature, image_base64, image_mime_type)
            return provider_fn(prompt, temperature)
        except Exception as err:  # noqa: BLE001 — on veut capturer toute erreur pour basculer proprement
            print(f"[llm-client] {provider_fn.__name__} a échoué : {err}")
            last_error = err

    raise RuntimeError(f"Tous les providers LLM ont échoué. Dernière erreur : {last_error}")


def _call_gemini(
    prompt: str,
    temperature: float,
    image_base64: str | None = None,
    image_mime_type: str | None = None,
) -> str:
    if not GEMINI_API_KEY:
        raise RuntimeError("GEMINI_API_KEY manquante")

    parts = [{"text": prompt}]
    if image_base64 and image_mime_type:
        parts.append({"inline_data": {"mime_type": image_mime_type, "data": image_base64}})

    response = requests.post(
        f"{GEMINI_URL}?key={GEMINI_API_KEY}",
        json={"contents": [{"parts": parts}], "generationConfig": {"temperature": temperature}},
        timeout=60,
    )

    if not response.ok:
        raise RuntimeError(f"Gemini API error {response.status_code}: {response.text}")

    data = response.json()
    try:
        text = data["candidates"][0]["content"]["parts"][0]["text"]
    except (KeyError, IndexError) as err:
        raise RuntimeError("Réponse Gemini vide ou mal formée") from err

    if not text:
        raise RuntimeError("Réponse Gemini vide ou mal formée")

    return text


def _call_groq(prompt: str, temperature: float) -> str:
    # Note : Groq (Llama 3.3) ne supporte pas l'entrée image ici.
    # Si on tombe sur Groq en fallback pour une étape qui envoyait une image,
    # l'appel continue en mode texte seul plutôt que de crasher.
    if not GROQ_API_KEY:
        raise RuntimeError("GROQ_API_KEY manquante")

    response = requests.post(
        GROQ_URL,
        headers={"Authorization": f"Bearer {GROQ_API_KEY}"},
        json={
            "model": "llama-3.3-70b-versatile",
            "messages": [{"role": "user", "content": prompt}],
            "temperature": temperature,
        },
        timeout=60,
    )

    if not response.ok:
        raise RuntimeError(f"Groq API error {response.status_code}: {response.text}")

    data = response.json()
    try:
        text = data["choices"][0]["message"]["content"]
    except (KeyError, IndexError) as err:
        raise RuntimeError("Réponse Groq vide ou mal formée") from err

    if not text:
        raise RuntimeError("Réponse Groq vide ou mal formée")

    return text

"""
Étape 2 du pipeline — Direction artistique.

Génère 3 variantes distinctes de direction artistique (palette, typographie,
mood, layout) à partir du besoin structuré (étape 1), avec analyse optionnelle
d'une image (logo ou inspiration visuelle) via les capacités multimodales de Gemini.
Utilise Gemini en provider primaire (seul provider multimodal), fallback Groq
(mode texte seul si jamais une image était fournie).
"""

import json
import re
from pathlib import Path

from src.services.llm_client import call_llm
from src.services.image_utils import validate_and_prepare_image

PROMPT_PATH = Path(__file__).resolve().parent.parent / "prompts" / "art_direction.prompt"

VALID_MOODS = [
    "artisanal", "editorial", "minimalist_luxury", "organic_warm",
    "bold_modern", "corporate_trustworthy", "playful_energetic",
]
VALID_LAYOUTS = [
    "centered_classic", "asymmetric_editorial", "split_dynamic",
    "fullbleed_immersive", "grid_structured",
]
VALID_HERO_VARIANTS = ["hero-centered", "hero-split", "hero-fullscreen"]
VALID_SPACING = ["compact", "comfortable", "generous"]

REQUIRED_VARIANT_FIELDS = [
    "id", "label", "rationale", "color_palette",
    "typography", "mood", "layout_style", "hero_variant", "spacing_scale",
]
PALETTE_KEYS = ["primary", "secondary", "accent", "background", "text"]
HEX_RE = re.compile(r"^#[0-9A-Fa-f]{6}$")


def generate_art_direction(business_need: dict, image: dict | None = None) -> dict:
    """
    :param business_need: Le dict structuré produit par extract_need() (étape 1)
    :param image: {"buffer": bytes, "mime_type": str, "image_type": "logo" | "inspiration"} — optionnel.
        "image_type" est fourni par la plateforme au moment de l'upload (pas déductible du contenu) :
        - "logo" : l'image doit être visuellement intégrée au site à l'étape 3 (ex: navbar).
        - "inspiration" : l'image sert uniquement à influencer le style, jamais affichée telle quelle.
    :return: {"variants": [...3 variantes...], "image_influence": str | None}
    :raises ValueError: si business_need ou l'image sont invalides
    """
    if not business_need or not isinstance(business_need, dict):
        raise ValueError("business_need manquant ou invalide (attendu : sortie de extract_need())")

    # Valide et prépare l'image AVANT tout appel LLM, pour échouer vite et clairement
    # plutôt que de laisser un fichier invalide remonter en erreur API opaque.
    prepared_image = None
    if image and image.get("buffer") and image.get("mime_type"):
        if image.get("image_type") not in ("logo", "inspiration"):
            raise ValueError(
                'image["image_type"] doit être "logo" ou "inspiration" — '
                "à fournir explicitement par la plateforme, non déductible du contenu de l'image"
            )
        prepared_image = validate_and_prepare_image(image["buffer"], image["mime_type"])
        prepared_image["image_type"] = image["image_type"]

    prompt_template = PROMPT_PATH.read_text(encoding="utf-8")
    final_prompt = prompt_template.replace(
        "{{BUSINESS_NEED_JSON}}",
        json.dumps(business_need, indent=2, ensure_ascii=False),
    )

    call_kwargs = {"temperature": 0.8, "primary_provider": "gemini"}
    if prepared_image:
        call_kwargs["image_base64"] = prepared_image["base64"]
        call_kwargs["image_mime_type"] = prepared_image["mime_type"]

    raw_response = call_llm(final_prompt, **call_kwargs)

    cleaned = re.sub(r"```json|```", "", raw_response).strip()

    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError as err:
        print("Échec du parsing JSON. Réponse brute reçue :", cleaned)
        raise ValueError("Le LLM n'a pas retourné un JSON valide") from err

    _validate_structure(parsed)

    # Si l'image fournie est un logo, on le renvoie tel quel pour que l'orchestrateur
    # puisse le conserver dans la session — l'étape 3 en aura besoin pour l'intégrer au site.
    if prepared_image and prepared_image["image_type"] == "logo":
        parsed["logo"] = {
            "base64": prepared_image["base64"],
            "mime_type": prepared_image["mime_type"],
        }
    else:
        parsed["logo"] = None

    return parsed


def _validate_structure(data: dict) -> None:
    variants = data.get("variants")
    if not isinstance(variants, list) or len(variants) != 3:
        raise ValueError("La réponse doit contenir exactement 3 variantes")

    for i, variant in enumerate(variants, start=1):
        for field in REQUIRED_VARIANT_FIELDS:
            if field not in variant:
                raise ValueError(f'Variante {i} : champ requis manquant "{field}"')

        for key in PALETTE_KEYS:
            value = variant["color_palette"].get(key)
            if not value or not HEX_RE.match(value):
                raise ValueError(
                    f'Variante {i} : couleur "{key}" manquante ou invalide (attendu format hex #RRGGBB)'
                )

        if not variant["typography"].get("heading_font") or not variant["typography"].get("body_font"):
            raise ValueError(f"Variante {i} : typography incomplète")

        if variant["mood"] not in VALID_MOODS:
            raise ValueError(f'Variante {i} : mood invalide "{variant["mood"]}"')
        if variant["layout_style"] not in VALID_LAYOUTS:
            raise ValueError(f'Variante {i} : layout_style invalide "{variant["layout_style"]}"')
        if variant["hero_variant"] not in VALID_HERO_VARIANTS:
            raise ValueError(f'Variante {i} : hero_variant invalide "{variant["hero_variant"]}"')
        if variant["spacing_scale"] not in VALID_SPACING:
            raise ValueError(f'Variante {i} : spacing_scale invalide "{variant["spacing_scale"]}"')

    # Vérifie que les 3 variantes sont bien distinctes (pas les mêmes fonts, pas le même mood)
    moods = [v["mood"] for v in variants]
    heading_fonts = [v["typography"]["heading_font"] for v in variants]
    if len(set(moods)) < 3:
        print("[art-direction] Attention : plusieurs variantes partagent le même mood — diversité insuffisante")
    if len(set(heading_fonts)) < 3:
        print("[art-direction] Attention : plusieurs variantes partagent la même police — diversité insuffisante")

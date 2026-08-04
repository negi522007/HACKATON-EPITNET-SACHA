"""
ORCHESTRATEUR — point d'entrée unique pour l'équipe plateforme.

Couvre le pipeline complet : extraction (1), direction artistique (2),
composition (3) et critique (4). Persiste l'état de la session à chaque étape.
"""

import json
import uuid
from datetime import datetime, timezone
from pathlib import Path

from src.pipeline.step1_extraction import extract_need
from src.pipeline.step2_art_direction import generate_art_direction
from src.pipeline.step4_critique import review_and_fix
from src.pipeline.export import export_site

SESSIONS_DIR = Path(__file__).resolve().parent.parent.parent / "sessions"


def start_generation(
    user_input: str,
    optional_fields: dict | None = None,
    image: dict | None = None,
) -> dict:
    """
    :param user_input: Texte libre décrivant le besoin
    :param optional_fields: Champs de formulaire optionnels
    :param image: {"buffer": bytes, "mime_type": str, "image_type": "logo" | "inspiration"} — optionnel.
        "image_type" doit être fourni explicitement par la plateforme (voir PLATFORM_README.md).
    :return: {"session_id", "business_need", "variants", "image_influence"}
    """
    session_id = str(uuid.uuid4())

    # Étape 1
    business_need = extract_need(user_input, optional_fields or {})

    # Étape 2
    art_direction_result = generate_art_direction(business_need, image)

    session = {
        "session_id": session_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "status": "awaiting_variant_selection",
        "business_need": business_need,
        "variants": art_direction_result["variants"],
        "image_influence": art_direction_result.get("image_influence"),
        "logo": art_direction_result.get("logo"),  # présent seulement si image_type == "logo"
        "selected_variant_id": None,
    }

    _save_session(session)

    return {
        "session_id": session_id,
        "business_need": business_need,
        "variants": art_direction_result["variants"],
        "image_influence": art_direction_result.get("image_influence"),
        "has_logo": session["logo"] is not None,
    }


def select_variant(session_id: str, variant_id: str) -> dict:
    """
    Appelé quand l'utilisateur a choisi une des 3 variantes proposées (preview dynamique).
    Met à jour la session — c'est ce que l'étape 3 (composition) viendra lire ensuite.

    :param session_id: identifiant de session
    :param variant_id: ex: 'variant_1', 'variant_2', 'variant_3'
    :return: la session mise à jour
    """
    session = _load_session(session_id)

    variant = next((v for v in session["variants"] if v["id"] == variant_id), None)
    if variant is None:
        raise ValueError(f'Variante "{variant_id}" introuvable dans la session {session_id}')

    session["selected_variant_id"] = variant_id
    session["status"] = "ready_for_composition"
    _save_session(session)

    return session


def get_session(session_id: str) -> dict:
    """Récupère une session existante (utile pour la plateforme comme pour l'étape 3)."""
    return _load_session(session_id)


def run_composition(session_id: str) -> dict:
    """
    Lance les étapes 3 (composition) et 4 (critique) pour une session dont
    l'utilisateur a déjà choisi une variante (status == "ready_for_composition").

    :param session_id: identifiant de session
    :return: {
        "html": str,
        "zip_path": str,
        "skipped_sections": [str],   # sections demandées mais non générées, voir step3_composition.py
        "signals_history": [str],    # signaux "générique" détectés et corrigés par la critique
    }
    :raises ValueError: si la session n'est pas prête pour la composition
    """
    session = _load_session(session_id)

    if session["status"] != "ready_for_composition":
        raise ValueError(
            f'Session non prête pour la composition (status actuel : "{session["status"]}"). '
            f"Appelle select_variant() d'abord."
        )

    variant = next(v for v in session["variants"] if v["id"] == session["selected_variant_id"])

    result = review_and_fix(session["business_need"], variant)

    export_result = export_site(session_id, result["html"])

    session["status"] = "completed"
    session["business_need"] = result["business_need"]  # peut avoir été patché par la critique
    session["skipped_sections"] = result["skipped_sections"]
    session["signals_history"] = result["signals_history"]
    session["output_zip_path"] = export_result["zip_path"]
    session["output_site_dir"] = export_result["site_dir"]
    _save_session(session)

    return {
        "html": result["html"],
        "zip_path": export_result["zip_path"],
        "skipped_sections": result["skipped_sections"],
        "signals_history": result["signals_history"],
    }


# --- Persistance (fichier JSON par session, cf. décision architecture J1) ---

def _save_session(session: dict) -> None:
    SESSIONS_DIR.mkdir(parents=True, exist_ok=True)
    file_path = SESSIONS_DIR / f"{session['session_id']}.json"
    file_path.write_text(json.dumps(session, indent=2, ensure_ascii=False), encoding="utf-8")


def _load_session(session_id: str) -> dict:
    file_path = SESSIONS_DIR / f"{session_id}.json"
    if not file_path.exists():
        raise FileNotFoundError(f"Session introuvable : {session_id}")
    return json.loads(file_path.read_text(encoding="utf-8"))

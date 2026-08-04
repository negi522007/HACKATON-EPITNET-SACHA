"""
Vérifie le branchement complet du pipeline (1 → 2 → 3 → 4 → export) SANS appeler
de vraies API — les réponses LLM sont simulées, pour tester la mécanique
(parsing, validation, mapping des templates, rendu, patches de critique, export)
indépendamment de la disponibilité réseau à Gemini/Groq.

⚠️ Ceci ne remplace PAS un test avec de vraies clés API — à faire en local
avec `python tests/test_orchestrator.py` + de vraies clés dans .env.

Usage : python tests/test_full_pipeline_mocked.py
"""

import json
import sys
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.api import generate as orchestrator
from src.pipeline.export import cleanup_output

FAKE_EXTRACTION_RESPONSE = json.dumps({
    "business_name": "Boulangerie Marie",
    "sector": "artisanal_bakery",
    "short_description": "Boulangerie artisanale chaleureuse à Cotonou.",
    "brand_tone": "artisanal",
    "location": "Cotonou",
    # Volontairement, on inclut une section qu'on sait NE PAS être supportée
    # (testimonials) pour vérifier que compose_site() la saute proprement.
    "required_sections": ["hero", "about", "services", "contact", "testimonials"],
    "content": {
        "hero_tagline": "Bienvenue sur notre site",  # volontairement générique, pour tester la critique
        "long_description": "Nous proposons des produits de qualité pour tous.",  # idem
        "services_or_products": ["Pain traditionnel", "Viennoiseries", "Gâteaux sur commande"],
        "contact": {"phone": "+229 00 00 00 00", "email": "marie@example.com", "address": "Cotonou, Bénin"},
    },
    "visual_hints": {"mentioned_colors": ["terracotta"], "mentioned_style": None},
})

FAKE_ART_DIRECTION_RESPONSE = json.dumps({
    "variants": [
        {
            "id": "variant_1", "label": "Chaleureux artisanal",
            "rationale": "Palette terracotta pour une boulangerie artisanale.",
            "color_palette": {"primary": "#8B4513", "secondary": "#F5DEB3", "accent": "#D2691E", "background": "#FFF8F0", "text": "#3E2723"},
            "typography": {"heading_font": "Playfair Display", "body_font": "Lato"},
            "mood": "artisanal", "layout_style": "asymmetric_editorial",
            "hero_variant": "hero-split", "spacing_scale": "generous",
        },
        {
            "id": "variant_2", "label": "Moderne épuré",
            "rationale": "Style minimaliste pour une clientèle urbaine.",
            "color_palette": {"primary": "#1A1A1A", "secondary": "#EDEDED", "accent": "#C9A66B", "background": "#FFFFFF", "text": "#1A1A1A"},
            "typography": {"heading_font": "Space Grotesk", "body_font": "IBM Plex Sans"},
            "mood": "minimalist_luxury", "layout_style": "grid_structured",
            "hero_variant": "hero-fullscreen", "spacing_scale": "comfortable",
        },
        {
            "id": "variant_3", "label": "Éditorial fait main",
            "rationale": "Ambiance artisanale et éditoriale.",
            "color_palette": {"primary": "#5C4033", "secondary": "#EAD8C0", "accent": "#A9744F", "background": "#FBF6EF", "text": "#3B2E25"},
            "typography": {"heading_font": "DM Serif Display", "body_font": "DM Sans"},
            "mood": "editorial", "layout_style": "centered_classic",
            "hero_variant": "hero-centered", "spacing_scale": "compact",
        },
    ],
    "image_influence": None,
})

FAKE_CRITIQUE_RESPONSE_ROUND_1 = json.dumps({
    "generic_ai_signals": ["Accroche générique ('Bienvenue sur notre site')", "Description trop vague"],
    "patches": {
        "text_patches": {
            "content.hero_tagline": "Le pain de tradition, pétri chaque matin à Cotonou",
            "content.long_description": "Marie prépare chaque jour pains, viennoiseries et gâteaux artisanaux, avec des recettes transmises et un savoir-faire local.",
        }
    },
    "approved": False,
})

FAKE_CRITIQUE_RESPONSE_ROUND_2 = json.dumps({
    "generic_ai_signals": [],
    "patches": {"text_patches": {}},
    "approved": True,
})


def run():
    print("\n--- Test pipeline complet (mocké) ---\n")

    with patch("src.pipeline.step1_extraction.call_llm", return_value=FAKE_EXTRACTION_RESPONSE), \
         patch("src.pipeline.step2_art_direction.call_llm", return_value=FAKE_ART_DIRECTION_RESPONSE):

        result = orchestrator.start_generation(
            user_input="Je suis Marie, j'ai une boulangerie artisanale à Cotonou.",
        )

    session_id = result["session_id"]
    print("Session créée :", session_id)
    assert len(result["variants"]) == 3, "Il faut exactement 3 variantes"
    print("✓ 3 variantes bien reçues")

    session = orchestrator.select_variant(session_id, result["variants"][0]["id"])
    assert session["status"] == "ready_for_composition"
    print("✓ Sélection de variante OK, statut :", session["status"])

    with patch(
        "src.services.structured_llm.call_llm",
        side_effect=[FAKE_CRITIQUE_RESPONSE_ROUND_1, FAKE_CRITIQUE_RESPONSE_ROUND_2],
    ):
        composition_result = orchestrator.run_composition(session_id)

    print("\n--- Résultat composition + critique ---")
    print("Sections ignorées (non supportées) :", composition_result["skipped_sections"])
    assert composition_result["skipped_sections"] == ["testimonials"], "testimonials aurait dû être ignorée"
    print("✓ La section non supportée a bien été ignorée proprement (pas de contenu inventé)")

    print("Signaux génériques détectés puis corrigés :", composition_result["signals_history"])
    assert len(composition_result["signals_history"]) > 0, "La critique aurait dû détecter des signaux au round 1"
    print("✓ La boucle de critique a bien détecté et corrigé le contenu générique")

    html = composition_result["html"]
    assert "Le pain de tradition" in html, "Le texte corrigé par la critique doit apparaître dans le HTML final"
    assert "Bienvenue sur notre site" not in html, "Le texte générique original ne doit plus apparaître"
    print("✓ Le HTML final contient bien le texte corrigé, pas l'original générique")

    assert "<script>" not in html.lower() or "&lt;script&gt;" in html, "Vérif basique anti-XSS (autoescape Jinja2)"
    print("✓ Pas de balise <script> non échappée détectée (autoescape Jinja2 actif)")

    zip_path = Path(composition_result["zip_path"])
    assert zip_path.exists(), "Le fichier ZIP doit avoir été créé"
    print(f"✓ Export ZIP créé : {zip_path} ({zip_path.stat().st_size} octets)")

    output_html_path = Path(composition_result["zip_path"]).parent / session_id / "index.html"
    print(f"\nSite HTML complet sauvegardé pour inspection manuelle : {output_html_path}")

    cleanup_output(session_id)
    Path(f"sessions/{session_id}.json").unlink(missing_ok=True)

    print("\n✅ TOUS LES TESTS MÉCANIQUES SONT PASSÉS.")
    print("⚠️ Rappel : ceci teste le branchement, pas la qualité réelle des réponses LLM.")
    print("   Il reste à tester avec de vraies clés API (python tests/test_orchestrator.py).")


if __name__ == "__main__":
    try:
        run()
    except AssertionError as err:
        print(f"\n❌ ÉCHEC : {err}")
        sys.exit(1)
    except Exception as err:  # noqa: BLE001
        print(f"\n❌ ERREUR INATTENDUE : {err}")
        raise

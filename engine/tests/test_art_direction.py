"""
Ce script enchaîne étape 1 → étape 2, pour tester la direction artistique
avec une entrée réaliste (celle produite par l'extraction).

Usage :
    python tests/test_art_direction.py boulangerie
    python tests/test_art_direction.py cabinet_medical
"""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.pipeline.step1_extraction import extract_need
from src.pipeline.step2_art_direction import generate_art_direction

FIXTURES_DIR = Path(__file__).resolve().parent / "fixtures"


def run(fixture_name: str) -> None:
    fixture_path = FIXTURES_DIR / f"{fixture_name}.json"
    if not fixture_path.exists():
        print(f"Fixture introuvable : {fixture_path}")
        sys.exit(1)

    fixture = json.loads(fixture_path.read_text(encoding="utf-8"))
    user_input = fixture["userInput"]
    optional_fields = fixture.get("optionalFields", {})

    print(f"\n--- Test direction artistique : {fixture_name} ---\n")
    print("Étape 1 (extraction) en cours...\n")

    business_need = extract_need(user_input, optional_fields)
    print("Besoin structuré obtenu :", business_need["business_name"], "/", business_need["sector"])

    print("\nÉtape 2 (direction artistique) en cours...\n")

    # Pas d'image dans ce test de base — pour tester avec une image (logo ou inspiration) :
    # image = {"buffer": Path("chemin/vers/logo.png").read_bytes(), "mime_type": "image/png"}
    # generate_art_direction(business_need, image)
    # → la validation (format, taille) se fait automatiquement dans generate_art_direction()

    try:
        result = generate_art_direction(business_need)

        print(f"\n{len(result['variants'])} variantes générées :\n")
        for i, v in enumerate(result["variants"], start=1):
            print(f"--- Variante {i} : {v['label']} ---")
            print("Rationale :", v["rationale"])
            print("Mood :", v["mood"], "| Layout :", v["layout_style"], "| Hero :", v["hero_variant"])
            print("Palette :", v["color_palette"])
            print("Typo :", v["typography"])
            print("Spacing :", v["spacing_scale"])
            print()

        output_path = FIXTURES_DIR / f"{fixture_name}.art_direction_output.json"
        output_data = {"businessNeed": business_need, **result}
        output_path.write_text(json.dumps(output_data, indent=2, ensure_ascii=False), encoding="utf-8")
        print(f"Résultat complet sauvegardé dans : {output_path}")
    except Exception as err:  # noqa: BLE001
        print("Erreur pendant le test :", err)
        sys.exit(1)


if __name__ == "__main__":
    fixture_arg = sys.argv[1] if len(sys.argv) > 1 else "boulangerie"
    run(fixture_arg)

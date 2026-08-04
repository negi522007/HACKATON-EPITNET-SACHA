"""
Test du pipeline COMPLET (extraction → direction artistique → composition →
critique → export) avec de VRAIES clés API. Contrairement à
test_full_pipeline_mocked.py, ce script fait de vrais appels réseau à
Gemini/Groq — nécessite un .env valide.

Usage :
    python tests/test_full_pipeline_real.py boulangerie
    python tests/test_full_pipeline_real.py cabinet_medical
"""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.api import generate as orchestrator

FIXTURES_DIR = Path(__file__).resolve().parent / "fixtures"


def run(fixture_name: str) -> None:
    fixture_path = FIXTURES_DIR / f"{fixture_name}.json"
    if not fixture_path.exists():
        print(f"Fixture introuvable : {fixture_path}")
        sys.exit(1)

    fixture = json.loads(fixture_path.read_text(encoding="utf-8"))

    print(f"\n--- Test pipeline complet (RÉEL) : {fixture_name} ---\n")
    print("Étapes 1 + 2 (extraction + direction artistique) en cours...\n")

    result = orchestrator.start_generation(
        user_input=fixture["userInput"],
        optional_fields=fixture.get("optionalFields", {}),
    )

    session_id = result["session_id"]
    print("Session créée :", session_id)
    print("Entreprise détectée :", result["business_need"]["business_name"])
    print(f"\n{len(result['variants'])} variantes générées :\n")
    for v in result["variants"]:
        print(f"  - {v['label']} ({v['mood']}, {v['typography']['heading_font']}/{v['typography']['body_font']})")

    print("\nSélection automatique de la variante 1 pour ce test...")
    orchestrator.select_variant(session_id, result["variants"][0]["id"])

    print("\nÉtapes 3 + 4 (composition + critique) en cours — ça peut prendre quelques secondes...\n")
    composition = orchestrator.run_composition(session_id)

    print("Sections ignorées (non supportées) :", composition["skipped_sections"])
    print("Signaux génériques détectés/corrigés :", composition["signals_history"])
    print("\nSite exporté :", composition["zip_path"])
    print("\n✅ Pipeline complet exécuté avec de vraies API. Ouvre le fichier ci-dessous dans un navigateur pour vérifier visuellement :")

    site_dir = Path(composition["zip_path"]).parent / session_id / "index.html"
    print(f"   {site_dir.resolve()}")


if __name__ == "__main__":
    fixture_arg = sys.argv[1] if len(sys.argv) > 1 else "boulangerie"
    try:
        run(fixture_arg)
    except Exception as err:  # noqa: BLE001
        print("\n❌ Erreur pendant le test :", err)
        sys.exit(1)

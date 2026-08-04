"""
Simule ce que fera l'équipe plateforme :
1. Soumission du besoin → 3 variantes reçues
2. Choix d'une variante par l'utilisateur (ici, on simule le choix de la variante 1)
3. Lecture de la session mise à jour (ce que l'étape 3 lira ensuite)

Usage :
    python tests/test_orchestrator.py boulangerie
"""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.api.generate import start_generation, select_variant, get_session

FIXTURES_DIR = Path(__file__).resolve().parent / "fixtures"


def run(fixture_name: str) -> None:
    fixture_path = FIXTURES_DIR / f"{fixture_name}.json"
    fixture = json.loads(fixture_path.read_text(encoding="utf-8"))
    user_input = fixture["userInput"]
    optional_fields = fixture.get("optionalFields", {})

    print(f"\n--- Test orchestrateur complet : {fixture_name} ---\n")

    result = start_generation(user_input=user_input, optional_fields=optional_fields)
    session_id = result["session_id"]

    print("Session créée :", session_id)
    print("Entreprise :", result["business_need"]["business_name"])
    print(f"{len(result['variants'])} variantes proposées :", [v["label"] for v in result["variants"]])
    print("Influence image :", result["image_influence"])

    print("\nSimulation : l'utilisateur choisit la variante 1...\n")
    updated_session = select_variant(session_id, result["variants"][0]["id"])
    print("Session mise à jour, statut :", updated_session["status"])
    print("Variante sélectionnée :", updated_session["selected_variant_id"])

    print("\nRelecture de la session (ce que l'étape 3 récupérera) :")
    reloaded = get_session(session_id)
    print(json.dumps(reloaded, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    try:
        fixture_arg = sys.argv[1] if len(sys.argv) > 1 else "boulangerie"
        run(fixture_arg)
    except Exception as err:  # noqa: BLE001
        print("Erreur pendant le test :", err)
        sys.exit(1)

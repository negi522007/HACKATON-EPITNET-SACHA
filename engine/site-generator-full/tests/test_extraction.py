"""
Usage :
    python tests/test_extraction.py boulangerie
    python tests/test_extraction.py cabinet_medical
"""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.pipeline.step1_extraction import extract_need

FIXTURES_DIR = Path(__file__).resolve().parent / "fixtures"


def run(fixture_name: str) -> None:
    fixture_path = FIXTURES_DIR / f"{fixture_name}.json"
    if not fixture_path.exists():
        print(f"Fixture introuvable : {fixture_path}")
        sys.exit(1)

    fixture = json.loads(fixture_path.read_text(encoding="utf-8"))
    user_input = fixture["userInput"]
    optional_fields = fixture.get("optionalFields", {})

    print(f"\n--- Test extraction : {fixture_name} ---\n")
    print("Input utilisateur :", user_input)
    print("Champs optionnels :", optional_fields)
    print("\nAppel du LLM en cours...\n")

    try:
        result = extract_need(user_input, optional_fields)
        print("Résultat extraction :\n")
        print(json.dumps(result, indent=2, ensure_ascii=False))

        output_path = FIXTURES_DIR / f"{fixture_name}.extraction_output.json"
        output_path.write_text(json.dumps(result, indent=2, ensure_ascii=False), encoding="utf-8")
        print(f"\nRésultat sauvegardé dans : {output_path}")
    except Exception as err:  # noqa: BLE001
        print("Erreur pendant le test :", err)
        sys.exit(1)


if __name__ == "__main__":
    fixture_arg = sys.argv[1] if len(sys.argv) > 1 else "boulangerie"
    run(fixture_arg)

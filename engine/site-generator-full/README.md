# Site Generator — Extraction & Direction Artistique (Python)

Ce dossier contient les étapes 1 et 2 du pipeline de génération de sites vitrines (Hackathon EPITNET 2026), en Python — cohérent avec les étapes 3 et 4 (composition, critique) gérées par l'autre binôme, également en Python.

## Contenu

- **Étape 1 — Extraction** (`src/pipeline/step1_extraction.py`) : texte libre + champs optionnels → JSON structuré du besoin. Provider primaire : Groq (fallback Gemini).
- **Étape 2 — Direction artistique** (`src/pipeline/step2_art_direction.py`) : JSON du besoin (+ image optionnelle) → 3 variantes créatives distinctes. Provider primaire : Gemini (multimodal, fallback Groq en mode texte seul).
- **Orchestrateur** (`src/api/generate.py`) : point d'entrée unique pour l'équipe plateforme — enchaîne les deux étapes, gère la persistance de session, prépare le relais vers l'étape 3.

## Setup

1. Créer un environnement virtuel (recommandé) et installer les dépendances :
   ```bash
   python -m venv .venv
   source .venv/bin/activate   # Windows : .venv\Scripts\activate
   pip install -r requirements.txt
   ```

2. Créer ton fichier `.env` à partir de `.env.example`, avec tes clés :
   ```
   GEMINI_API_KEY=ta_cle_gemini
   GROQ_API_KEY=ta_cle_groq
   ```

## Lancer les tests

Depuis la racine du projet :

```bash
# Extraction seule
python tests/test_extraction.py boulangerie
python tests/test_extraction.py cabinet_medical

# Pipeline complet (extraction → direction artistique)
python tests/test_art_direction.py boulangerie

# Orchestrateur (le point d'entrée réel pour l'équipe plateforme)
python tests/test_orchestrator.py boulangerie
```

Chaque script sauvegarde son résultat dans `tests/fixtures/*.output.json`, pour inspection et comparaison entre cas de test (vérifier que le design varie bien selon le secteur).

## Comment l'équipe plateforme (ou l'étape 3) doit utiliser ce module

Ne pas appeler `step1_extraction.py` ou `step2_art_direction.py` directement — utiliser uniquement `src/api/generate.py` :

```python
from src.api.generate import start_generation, select_variant, get_session

# 1. Quand l'utilisateur soumet son besoin (+ image optionnelle)
result = start_generation(
    user_input="Je suis Marie, j'ai une boulangerie...",
    optional_fields={"preferred_colors": "terracotta"},
    image={"buffer": uploaded_file_bytes, "mime_type": "image/png"},  # optionnel
)
session_id = result["session_id"]
# → afficher les 3 result["variants"] à l'utilisateur (preview dynamique)

# 2. Quand l'utilisateur choisit une variante
session = select_variant(session_id, result["variants"][0]["id"])
# → transmettre session_id à l'étape 3 (composition), qui appellera get_session(session_id)
#   une fois session["status"] == "ready_for_composition"
```

## Ajouter un nouveau cas de test

Créer un fichier `tests/fixtures/mon_cas.json` :
```json
{
  "userInput": "Description libre du besoin...",
  "optionalFields": {
    "preferred_colors": "optionnel",
    "style_keywords": "optionnel"
  }
}
```
Puis lancer `python tests/test_art_direction.py mon_cas`.

## Tester avec une image (logo ou inspiration)

Dans `tests/test_art_direction.py`, décommenter le bloc :
```python
image = {"buffer": Path("chemin/vers/logo.png").read_bytes(), "mime_type": "image/png"}
generate_art_direction(business_need, image)
```

L'image est validée (format PNG/JPEG/WebP, 4 Mo max) par `src/services/image_utils.py` avant d'être envoyée au LLM — filet de sécurité minimal, la validation principale (UX, message d'erreur utilisateur) reste gérée par l'équipe plateforme au moment de l'upload.

## Points de sécurité déjà en place

- Chaque prompt délimite strictement l'entrée utilisateur (`<user_input>`, `<business_need>`) et instruit le modèle de ne jamais la traiter comme des instructions.
- Le JSON produit à chaque étape est validé strictement (`_validate_structure`) avant d'être utilisé par la suite du pipeline.
- Les clés API ne doivent jamais être commit — vérifie que ton `.env` est bien ignoré (`.gitignore`).

## Documentation d'intégration

- **`PLATFORM_README.md`** — pour l'équipe plateforme : format des données à envoyer, gestion des uploads, preview dynamique, envoi du choix utilisateur.
- **`INTEGRATION.md`** — pour l'équipe étape 3 (composition) : comment lire une session, structure complète des données, gestion du logo.

## À faire ensuite (hors périmètre de ce dossier)

- Étape 3 (composition) et étape 4 (critique) — gérées par l'autre binôme génération, en Python, à brancher sur `get_session(session_id)`.
- Bibliothèque de composants HTML/CSS (`src/components/`) à laquelle les `hero_variant` / `layout_style` générés ici feront référence.

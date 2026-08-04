# Guide d'intégration — Étapes 3 & 4 (Composition & Critique)

> Destiné au coéquipier qui prend le relais après la direction artistique. Ce document explique tout ce qu'il faut savoir pour se brancher sur mon travail (étapes 1 & 2) sans avoir à lire tout le code.

---

## 1. Ce que je te fournis

Un module unique à importer : `src/api/generate.py`. **Tu n'as jamais besoin d'appeler `step1_extraction.py` ou `step2_art_direction.py` directement** — tout passe par l'orchestrateur.

```python
from src.api.generate import get_session
```

## 2. Le seul point de contact dont tu as besoin

```python
session = get_session(session_id)
```

Ça te retourne un dictionnaire Python lu depuis `sessions/{session_id}.json`. **Ton étape 3 doit attendre que `session["status"] == "ready_for_composition"`** avant de démarrer — c'est le signal que l'utilisateur a bien choisi une variante côté plateforme.

## 3. Structure exacte de l'objet session

```python
{
  "session_id": "a1b2c3d4-...",
  "created_at": "2026-08-03T23:45:00+00:00",
  "status": "ready_for_composition",   # ou "awaiting_variant_selection" si pas encore choisi
  "business_need": { ... },             # voir section 4
  "variants": [ { ... }, { ... }, { ... } ],  # les 3 variantes, voir section 5
  "image_influence": "string ou null",  # phrase expliquant l'usage d'une image, si fournie
  "logo": { "base64": "string", "mime_type": "string" } ou null,  # présent SEULEMENT si l'utilisateur a uploadé un logo (pas une simple image d'inspiration)
  "selected_variant_id": "variant_2"    # l'ID de la variante choisie — celle à utiliser
}
```

**Important :** `variants` contient toujours les 3 propositions, mais tu ne dois utiliser que celle dont l'`id` correspond à `selected_variant_id`. Exemple pour la récupérer :

```python
selected = next(v for v in session["variants"] if v["id"] == session["selected_variant_id"])
```

**Sur le logo :** s'il est présent (`session["logo"] is not None`), c'est parce que l'utilisateur l'a explicitement identifié comme logo côté plateforme (et pas comme simple image d'inspiration) — tu dois l'intégrer visuellement au site (ex: navbar, footer). Décodage :

```python
import base64

if session["logo"]:
    logo_bytes = base64.b64decode(session["logo"]["base64"])
    # à écrire en fichier ou à intégrer selon ta logique de composition
```

Si `session["logo"]` est `null`, soit l'utilisateur n'a rien uploadé, soit il a uploadé une image d'inspiration (qui a influencé le style mais n'est pas destinée à apparaître sur le site) — dans les deux cas, pas de logo à afficher.

## 4. Structure de `business_need` (contenu du site)

```python
{
  "business_name": "string",
  "sector": "string",                 # ex: "artisanal_bakery"
  "short_description": "string",      # en français
  "brand_tone": "string",             # une des valeurs : luxurious, artisanal, modern, warm,
                                       # minimalist, corporate_professional, playful, editorial
  "location": "string ou null",
  "required_sections": ["hero", "about", "services", ...],  # sections à générer, min. 3
  "content": {
    "hero_tagline": "string",         # accroche principale, en français
    "long_description": "string",     # 2-3 phrases, en français
    "services_or_products": ["string", ...],
    "contact": {
      "phone": "string ou null",
      "email": "string ou null",
      "address": "string ou null"
    }
  },
  "visual_hints": {
    "mentioned_colors": ["string", ...],  # couleurs explicitement demandées par l'utilisateur, peut être vide
    "mentioned_style": "string ou null"
  }
}
```

⚠️ **Sécurité — à faire de ton côté avant injection dans le HTML** : tous les champs texte de `content` (et `business_name`) proviennent, indirectement, d'un texte libre tapé par un utilisateur. Je délimite et sécurise contre l'injection de *prompt* à mon niveau, mais **toi tu dois échapper le HTML** (`business_name`, `hero_tagline`, etc.) avant de les insérer dans tes templates, pour éviter un risque XSS si quelqu'un tape `<script>...</script>` comme nom d'entreprise.

## 5. Structure d'une variante (direction artistique choisie)

⚠️ **Avant de lire les valeurs ci-dessous, lis la section 5bis — elle explique CE À QUOI ces valeurs servent concrètement, et ce que toi tu dois construire pour qu'elles servent à quelque chose.**

```python
{
  "id": "variant_2",
  "label": "Chaleureux artisanal",     # nom affiché à l'utilisateur, en français
  "rationale": "string",               # pourquoi ce style, en français
  "color_palette": {
    "primary": "#8B4513",
    "secondary": "#F5DEB3",
    "accent": "#D2691E",
    "background": "#FFF8F0",
    "text": "#3E2723"
  },
  "typography": {
    "heading_font": "Playfair Display",  # une police parmi une liste curée de 6 pairings
    "body_font": "Lato"
  },
  "mood": "artisanal",                  # un des 7 moods possibles, voir liste ci-dessous
  "layout_style": "asymmetric_editorial", # un des 5 layouts possibles, voir liste ci-dessous
  "hero_variant": "hero-split",         # un des 3 : hero-centered, hero-split, hero-fullscreen
  "spacing_scale": "generous"           # compact, comfortable, ou generous
}
```

**Valeurs possibles pour `mood`** : `artisanal`, `editorial`, `minimalist_luxury`, `organic_warm`, `bold_modern`, `corporate_trustworthy`, `playful_energetic`

**Valeurs possibles pour `layout_style`** : `centered_classic`, `asymmetric_editorial`, `split_dynamic`, `fullbleed_immersive`, `grid_structured`

**Valeurs possibles pour `hero_variant`** : `hero-centered`, `hero-split`, `hero-fullscreen`

**Polices** : toujours l'une de ces 6 paires exactes (jamais autre chose) :
| Heading | Body |
|---|---|
| Fraunces | Inter |
| Playfair Display | Lato |
| Space Grotesk | IBM Plex Sans |
| DM Serif Display | DM Sans |
| Bricolage Grotesque | Work Sans |
| Libre Caslon Display | Karla |

Toutes ces polices sont disponibles sur Google Fonts.

## 5bis. Ce que ces valeurs représentent concrètement — LIS CETTE SECTION

**Le point de départ du problème :** l'étape 2 (mon travail) ne génère aucun code HTML/CSS. Elle génère uniquement du texte/JSON — des *décisions de style* (une palette, une police, un mood...). Ce n'est **pas un site**, c'est une **spécification de style**.

**Le rôle de l'étape 3 (ton travail) : transformer cette spécification en un vrai site.** Pour ça, il te faut de la matière première déjà designée à l'avance — parce qu'on a décidé ensemble (voir plus haut dans la conversation) de ne PAS laisser un LLM inventer du HTML/CSS depuis zéro à chaque génération (trop risqué en qualité, trop de bugs possibles, et ça tombe systématiquement dans des designs clichés d'IA).

**Concrètement, ça veut dire que TOI tu dois construire une bibliothèque de blocs de site déjà designés à l'avance**, par exemple des vrais fichiers comme :

```
components/
├── hero/
│   ├── hero-centered.html   ← un vrai bloc "hero" déjà stylé, avec du HTML/CSS réel dedans
│   ├── hero-split.html
│   └── hero-fullscreen.html
├── services/
│   ├── services-grid.html
│   └── services-list.html
├── contact/
│   └── contact-simple.html
└── footer/
    └── footer-basic.html
```

Chaque fichier est un **squelette de section déjà bien designé**, mais **sans contenu ni couleurs fixes** — il utilise des variables CSS génériques (ex: `var(--color-primary)`, `var(--font-heading)`) à la place de vraies valeurs codées en dur, et des placeholders à la place du texte final.

**Le lien entre les deux :** quand ton code lit `hero_variant: "hero-split"` dans une variante, ton travail est d'aller chercher **littéralement le fichier `hero-split.html`** dans ta bibliothèque, puis :
1. D'y injecter le contenu réel (`business_need.content.hero_tagline`, etc.)
2. D'y injecter les vraies valeurs de `color_palette` et `typography` à la place des variables CSS génériques
3. D'assembler tous les blocs nécessaires (selon `business_need.required_sections`) en un seul site final

**Sur les noms eux-mêmes (`hero-split`, `centered_classic`, etc.) :** je les ai choisis arbitrairement en écrivant le prompt de l'étape 2 — ce sont une **proposition de contrat d'interface**, pas une vérité déjà actée ou une connaissance de fichiers qui existeraient déjà quelque part. Si tu préfères d'autres noms, une autre organisation de dossiers, ou moins/plus de variantes par section, dis-le-moi — j'ajusterai le prompt et la validation de l'étape 2 en conséquence. L'important, c'est qu'on soit alignés sur les mêmes noms des deux côtés, sinon `hero_variant: "hero-split"` ne pointera vers aucun fichier réel chez toi.

**Ce que ce n'est PAS :** ce n'est pas un template unique qu'on remplit juste avec du texte différent. C'est un système modulaire : plusieurs variantes possibles par section, combinées différemment et stylées différemment à chaque génération — donc chaque site reste réellement unique dans sa composition finale, même si les briques de base sont pré-designées.

## 6. Ce que tu es censé produire en sortie (étape 3 → étape 4 → déploiement)

Ce n'est pas figé de mon côté, à définir avec l'équipe DevOps, mais l'architecture prévue à date :
- Un site statique (HTML/CSS/JS) assemblé à partir des `required_sections` de `business_need`, stylé selon la variante choisie
- Un export `.zip` téléchargeable par l'utilisateur (idée retenue pour la fiche J1)
- Le format transmis à l'équipe DevOps pour déploiement sur Wayhost

## 7. Comment tester ton intégration sans attendre que je génère une vraie session

Tu peux simuler une session directement, sans dépendre de mes appels LLM à chaque test :

```python
import json
from pathlib import Path

fake_session = {
  "session_id": "test-session-001",
  "status": "ready_for_composition",
  "business_need": { ... },   # copie un exemple depuis tests/fixtures/*.art_direction_output.json
  "variants": [ ... ],
  "selected_variant_id": "variant_1"
}

Path("sessions/test-session-001.json").write_text(json.dumps(fake_session, indent=2, ensure_ascii=False))
```

Puis dans ton code :
```python
from src.api.generate import get_session
session = get_session("test-session-001")
```

**Astuce :** lance `python tests/test_art_direction.py boulangerie` ou `cabinet_medical` de mon côté, ça génère un vrai exemple complet dans `tests/fixtures/*.art_direction_output.json` que tu peux copier/coller comme fixture de test chez toi.

## 8. Ce qui n'est PAS encore géré (à anticiper)

- **Itérations post-génération** ("change les couleurs", "ajoute une section témoignages") : prévu dans l'architecture mais pas encore implémenté. Si l'utilisateur redemande un ajustement après ta composition, il faudra un mécanisme de re-déclenchement — à concevoir ensemble le moment venu.
- **Persistance long terme** : les sessions sont des fichiers JSON simples, sans expiration ni nettoyage automatique pour l'instant.
- **Envoi simultané logo + image d'inspiration** : actuellement un seul type d'image par génération (voir `PLATFORM_README.md` côté plateforme).

## 9. En cas de problème

Si `get_session()` lève `FileNotFoundError`, ça veut dire que la session n'existe pas ou pas encore — vérifie que l'orchestrateur (`start_generation` + `select_variant`) a bien été appelé côté plateforme avant que tu essaies de la lire.

Si tu as besoin d'un champ qui n'existe pas dans cette structure, viens m'en parler avant de le bidouiller de ton côté — plus simple de l'ajouter proprement à la source.

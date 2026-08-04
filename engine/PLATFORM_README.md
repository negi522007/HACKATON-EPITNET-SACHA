# Guide d'intégration — Équipe Plateforme

> Destiné à la personne en charge de l'interface où l'utilisateur soumet son besoin. Ce document explique tout ce que ton front-end doit envoyer, comment gérer les uploads, comment afficher la preview, et comment me renvoyer le choix final de l'utilisateur.

---

## 1. Vue d'ensemble du flux

```
Ton formulaire utilisateur
        │
        ▼
start_generation(user_input, optional_fields, image)
        │
        ▼
   3 variantes reçues → tu affiches la preview dynamique
        │
        ▼
   L'utilisateur choisit une variante
        │
        ▼
select_variant(session_id, variant_id)
        │
        ▼
   Étape 3 (composition) prend le relais automatiquement
```

Tu n'appelles jamais mes fonctions internes (`extract_need`, `generate_art_direction`) directement — seulement `src/api/generate.py`.

## 2. Ce que ton formulaire doit collecter

### Champ obligatoire

- **`user_input`** (texte libre) : la description du besoin en langage naturel.
  - **Limite recommandée : 8000 caractères.** Affiche un compteur de caractères en temps réel sur le formulaire, pour que l'utilisateur ne perde pas ce qu'il a tapé en dépassant la limite.
  - Minimum 10 caractères (sinon rejeté automatiquement de mon côté avec une erreur claire).

### Champs optionnels suggérés (`optional_fields`)

Propose-les comme des cases/champs facultatifs, pas obligatoires — ils aident à préciser le besoin mais l'utilisateur doit pouvoir les ignorer. Suggestions concrètes à afficher :

| Champ | Exemple d'UI | Clé à envoyer |
|---|---|---|
| Couleurs préférées | Color picker ou texte libre ("tons chauds", "bleu marine"...) | `preferred_colors` |
| Mots-clés de style | Tags cliquables : "chaleureux", "minimaliste", "luxueux", "moderne", "ludique"... | `style_keywords` |
| Secteur précis | Liste déroulante ou texte libre si le secteur n'est pas clair dans le texte | `precise_sector` |

Tu peux en ajouter d'autres si utile, mais garde le formulaire léger — l'essentiel de l'information doit venir du texte libre. Envoie uniquement les champs que l'utilisateur a effectivement remplis (ne pas envoyer de chaînes vides).

### Upload d'image (optionnel) — deux cas bien distincts

⚠️ **Point important : c'est à TOI de distinguer si l'image est un logo ou une inspiration visuelle — je ne peux pas le deviner du contenu de l'image.**

Prévois deux zones d'upload séparées et clairement labellisées, par exemple :
- **"Uploader mon logo"** → si rempli, envoie `image_type: "logo"`. Ce logo sera intégré tel quel sur le site final.
- **"Image d'inspiration (optionnel)"** → si rempli, envoie `image_type: "inspiration"`. Cette image ne sera jamais affichée sur le site, elle sert uniquement à orienter le style (couleurs, ambiance).

L'utilisateur peut fournir l'un, l'autre, les deux, ou aucun. S'il fournit les deux, envoie-moi seulement une image à la fois par appel actuellement (le champ `image` de `start_generation` est unique) — priorise le logo si tu dois choisir, ou contacte-moi si tu as besoin d'envoyer les deux (je peux étendre la fonction si besoin).

**Validation à faire de ton côté (pas de la mienne)** :
- Formats acceptés : PNG, JPEG, WebP uniquement
- Taille max recommandée : 4 Mo
- Affiche une erreur claire à l'utilisateur si le fichier ne respecte pas ces critères, avant même de me l'envoyer

## 3. Comment démarrer une génération

```python
from src.api.generate import start_generation

result = start_generation(
    user_input="Je suis Marie, j'ai une boulangerie artisanale à Cotonou...",
    optional_fields={
        "preferred_colors": "tons chauds, terracotta",
        "style_keywords": "chaleureux, fait main",
    },
    image={
        "buffer": uploaded_file_bytes,   # bytes bruts du fichier
        "mime_type": "image/png",
        "image_type": "logo",            # ou "inspiration"
    },  # ce paramètre entier est optionnel — omets-le si aucune image n'est uploadée
)
```

### Ce que tu reçois en retour

```python
{
  "session_id": "a1b2c3d4-...",       # à conserver, tu en auras besoin pour la suite
  "business_need": { ... },            # utile si tu veux afficher un résumé du besoin compris
  "variants": [ variant1, variant2, variant3 ],
  "image_influence": "string ou null", # phrase expliquant comment l'image a influencé le style, à afficher si présente
  "has_logo": true/false               # indique si un logo a bien été pris en compte
}
```

**Gestion des erreurs à prévoir côté UI** : `start_generation` peut lever une exception (ex: description trop courte, échec des deux providers LLM). Prévois un message utilisateur générique ("Une erreur est survenue, réessaie") plutôt que de laisser planter le formulaire.

## 4. Afficher la preview dynamique

Chaque variante dans `result["variants"]` contient tout ce qu'il te faut pour styliser une maquette générique en direct (voir structure détaillée dans `INTEGRATION.md`, section 5, partagée avec l'étape 3 — même format). En résumé, chaque variante donne :
- `label` et `rationale` (en français) → à afficher comme titre/description de l'option
- `color_palette` (5 couleurs hex) → à injecter en variables CSS
- `typography` (2 polices Google Fonts) → à charger et appliquer
- `mood`, `layout_style`, `hero_variant`, `spacing_scale` → informatifs, utiles si tu veux adapter la structure de la maquette de preview

**Ce que tu dois construire toi-même** : la maquette HTML/CSS générique (bloc hero, bloc services fictif, etc.) sur laquelle ces tokens s'appliquent. Ce n'est pas généré par le LLM — c'est un gabarit fixe que tu prépares une fois, et sur lequel les 3 variantes viennent juste changer les couleurs/polices/espacements en direct (ex: en swappant des CSS custom properties).

## 5. Renvoyer le choix de l'utilisateur

Une fois que l'utilisateur a cliqué sur la variante qu'il préfère :

```python
from src.api.generate import select_variant

session = select_variant(session_id, variant_id)
# variant_id = result["variants"][i]["id"], ex: "variant_2"
```

Ça met à jour le statut de la session à `"ready_for_composition"` — c'est le signal qui déclenche (ou permet à) l'étape 3 de démarrer la composition du site.

Tu n'as rien d'autre à faire après ça — l'étape 3 lit la session elle-même via `get_session(session_id)`.

## 6. Résumé des erreurs possibles à gérer côté UI

| Situation | Ce que tu dois afficher |
|---|---|
| `user_input` trop court (< 10 caractères) | "Décris un peu plus ton projet avant de continuer" |
| `user_input` trop long (> 8000 caractères) | Bloqué par ton compteur de caractères, avant même l'envoi |
| Image dans un format non supporté | "Formats acceptés : PNG, JPEG, WebP" |
| Image trop lourde | "Image trop volumineuse (max 4 Mo)" |
| `image_type` manquant alors qu'une image est fournie | Bug de ton intégration — assure-toi de toujours l'envoyer explicitement |
| Échec de `start_generation` (exception) | Message générique + bouton "réessayer" |
| `variant_id` invalide dans `select_variant` | Ne devrait pas arriver si tu utilises bien les IDs reçus — vérifie que tu passes l'`id` exact de la variante affichée |

## 7. En cas de doute

Si tu as besoin d'un champ ou d'une donnée que je ne fournis pas encore (ex: envoyer logo + inspiration en même temps, changer la limite de caractères, etc.), viens m'en parler avant de contourner à ton niveau — plus simple d'ajuster à la source.

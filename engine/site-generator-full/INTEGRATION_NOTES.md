# Note d'intégration — Branchement complet du pipeline (étapes 1 → 4)

> Ce document explique ce qui a été repris, corrigé, et complété à partir du travail initial sur les étapes 3/4, pour que tout le pipeline soit réellement branché et fonctionnel.

## Ce qui a été gardé (bonnes idées du travail initial)

- **Jinja2 avec autoescape activé** pour le rendu HTML — meilleure protection XSS que l'échappement manuel, gardée telle quelle dans `step3_composition.py`.
- **Validation stricte via Pydantic** pour toute sortie LLM — gardée, mais déplacée dans `src/services/structured_llm.py` (`call_structured()`) pour rester branchée sur notre client LLM unique au lieu d'un doublon.
- **Boucle de critique avec patches structurés** (proposer des corrections ciblées plutôt que tout régénérer) — gardée dans `step4_critique.py`, adaptée au vrai schéma de `business_need`.
- **Prompts séparés du code** — convention conservée (`src/prompts/critique.prompt`).

## Ce qui a été corrigé

1. **Déconnexion de l'orchestrateur** : rien n'appelait `get_session()`. `run_composition(session_id)` dans `src/api/generate.py` fait maintenant le lien complet : lit la session, lance composition + critique, exporte le résultat, met à jour le statut.
2. **Schéma incompatible** : l'ancien code utilisait `component_type: "hero"` (un seul type générique) et des tokens (`color_primary`, `spacing_unit`, `radius`) qui ne correspondaient à rien de ce que produit l'étape 2. Tout a été réaligné sur le vrai schéma (`hero_variant`, `color_palette`, `spacing_scale`, etc. — voir `INTEGRATION.md`).
3. **Client LLM dupliqué** : supprimé. Tout passe maintenant par `src/services/llm_client.py` (le même pour les 4 étapes), avec le bon modèle (`gemini-2.5-flash`, pas `gemini-2.0-flash`).
4. **Templates manquants** : le dossier `src/components/` n'existait pas du tout — sans lui, le code plantait immédiatement. Il est maintenant créé avec 8 templates fonctionnels (3 variantes de hero, à propos, 2 variantes de services, contact, footer) + le layout de base.
5. **Fichiers parasites supprimés** : `Ochestrateur`, `Pipelines IA/modèles` (fichiers vides accidentels), `site-generator-python.zip` imbriqué (doublon exact de `src/`), `Pipelines IA/requirements.txt` et `Pipelines IA/llm_client.py` (doublons — fusionnés dans les fichiers uniques du projet).
6. **`.env` retiré** — ne doit jamais être commit, même vide.

## Ce qui a été complété (nouveau)

- **`src/pipeline/step3_composition.py`** : composition **déterministe** (pas d'appel LLM) — le contenu et le style sont déjà générés et validés aux étapes 1 et 2, composer c'est juste choisir les bons fichiers de template et y injecter ce qu'on a déjà. Ça évite un appel LLM inutile (coût, latence, risque d'erreur) pour une tâche qui est en réalité un mapping simple.

  ⚠️ **Changement de design assumé par rapport à la version initiale** : l'ancien `composer.py` faisait un appel LLM pour "choisir" les composants. Je pense que ce n'est pas nécessaire vu qu'on a déjà toute l'info (contenu + style) — mais si vous voulez plus de diversité dans l'assemblage (ex: le LLM pourrait varier l'ordre des sections ou choisir entre plus de variantes par section), on peut réintroduire un appel LLM ici. **À valider ensemble, ce n'est pas figé.**

- **`src/pipeline/step4_critique.py`** : relit le **contenu textuel** (pas le HTML — le HTML reste toujours généré de façon déterministe et échappée, donc aucun risque que la critique introduise du HTML non sécurisé). Propose des corrections ciblées si le texte sonne générique, applique les patches, puis relance le rendu.

- **`src/pipeline/export.py`** : génère le dossier de site statique + l'archive ZIP téléchargeable (idée retenue dans la fiche livrable J1).

- **`src/pipeline/schemas.py`** : schéma Pydantic pour la sortie de la critique.

- **`tests/test_full_pipeline_mocked.py`** : test de bout en bout qui simule les réponses LLM (Gemini/Groq non accessibles depuis mon environnement d'exécution) pour vérifier que **le branchement mécanique fonctionne** — extraction → direction artistique → composition → critique → export ZIP. **Exécuté et validé** : les 3 variantes sont bien produites, la section non supportée est bien ignorée proprement, la critique corrige bien le texte générique, le HTML final est propre et sans faille XSS basique, le ZIP est bien généré.

## ⚠️ Point important non résolu : sections sans contenu généré

Le schéma de l'étape 1 autorise `required_sections` à contenir `gallery`, `testimonials`, `team`, `pricing`, `faq`, `map`, `social_links` — mais **aucune de ces sections n'a de contenu réellement généré** par l'étape 1 (pas de champ correspondant dans `content`).

**Décision prise pour l'instant** : plutôt que d'inventer de fausses données (faux témoignages, faux tarifs...), ces sections sont **ignorées silencieusement** si demandées par l'utilisateur, avec une liste `skipped_sections` retournée pour que la plateforme puisse en informer l'utilisateur ("Cette section n'est pas encore disponible").

**À décider en équipe** : soit on étend l'étape 1 pour générer du contenu réel pour ces sections (plus de travail), soit on limite carrément la liste `required_sections` possible dans le prompt d'extraction pour ne plus jamais les proposer à l'utilisateur (plus simple, plus honnête).

## ⚠️ Ce qui n'a PAS été testé

**Aucun appel réel à Gemini ou Groq n'a été fait** — mon environnement d'exécution n'a pas accès à ces domaines. Le test mocké prouve que le *branchement* fonctionne (parsing, validation, mapping, rendu, export), mais pas que :
- les vraies réponses LLM respecteront bien le format attendu dans 100% des cas
- la qualité réelle des 3 variantes de direction artistique est bonne
- la critique améliore réellement le contenu (pas juste dans l'exemple simulé)
- les temps de réponse sont acceptables pour une démo live

**Prochaine étape obligatoire** : lancer `python tests/test_orchestrator.py boulangerie` puis étendre avec un vrai appel à `run_composition()` avec de vraies clés API, en conditions réelles.

"""
Étape 4 — Critique.
Un second appel LLM relit le rendu et repère les signaux "template IA
générique". Il ne renvoie que des patches structurés (tokens + textes),
appliqués automatiquement sur l'objet CompositionOutput de l'étape 3,
puis re-rendus par le même moteur déterministe (composer.render_composition).
"""
from __future__ import annotations
from schemas import CompositionOutput, CritiqueOutput
from prompts import CRITIQUE_SYSTEM_PROMPT, build_critique_prompt
from llm_client import call_llm_structured
from composer import render_composition


def _apply_patches(composition: CompositionOutput, critique: CritiqueOutput) -> CompositionOutput:
    """Applique les patches de critique au modèle de composition existant."""
    data = composition.model_dump()

    # Ajuste les tokens si la critique fournit des modifications
    for key, value in critique.patches.token_patches.items():
        if key in data["tokens"]:
            data["tokens"][key] = value

    # Met à jour le contenu texte des composants concernés
    for component in data["components"]:
        patch = critique.patches.text_patches.get(component["component_type"])
        if patch:
            component["content"].update(patch)

    # Reconstruit un objet validé pour garantir l'intégrité des données
    return CompositionOutput.model_validate(data)


def review_and_fix(
    composition: CompositionOutput,
    rendered_html: str,
    page_title: str = "Site généré",
    max_rounds: int = 2,
) -> tuple[str, CompositionOutput, list[str]]:
    """
    Boucle d'auto-critique : au plus `max_rounds` passes.
    S'arrête dès que le LLM renvoie approved=true ou qu'aucun patch n'est proposé.
    Retourne (html_final, composition_finale, historique_des_signaux).
    """
    history: list[str] = []
    current_html = rendered_html
    current_composition = composition

    for _ in range(max_rounds):
        # Prépare les données par composant pour le prompt de critique
        content_by_component = {
            c.component_type: c.content for c in current_composition.components
        }
        prompt = build_critique_prompt(
            current_html, current_composition.tokens.model_dump(), content_by_component
        )

        # Appel LLM avec validation stricte de la réponse
        critique = call_llm_structured(CRITIQUE_SYSTEM_PROMPT, prompt, CritiqueOutput)
        history.extend(critique.generic_ai_signals)

        # Si aucune correction n'est proposée ou si c'est approuvé, on arrête
        no_patches = (
            not critique.patches.token_patches and not critique.patches.text_patches
        )
        if critique.approved or no_patches:
            break

        # Applique les corrections et re-génère le HTML
        current_composition = _apply_patches(current_composition, critique)
        current_html = render_composition(current_composition, page_title)

    return current_html, current_composition, history

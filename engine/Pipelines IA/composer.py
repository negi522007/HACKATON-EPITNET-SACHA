"""
Étape 3 — Composition.
Le LLM choisit les composants + génère les tokens + mappe le contenu.
TOUT le HTML est assemblé ici, de façon déterministe, via Jinja2 (autoescape
activé => protection XSS native sur toute variable injectée).
"""
from __future__ import annotations
import os
from jinja2 import Environment, FileSystemLoader, select_autoescape

from schemas import CompositionOutput, ComponentSelection
from prompts import COMPOSITION_SYSTEM_PROMPT, build_composition_prompt
from llm_client import call_llm_structured

# Emplacement des templates HTML des composants et du layout global
COMPONENTS_DIR = os.path.join(os.path.dirname(__file__), "components")

# Environnement Jinja2 avec auto-escaping HTML activé pour prévenir les injections
_env = Environment(
    loader=FileSystemLoader(COMPONENTS_DIR),
    autoescape=select_autoescape(["html"]),  # échappement HTML/XSS automatique
)


def _render_component(selection: ComponentSelection) -> str:
    """Rend un composant individuel à partir de son template et de son contenu."""
    template = _env.get_template(f"{selection.component_type}.html")
    return template.render(**selection.content)


def compose_site(
    generated_content: dict,
    art_direction: dict,
    page_title: str = "Site généré",
) -> tuple[str, CompositionOutput]:
    """
    Compose le site à partir du contenu généré et de la direction artistique.
    Renvoie le HTML final et l'objet validé CompositionOutput.
    """
    prompt = build_composition_prompt(generated_content, art_direction)
    composition = call_llm_structured(
        COMPOSITION_SYSTEM_PROMPT, prompt, CompositionOutput
    )
    html = render_composition(composition, page_title)
    return html, composition


def render_composition(composition: CompositionOutput, page_title: str = "Site généré") -> str:
    """Assemble les composants validés dans le layout principal."""
    by_type = {c.component_type: c for c in composition.components}

    body_parts = []
    for section in composition.sections_order:
        selection = by_type.get(section)
        if selection is None:
            # Si une section est listée mais absente du jeu de composants, on l'ignore.
            continue
        body_parts.append(_render_component(selection))

    body_html = "\n".join(body_parts)

    layout = _env.get_template("base_layout.html")
    return layout.render(
        page_title=page_title,
        tokens=composition.tokens,
        body=body_html,  # body HTML déjà généré et échappé par Jinja2
    )

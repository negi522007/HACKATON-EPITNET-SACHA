"""
Étape 3 — Composition.

Contrairement à la version initialement écrite par mon coéquipier, cette étape
est VOLONTAIREMENT déterministe (pas d'appel LLM) : le contenu (étape 1) et le
style (étape 2) sont déjà entièrement générés et validés à ce stade. Composer,
c'est juste choisir les bons fichiers de template et y injecter ce qu'on a déjà.

Ça évite un appel LLM inutile (coût, latence, risque d'erreur) pour une tâche
qui est en réalité un simple mapping déterministe.

⚠️ IMPORTANT — sections non supportées pour l'instant :
Le schéma de l'étape 1 (extraction.prompt) autorise required_sections à contenir
"gallery", "testimonials", "team", "pricing", "faq", "map", "social_links" —
mais AUCUNE de ces sections n'a de contenu réellement généré par l'étape 1
(pas de champ correspondant dans `content`). Plutôt que d'inventer du faux
contenu (fausses données clients, faux témoignages...), ces sections sont
actuellement IGNORÉES si demandées, avec un avertissement retourné à l'appelant.
Voir `SUPPORTED_SECTIONS` ci-dessous. À étendre plus tard si on décide de
générer du contenu réel pour ces sections à l'étape 1.
"""

from __future__ import annotations

from pathlib import Path
from jinja2 import Environment, FileSystemLoader, select_autoescape

COMPONENTS_DIR = Path(__file__).resolve().parent.parent / "components"

_env = Environment(
    loader=FileSystemLoader(str(COMPONENTS_DIR)),
    autoescape=select_autoescape(["html"]),  # échappement HTML/XSS automatique — protège contre les injections
)

SUPPORTED_SECTIONS = {"hero", "about", "services", "contact"}

SPACING_VALUES = {
    "compact": "2.5rem",
    "comfortable": "4rem",
    "generous": "6rem",
}


def compose_site(business_need: dict, variant: dict) -> dict:
    """
    :param business_need: sortie de extract_need() (étape 1)
    :param variant: la variante de direction artistique choisie (un élément de session["variants"])
    :return: {
        "html": str,               # le site complet, rendu
        "skipped_sections": [str], # sections demandées mais non rendues (pas de contenu généré pour elles)
    }
    """
    required_sections = business_need.get("required_sections", [])
    skipped_sections = [s for s in required_sections if s not in SUPPORTED_SECTIONS]

    body_parts = []
    for section in required_sections:
        if section not in SUPPORTED_SECTIONS:
            continue
        body_parts.append(_render_section(section, business_need, variant))

    body_parts.append(_render_footer(business_need))
    body_html = "\n".join(body_parts)

    html = _render_layout(body_html, business_need, variant)

    return {"html": html, "skipped_sections": skipped_sections}


def _render_section(section: str, business_need: dict, variant: dict) -> str:
    content = business_need.get("content", {})

    if section == "hero":
        template = _env.get_template(f"{variant['hero_variant']}.html")
        return template.render(
            title=content.get("hero_tagline", ""),
            subtitle=business_need.get("short_description", ""),
            cta="Nous contacter",
        )

    if section == "about":
        template = _env.get_template("about.html")
        return template.render(
            title="À propos",
            text=content.get("long_description", ""),
        )

    if section == "services":
        # Heuristique simple : layouts denses/structurés → grille, sinon → liste.
        # À affiner plus tard si besoin (pourrait redevenir un choix piloté par le LLM).
        use_grid = variant.get("layout_style") in ("grid_structured", "fullbleed_immersive")
        template_name = "services-grid.html" if use_grid else "services-list.html"
        template = _env.get_template(template_name)
        return template.render(
            title="Nos services",
            items=content.get("services_or_products", []),
        )

    if section == "contact":
        template = _env.get_template("contact.html")
        contact = content.get("contact", {})
        return template.render(
            title="Contactez-nous",
            phone=contact.get("phone"),
            email=contact.get("email"),
            address=contact.get("address"),
        )

    raise ValueError(f"Section non gérée : {section}")  # ne devrait jamais arriver (filtré en amont)


def _render_footer(business_need: dict) -> str:
    from datetime import datetime

    template = _env.get_template("footer.html")
    return template.render(
        business_name=business_need.get("business_name", ""),
        year=datetime.now().year,
    )


def _render_layout(body_html: str, business_need: dict, variant: dict) -> str:
    template = _env.get_template("base_layout.html")
    return template.render(
        page_title=business_need.get("business_name", "Site généré"),
        body=body_html,
        tokens=variant,
        spacing_value=SPACING_VALUES.get(variant.get("spacing_scale"), "4rem"),
        heading_font_url=variant["typography"]["heading_font"].replace(" ", "+"),
        body_font_url=variant["typography"]["body_font"].replace(" ", "+"),
    )

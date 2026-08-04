"""
Schémas de validation stricte des sorties LLM.
Toute réponse du LLM (Gemini ou Groq) DOIT passer par ces modèles Pydantic
avant d'être utilisée par le code déterministe. Aucune donnée non validée
n'atteint le moteur de rendu HTML.
"""
from __future__ import annotations
from typing import Any, Dict, List, Literal
from pydantic import BaseModel, Field, field_validator

# Composants disponibles dans la bibliothèque (doit correspondre aux fichiers
# présents dans components/). Le LLM ne peut choisir que parmi cette liste.
ALLOWED_COMPONENTS = {"hero", "gallery", "services", "contact", "footer"}


class DesignTokens(BaseModel):
    """Variables CSS / design tokens générées selon la direction artistique."""
    color_primary: str = Field(pattern=r"^#[0-9a-fA-F]{3,8}$")
    color_secondary: str = Field(pattern=r"^#[0-9a-fA-F]{3,8}$")
    color_background: str = Field(pattern=r"^#[0-9a-fA-F]{3,8}$")
    color_text: str = Field(pattern=r"^#[0-9a-fA-F]{3,8}$")
    font_heading: str
    font_body: str
    spacing_unit: str = Field(pattern=r"^\d+(px|rem)$")
    radius: str = Field(pattern=r"^\d+(px|rem)$")


class ComponentSelection(BaseModel):
    """Représente un composant de page et son contenu associé."""
    component_type: Literal["hero", "gallery", "services", "contact", "footer"]
    # Le contenu doit être le mapping de données vers les slots du template.
    # Les valeurs peuvent être des chaînes, listes ou dictionnaires selon le type.
    content: Dict[str, Any] = Field(default_factory=dict)

    @field_validator("component_type")
    @classmethod
    def check_allowed(cls, v: str) -> str:
        if v not in ALLOWED_COMPONENTS:
            raise ValueError(f"Composant inconnu: {v}")
        return v


class CompositionOutput(BaseModel):
    """Sortie complète attendue du LLM à l'étape de composition."""
    sections_order: List[str]
    components: List[ComponentSelection]
    tokens: DesignTokens

    @field_validator("sections_order")
    @classmethod
    def order_matches_components(cls, v: List[str]) -> List[str]:
        # Vérifie que chaque section est bien dans la liste de composants autorisés.
        for s in v:
            if s not in ALLOWED_COMPONENTS:
                raise ValueError(f"Section inconnue dans sections_order: {s}")
        return v


class CritiquePatch(BaseModel):
    """Représente les modifications structurées proposées par la critique."""
    token_patches: Dict[str, str] = Field(default_factory=dict)
    text_patches: Dict[str, Dict[str, str]] = Field(default_factory=dict)
    # ex: {"hero": {"title": "Nouveau titre moins générique"}}


class CritiqueOutput(BaseModel):
    """Sortie complète attendue du LLM après l'étape de critique."""
    generic_ai_signals: List[str] = Field(default_factory=list)
    patches: CritiquePatch
    approved: bool

"""
Exemple d'orchestration : étape 1 (contenu) et étape 2 (direction artistique)
sont supposées déjà produites en amont. Ce script enchaîne composition (3)
puis critique (4).
"""
from composer import compose_site
from critique import review_and_fix

# --- Simule la sortie de l'étape 1 (génération de contenu) ---
# Ce dictionnaire représente les blocs de contenu déjà produits avant la composition.
generated_content = {
    "hero": {"title": "Votre expertise, visible en ligne", "subtitle": "Un site clair, sans jargon.", "cta": "Nous contacter"},
    "services": {"title": "Nos services", "items": [
        {"name": "Conseil", "description": "Accompagnement sur mesure."},
        {"name": "Support", "description": "Réactivité garantie sous 24h."},
    ]},
    "contact": {"title": "Discutons de votre projet", "description": "Réponse sous 24h ouvrées."},
    "footer": {"company_name": "Acme SAS", "year": "2026", "links": [{"url": "/mentions-legales", "label": "Mentions légales"}]},
}

# --- Simule la sortie de l'étape 2 (direction artistique) ---
# Ces informations servent à guider le choix des tokens et le ton global.
art_direction = {
    "style": "sobre, professionnel, tons bleu-gris",
    "cible": "PME B2B",
}

if __name__ == "__main__":
    # Génération de la composition et rendu initial
    html, composition = compose_site(generated_content, art_direction, page_title="Acme SAS")

    # Relecture critique et application automatique des corrections
    final_html, final_composition, signals = review_and_fix(composition, html, page_title="Acme SAS")

    print("Signaux détectés puis corrigés :", signals)
    with open("site_final.html", "w", encoding="utf-8") as f:
        f.write(final_html)

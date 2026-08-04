"""
Validation des images uploadées par l'utilisateur (logo ou inspiration visuelle)
avant envoi à l'étape de direction artistique.

Filet de sécurité minimal côté génération — la validation principale (taille,
format, UX d'erreur) reste gérée par l'équipe plateforme au moment de l'upload.
"""

import base64

SUPPORTED_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"]
MAX_SIZE_BYTES = 4 * 1024 * 1024  # 4 Mo


def validate_and_prepare_image(file_bytes: bytes, mime_type: str) -> dict:
    """
    :param file_bytes: Le contenu brut du fichier uploadé
    :param mime_type: Le type MIME déclaré du fichier (ex: 'image/png')
    :return: { "base64": str, "mime_type": str }
    :raises ValueError: si l'image est invalide, avec un message clair
    """
    if not file_bytes:
        raise ValueError("Fichier image vide ou manquant")

    if mime_type not in SUPPORTED_MIME_TYPES:
        raise ValueError(
            f'Format d\'image non supporté : "{mime_type}". '
            f'Formats acceptés : {", ".join(SUPPORTED_MIME_TYPES)}'
        )

    if len(file_bytes) > MAX_SIZE_BYTES:
        size_mb = len(file_bytes) / (1024 * 1024)
        raise ValueError(
            f"Image trop volumineuse ({size_mb:.1f} Mo). "
            f"Taille maximale autorisée : {MAX_SIZE_BYTES // (1024 * 1024)} Mo"
        )

    return {
        "base64": base64.b64encode(file_bytes).decode("utf-8"),
        "mime_type": mime_type,
    }

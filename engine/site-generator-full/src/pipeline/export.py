"""
Export du site généré en dossier de fichiers statiques + zip téléchargeable.
(Idée retenue dans la fiche livrable J1 — export ZIP.)
"""

from __future__ import annotations

import shutil
import zipfile
from pathlib import Path

OUTPUT_DIR = Path(__file__).resolve().parent.parent.parent / "output"


def export_site(session_id: str, html: str) -> dict:
    """
    Écrit le site sur disque et produit une archive ZIP téléchargeable.

    :return: {"site_dir": str, "zip_path": str}
    """
    site_dir = OUTPUT_DIR / session_id
    site_dir.mkdir(parents=True, exist_ok=True)

    (site_dir / "index.html").write_text(html, encoding="utf-8")

    zip_path = OUTPUT_DIR / f"{session_id}.zip"
    if zip_path.exists():
        zip_path.unlink()

    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for file in site_dir.rglob("*"):
            zf.write(file, arcname=file.relative_to(site_dir))

    return {"site_dir": str(site_dir), "zip_path": str(zip_path)}


def cleanup_output(session_id: str) -> None:
    """Utilitaire pour les tests — supprime les fichiers générés pour une session."""
    site_dir = OUTPUT_DIR / session_id
    zip_path = OUTPUT_DIR / f"{session_id}.zip"
    if site_dir.exists():
        shutil.rmtree(site_dir)
    if zip_path.exists():
        zip_path.unlink()

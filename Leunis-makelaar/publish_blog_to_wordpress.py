#!/usr/bin/env python3
"""
Brand is Code — Automatisch Blog naar WordPress Draft

Leest een BLOG-XX-*.md bestand uit docs/ en plaatst de bloginhoud
als concept (draft) in WordPress via de REST API.

GEBRUIK:
    python3 publish_blog_to_wordpress.py docs/BLOG-01-CRM-DATA-DRAFT.md
    python3 publish_blog_to_wordpress.py docs/BLOG-01-CRM-DATA-DRAFT.md --dry-run

VEREISTEN:
    pip install markdown requests
    Omgevingsvariabelen (of .env bestand):
        WP_USER          — WordPress-gebruikersnaam
        WP_APP_PASSWORD  — Application Password (aanmaken via WP Admin → Gebruikers → Profiel)

APPLICATION PASSWORD aanmaken:
    1. Ga naar https://brandiscode.com/wp-admin/profile.php
    2. Scroll naar "Toepassingswachtwoorden"
    3. Voer naam in (bijv. "Copilot Blog Publisher") → klik "Toevoegen"
    4. Kopieer het wachtwoord (inclusief spaties) en sla op als WP_APP_PASSWORD
"""

import os
import re
import sys
import json
import base64
import argparse
import requests
import markdown as md_lib
from pathlib import Path

# ── Configuratie ──────────────────────────────────────────────────────────────

SITE_URL = "https://brandiscode.com"
API_BASE = f"{SITE_URL}/index.php?rest_route=/wp/v2"

# ── Helpers ───────────────────────────────────────────────────────────────────

def load_credentials() -> tuple[str, str]:
    """Laad WP_USER en WP_APP_PASSWORD uit omgeving of .env bestand."""
    env_file = Path(__file__).parent / ".env"
    if env_file.exists():
        for line in env_file.read_text().splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, _, value = line.partition("=")
                os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))

    user = os.environ.get("WP_USER", "").strip()
    password = os.environ.get("WP_APP_PASSWORD", "").strip()

    if not user or not password:
        print("FOUT: Stel WP_USER en WP_APP_PASSWORD in als omgevingsvariabele of in .env")
        print("      Zie de instructies bovenin dit script.")
        sys.exit(1)

    return user, password


def auth_header(user: str, password: str) -> dict:
    token = base64.b64encode(f"{user}:{password}".encode()).decode()
    return {"Authorization": f"Basic {token}", "Content-Type": "application/json"}


def parse_blog_file(filepath: Path) -> dict:
    """
    Parseer een BLOG-XX-*.md bestand.
    Extraheert: titel, slug, seo_focus, datum en bloginhoud (markdown).
    De bloginhoud begint na '## Blog' en eindigt bij de volgende '## ' heading.
    """
    text = filepath.read_text(encoding="utf-8")

    # Frontmatter velden
    seo_focus = _extract_meta(text, "SEO-focus")
    datum = _extract_meta(text, "Datum")

    # Blog sectie: alles tussen '## Blog' en de volgende '## ' of einde bestand
    blog_match = re.search(
        r"^## Blog\s*\n(.*?)(?=^## |\Z)",
        text,
        re.MULTILINE | re.DOTALL,
    )
    if not blog_match:
        print("FOUT: Geen '## Blog' sectie gevonden in het bestand.")
        sys.exit(1)

    blog_body = blog_match.group(1).strip()

    # Eerste H3 als post-titel
    title_match = re.search(r"^###\s+(.+)$", blog_body, re.MULTILINE)
    if not title_match:
        # Fallback: bestandsnaam
        title = filepath.stem.replace("-", " ").replace("DRAFT", "").strip()
    else:
        title = title_match.group(1).strip()
        # Verwijder de H3-titellijn uit de body (WordPress gebruikt de post-titel)
        blog_body = blog_body[title_match.end():].strip()

    # Slug: schone versie van titel
    slug = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")

    return {
        "title": title,
        "slug": slug,
        "seo_focus": seo_focus,
        "datum": datum,
        "markdown": blog_body,
    }


def _extract_meta(text: str, label: str) -> str:
    match = re.search(rf"^\*\*{re.escape(label)}:\*\*\s*(.+)$", text, re.MULTILINE)
    return match.group(1).strip() if match else ""


def markdown_to_html(md_text: str) -> str:
    """Converteer markdown naar HTML (WordPress-compatibel)."""
    return md_lib.markdown(
        md_text,
        extensions=["extra", "nl2br"],
    )


def create_draft_post(parsed: dict, headers: dict, dry_run: bool) -> None:
    """Maak een draft post aan in WordPress."""
    html_content = markdown_to_html(parsed["markdown"])

    payload = {
        "title": parsed["title"],
        "slug": parsed["slug"],
        "content": html_content,
        "status": "draft",
        "categories": [],   # Vul in met category-ID indien gewenst
        "meta": {
            # Yoast SEO velden (werkt alleen als Yoast actief is)
            "_yoast_wpseo_focuskw": parsed["seo_focus"].split(",")[0].strip(),
            "_yoast_wpseo_metadesc": f"Lees hoe {parsed['seo_focus']} jouw bedrijf raakt — Brand is Code.",
        },
    }

    if dry_run:
        print("\n── DRY RUN — Geen wijzigingen gemaakt ──────────────────────────")
        print(f"  Titel:      {payload['title']}")
        print(f"  Slug:       {payload['slug']}")
        print(f"  SEO focus:  {parsed['seo_focus']}")
        print(f"  Status:     {payload['status']}")
        print(f"\n  HTML preview (eerste 400 tekens):\n")
        print(html_content[:400] + "...")
        print("\n────────────────────────────────────────────────────────────────")
        return

    url = f"{API_BASE}/posts"
    response = requests.post(url, headers=headers, json=payload, timeout=30)

    if response.status_code in (200, 201):
        post = response.json()
        post_id = post.get("id")
        edit_url = f"{SITE_URL}/wp-admin/post.php?post={post_id}&action=edit"
        print(f"\n✓ Draft aangemaakt!")
        print(f"  Titel:    {post.get('title', {}).get('rendered', parsed['title'])}")
        print(f"  Post ID:  {post_id}")
        print(f"  Bewerk:   {edit_url}")
        print(f"  Status:   {post.get('status')}")
    else:
        print(f"\nFOUT: WordPress gaf HTTP {response.status_code}")
        try:
            err = response.json()
            print(f"  Code:    {err.get('code', '?')}")
            print(f"  Bericht: {err.get('message', response.text[:200])}")
        except Exception:
            print(f"  Antwoord: {response.text[:300]}")
        sys.exit(1)


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Publiceer een blog markdown-bestand als WordPress draft."
    )
    parser.add_argument(
        "file",
        nargs="?",
        help="Pad naar BLOG-*.md bestand (bijv. docs/BLOG-01-CRM-DATA-DRAFT.md). "
             "Laat leeg voor automatische detectie van het nieuwste bestand.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Toon wat er gepubliceerd zou worden zonder WordPress te raken.",
    )
    args = parser.parse_args()

    # Bestand bepalen
    if args.file:
        blog_path = Path(args.file)
    else:
        docs_dir = Path(__file__).parent / "docs"
        candidates = sorted(docs_dir.glob("BLOG-*-DRAFT.md"))
        if not candidates:
            print("FOUT: Geen BLOG-*-DRAFT.md bestanden gevonden in docs/")
            sys.exit(1)
        blog_path = candidates[-1]
        print(f"Auto-gedetecteerd: {blog_path}")

    if not blog_path.exists():
        print(f"FOUT: Bestand niet gevonden: {blog_path}")
        sys.exit(1)

    print(f"\nVerwerken: {blog_path.name}")

    # Parseer bestand
    parsed = parse_blog_file(blog_path)
    print(f"  Titel gevonden:  {parsed['title']}")
    print(f"  SEO focus:       {parsed['seo_focus']}")

    # Credentials pas nodig bij echte publicatie
    if args.dry_run:
        create_draft_post(parsed, headers={}, dry_run=True)
    else:
        user, password = load_credentials()
        headers = auth_header(user, password)
        create_draft_post(parsed, headers, dry_run=False)


if __name__ == "__main__":
    main()

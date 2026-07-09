#!/usr/bin/env python3
"""
Brand is Code — Automatisch Blog naar WordPress Draft (met afbeelding)

Leest een BLOG-XX-*.md bestand uit docs/, genereert een featured image
en plaatst alles als concept (draft) in WordPress via de REST API.

GEBRUIK:
    python3 publish_blog_to_wordpress.py docs/BLOG-01-CRM-DATA-DRAFT.md
    python3 publish_blog_to_wordpress.py docs/BLOG-01-CRM-DATA-DRAFT.md --image dalle
    python3 publish_blog_to_wordpress.py docs/BLOG-01-CRM-DATA-DRAFT.md --image unsplash
    python3 publish_blog_to_wordpress.py docs/BLOG-01-CRM-DATA-DRAFT.md --dry-run

AFBEELDINGSBRONNEN:
    --image dalle     DALL-E 3 via OpenAI (~€0,04/afbeelding). Vereist OPENAI_API_KEY in .env
    --image unsplash  Gratis stockfoto via Unsplash. Vereist UNSPLASH_ACCESS_KEY in .env
    (geen --image)    Geen featured image, alleen tekst

VEREISTEN:
    pip install markdown requests openai
    .env bestand:
        WP_USER             — WordPress-gebruikersnaam
        WP_APP_PASSWORD     — Application Password
        OPENAI_API_KEY      — alleen bij --image dalle
        UNSPLASH_ACCESS_KEY — alleen bij --image unsplash
"""

import os
import re
import sys
import json
import base64
import argparse
import tempfile
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


# ── Afbeelding genereren ──────────────────────────────────────────────────────

def _dalle_prompt(title: str, pillar: str) -> str:
    """Genereer een DALL-E prompt die past bij de Brand is Code stijl."""
    style = (
        "Minimalist professional illustration, dark navy background, "
        "subtle data/network grid lines, clean typography feel, "
        "deep blue and white tones, modern corporate tech aesthetic, "
        "no text in image, 16:9 ratio"
    )
    return (
        f"Blog header image for a Dutch B2B technology strategy article titled "
        f"'{title}'. Theme: {pillar}. Style: {style}."
    )


def generate_image_dalle(title: str, pillar: str) -> bytes:
    """Genereer een featured image via DALL-E 3. Retourneert de afbeelding als bytes."""
    try:
        from openai import OpenAI
    except ImportError:
        print("FOUT: openai niet geïnstalleerd. Voer uit: pip install openai")
        sys.exit(1)

    api_key = os.environ.get("OPENAI_API_KEY", "").strip()
    if not api_key:
        print("FOUT: OPENAI_API_KEY ontbreekt in .env")
        sys.exit(1)

    client = OpenAI(api_key=api_key)
    prompt = _dalle_prompt(title, pillar)

    print(f"  DALL-E 3 afbeelding genereren...")
    response = client.images.generate(
        model="dall-e-3",
        prompt=prompt,
        size="1792x1024",
        quality="standard",
        n=1,
    )
    image_url = response.data[0].url
    img_response = requests.get(image_url, timeout=60)
    img_response.raise_for_status()
    print(f"  Afbeelding gegenereerd ✓")
    return img_response.content


def fetch_image_unsplash(query: str) -> bytes:
    """Haal een relevante stockfoto op via de Unsplash API. Retourneert bytes."""
    access_key = os.environ.get("UNSPLASH_ACCESS_KEY", "").strip()
    if not access_key:
        print("FOUT: UNSPLASH_ACCESS_KEY ontbreekt in .env")
        print("      Gratis aanmaken op: https://unsplash.com/developers")
        sys.exit(1)

    # Vertaal Nederlandse query naar Engels voor betere resultaten
    query_en = _nl_to_en_query(query)
    print(f"  Unsplash afbeelding zoeken voor: '{query_en}'...")
    search_url = "https://api.unsplash.com/search/photos"
    params = {
        "query": query_en,
        "orientation": "landscape",
        "per_page": 1,
        "order_by": "relevant",
    }
    headers = {"Authorization": f"Client-ID {access_key}"}
    r = requests.get(search_url, params=params, headers=headers, timeout=15)

    if r.status_code == 401:
        print("FOUT: Ongeldige Unsplash API key.")
        print("      Maak een gratis key aan op: https://unsplash.com/developers")
        print("      Of gebruik: --image free  (geen key nodig)")
        sys.exit(1)

    r.raise_for_status()

    results = r.json().get("results", [])
    if not results:
        print(f"  Geen resultaten voor '{query_en}', overschakelen naar vrije foto...")
        return fetch_image_free(query_en)

    photo = results[0]
    download_url = photo["urls"]["regular"]
    attribution = f"{photo['user']['name']} via Unsplash"

    img_r = requests.get(download_url, timeout=30)
    img_r.raise_for_status()
    print(f"  Foto gevonden: {attribution} ✓")
    return img_r.content


def fetch_image_free(query: str) -> bytes:
    """
    Haal een gratis foto op via loremflickr.com — geen API key nodig.
    Gebruikt Flickr Creative Commons foto's op basis van zoekwoorden.
    """
    # Gebruik max 2 Engelse zoekwoorden voor loremflickr
    keywords = _nl_to_en_query(query).replace(" ", ",")
    url = f"https://loremflickr.com/1792/1024/{keywords}"
    print(f"  Gratis foto ophalen voor: '{keywords}'...")
    r = requests.get(url, timeout=30, allow_redirects=True)
    r.raise_for_status()
    print(f"  Foto gevonden via loremflickr ✓")
    return r.content


def _nl_to_en_query(query: str) -> str:
    """Eenvoudige vertaling van veelgebruikte Nederlandse termen naar Engels."""
    translations = {
        "MKB": "business SMB",
        "bedrijf": "business",
        "data strategie": "data strategy",
        "CRM data": "CRM data",
        "losse tools": "business tools workflow",
        "automatisering": "automation",
        "informatie architectuur": "information architecture",
        "makelaar": "real estate",
        "spreadsheet": "spreadsheet data",
        "marketing": "marketing",
        "sales": "sales",
    }
    result = query
    for nl, en in translations.items():
        result = result.replace(nl, en)
    # Verwijder dubbele spaties en trim
    return " ".join(result.split())[:60]


def upload_image_to_wordpress(
    image_bytes: bytes,
    filename: str,
    auth_headers: dict,
) -> int:
    """Upload afbeelding naar WordPress mediabibliotheek. Retourneert media-ID."""
    upload_url = f"{API_BASE}/media"

    ext = filename.rsplit(".", 1)[-1].lower()
    mime = "image/png" if ext == "png" else "image/jpeg"

    upload_headers = {k: v for k, v in auth_headers.items() if k != "Content-Type"}
    upload_headers["Content-Type"] = mime
    upload_headers["Content-Disposition"] = f'attachment; filename="{filename}"'

    print(f"  Uploaden naar WordPress media...")
    response = requests.post(
        upload_url,
        headers=upload_headers,
        data=image_bytes,
        timeout=60,
    )

    if response.status_code in (200, 201):
        media_id = response.json().get("id")
        print(f"  Media geüpload ✓  (ID: {media_id})")
        return media_id
    else:
        print(f"  WAARSCHUWING: Media upload mislukt (HTTP {response.status_code})")
        try:
            print(f"  {response.json().get('message', response.text[:150])}")
        except Exception:
            pass
        return 0


def create_draft_post(parsed: dict, headers: dict, dry_run: bool, media_id: int = 0) -> None:
    """Maak een draft post aan in WordPress."""
    html_content = markdown_to_html(parsed["markdown"])

    payload = {
        "title": parsed["title"],
        "slug": parsed["slug"],
        "content": html_content,
        "status": "draft",
        "categories": [],
        "meta": {
            "_yoast_wpseo_focuskw": parsed["seo_focus"].split(",")[0].strip(),
            "_yoast_wpseo_metadesc": f"Lees hoe {parsed['seo_focus']} jouw bedrijf raakt — Brand is Code.",
        },
    }

    if media_id:
        payload["featured_media"] = media_id

    if dry_run:
        print("\n── DRY RUN — Geen wijzigingen gemaakt ──────────────────────────")
        print(f"  Titel:          {payload['title']}")
        print(f"  Slug:           {payload['slug']}")
        print(f"  SEO focus:      {parsed['seo_focus']}")
        print(f"  Status:         {payload['status']}")
        print(f"  Featured image: {'media_id=' + str(media_id) if media_id else 'geen'}")
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
        if media_id:
            print(f"  Afbeelding: featured image ingesteld (media {media_id})")
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
        help="Pad naar BLOG-*.md bestand. Laat leeg voor automatische detectie.",
    )
    parser.add_argument(
        "--image",
        choices=["dalle", "unsplash", "free"],
        default=None,
        help=(
            "Genereer een featured image: "
            "'free' (geen key nodig, loremflickr), "
            "'unsplash' (gratis Unsplash key nodig), "
            "'dalle' (DALL-E 3, OpenAI key nodig)."
        ),
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
    print(f"  Titel:     {parsed['title']}")
    print(f"  SEO focus: {parsed['seo_focus']}")

    # Pillar uit bestand (voor DALL-E prompt)
    pillar_match = re.search(r"^\*\*Pillar:\*\*\s*(.+)$",
                             blog_path.read_text(), re.MULTILINE)
    pillar = pillar_match.group(1).strip() if pillar_match else "data strategie"

    if args.dry_run:
        create_draft_post(parsed, headers={}, dry_run=True)
        return

    # Credentials laden
    user, password = load_credentials()
    headers = auth_header(user, password)

    # Afbeelding genereren en uploaden
    media_id = 0
    if args.image == "dalle":
        image_bytes = generate_image_dalle(parsed["title"], pillar)
        safe_slug = re.sub(r"[^a-z0-9]+", "-", parsed["title"].lower()).strip("-")
        media_id = upload_image_to_wordpress(image_bytes, f"{safe_slug}.png", headers)
    elif args.image == "unsplash":
        query = parsed["seo_focus"].split(",")[0].strip() or parsed["title"]
        image_bytes = fetch_image_unsplash(query)
        safe_slug = re.sub(r"[^a-z0-9]+", "-", parsed["title"].lower()).strip("-")
        media_id = upload_image_to_wordpress(image_bytes, f"{safe_slug}.jpg", headers)
    elif args.image == "free":
        query = parsed["seo_focus"].split(",")[0].strip() or parsed["title"]
        image_bytes = fetch_image_free(query)
        safe_slug = re.sub(r"[^a-z0-9]+", "-", parsed["title"].lower()).strip("-")
        media_id = upload_image_to_wordpress(image_bytes, f"{safe_slug}.jpg", headers)

    # Post aanmaken
    create_draft_post(parsed, headers, dry_run=False, media_id=media_id)


if __name__ == "__main__":
    main()

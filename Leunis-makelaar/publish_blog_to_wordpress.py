#!/usr/bin/env python3
"""
Brand is Code — Automatisch Blog naar WordPress Draft (met afbeelding)

Leest een BLOG-XX-*.md bestand uit docs/, genereert een featured image
en plaatst alles als concept (draft) in WordPress via de REST API.

GEBRUIK:
    python3 publish_blog_to_wordpress.py docs/BLOG-01-CRM-DATA-DRAFT.md
    python3 publish_blog_to_wordpress.py docs/BLOG-01-CRM-DATA-DRAFT.md --image pexels
    python3 publish_blog_to_wordpress.py docs/BLOG-01-CRM-DATA-DRAFT.md --image dalle
    python3 publish_blog_to_wordpress.py docs/BLOG-01-CRM-DATA-DRAFT.md --photo-advice
    python3 publish_blog_to_wordpress.py docs/BLOG-01-CRM-DATA-DRAFT.md --dry-run

AFBEELDINGSBRONNEN:
    --image pexels    Gratis Pexels stockfoto. Vereist PEXELS_API_KEY in .env
    --image unsplash  Gratis Unsplash stockfoto. Vereist UNSPLASH_ACCESS_KEY in .env
    --image dalle     DALL-E 3 via OpenAI (~€0,04/afbeelding). Vereist OPENAI_API_KEY in .env
    --image free      Loremflickr, geen key nodig (lage relevantie)
    (geen --image)    Geen featured image, alleen tekst

FOTO ADVIES (eigen camera):
    --photo-advice    Geeft een shooting brief voor jouw Canon EOS R7 kit:
                      Sigma 18-35mm f/1.8 Art | RF 50mm f/1.8
                      Geen WordPress-actie — alleen advies uitprinten.

VEREISTEN:
    pip install markdown requests openai
    .env bestand:
        WP_USER             — WordPress-gebruikersnaam
        WP_APP_PASSWORD     — Application Password
        PEXELS_API_KEY      — bij --image pexels  (gratis: pexels.com/api)
        OPENAI_API_KEY      — bij --image dalle of --photo-advice (optioneel)
        UNSPLASH_ACCESS_KEY — bij --image unsplash
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


def fetch_image_pexels(query: str) -> bytes:
    """Haal een relevante foto op via de Pexels API. Retourneert bytes."""
    api_key = os.environ.get("PEXELS_API_KEY", "").strip()
    if not api_key:
        print("FOUT: PEXELS_API_KEY ontbreekt in .env")
        print("      Gratis key aanmaken op: https://www.pexels.com/api/")
        sys.exit(1)

    query_en = _nl_to_en_query(query)
    print(f"  Pexels afbeelding zoeken voor: '{query_en}'...")
    r = requests.get(
        "https://api.pexels.com/v1/search",
        headers={"Authorization": api_key},
        params={"query": query_en, "orientation": "landscape", "per_page": 1, "size": "large"},
        timeout=15,
    )

    if r.status_code == 401:
        print("FOUT: Ongeldige Pexels API key. Controleer je .env")
        sys.exit(1)

    r.raise_for_status()
    photos = r.json().get("photos", [])
    if not photos:
        print(f"  Geen Pexels resultaten voor '{query_en}', val terug op loremflickr...")
        return fetch_image_free(query_en)

    photo_url = photos[0]["src"]["large2x"]
    photographer = photos[0]["photographer"]
    img_r = requests.get(photo_url, timeout=30)
    img_r.raise_for_status()
    print(f"  Foto gevonden: {photographer} via Pexels ✓")
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


# ── Fotografie-advies (eigen camera) ─────────────────────────────────────────

# Gear specificaties
CAMERA_GEAR = {
    "body": "Canon EOS R7 (32.5MP APS-C, IBIS, 4K)",
    "lenses": [
        {
            "name": "Sigma 18-35mm f/1.8 Art (via adapter)",
            "focal_range": "18-35mm (≈29-56mm FF equivalent op APS-C)",
            "strengths": "Scherpe achtergrond-context, werkruimte, omgevingsshots, storytelling met diepte",
            "sweet_spot": "f/2.8, 24mm",
        },
        {
            "name": "RF 50mm f/1.8 STM",
            "focal_range": "50mm (≈80mm FF equivalent op APS-C)",
            "strengths": "Scherpgestelde details, scherm/laptop close-up, portret-stijl productshot, bokeh",
            "sweet_spot": "f/2.2, 50mm",
        },
    ],
}

# Pillar → visuele stijlrichtlijn
PILLAR_VISUAL_GUIDE = {
    "Data als kompas": {
        "concept": "Data die richting geeft: dashboards, grafieken op scherm, notities en aantekeningen",
        "mood": "Helder, overzichtelijk, gefocust",
        "light": "Zacht daglicht van opzij (raam), of warm bureaulamp",
        "props": "Laptop met open dashboard, notitieboek, pen, koffie op bureau",
    },
    "Code als fundament": {
        "concept": "Het systeem dat werkt: code-editor op scherm, server-rack, handen op toetsenbord",
        "mood": "Donker, technisch, gestructureerd",
        "light": "Scherm-glow in donkere ruimte, of directe bureaulamp op toetsenbord",
        "props": "Code-editor, terminal venster, meerdere schermen",
    },
    "AI als versneller": {
        "concept": "Mens en technologie samen: handen op laptop met AI-interface, grafiek die stijgt",
        "mood": "Energiek, toekomstgericht, optimistisch",
        "light": "Helder natuurlijk licht, schoon en fris",
        "props": "Laptop, telefoon met app, whiteboard met pijlen omhoog",
    },
    "Architectuur als strategie": {
        "concept": "Overzicht en planning: plattegrond/schema op whiteboard, vogelvlucht perspectief",
        "mood": "Strategisch, kalm, doordacht",
        "light": "Egaal daglicht, geen harde schaduwen",
        "props": "Whiteboard met schema's, post-its, overhead shot van bureau met documenten",
    },
    "Positionering": {
        "concept": "Identiteit en vertrouwen: persoonlijk portret, of Brand is Code branding in context",
        "mood": "Professioneel, menselijk, zelfverzekerd",
        "light": "Portrait lighting: raamlicht van voren-opzij, reflector of wit vel als fill",
        "props": "Neutraal of merkkleur achtergrond, laptop als prop",
    },
}


def generate_photo_advice(parsed: dict, pillar: str) -> None:
    """Print een gedetailleerde shooting brief voor de Canon EOS R7 kit."""
    guide = PILLAR_VISUAL_GUIDE.get(pillar, PILLAR_VISUAL_GUIDE["Data als kompas"])

    # Kies lens op basis van pillar
    if pillar in ("Architectuur als strategie", "Code als fundament"):
        primary_lens = CAMERA_GEAR["lenses"][0]  # Sigma 18-35mm — omgeving
        secondary_lens = CAMERA_GEAR["lenses"][1]  # RF 50mm — details
    elif pillar == "Positionering":
        primary_lens = CAMERA_GEAR["lenses"][1]  # RF 50mm — portret
        secondary_lens = CAMERA_GEAR["lenses"][0]
    else:
        primary_lens = CAMERA_GEAR["lenses"][0]  # Sigma 18-35mm — context
        secondary_lens = CAMERA_GEAR["lenses"][1]  # RF 50mm — detail

    print()
    print("═" * 62)
    print(f"  FOTOGRAFIE BRIEF — {parsed['title'][:45]}")
    print("═" * 62)
    print(f"  Camera:   {CAMERA_GEAR['body']}")
    print()
    print(f"  CONCEPT")
    print(f"  {guide['concept']}")
    print()
    print(f"  MOOD / STIJL")
    print(f"  {guide['mood']}")
    print()
    print(f"  PRIMAIRE LENS  →  {primary_lens['name']}")
    print(f"  Gebruik voor:  {primary_lens['strengths']}")
    print(f"  Sweet spot:    {primary_lens['sweet_spot']}")
    print()
    print(f"  INSTELLINGEN (primaire shot)")
    aperture = primary_lens['sweet_spot'].split(',')[0].strip()
    print(f"  Mode:      Av (Aperture Priority)")
    print(f"  Diafragma: {aperture}")
    print(f"  ISO:       Auto (max 3200 met IBIS aan)")
    print(f"  Sluitertijd: laat camera bepalen, min. 1/60s")
    print(f"  Picture Style: Neutraal (bewerk in Lightroom)")
    print(f"  RAW + JPEG: aan")
    print()
    print(f"  DETAIL LENS  →  {secondary_lens['name']}")
    print(f"  Gebruik voor: {secondary_lens['strengths']}")
    print(f"  Sweet spot:   {secondary_lens['sweet_spot']}")
    print()
    print(f"  LICHT")
    print(f"  {guide['light']}")
    print()
    print(f"  PROPS / SCENE")
    print(f"  {guide['props']}")
    print()
    print(f"  COMPOSITIE TIPS")
    print(f"  • Regel van derden: onderwerp op snijpunten")
    print(f"  • Zorg voor 1 scherp focal point, rest zacht (bokeh)")
    print(f"  • Maak 3 varianten: wide (18-24mm), medium (35mm), close-up (50mm)")
    print(f"  • Scherm/laptop altijd met zichtbare maar niet afleide inhoud")
    print()
    print(f"  BESTANDSNAAM VOOR WORDPRESS")
    safe = re.sub(r'[^a-z0-9]+', '-', parsed['title'].lower()).strip('-')
    print(f"  blog-{safe[:40]}-hero.jpg")
    print("═" * 62)
    print()


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
        choices=["pexels", "dalle", "unsplash", "free"],
        default=None,
        help=(
            "Genereer een featured image: "
            "'pexels' (aanbevolen, gratis key via pexels.com/api), "
            "'free' (geen key nodig), "
            "'unsplash' (Unsplash key nodig), "
            "'dalle' (DALL-E 3, OpenAI key nodig)."
        ),
    )
    parser.add_argument(
        "--photo-advice",
        action="store_true",
        help="Print een shooting brief voor je Canon EOS R7 kit. Geen WordPress-actie.",
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

    # Pillar uit bestand (voor DALL-E prompt en foto-advies)
    pillar_match = re.search(r"^\*\*Pillar:\*\*\s*(.+)$",
                             blog_path.read_text(), re.MULTILINE)
    pillar = pillar_match.group(1).strip() if pillar_match else "Data als kompas"

    # Foto-advies: altijd eerst printen, ook gecombineerd met --dry-run
    if args.photo_advice:
        generate_photo_advice(parsed, pillar)
        if not args.image and not args.dry_run:
            return

    if args.dry_run:
        create_draft_post(parsed, headers={}, dry_run=True)
        return

    # Credentials laden
    user, password = load_credentials()
    headers = auth_header(user, password)

    # Afbeelding genereren en uploaden
    media_id = 0
    safe_slug = re.sub(r"[^a-z0-9]+", "-", parsed["title"].lower()).strip("-")
    if args.image == "pexels":
        query = parsed["seo_focus"].split(",")[0].strip() or parsed["title"]
        image_bytes = fetch_image_pexels(query)
        media_id = upload_image_to_wordpress(image_bytes, f"{safe_slug}.jpg", headers)
    elif args.image == "dalle":
        image_bytes = generate_image_dalle(parsed["title"], pillar)
        media_id = upload_image_to_wordpress(image_bytes, f"{safe_slug}.png", headers)
    elif args.image == "unsplash":
        query = parsed["seo_focus"].split(",")[0].strip() or parsed["title"]
        image_bytes = fetch_image_unsplash(query)
        media_id = upload_image_to_wordpress(image_bytes, f"{safe_slug}.jpg", headers)
    elif args.image == "free":
        query = parsed["seo_focus"].split(",")[0].strip() or parsed["title"]
        image_bytes = fetch_image_free(query)
        media_id = upload_image_to_wordpress(image_bytes, f"{safe_slug}.jpg", headers)

    # Post aanmaken
    create_draft_post(parsed, headers, dry_run=False, media_id=media_id)


if __name__ == "__main__":
    main()

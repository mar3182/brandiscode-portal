#!/usr/bin/env python3
"""
Brand is Code — WordPress Custom CSS Updater

Pusht de bijgewerkte custom-css.css naar WordPress Additional CSS
via de WordPress admin Customizer (web-login sessie).

GEBRUIK:
    python3 push_css_to_wordpress.py
    python3 push_css_to_wordpress.py --css-file brandiscode/wp-content-update/custom-css.css
    python3 push_css_to_wordpress.py --dry-run   (toont CSS maar pusht niet)

VEREISTEN:
    .env met:
        WP_USER             — WordPress-gebruikersnaam (bijv. mary)
        WP_ADMIN_PASSWORD   — WordPress admin wachtwoord (niet de Application Password!)

    Als WP_ADMIN_PASSWORD niet in .env staat, vraagt het script er interactief om.

VERSCHIL Application Password vs Admin Password:
    WP_APP_PASSWORD   = de long token in Profiel > Applicatiewachtwoorden (voor REST API)
    WP_ADMIN_PASSWORD = je gewone WordPress inlogwachtwoord (voor het admin-dashboard)

AANMAKEN WP_ADMIN_PASSWORD in .env:
    Voeg toe aan /Users/admin/Desktop/Leunis-makelaar/.env:
        WP_ADMIN_PASSWORD=<jouw_wachtwoord>
"""

import os
import re
import sys
import getpass
import requests
from pathlib import Path

# ── Configuratie ──────────────────────────────────────────────────────────────

SITE_URL = "https://brandiscode.com"
LOGIN_URL = f"{SITE_URL}/login/"
ADMIN_AJAX_URL = f"{SITE_URL}/wp-admin/admin-ajax.php"
CUSTOMIZE_URL = f"{SITE_URL}/wp-admin/customize.php"

DEFAULT_CSS_FILE = Path(__file__).parent / "brandiscode" / "wp-content-update" / "custom-css.css"

# ── Helpers ───────────────────────────────────────────────────────────────────

def load_env() -> tuple[str, str]:
    """Laad credentials uit .env of vraag interactief."""
    env_file = Path(__file__).parent / ".env"
    if env_file.exists():
        for line in env_file.read_text().splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, _, value = line.partition("=")
                os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))

    user = os.environ.get("WP_USER", "").strip()
    if not user:
        user = input("WordPress gebruikersnaam: ").strip()

    password = os.environ.get("WP_ADMIN_PASSWORD", "").strip()
    if not password:
        print()
        print("Voer je WordPress ADMIN-wachtwoord in")
        print("(Dit is je gewone dashboard-wachtwoord, NIET de Application Password)")
        password = getpass.getpass("Wachtwoord: ")

    if not user or not password:
        print("FOUT: gebruikersnaam en wachtwoord zijn verplicht.")
        sys.exit(1)

    return user, password


def login_to_wordpress(session: requests.Session, user: str, password: str) -> bool:
    """Log in via de WordPress login pagina. Retourneert True bij succes."""
    # Zet test cookie (WordPress vereist dit)
    session.cookies.set("wordpress_test_cookie", "WP Cookie check", domain=SITE_URL.split("//")[1])

    login_data = {
        "log": user,
        "pwd": password,
        "wp-submit": "Inloggen",
        "redirect_to": "/wp-admin/",
        "testcookie": "1",
    }

    print(f"  Inloggen bij {LOGIN_URL}...")
    r = session.post(LOGIN_URL, data=login_data, allow_redirects=True, timeout=30)

    # Controleer of we in wp-admin zijn gekomen
    if "wp-admin" in r.url or any("wordpress_logged_in" in c for c in session.cookies.keys()):
        print(f"  Ingelogd als '{user}' ✓")
        return True

    # Extra check: zoek naar admin content in de response
    if 'id="wpadminbar"' in r.text or "dashboard" in r.url.lower():
        print(f"  Ingelogd als '{user}' ✓")
        return True

    print(f"  Login mislukt. URL na login: {r.url}")
    if "incorrect" in r.text.lower() or "onjuist" in r.text.lower() or "Error" in r.text:
        print("  FOUT: Onjuist wachtwoord of gebruikersnaam.")
    return False


def get_customize_nonce(session: requests.Session) -> str:
    """Haal de customize-nonce op van de Customizer pagina."""
    print(f"  Nonce ophalen uit Customizer...")
    r = session.get(CUSTOMIZE_URL, timeout=30)

    # Zoek nonce in pagina HTML
    patterns = [
        r'"customize_nonce"\s*:\s*"([a-f0-9]+)"',
        r"'nonce'\s*:\s*'([a-f0-9]+)'",
        r'"nonce"\s*:\s*"([a-f0-9]+)"',
        r'name="save-customize.*?"\s+value="([a-f0-9]+)"',
        r"_wpnonce['\"]?\s*[=:]\s*['\"]([a-f0-9]+)['\"]",
    ]

    for pattern in patterns:
        match = re.search(pattern, r.text)
        if match:
            nonce = match.group(1)
            print(f"  Nonce gevonden ✓")
            return nonce

    # Fallback: zoek in JavaScript data
    wp_data = re.search(r'var _wpCustomizeSettings\s*=\s*({.*?});', r.text, re.DOTALL)
    if wp_data:
        import json
        try:
            settings = json.loads(wp_data.group(1))
            nonce = settings.get("nonce", {}).get("save", "")
            if nonce:
                print(f"  Nonce gevonden via _wpCustomizeSettings ✓")
                return nonce
        except Exception:
            pass

    print("  WAARSCHUWING: Geen nonce gevonden in Customizer pagina.")
    return ""


def save_custom_css(session: requests.Session, nonce: str, css_content: str) -> bool:
    """Sla de custom CSS op via de WordPress Customizer admin-ajax endpoint."""
    print(f"  CSS opslaan via WordPress Customizer...")

    # De Customizer save werkt via admin-ajax.php
    payload = {
        "wp_customize": "on",
        "action": "customize_save",
        "nonce": nonce,
        "customize_changeset_data": f'{{"custom_css[kadence]":{{"value":{json_escape(css_content)}}}}}',
        "customize_theme": "kadence",
    }

    headers = {
        "X-WP-Nonce": nonce,
        "Referer": CUSTOMIZE_URL,
        "Content-Type": "application/x-www-form-urlencoded",
    }

    r = session.post(ADMIN_AJAX_URL, data=payload, headers=headers, timeout=60)
    print(f"  Customizer ajax status: {r.status_code}")

    if r.status_code == 200:
        try:
            data = r.json()
            if data.get("success"):
                print(f"  CSS opgeslagen via Customizer ✓")
                return True
            else:
                print(f"  Customizer response: {data}")
        except Exception:
            print(f"  Response: {r.text[:200]}")

    return False


def save_css_via_direct_post(session: requests.Session, css_content: str) -> bool:
    """
    Alternatieve methode: sla CSS op via direct POST naar customize.php
    (gebruikt als de ajax-methode niet werkt).
    """
    import json

    print(f"  CSS opslaan via customize.php (directe POST)...")

    # Eerst een GET om de nonce te laden
    r = session.get(f"{CUSTOMIZE_URL}?autofocus[control]=custom_css", timeout=30)

    # Zoek nonce specifiek voor save-customize
    nonce_match = re.search(r'"save"\s*:\s*"([a-f0-9]+)"', r.text)
    if not nonce_match:
        nonce_match = re.search(r"customize_nonce['\"]?\s*[=:]\s*['\"]([a-f0-9]+)['\"]", r.text)

    nonce = nonce_match.group(1) if nonce_match else ""

    if not nonce:
        print("  Geen nonce gevonden voor directe POST.")
        return False

    changeset_data = json.dumps({
        "custom_css[kadence]": {"value": css_content}
    })

    payload = {
        "wp_customize": "on",
        "nonce": nonce,
        "customize_changeset_data": changeset_data,
        "customize_theme": "kadence",
        "action": "customize_save",
    }

    r2 = session.post(ADMIN_AJAX_URL, data=payload, timeout=60)

    if r2.status_code == 200:
        try:
            data = r2.json()
            if data.get("success"):
                print(f"  CSS opgeslagen via directe POST ✓")
                return True
            print(f"  Response data: {data}")
        except Exception:
            print(f"  Response text: {r2.text[:300]}")
    else:
        print(f"  HTTP {r2.status_code}: {r2.text[:150]}")

    return False


def json_escape(s: str) -> str:
    """Escape string voor gebruik in JSON."""
    import json
    return json.dumps(s)


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    import argparse
    import json

    parser = argparse.ArgumentParser(
        description="Push custom CSS naar WordPress Additional CSS via admin login."
    )
    parser.add_argument(
        "--css-file",
        type=Path,
        default=DEFAULT_CSS_FILE,
        help=f"Pad naar CSS bestand (standaard: {DEFAULT_CSS_FILE})",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Lees en toon CSS maar push niet naar WordPress.",
    )
    args = parser.parse_args()

    # CSS laden
    css_path = args.css_file
    if not css_path.exists():
        print(f"FOUT: CSS bestand niet gevonden: {css_path}")
        sys.exit(1)

    css_content = css_path.read_text(encoding="utf-8")
    print(f"\nCSS bestand: {css_path}")
    print(f"Grootte: {len(css_content):,} tekens")

    if args.dry_run:
        print("\n── DRY RUN — CSS preview (eerste 500 tekens) ──────────────────")
        print(css_content[:500])
        print("────────────────────────────────────────────────────────────────")
        print("\nDry-run klaar. Geen wijzigingen gemaakt.")
        return

    print()

    # Credentials
    user, password = load_env()

    # Login sessie starten
    session = requests.Session()
    session.headers.update({
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    })

    if not login_to_wordpress(session, user, password):
        print("\nFOUT: Kon niet inloggen bij WordPress.")
        print("TIP 1: Controleer je wachtwoord (WP_ADMIN_PASSWORD in .env)")
        print("TIP 2: Zorg dat je ingelogd ben via de browser en het wachtwoord klopt")
        print()
        print("ALTERNATIEF — Plak de CSS handmatig via WordPress:")
        print(f"  1. Ga naar: {SITE_URL}/wp-admin/customize.php")
        print(f"  2. Klik 'Extra CSS' (onderaan de linkerzijbalk)")
        print(f"  3. Vervang de inhoud door de CSS uit: {css_path}")
        print(f"  4. Klik 'Publiceren'")
        sys.exit(1)

    # Nonce ophalen
    nonce = get_customize_nonce(session)

    # CSS opslaan
    success = False

    if nonce:
        success = save_custom_css(session, nonce, css_content)

    if not success:
        print("  Eerste methode mislukt, alternatieve methode proberen...")
        success = save_css_via_direct_post(session, css_content)

    if success:
        print(f"\n✓ CSS succesvol gepusht naar {SITE_URL}")
        print(f"  Controleer op: {SITE_URL}/blog/")
    else:
        print(f"\nOPMERKING: Automatisch pushen lukte niet via Python.")
        print(f"Gebruik de handmatige methode:")
        print(f"  1. Ga naar: {CUSTOMIZE_URL}")
        print(f"  2. Klik 'Extra CSS' (onderaan de linkerzijbalk)")
        print(f"  3. Plak de volledige inhoud van: {css_path}")
        print(f"  4. Klik 'Publiceren'")
        print()
        print("OF via Kadence Global Settings:")
        print(f"  1. Ga naar: {SITE_URL}/wp-admin/admin.php?page=kadence")
        print(f"  2. Zoek de 'Custom CSS' sectie")
        print(f"  3. Plak de CSS en sla op")


if __name__ == "__main__":
    main()

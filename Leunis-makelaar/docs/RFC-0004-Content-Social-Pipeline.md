# RFC-0004: Content-to-Social Automation Pipeline

**RFC ID:** RFC-0004
**Version:** 1.0
**Status:** Draft
**Owner:** Content Factory + Backend Specialist
**Date:** 2026-07-09

---

## Context

Brand is Code heeft een content-strategie nodig die:
1. Consistent de merkpositionering (RFC-0002) uitdraagt.
2. Organisch verkeer naar de website genereert (SEO).
3. Zichtbaarheid opbouwt op LinkedIn, Instagram en Facebook.
4. Schaalbaar is: 1 persoon moet wekelijks kunnen publiceren zonder overbelasting.

Momenteel is er geen gestructureerde contentmachine. Blogs en social posts worden ad hoc geschreven zonder consistente structuur, merkboodschap of distributielogica.

---

## Decision

### Architectuur: 1 Input → N Outputs

```
KERNIDEE (weekelijks)
    ↓
BLOG (brandiscode.com)
    ↓ auto-transformatie
    ├── LinkedIn long-form post (thought leadership)
    ├── LinkedIn short post (hook-only variant)
    ├── Instagram caption + carousel copy (5 slides)
    └── Facebook post (community/story variant)
    ↓
HUMAN APPROVAL GATE
    ↓
PUBLICATIE + SCHEDULING
    ↓
PERFORMANCE FEEDBACK → volgende planning
```

### Blog-structuur (normatief)

Elke blog volgt dit format:

```markdown
# [Titel: probleem of provocatieve stelling]

## De situatie (herkenning)
[2-3 zinnen: het probleem dat de doelgroep kent]

## Waarom dit niet werkt (inzicht)
[Uitleg van de kern van het probleem]

## Hoe het anders kan (aanpak Brand is Code)
[Concrete aanpak, geen abstracte beloften]

## Bewijs of voorbeeld
[Case, cijfer, screenshot of analogie]

## Jouw volgende stap (CTA)
[1 concrete actie: call plannen, intake starten, of blog lezen]
```

Blog-lengte: 600–900 woorden (SEO + leesbaarheid).

### Social-transformatieregels per kanaal

**LinkedIn Long-form (thought leadership)**
- Hook: 1–2 sterke openingszinnen (geen "Ik deel graag mijn ervaringen").
- Body: 5–7 bullet points of korte alinea's — scanbaar.
- CTA: link naar blog of intake.
- Hashtags: 3–5 relevant (#AI #MKB #DataStrategie #InformatieArchitectuur).
- Toon: zelfverzekerd, direct, geen hype.

**LinkedIn Short (hook-variant)**
- Maximaal 150 woorden.
- Één provocatieve stelling + 1 inzicht + 1 CTA.
- Geen carousel, geen link in post (eerste comment).

**Instagram Caption + Carousel**
- Caption: max 150 woorden, eerste zin is de hook.
- Carousel: 5 slides.
  - Slide 1: Provocatieve stelling (= blogkop).
  - Slide 2: Het probleem.
  - Slide 3: De aanpak.
  - Slide 4: Bewijs/resultaat.
  - Slide 5: CTA ("DM voor meer info" / "Link in bio").
- Hashtags: 10–15, mix van breed en niche.

**Facebook**
- Community/story variant: meer persoonlijk, minder formeel dan LinkedIn.
- Start met herkenbaar scenario.
- Eindig met vraag aan de community voor engagement.
- Geen carousel (tenzij ook Instagram-post).

### Contentkalender: 12 Blogthema's (kwartaalplanning)

Thema's zijn afgeleid van RFC-0002 message pillars:

| #   | Thema                                                      | Pillar                     | Doelgroep        |
| --- | ---------------------------------------------------------- | -------------------------- | ---------------- |
| 1   | Waarom je CRM-data je groei blokkeert                      | Data als kompas            | MKB directeur    |
| 2   | De echte kosten van losse tools                            | Code als fundament         | MKB directeur    |
| 3   | Wat is een information architecture? (introductie)         | Architectuur als strategie | Breed            |
| 4   | AI begint niet met AI — het begint met je data             | AI als versneller          | Breed            |
| 5   | Hoe een makelaar 5 uur per week terugwint met 1 automation | AI als versneller          | Makelaars        |
| 6   | De 3 signalen dat je bedrijf AI-ready is (checklist)       | Data First                 | MKB directeur    |
| 7   | Wat Microsoft Copilot je niet vertelt                      | AI als versneller          | Marketingmanager |
| 8   | Van spreadsheet naar systeem: een stappenplan              | Code als fundament         | Scale-up         |
| 9   | Waarom je marketingdata en salesdata niet praten           | Data als kompas            | Marketingmanager |
| 10  | Brand is Code: wat betekent de naam echt?                  | Positionering              | Breed            |
| 11  | Hoe je een AI-project laat falen (en hoe je dat voorkomt)  | AI Second                  | Breed            |
| 12  | De information architecture van een gezond MKB-bedrijf     | Architectuur als strategie | MKB directeur    |

### Workflow per week

```
Maandag:    PM selecteert thema + geeft kernbriefing (5 min)
Dinsdag:    Content Factory schrijft blog-draft
Woensdag:   Content Factory transformeert naar social-posts
Donderdag:  Human approval gate (PM / eigenaar)
Vrijdag:    Publicatie blog + scheduling social posts
```

### Tooling

| Tool                                   | Gebruik                               | Status       |
| -------------------------------------- | ------------------------------------- | ------------ |
| GitHub Copilot / Content Factory agent | Blog-generatie + social-transformatie | Operationeel |
| WordPress (brandiscode.com)            | Blog-publicatie                       | Bestaand     |
| Buffer / Later / Meta Business Suite   | Social scheduling                     | Te kiezen    |
| LinkedIn native                        | Direct posten of via scheduling tool  | Te kiezen    |

**Aanbevolen scheduling-tool:** Buffer (gratis tier voor 3 kanalen) of Later (betere Instagram-ondersteuning).

### Approval Gate (normatief)

Vóór publicatie MOET een menselijke reviewer bevestigen:
1. Boodschap klopt met RFC-0002 messaging.
2. Geen factual fouten in technische claims.
3. CTA is actueel (juiste link naar blog, intake of calendar).
4. Geen gevoelige klantdata in voorbeelden.

---

## Alternatives Considered

### A. Volledig handmatig schrijven per kanaal
Te tijdsintensief voor 1 persoon; niet schaalbaar.

### B. Automatisch publiceren zonder approval gate
Onaanvaardbaar reputatierisico; approval gate is normatief.

### C. Alleen LinkedIn, Instagram en Facebook later
LinkedIn heeft hoogste ROI voor B2B MKB; maar parallelle aanwezigheid op Instagram en Facebook versterkt brandherkenning bij zelfde doelgroep in andere context.

---

## Consequences

**Positief:**
- Consistent merkprofiel op alle kanalen.
- 1 thema levert 4–5 content-stukken op.
- Blog-archief bouwt SEO-autoriteit.
- Social-aanwezigheid genereert website-verkeer.

**Risico:**
- Kwaliteitsverlies bij te snelle generatie zonder goede briefing.
- Approval gate moet snel zijn (<24u) om cadans te halen.

---

## Compatibility with RFC-0001

- Content is de bovenste laag van het AI Enablement Platform: kennisdeling als onderdeel van de go-to-market.
- Blogs en social posts zijn geen aparte datastroom maar bijdragen aan het vertrouwensmodel bij potentiële klanten.
- Geen nieuwe datasystemen; WordPress en social platforms zijn externe kanalen die content distribueren, niet dupliceren.

Geen conflict met RFC-0001.

---

## Security and Privacy Impact

- Geen klantdata in publieke content zonder expliciete schriftelijke toestemming.
- Geen persoonsnamen of bedrijfsnamen in cases tenzij als case study met goedkeuring.
- Scheduling-tools mogen geen toegang krijgen tot Supabase of portal-data.

---

## Rollout and Rollback

**Rollout:**
1. Contentkalender intern goedkeuren (PM).
2. Template (blog-structuur) in docs vastleggen.
3. Wekelijkse workflow starten met thema 1 (week 1).
4. Scheduling-tool kiezen en inrichten (week 1).
5. Eerste approval gate doorlopen (week 1).
6. Publicatie + meting (week 2).
7. Na 4 weken: performance-review en bijstelling thema's.

**Rollback:**
- Stop content-generatie; bestaande gepubliceerde content blijft staan.
- Geen technische rollback nodig.

---

## References

- RFC-0001: Data-First AI Platform Strategy
- RFC-0002: Brand Messaging & Go-To-Market Architecture
- RFC-0003: Website-to-Portal Funnel & Conversion Flow

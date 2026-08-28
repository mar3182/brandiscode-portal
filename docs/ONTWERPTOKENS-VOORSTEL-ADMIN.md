# Ontwerptokens-voorstel — Admin UI-simplificatie (Taak A2)

**Versie:** 1.0
**Datum:** 28 augustus 2026
**Status:** Voorstel — ter goedkeuring PM (fase A3), zie `docs/ADMIN-AI-WORKBENCH-EN-UI-SIMPLIFICATIE.md` sectie 3 en 5.
**Scope:** dit document bevat **alleen** een voorstel met concrete code. Er zijn in deze taak **geen** bestaande component- of stylingbestanden gewijzigd.

---

## 0. Bevestigde huidige staat (feitelijk, uit de code gelezen op 28-08-2026)

| Bestand                                         | Wat er nu in staat                                                                                                                                                                                                                                                                 |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `client-portal/tailwind.config.js`              | 5 merkkleuren: `brand.dark #1B2A4A`, `brand.gold #D4A843`, `brand.blue #2E86AB`, `brand.pink #E84393`, `brand.orange #F7631B`. Geen andere custom tokens (geen spacing/radius/shadow-tokens).                                                                                      |
| `client-portal/src/app/globals.css`             | `.glass-card` (1 variant, geen accent-variant), `.text-gold-gradient`, `.status-badge` (basislaag) + **3** losse CSS-klassen `.status-actief`, `.status-wacht`, `.status-afgerond` — **deze 3 blijken ongebruikt te zijn** (zie afwijking hieronder).                              |
| `client-portal/src/components/StatusBadge.tsx`  | 14 statuswaarden in een inline `statusClasses`-object (Tailwind-strings, niet via de CSS-klassen uit globals.css): `concept`, `verstuurd`, `bekeken`, `getekend`, `afgewezen`, `betaald`, `herinnering`, `gepland`, `actief`, `review`, `afgerond`, `todo`, `in_progress`, `done`. |
| `client-portal/src/components/StatCard.tsx`     | 4 kleurvarianten (`gold`, `blue`, `green`, `pink`), elk met eigen `from/to`-gradient + eigen border/tekstkleur. `green` gebruikt Tailwind's `emerald`, geen brand-token.                                                                                                           |
| `client-portal/src/components/AdminSidebar.tsx` | Actieve nav-status en het label "Admin Panel" gebruiken **`brand-orange`**, niet `brand-gold`. `glass-card` voor de sidebar-container zelf.                                                                                                                                        |

### Afwijkingen t.o.v. de aannames in de opdracht

1. **Geen 14 losse `.status-*` CSS-klassen.** In `globals.css` staan er slechts 3 (`.status-actief`, `.status-wacht`, `.status-afgerond`), en die worden **nergens** aangeroepen — `StatusBadge.tsx` gebruikt een eigen inline object met Tailwind-utility-strings, niet deze CSS-klassen. De 3 CSS-klassen zijn dode code. Dit voorstel behandelt daarom de 14 statuswaarden in `StatusBadge.tsx` als bron van waarheid, en stelt voor de 3 ongebruikte CSS-klassen te verwijderen in fase D (opruiming, geen risico).
2. **Kleurhergebruik bestaat al gedeeltelijk.** `betaald`, `getekend`, `afgerond` en `done` delen nu al dezelfde `emerald`-kleur; `bekeken` en `herinnering` delen `amber`; `actief` en `in_progress` delen `brand-gold`. Er zijn dus feitelijk **7 unieke kleurwaarden** verdeeld over 14 labels, niet 14 unieke kleuren. Dit maakt de stap naar 4 semantische tinten kleiner dan de aanname suggereert, maar de conclusie (4 tinten in plaats van de huidige indeling) blijft staan.
3. **De sidebar gebruikt nu `brand-orange` als "actief"-accent**, niet `brand-gold`. Het voorstel om goud als dé accentkleur te maken is dus ook een wijziging voor `AdminSidebar.tsx`, niet alleen een opruiming van StatCard/StatusBadge.

---

## 1. Voor/na-vergelijking van de kleurgrammatica

### Voor (huidig)

- **5 UI-merkkleuren** actief in chrome/navigatie/kaarten: `brand-dark`, `brand-gold`, `brand-blue`, `brand-pink`, `brand-orange` — plus incidenteel `emerald` (StatCard "green") buiten het brand-palet.
- **Accentgebruik is inconsistent**: sidebar-actief-status = oranje, StatCard-default = goud, StatusBadge "actief"/"in_progress" = goud. Drie verschillende "wat betekent kleur X"-conventies naast elkaar.
- **7 feitelijk unieke statuskleuren** verdeeld over 14 labels (gray, blue, amber, emerald ×4-labels, red, brand-gold ×2-labels, purple) — geen 1-op-1 semantiek, sommige kleuren (amber, emerald) worden voor meerdere, niet-verwante semantische situaties gebruikt (bv. `bekeken` = "info" en `herinnering` = "waarschuwing" delen beide amber).
- **StatCard**: 4 losse gradients, elk kaart trekt visueel evenveel aandacht — geen hiërarchie tussen "belangrijkste KPI" en de rest.

### Na (voorstel)

- **1 primaire accentkleur — goud (`brand-gold`)** voor alles wat actiegericht/interactief is: primaire knoppen, actieve navigatie-status, actieve/lopende statusindicatie, links, focus-states.
- **Overige merkkleuren (`blue`, `pink`, `orange`) verhuizen naar data-visualisatie-only** (grafieken in de nieuwe Monitoring-tab uit fase C3), niet meer in UI-chrome. `brand-dark` blijft achtergrond-token.
- **4 semantische statustinten** in plaats van 7 ad-hoc kleuren over 14 labels:
  - **Neutraal** (grijs) — nog niet gestart / geen actie vereist.
  - **In behandeling** (blauw) — actief bezig, wacht op iets.
  - **Positief** (groen/emerald) — succesvol afgerond.
  - **Aandacht nodig** (amber/rood-accent) — vereist actie van de gebruiker.
- **StatCard: 2 varianten** — `neutral` (standaard, geen gradient, alleen `glass-card` + gouden icoon-tint) en `accent` (voor precies de KPI die die pagina het belangrijkst vindt, met een subtiele gouden gloed). Geen 4 losse kleurvarianten meer.
- Labelteksten in `StatusBadge` blijven **ongewijzigd** — alleen de onderliggende kleurklasse per label verandert.

---

## 2. Mapping-tabel: 14 statuswaarden → 4 semantische tinten

| Huidige status (`StatusBadge.tsx`) | Huidig label | Huidige kleur | → Semantische tint              |
| ---------------------------------- | ------------ | ------------- | ------------------------------- |
| `concept`                          | Concept      | gray          | **Neutraal**                    |
| `gepland`                          | Gepland      | gray          | **Neutraal**                    |
| `todo`                             | To do        | gray          | **Neutraal**                    |
| `verstuurd`                        | Nieuw        | blue          | **In behandeling**              |
| `bekeken`                          | Bekeken      | amber         | **In behandeling**              |
| `in_progress`                      | Bezig        | brand-gold    | **In behandeling**              |
| `review`                           | Review       | purple        | **In behandeling**              |
| `getekend`                         | Akkoord ✓    | emerald       | **Positief**                    |
| `betaald`                          | Betaald      | emerald       | **Positief**                    |
| `afgerond`                         | Afgerond ✓   | emerald       | **Positief**                    |
| `done`                             | Klaar ✓      | emerald       | **Positief**                    |
| `afgewezen`                        | Afgewezen    | red           | **Aandacht nodig**              |
| `herinnering`                      | Herinnering  | amber         | **Aandacht nodig**              |
| `actief`                           | Actief       | brand-gold    | **In behandeling** *(zie noot)* |

**Noot bij `actief`:** dit label wordt gebruikt voor lopende sprints (`SprintStatus`). Semantisch is "een sprint die loopt" dichter bij "in behandeling" dan bij "positief afgerond". Dit wijkt af van de letterlijke opdrachttekst (die `actief` niet aan een tint koppelde) — voorgesteld op basis van betekenis. PM kan dit bij goedkeuring corrigeren indien een andere indeling gewenst is.

---

## 3. Voorgestelde Tailwind-tokens en CSS-utilities (nog niet toegepast)

### 3.1 `tailwind.config.js` — uitbreiding (additief, bestaande `brand.*`-keys blijven ongewijzigd)

```js
// binnen theme.extend.colors, naast de bestaande brand-kleuren:
status: {
  neutral:  '#9CA3AF', // gray-400 — geen actie vereist
  pending:  '#2E86AB', // brand-blue — in behandeling
  positive: '#10B981', // emerald-500 — afgerond/succesvol
  warning:  '#F59E0B', // amber-500 — aandacht nodig
},
```

### 3.2 `globals.css` — nieuwe/aangepaste utility-klassen

```css
/* Semantische statustinten — vervangt losse per-label kleuren in StatusBadge.tsx */
.status-neutral {
  @apply bg-gray-500/20 text-gray-300 border-gray-500/30;
}

.status-pending {
  @apply bg-brand-blue/20 text-blue-300 border-brand-blue/30;
}

.status-positive {
  @apply bg-emerald-500/20 text-emerald-300 border-emerald-500/30;
}

.status-warning {
  @apply bg-amber-500/20 text-amber-300 border-amber-500/30;
}

/* Verwijdert in fase D: .status-actief, .status-wacht, .status-afgerond (ongebruikte dode code) */
```

```css
/* StatCard — 2 varianten in plaats van 4 */
.stat-card-neutral {
  /* gebruikt de bestaande .glass-card, geen extra gradient nodig */
}

.stat-card-accent {
  background: linear-gradient(135deg, rgba(212, 168, 67, 0.15), rgba(212, 168, 67, 0.03));
  border-color: rgba(212, 168, 67, 0.3);
}
```

### 3.3 Illustratief hertaal-voorbeeld (géén wijziging in deze taak — alleen ter verduidelijking van het voorstel)

```ts
// StatusBadge.tsx — voorgestelde mapping (fase D, nu NIET toegepast)
const statusTint: Record<string, 'neutral' | 'pending' | 'positive' | 'warning'> = {
  concept: 'neutral', gepland: 'neutral', todo: 'neutral',
  verstuurd: 'pending', bekeken: 'pending', in_progress: 'pending', review: 'pending', actief: 'pending',
  getekend: 'positive', betaald: 'positive', afgerond: 'positive', done: 'positive',
  afgewezen: 'warning', herinnering: 'warning',
}
```

---

## 4. Risico- en impactparagraaf

**Geraakte bestanden in fase D (D1: admin-dashboard/sidebar, D2: klant-facing — later):**

- `client-portal/src/components/StatusBadge.tsx` — kleurklasse-object wordt vervangen door de 4-tinten-mapping. Labeltekst ongewijzigd. **Visuele wijziging: ja** — statussen die nu verschillende kleuren hadden (bv. `bekeken` amber → wordt pending/blauw) krijgen een andere kleur dan gebruikers gewend zijn.
- `client-portal/src/components/StatCard.tsx` — 4 kleurvarianten (`gold`/`blue`/`green`/`pink`) worden 2 varianten (`neutral`/`accent`). **Breaking prop-wijziging**: bestaande aanroepen met `color="blue"` / `color="green"` / `color="pink"` moeten worden omgezet naar `variant="neutral"` of `variant="accent"`. Vereist een korte grep naar alle huidige `<StatCard color=...>`-aanroepen vóórdat dit wordt doorgevoerd.
- `client-portal/src/components/AdminSidebar.tsx` — actieve-navigatie-accent gaat van `brand-orange` naar `brand-gold`. **Visuele wijziging: ja**, klein maar zichtbaar (kleur van het actieve menu-item en het "Admin Panel"-label).
- `client-portal/src/app/admin/page.tsx` — waarschijnlijk gebruiker van `StatCard` met meerdere `color`-varianten; moet mee worden aangepast zodra StatCard's API wijzigt (niet in deze taak onderzocht op exacte aanroepen — aanbevolen als eerste stap van fase D1).
- `client-portal/src/app/admin/clients/[id]/page.tsx` — gebruikt vermoedelijk `StatusBadge` voor offerte/sprint/deliverable/factuur-statussen; geen API-wijziging nodig (StatusBadge-component-interface blijft `status`-prop), alleen visuele kleurverandering.
- `client-portal/src/app/globals.css` — 3 ongebruikte `.status-*`-klassen kunnen veilig verwijderd worden (geen referenties gevonden); dit is opruiming zonder risico.

**Breaking changes samengevat:**
- **Visueel breaking** (kleurverandering, geen functionele impact): alle statusbadges en de sidebar-actief-kleur zien er anders uit. Geen data- of gedragswijziging.
- **API-breaking** (vereist code-aanpassing bij toepassing): `StatCard`'s `color`-prop verandert van 4 naar 2 opties — elke bestaande aanroep met `blue`/`green`/`pink` moet expliciet worden herzien in fase D1, anders faalt `npx tsc --noEmit` niet (want `color` heeft een default), maar het component rendert dan met een niet-bestaande variant tenzij de nieuwe types een fallback/verplichte migratie afdwingen.
- **Geen backend-, database- of route-impact.** Dit voorstel raakt uitsluitend styling/presentatie-bestanden binnen `client-portal/src`; geen migraties, geen API's, geen RLS.
- **Uitrolvolgorde blijft zoals in sectie 3.3 van het hoofddocument**: eerst admin (D1), pas daarna klant-facing (D2), zodat Sprint 1-oplevering voor Leunis niet wordt verstoord.

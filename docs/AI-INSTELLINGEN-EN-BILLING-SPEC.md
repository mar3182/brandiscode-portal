# AI Instellingen en Billing Spec (Portal)
**Versie:** 1.0  
**Datum:** 2026-07-08  
**Status:** Voor implementatie (Sprint 2 voorstel)

---

## 1. Doel

Klant krijgt keuze tussen:

1. **BYOK** (Bring Your Own Key): klant gebruikt eigen AI API key.
2. **Managed AI**: Brand is Code beheert AI keys en rekent vaste maandkosten + fair use.
3. **Hybrid**: start managed, later omschakelen naar BYOK zonder migratie.

Deze opzet maakt:

- Snelle livegang mogelijk zonder Microsoft 365 Copilot licenties.
- Flexibele modelkeuze mogelijk per use-case.
- CRM-koppeling (bijv. Realworks) model-onafhankelijk en toekomstvast.

---

## 2. Positionering richting klant

Belangrijk om expliciet te maken in UI en communicatie:

1. Microsoft 365 Business Premium bevat niet standaard Microsoft 365 Copilot.
2. Copilot is in de praktijk vaak een aparte licentie per gebruiker.
3. Dit portal kiest bewust voor open modelarchitectuur zodat klant niet vastzit aan 1 provider.

---

## 3. Scope

### In scope

1. Instellingenpagina per klant voor AI modus/provider/model.
2. Veilige opslag van API keys (alleen server-side, encrypted at rest).
3. Kostenlogica (BYOK vs Managed) zichtbaar in dashboard.
4. API-laag die provider/model dynamisch kiest per request.
5. Basis usage-meting per klant en per tool.

### Niet in scope (fase later)

1. Geavanceerde kostenallocatie per teamlid.
2. Automatische facturatie via PSP.
3. Multi-tenant hard quotas met real-time blocking.

---

## 4. Functioneel ontwerp

## 4.1 Instellingsscherm (Admin klantniveau)

Locatie:

- Admin klantdetail: nieuw tabblad AI Instellingen.

Velden:

1. AI modus (required):
- byok
- managed
- hybrid

2. Provider (required):
- openai
- azure-openai
- anthropic
- github-models

3. Model per use-case:
- listing_generation_model
- listing_refinement_model
- social_generation_model
- brochure_generation_model

4. Managed bundel (alleen bij managed/hybrid):
- starter
- growth
- pro

5. Fair use limiet (alleen managed/hybrid):
- maandelijkse tokens of maandelijkse requests

6. Waarschuwing drempel:
- 80% (default)
- 95% (hard warning)

7. BYOK key invoer (alleen byok/hybrid):
- api_key (masked input)
- key status testknop (test verbinding)


## 4.2 Klantweergave (Dashboard)

Nieuwe kaart onder instellingen:

1. Actieve modus: BYOK / Managed / Hybrid
2. Actieve provider + model
3. Huidig verbruik (maand)
4. Verwachte kostenindicatie
5. Waarschuwing bij bijna limiet

---

## 5. Data model (Supabase)

## 5.1 Tabel: client_ai_settings

Kolommen:

1. id uuid pk
2. client_id uuid fk clients(id)
3. ai_mode text check in ('byok','managed','hybrid')
4. provider text check in ('openai','azure-openai','anthropic','github-models')
5. listing_generation_model text
6. listing_refinement_model text
7. social_generation_model text
8. brochure_generation_model text
9. managed_bundle text null
10. fair_use_limit integer null
11. warning_threshold integer default 80
12. api_key_encrypted text null
13. api_key_last4 text null
14. key_status text check in ('unknown','valid','invalid') default 'unknown'
15. updated_by uuid null
16. created_at timestamptz default now()
17. updated_at timestamptz default now()

Indexes:

1. unique(client_id)
2. idx_client_ai_settings_provider

## 5.2 Tabel: ai_usage_events

Kolommen:

1. id uuid pk
2. client_id uuid fk
3. tool_name text
4. provider text
5. model text
6. mode text
7. input_tokens integer null
8. output_tokens integer null
9. estimated_cost numeric(10,4) null
10. request_status text check in ('success','error')
11. created_at timestamptz default now()

Indexes:

1. idx_ai_usage_events_client_created
2. idx_ai_usage_events_tool

---

## 6. Security en compliance

1. API keys nooit client-side renderen.
2. API keys encrypted opslaan (server-side encryptie util).
3. Logs maskeren: nooit volledige key tonen.
4. Cache-Control no-store op instellingen en usage endpoints.
5. Alleen admin en eigenaar mogen AI instellingen wijzigen.
6. Audit logging bij wijziging van modus/provider/model/key.

---

## 7. API ontwerp

## 7.1 Admin instellingen

1. GET /api/admin/clients/[id]/ai-settings
- Return huidige AI settings (zonder volledige key)

2. POST /api/admin/clients/[id]/ai-settings
- Upsert settings
- Valideer mode/provider/model combinaties

3. POST /api/admin/clients/[id]/ai-settings/test-key
- Test providerconnectie
- Return valid/invalid + foutmelding

## 7.2 Usage

1. GET /api/admin/clients/[id]/ai-usage?period=month
- Return usage en kostenindicatie

2. Interne helper: recordAiUsage(...)
- Aangeroepen na elke AI request

## 7.3 Tool routes

Bestaande AI routes gebruiken centrale resolver:

- resolveAiClient(clientId) -> { mode, provider, model, keySource }

Logica:

1. byok: gebruik client key
2. managed: gebruik platform key
3. hybrid: default platform key, maar overschrijfbaar per use-case

---

## 8. Validaties

1. byok zonder key = fout.
2. managed zonder bundle = fout.
3. unsupported model voor provider = fout.
4. warning_threshold alleen 50-99.
5. fair_use_limit minimaal 1.

---

## 9. Pricing logica (functioneel)

## 9.1 BYOK

1. Klant betaalt AI provider direct.
2. Portal factureert alleen platform fee.

Prijsvoorbeeld:

- Platform fee: vast per maand (bijv. 79-149)

## 9.2 Managed

1. Klant betaalt vast maandbedrag + fair use.
2. Overschrijding als add-on.

Voorbeeldbundels:

1. Starter: tot 200 teksten p/m
2. Growth: tot 600 teksten p/m
3. Pro: tot 1500 teksten p/m

## 9.3 Hybrid

1. Start met managed voor snelheid.
2. Switch naar byok wanneer klant eigen billing wil.

---

## 10. UX copy (korte tekst in portal)

Tekst bij moduskeuze:

- BYOK: Gebruik je eigen AI sleutel en hou kosten bij je eigen provider.
- Managed: Laat Brand is Code AI beheer en kosten afhandelen via een vaste maandbundel.
- Hybrid: Start managed en stap later over naar je eigen sleutel.

Helpertekst:

Deze opzet is gemaakt voor flexibiliteit: je kunt per fase kiezen wat past bij je team, budget en technische voorkeur.

---

## 11. Acceptatiecriteria

1. Admin kan modus/provider/model opslaan zonder TypeScript errors.
2. BYOK key test werkt en toont status.
3. AI route gebruikt correcte provider op basis van client settings.
4. Usage events worden opgeslagen per request.
5. Dashboard toont modus + verbruik + waarschuwing.
6. Geen API key zichtbaar in frontend of logs.

---

## 12. Implementatievolgorde

1. DB migratie + types.
2. Admin API routes.
3. Admin UI tab AI Instellingen.
4. Centrale AI resolver en route refactor.
5. Usage tracking + dashboardkaart.
6. QA + test met Leunis beta account.

---

## 13. Beslispunten voor klantgesprek

1. Welke modus starten we mee (byok/managed/hybrid)?
2. Welke provider heeft voorkeur?
3. Welke maandbundel past bij verwacht volume?
4. Wanneer willen jullie naar Realworks read-only koppeling?

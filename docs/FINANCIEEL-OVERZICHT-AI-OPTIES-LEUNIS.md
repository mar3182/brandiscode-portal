# Financieel Overzicht — AI-Opties voor Leunis Makelaars
**Opgesteld door:** Brand is Code (Mary García)  
**Voor:** Arno Leunis — Leunis Makelaars, Tholen (Zeeland)  
**Datum:** 11 juli 2026  
**Status:** Interne beslisnotitie — nog niet delen met klant vóór verificatie openstaande vragen

> Alle bedragen zijn **exclusief 21% BTW**, tenzij anders vermeld.  
> Sprint 1 (€2.500 eenmalig) is reeds getekend.  
> ⚠️ Microsoft-prijzen zijn ramingen — te bevestigen via Arno of admin.microsoft.com.

---

## 1. Wat wij aanbieden — drie lagen

De kosten bestaan uit drie onafhankelijke lagen. Elke laag is een aparte keuze.

| Laag                     | Wat                                                   | Aan wie betaal je | Verplicht?                             |
| ------------------------ | ----------------------------------------------------- | ----------------- | -------------------------------------- |
| **Laag A** — Eenmalig    | Sprint 1: implementatie + training                    | Brand is Code     | ✅ Al getekend                          |
| **Laag B** — Maandelijks | Brand is Code retainer (begeleiding + portaltoegang)  | Brand is Code     | Aanbevolen, min. 3 maanden             |
| **Laag C** — Maandelijks | Microsoft Copilot-licenties (alleen bij Optie 2 of 3) | Microsoft         | Alleen als klant kiest voor M365-route |

> **Kern:** Optie 1 (portal) heeft **geen Laag C**. Opties 2 en 3 hebben Laag C bovenop de rest. De retainer (Laag B) is bij alle opties een aparte keuze.

---

## 2. De opties naast elkaar

### Optie 1 — Brand is Code Portal *(aanbevolen voor Sprint 1)*

Klant krijgt een account op portal.brandiscode.com. Woningbeschrijvingen-tool is direct beschikbaar: 4 outputformaten (Funda, brochure, Instagram, Facebook). Geen extra Microsoft-licenties nodig.

**Kosten portal per klant per maand (onze productiekosten):**

| Component                               | Geschatte kostprijs/maand |
| --------------------------------------- | ------------------------- |
| OpenAI API GPT-4o (50 beschrijvingen/m) | ≈ €0,45                   |
| Vercel + Supabase + Resend (gedeeld)    | ≈ €2–4                    |
| **Totale kostprijs**                    | **≈ €3–5/maand**          |

**Prijs aan klant:** inbegrepen in de Brand is Code retainer. Geen losse portal-fee.

**Marge:** ~99% bruto op de portaltool zelf. De retainer dekt begeleiding + infrastructuur.

---

### Optie 2 — Microsoft 365 Copilot Pro in Word *(aanvulling, niet vervanging)*

Copilot Pro is een persoonlijke add-on licentie per gebruiker (~€22/m). Werkt in Word, Outlook, Excel op de desktop. Klant voert zelf prompts in via een sjabloon dat Brand is Code aanlevert.

**Maandelijkse Microsoft-licentiekosten (Laag C):**

| Gebruikers | Per maand |  Per jaar |
| :--------: | --------: | --------: |
|     4      |    € 88,- | € 1.056,- |
|     5      |   € 110,- | € 1.320,- |
|     6      |   € 132,- | € 1.584,- |

> Deze kosten betaalt de klant **rechtstreeks aan Microsoft**, los van Brand is Code.

---

### Optie 3 — Microsoft 365 Copilot Business + Copilot Studio *(concreet voorstel — klant heeft al Business Premium)*

Leunis Makelaars heeft al **Microsoft 365 Business Premium** (€20,60/gebruiker/maand). De upgrade naar de Copilot-versie kost slechts **€7,13/gebruiker/maand extra** — bevestigd door Arno. Wat dit oplevert: Copilot in Word, Outlook, Teams, Excel en PowerPoint, automatische notulen en transcripties in Teams-vergaderingen, Microsoft Designer (social media + AI-afbeeldingen genereren), toegang tot de beste AI-modellen via één interface, én Copilot Studio voor het bouwen van een eigen Realworks-gekoppelde agent. Microsoft beheert de databeveiliging volledig — EU-datacenter, GDPR-compliant. Brand is Code hoeft geen persoonsgegevens van Leunis-klanten te verwerken.

**Extra maandelijkse kosten t.o.v. huidige abonnement (Laag C — alleen het verschil):**

| Gebruikers | Extra per maand | Extra per jaar |
| :--------: | --------------: | -------------: |
|     4      |         € 28,52 |       € 342,24 |
|     5      |         € 35,65 |       € 427,80 |
|     6      |         € 42,78 |       € 513,36 |

> Klant betaalt dit rechtstreeks aan Microsoft als upgrade op het huidige abonnement.  
> Copilot Studio: 25 berichten/maand per tenant inbegrepen. Voor een productie-agent zijn aanvullende credits nodig (in te schatten na de demo).

---

### Optie 4 — Realworks API-koppeling *(Sprint 2 voorstel)*

Realworks is het CRM/beheersysteem van Leunis Makelaars. Via de Realworks API kunnen woninggegevens automatisch worden uitgelezen en doorgestuurd naar ons portal → GPT-4o genereert direct de teksten → geen handmatige invoer meer.

**Dit is Sprint 2 materiaal.** Niet bespreken tot Sprint 1 is afgerond en het team de tool actief gebruikt.

|                                                  |                                       |
| ------------------------------------------------ | ------------------------------------- |
| Eenmalige implementatiekosten Sprint 2           | € 2.500,-                             |
| Vereiste: Arno bevestigt Realworks-gebruik       | ✅ Vraag stellen bij volgende afspraak |
| Vereiste: Realworks API-documentatie beschikbaar | ✅ Controleren                         |

---

## 3. Totaaloverzicht jaar 1 en jaar 2+ — eerlijk naast elkaar

> De retainer (Laag B) is bij alle opties een **aparte keuze**. In de tabel staat hij als aanbevolen minimum (Basis €395/m).

### 5 gebruikers · Basis-retainer (€395/m) · jaar 1

| Kostenpost                           | Optie 1 · Portal | Optie 2 · + Copilot Pro | Optie 3 · + M365 Copilot |
| ------------------------------------ | ---------------: | ----------------------: | -----------------------: |
| Sprint 1 — eenmalig (Laag A)         |        € 2.500,- |               € 2.500,- |                € 2.500,- |
| Brand is Code retainer 12m (Laag B)  |        € 4.740,- |               € 4.740,- |                € 4.740,- |
| Microsoft upgrade 12m (Laag C)       |                — |               € 1.320,- |             **€ 428,-*** |
| Copilot Studio inrichting (eenmalig) |                — |                       — |              € 380–760,- |
| **Totaal jaar 1**                    |    **€ 7.240,-** |           **€ 8.560,-** |      **€ 8.048–8.428,-** |
| **Totaal jaar 2+**                   |  **€ 4.740,-/j** |         **€ 6.060,-/j** |          **€ 5.168,-/j** |

*\* Bevestigd: upgrade Business Premium → Copilot Business = €7,13/gebruiker/maand × 5 gebruikers × 12 maanden.*

**Conclusie:** Met de bevestigde upgrade-prijs is het verschil tussen Optie 1 en Optie 3 aanzienlijk kleiner dan geraamd. Optie 1 is jaar 1 nog **€808–€1.188 goedkoper**. Jaar 2+ scheelt slechts **€428 per jaar** (€36/maand) — terwijl Optie 3 dieper integreert in de bestaande Microsoft-workflow van het team.

---

## 4. Kostenanalyse — wat is het meest kosteneffectief?

### Optie 1 is de goedkoopste keuze voor een klein team

Voor een team van 4–6 medewerkers is **Optie 1 (Brand is Code Portal)** financieel het voordeligst. Het portaltoegang is inbegrepen in de retainer die Brand is Code sowieso aanbiedt voor begeleiding. Er komen **geen extra Microsoft-licentiekosten** bij.

**Jaar-op-jaar verschil (5 gebruikers, Basis-retainer):**
- Optie 1 vs. Optie 2: **€1.320,- per jaar goedkoper**
- Optie 1 vs. Optie 3: **€1.800,- per jaar goedkoper**

### Wanneer is de duurdere optie toch de betere keuze?

**Optie 2 (Copilot Pro)** is interessant als het team al dagelijks in Word, Outlook en Excel werkt en AI *in die tools zelf* wil gebruiken — voor meer dan alleen woningbeschrijvingen. Denk aan automatisch e-mails samenvatten in Outlook of contracten opstellen in Word. Dat is een ander gebruik dan waarvoor Sprint 1 is ontworpen.

**Optie 3 (M365 Copilot Business + Copilot Studio)** is pas financieel te rechtvaardigen als het team een **gedeelde organisatie-agent** wil die via Teams beschikbaar is, gekoppeld aan SharePoint-documenten en interne kennis. Dit is een volgende groeistap — relevant als Leunis Makelaars meer processen wil automatiseren (bijv. klantcommunicatie, offertes, interne kennisbank). De meerprijs ten opzichte van Optie 1 is dan een investering in integratie, niet in de AI-kwaliteit zelf.

**Korte samenvatting:**

|                                       | Optie 1    | Optie 2                    | Optie 3                        |
| ------------------------------------- | ---------- | -------------------------- | ------------------------------ |
| Meest kosteneffectief voor klein team | ✅ Ja       | —                          | —                              |
| Werkt in bestaande Microsoft-tools    | —          | ✅ Ja                       | ✅ Ja                           |
| Schaalbaar naar meer processen        | Beperkt    | Beperkt                    | ✅ Ja                           |
| Direct beschikbaar                    | ✅ Ja       | Vereist licentie-activatie | Vereist inrichting (2–4 weken) |
| Beheerd door Brand is Code            | ✅ Volledig | Gedeeltelijk               | Gedeeltelijk                   |

---

## 5. Onverwachte kosten en risico's — geen verrassingen

### Optie 1 — Brand is Code Portal

| Potentiële extra kost             | Toelichting                                                                             |
| --------------------------------- | --------------------------------------------------------------------------------------- |
| Retainer-opzegging                | Minimale looptijd 3 maanden. Na opzegging vervalt portaltoegang.                        |
| Afhankelijkheid van Brand is Code | Tool valt weg als de samenwerking stopt. Data-export mogelijk, maar migratie kost tijd. |
| Geen Office-integratie            | Gebruikers moeten inloggen in een apart systeem. Kleine leercurve voor het team.        |
| **Risico: laag**                  | De directe kosten zijn transparant en voorspelbaar.                                     |

### Optie 2 — Microsoft Copilot Pro

| Potentiële extra kost    | Toelichting                                                                                                |
| ------------------------ | ---------------------------------------------------------------------------------------------------------- |
| Bestaand M365-abonnement | Copilot Pro vereist Microsoft 365 Personal of Business. Controleer of het huidige abonnement voldoet.      |
| Promptconsistentie       | Elke medewerker voert prompts zelf in → inconsistente output. Bijsturen kost trainingstijd.                |
| Geen centrale kennisbron | Stijlgids en richtlijnen moeten individueel worden gedeeld; geen automatische synchronisatie.              |
| Licentiebeheer           | Bij in- en uitdienst treding moeten licenties handmatig worden aan- of afgezet via Microsoft Admin Center. |
| Training (schatting)     | Halve dag teamtraining via Brand is Code: €495,- (eenmalig, los van Sprint 1).                             |
| **Risico: middel**       | Hogere beheerslast bij groei. Output-kwaliteit is afhankelijk van gebruikersvaardigheid.                   |

### Optie 3 — Microsoft 365 Copilot Business + Copilot Studio

| Potentiële extra kost                      | Toelichting                                                                                                                                                |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M365 Business-abonnement upgrade           | Als het huidige abonnement niet het juiste plan is, kost een upgrade per gebruiker extra (bijv. van Basic naar Business Standard: +€8–12/gebruiker/maand). |
| Inrichtingstijd Brand is Code              | Copilot Studio-agent bouwen en koppelen aan SharePoint: geschat 4–8 uur maatwerk (€95,-/u = €380–760,- extra). Dit is *niet* inbegrepen in Sprint 1.       |
| Beheer SharePoint-kennisbank               | Iemand intern moet documenten actueel houden in SharePoint. Tijdsinvestering: ~1 uur/maand.                                                                |
| Licentiescaling                            | Bij groei van 5 naar 8 medewerkers stijgen de licentiekosten lineair (+€90/m bij 3 extra medewerkers @ €30).                                               |
| Auto-verlenging                            | ⚠️ Microsoft-licenties verlengen automatisch. Zet auto-renew bewust aan/uit in Microsoft Admin Center.                                                      |
| Trial-licenties                            | Als er trial-licenties zijn geactiveerd: zet deze *direct* uit na de testperiode om onverwachte facturen te voorkomen.                                     |
| **Risico: hoog bij slechte voorbereiding** | Transparant mits goed beheerd, maar de meeste verborgen kosten zitten in deze optie.                                                                       |

---

## 6. Aanbeveling — wat past het beste bij Leunis Makelaars?

### ⚠️ Aanbeveling herzien (11 juli 2026): Optie 3 is de logische keuze voor dit team

**Onderbouwing:**

1. **Klant heeft al Business Premium.** De upgrade naar Copilot Business kost slechts €7,13/gebruiker/maand extra. De financiële drempel is weggevallen — dit is geen toekomststap meer.

2. **Het team werkt al volledig in Microsoft.** Word (documenten), Outlook (klantmails), Teams (overleg), en binnenkort Microsoft Designer (social media + AI-afbeeldingen). Optie 3 integreert AI direct in de tools die het team al dagelijks gebruikt — nul extra schakelen tussen applicaties.

3. **Databeveiliging volledig bij Microsoft.** Brand is Code hoeft geen persoonsgegevens van Leunis-klanten te verwerken of op te slaan. Microsoft is GDPR-compliant met EU-datacenters. Dit verlaagt het compliancerisico voor Brand is Code structureel.

4. **Meeting-transcripties en notulen.** Het team waardeert automatische verslaglegging na vergaderingen — een Copilot-functie die de portal nooit zal bieden.

5. **Realworks-integratie is haalbaar via Copilot Studio.** Via Power Automate kan een connector worden gebouwd die woningdata uit Realworks direct doorvoert naar een Copilot-agent. Dat elimineert kopiëren en plakken — het primaire pijnpunt van het team.

6. **Financieel verschil is verwaarloosbaar.** Jaar 2+ kost Optie 3 slechts €36/maand meer dan Optie 1, terwijl de functionaliteit aanzienlijk breder is.

**Rol van Brand is Code bij Optie 3:**  
Brand is Code levert de inrichting, niet het platform. Concreet: Copilot Studio-agent configureren, Word-sjablonen en prompts bouwen, Realworks-connector ontwerpen (Sprint 2), en het team trainen. De tool blijft volledig in handen van Microsoft en Leunis Makelaars.

**Sprint 1 wijzigt niet.** De training on-site gaat door zoals gepland. De woningbeschrijvingen-tool in het portal wordt als demo en referentie ingezet — en als fallback als de Copilot-setup meer tijd vraagt dan verwacht.

---

## 6.1 Twee strategische paden — integratie met Realworks

Leunis Makelaars gebruikt **Realworks** als CRM/makelaarssoftware. Dat is de sleutel: welk pad is technisch haalbaar en het minst belastend voor het team?

### Pad A — Microsoft-first met Realworks-connector *(aanbevolen)*

```
Realworks (woning invoer)
    ↓ Realworks REST API
Power Automate connector
    ↓
Copilot Studio-agent (bouwt Brand is Code)
    ↓
Woningbeschrijving direct in Word / Copilot-chat / Teams
```

**Voordelen:**
- Team blijft volledig in Realworks voor woningbeheer
- Copilot genereert beschrijvingen direct in de Microsoft-omgeving
- Geen nieuw systeem aanmelden of wachtwoord onthouden
- Microsoft beheert alle data

**Haalbaarheid:**
- ✅ Realworks API-toegang bevestigd — klant heeft aantoonbare ervaring met het verlenen van API-toegang aan externe services (bevestigd door assistent Arno, 11 juli 2026)
- Power Automate heeft een generieke HTTP-connector → koppeling bouwen ≈ 8–16 uur maatwerk (Sprint 2)
- CSV-export als tussenoplossing is niet meer nodig

**Brand is Code levert:** agent-definitie + Copilot-sjablonen + connector-bouw (Sprint 2)

---

### Pad B — Brand is Code portal + Realworks API + optionele Microsoft-koppeling

```
Realworks API → Brand is Code portal → GPT-4o → output
                                              ↓
                         Kopiëren, of: Microsoft Graph API → OneDrive / Word
```

**Voordelen:**
- Meer controle over AI-instellingen en outputkwaliteit vanuit Brand is Code
- Realworks API-koppeling is al gepland als Sprint 2
- Output kan worden teruggezet naar Realworks via API (bidirectioneel)

**Nadelen:**
- Team moet nog steeds inloggen in een apart systeem
- Microsoft Graph API-integratie is technisch complex (€1.500–2.000 extra ontwikkeling)
- Persoonsgegevens van Leunis-klanten staan buiten het Microsoft-ecosysteem → meer compliancewerk voor Brand is Code

**Conclusie Pad B:** Technisch haalbaar, maar meer werk en minder naadloos. Alleen interessant als Arno bewust kiest voor maximale onafhankelijkheid van Microsoft.

---

### Beslisboom

| Vraag                                   | Ja                                  | Nee               |
| --------------------------------------- | ----------------------------------- | ----------------- |
| Heeft Arno Realworks API-toegang?       | ✅ Bevestigd — Pad A direct haalbaar | n.v.t.            |
| Wil Arno alles binnen Microsoft houden? | Kies Optie 3 + Pad A                | Overweeg Pad B    |
| Is €7,13/maand/gebruiker acceptabel?    | Ga direct naar Optie 3              | Optie 1 als basis |

**Aanbeveling Brand is Code:** Pad A + Optie 3. Lage extra kosten, maximale integratie, Microsoft draagt de beveiligingsverantwoordelijkheid.

---

## 7. Openstaande vragen voor Arno — vóór de volgende afspraak

Onderstaande vragen moeten beantwoord zijn om een definitieve aanbeveling te kunnen doen.

> ✅ = beantwoord op 11 juli 2026 · ❓ = nog open

### Financieel & licenties

1. ✅ **Welk Microsoft 365-plan heeft Leunis Makelaars momenteel?**  
   **Beantwoord:** Microsoft 365 Business Premium — €20,60/gebruiker/maand.

2. **Hoeveel actieve gebruikers zitten er op het Microsoft 365-abonnement?**  
   *(Is dit het volledige team of ook medewerkers die geen AI nodig hebben?)*

3. ✅ **Wat betalen jullie momenteel per maand voor Microsoft 365 (totaal)?**  
   **Beantwoord:** €20,60/gebruiker/maand (Business Premium). Upgrade naar Copilot Business = €27,73/gebruiker/maand (+€7,13 delta).

4. ✅ **Heeft Arno het exacte bedrag van Microsoft 365 Copilot Business kunnen bevestigen?**  
   **Beantwoord:** Ja — €27,73/gebruiker/maand (upgrade van Business Premium). Delta = €7,13/gebruiker/maand.

5. **Is er budget gereserveerd voor software-abonnementen buiten de Sprint 1-investering?**  
   *(Relevant voor de keuze tussen optie 1 (geen extra licenties) en optie 2/3 (maandelijkse Microsoft-kosten))*

### Werkwijze & prioriteit

6. ✅ **Werkt het team primair in Word, Outlook en Teams — of ook in andere tools?**  
   **Beantwoord:** Ja — het team werkt dagelijks in Word (documenten), Outlook (klantmails), Teams (overleg/notulen). Ook social media en afbeeldingen zijn een relevant gebruik (→ Microsoft Designer). Realworks is het CRM.

7. **Hoe wordt nu een woningbeschrijving gemaakt — en hoeveel tijd kost dat per woning gemiddeld?**  
   *(Nulmeting voor ROI-berekening na implementatie)*

8. ✅ **Wie in het team is de meest digitaalvaardige medewerker?**  
   **Beantwoord:** De assistent van Arno — zij wordt de interne ambassadeur en eerste aanspreekpunt voor het AI-tool binnen het team.

### Strategisch

9. ✅ **Ziet Arno AI alleen voor woningbeschrijvingen, of zijn er andere processen in beeld?**  
   **Beantwoord:** Bredere scope bevestigd: notulen, social media, documenten opstellen, afbeeldingen genereren.

10. ✅ **Wat is voor Arno de belangrijkste reden om voor AI te kiezen — kostenbesparing, tijdwinst of kwaliteitsverbetering?**  
    **Beantwoord:** Tijdsbesparing — met als doel ruimte te creëren voor nieuwe inkomstenbronnen. Arno denkt aan uitbreiding zoals een nieuwsbrief over de branche of vergelijkbare content-gedreven activiteiten. AI moet tijd vrijmaken, niet alleen bestaand werk versnellen.

### ❗ Nieuw — Realworks & licenties (kritiek voor Sprint 2)

11. ✅ **Heeft Leunis Makelaars een Realworks-abonnement met API-toegang?**  
    **Beantwoord (via assistent Arno):** Ja — ze zijn gewend API-toegang te verlenen aan externe services. Realworks API-koppeling is direct haalbaar zonder extra drempel.

12. **Hoeveel medewerkers krijgen de Copilot Business-licentie?**  
    *(Bepaalt de exacte maandelijkse meerkosten — 4, 5 of 6 personen?)*

13. **Wil Arno Optie 2 (Copilot Pro) overslaan en direct naar Optie 3 gaan?**  
    *(Copilot Pro is een persoonlijke licentie voor 1 gebruiker, minder geschikt voor een team. Optie 3 is de organisatie-variant. Arno heeft dit bevestigd als voorkeur \u2014 alleen formeel vaststellen.)*

---

## Bijlage — Overzicht retainerpakketten Brand is Code

| Pakket      | Inhoud                                              |     Maand |       Jaar |
| ----------- | --------------------------------------------------- | --------: | ---------: |
| **Basis**   | Check-in 1u · Support · Tool-updates                |   € 395,- |  € 4.740,- |
| **Plus**    | + Content-ondersteuning · Rapportage                |   € 695,- |  € 8.340,- |
| **Premium** | + Proactief · Onbeperkt support · Kwartaalstrategie | € 1.150,- | € 13.800,- |

*Minimale looptijd: 3 maanden. Portaltoegang inbegrepen bij alle pakketten.*

---

*Brand is Code · Mary García · brandiscode.com · KvK 93163697 · BTW NL866222786B01*  
*Dit document is opgesteld als beslisnotitie en bevat ramingen. Microsoft-prijzen zijn onder voorbehoud van bevestiging via admin.microsoft.com of de Microsoft-reseller van de klant.*

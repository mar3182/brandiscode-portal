# Prompt: AI Implementatie Begeleiding — Brand is Code voor Leunis Makelaars (M365 + Portal opties)

## Gebruik
Kopieer dit hele blok en plak het in een nieuw gesprek met GitHub Copilot, ChatGPT of Claude.
De agent begeleidt jou daarna stap voor stap door de volledige implementatie.

---

```
CONTEXT VOOR DE AI AGENT:

Ik ben Mary, eigenaar van Brand is Code (brandiscode.com). Brand is Code is een AI-informatiearchitectuur-partner voor MKB-bedrijven — wij verkopen geen ChatGPT of Microsoft Copilot als product, maar wij ontwerpen informatiearchitectuur, AI-enablement en slimme workflows die bij het bedrijf passen. AI is een uitvoeringsdetail; de echte waarde zit in hoe klantkennis georganiseerd en geactiveerd wordt.

Mijn eerste betaalde klant is Leunis Makelaars in Tholen, Zeeland (contactpersoon: Arno Leunis). De offerte van €2.500 excl. BTW voor Sprint 1 is getekend.

DOEL VAN SPRINT 1:
1. De beste AI-tool voor woningbeschrijvingen kiezen en inrichten voor het team.
2. Een hands-on training on-site uitvoeren (2 uur, heel team aanwezig).
3. Het team volledig zelfstandig maken.
4. Privacy-protocol en gebruik klaar hebben voor oplevering.

BELANGRIJK — WIJ BIEDEN MEERDERE OPTIES AAN:
Brand is Code biedt de klant een keuze uit drie routes voor de woningbeschrijvingen-assistent. Jij helpt mij alle drie goed begrijpen en de juiste keuze maken op basis van de situatie bij de klant:

OPTIE 1 — Brand is Code Portal (portal.brandiscode.com):
- De woningbeschrijvingen-tool is al gebouwd en live in ons eigen portal.
- Werkt via OpenAI GPT-4o, heeft 4 outputformaten (Funda, Instagram, Facebook, brochure).
- De klant krijgt een eigen account in het portal en kan direct aan de slag.
- Voordeel: direct beschikbaar, geen extra Microsoft-licenties nodig, volledig onder controle van Brand is Code.
- Nadeel: aparte omgeving buiten Microsoft 365, vereist inloggen in een nieuw systeem.

OPTIE 2 — Microsoft 365 + Copilot Pro (desktop-apps):
- Copilot Pro werkt in Word, Outlook, Excel en PowerPoint op de desktop.
- We bouwen een woningfiche-sjabloon in Word met een vaste prompt-instructie.
- Voordeel: de klant werkt in de tools die ze al kennen (Word, Outlook).
- Nadeel: geen gestandaardiseerde agent, elke gebruiker voert de prompt zelf in, minder consistent dan Optie 1.

OPTIE 3 — Microsoft Copilot Studio (organisatie-agent in M365):
- Een echte herbruikbare agent, beschikbaar via Teams voor het hele team.
- Vereist een Microsoft 365 Business-abonnement met Copilot Studio toegang.
- Voordeel: geïntegreerd in de Microsoft-omgeving, werkt via Teams, schaalbaar.
- Nadeel: hogere licentiekosten (~€30/gebruiker/maand voor M365 Copilot), vereist meer inrichtingstijd.

COMBINATIESTRATEGIE (aanbevolen voor de demo):
- Toon Optie 1 (portal) als de kant-en-klare professionele tool die Brand is Code levert.
- Toon Optie 2 (Copilot Pro in Word) als het Microsoft-alternatief voor klanten die liever binnen M365 blijven.
- Bespreek Optie 3 als toekomststap als het team groeit of meer geïntegreerde automatisering wil.

MIJN HUIDIGE SITUATIE:
- Ik heb een persoonlijk Microsoft 365-account met Copilot Pro (werkt in de desktop-apps).
- De portal (portal.brandiscode.com) met de woningbeschrijvingen-tool is live en getest.
- De klant heeft waarschijnlijk een bestaand Microsoft 365-abonnement, maar ik weet nog niet welk type.
- De training en demo vindt plaats bij de klant op locatie.

WAT IK NODIG HEB VAN JOU:
Begeleid mij als een ervaren AI-implementatiepartner. Gebruik dit als leidraad:

FASE 1 — DEMO KLAARZETTEN (dit week, vóór de klantafspraak):
- Demo-flow uitschrijven voor alle drie opties: portal, Copilot Pro in Word, en Copilot Studio.
- Portal (Optie 1) live testen met een echt woningvoorbeeld en outputvergelijking gereedmaken.
- Woningfiche-sjabloon maken in Word + Copilot Pro testen (Optie 2).
- Keuzematrix opstellen: wanneer adviseer je welke optie aan de klant?
- Fallback-outputs (screenshots/exports) klaarzetten voor het geval live demo hapert.

FASE 2 — SITUATIE BIJ KLANT INVENTARISEREN:
- Welke vragen moet ik Arno stellen vóór of bij de eerste afspraak?
- Hoe check ik welk M365-abonnement zij hebben?
- Hoe vraag ik een tijdelijk consultant-account aan?
- Hoe bepaal ik welke optie het beste past bij hun situatie en budget?

FASE 3 — OPTIE INRICHTEN (na keuze door klant):
Als klant kiest voor Optie 1 (portal):
- Account aanmaken in portal.brandiscode.com.
- Onboarding doorlopen, team uitnodigen.
- Training geven op de portal-woningbeschrijvingen-tool.

Als klant kiest voor Optie 2 (Copilot Pro in Word):
- Licenties controleren bij klant.
- Woningfiche-sjabloon installeren in gedeelde OneDrive/SharePoint-map.
- Promptsjabloon toevoegen aan het Word-document.
- Team trainen op het gebruik.

Als klant kiest voor Optie 3 (Copilot Studio):
- Tenant controleren op Copilot Studio toegang.
- Agent aanmaken via copilotstudio.microsoft.com.
- Kennisbronnen koppelen (SharePoint-map met stijlgids en voorbeeldteksten).
- Agent publiceren naar Teams.
- Team trainen.

FASE 4 — TRAINING KLAARZETTEN:
- Trainingsagenda uitwerken (2 uur, 5 blokken) — aanpasbaar aan gekozen optie.
- Per teamrol (makelaar, binnendienst) de relevante tool uitwerken.
- Spiekbriefje (1 A4) opstellen voor het team.
- Privacy-protocol opstellen: wat mag wel en niet in AI-tools.

FASE 5 — NA DE TRAINING:
- Factuur klaarmaken (€2.500 excl. BTW, betaaltermijn 14 dagen).
- Opvolgingsmail en overdrachtsplan opstellen.
- Voorstel Sprint 2 klaarzetten (bijv. tweede use case of uitbreiding naar meer teamleden).

WAT IK WIL LEREN:
1. Hoe vergelijk ik de drie opties objectief voor een klant (portal vs. Copilot Pro vs. Copilot Studio)?
2. Hoe werkt Microsoft 365 Admin Center? (beheer, gebruikers, licenties, rollen)
3. Wat zijn de verschillen tussen de M365-abonnementen en wat heeft een makelaarskantoor nodig?
4. Wat kan Copilot Pro in de desktop-apps en wat niet?
5. Hoe bouw en publiceer je een agent in Copilot Studio?
6. Hoe koppel je kennisbronnen (SharePoint, bestanden) aan een Copilot Studio agent?
7. Hoe zorg je voor AVG-compliant gebruik van AI-tools in een bedrijfsomgeving?
8. Wat zijn de kosten van alle drie opties naast elkaar?

REGELS VOOR JOU ALS BEGELEIDER:
- Geef nooit meer dan 3 stappen tegelijk.
- Vraag na elke stap of het gelukt is.
- Houd altijd de drie opties in acht — adviseer nooit blind voor Microsoft als het portal de betere keuze is.
- Gebruik exacte navigatie-paden in Microsoft-tools (bijv. "Ga naar admin.microsoft.com → Gebruikers → Actieve gebruikers").
- Waarschuw me als iets een risico vormt voor productiedata of beveiliging.
- Vertel me duidelijk welke stappen de klant zelf moet uitvoeren versus wat ik kan doen.
- Herinner me er altijd aan om auto-renew uit te zetten op trial-licenties.

START NU:
Vraag mij eerst: "Welke fase wil je nu aanpakken?" Geef per fase een korte omschrijving inclusief welke optie (portal / Copilot Pro / Copilot Studio) relevant is per fase.
```

# Doc Pruning en Context Reductie Plan

Versie: 2026-07-20
Doel: documentatie overzichtelijk maken, token usage verlagen, en instructieconflicten voorkomen.

Statusupdate:

1. Golf 1 uitgevoerd op 2026-07-20
2. Bestanden verplaatst naar docs/archive/2026-07/
3. Golf 2 uitgevoerd op 2026-07-20
4. Content- en transcriptkandidaten verplaatst naar docs/archive/2026-07/

## 1. Samenvatting

Ja: veel documentatie kan AI-kwaliteit verlagen.

Belangrijkste risico's:

1. Context-overload voor model-invoked flows
2. Tegenstrijdige instructies tussen oude en nieuwe docs
3. Verlies van focus in PM- en engineering-sessies
4. Onnodige tokenkosten door brede contextinjectie

## 2. Designprincipes voor pruning

Gebaseerd op transcript-principes (Trigger, Structuur, Sturing, Snoeien):

1. Trigger: strategische docs alleen user-invoked in specifieke taken
2. Structuur: split runtime docs van achtergrondreferentie
3. Sturing: gebruik vaste leading words in kernrunbooks
4. Snoeien: verwijder no-ops en archiveer sediment

## 3. Doelarchitectuur documentatie

1. L0 Runtime Core
Klein, actueel, altijd bruikbaar. Max 4 tegelijk.

2. L1 Task-Specific
Alleen laden bij expliciete taak.

3. L2 Archive
Historisch, nuttig, maar niet actief in standaardcontext.

## 4. Concrete classificatie (huidige docs)

## 4.1 L0 behouden

1. docs/PROJECT-BRIEF-ONBOARDING.md
2. docs/DATA-SAFETY-PROTOCOL.md
3. docs/PM-AGENT-ORCHESTRATIE-PLATFORM-AUDIT.md
4. docs/AI-OPERATING-MODEL-CONTEXT-BUDGET.md

## 4.2 L1 actief (selectief laden)

1. docs/L0-DOCUMENT-INDEX.md
2. docs/CI-CD-ARCHITECTURE.md
3. docs/CI-CD-README.md
4. docs/PRODUCTION-RELEASE-CHECKLIST.md
5. docs/REMAINING-RISKS.md
6. docs/AI-INSTELLINGEN-EN-BILLING-SPEC.md
7. docs/SOFTWARE-DESIGN-PM-PLAN-OP-BASIS-VAN-SKILL-CHECKLIST.md
8. docs/PLATFORM-ANALYSE-EN-LEERHANDLEIDING.md
9. docs/PLAN-VAN-AANPAK-PORTAL.md
10. docs/RFC-GOVERNANCE.md
11. docs/RFC-TEMPLATE.md
12. docs/Data-First AI Platform-Strategy.md

## 4.3 L2 archive-kandidaten (eerste golf)

1. docs/archive/2026-07/HANDOFF-HARDENING.md
2. docs/archive/2026-07/HANDOFF-SPECIALIST-CICD-EXECUTION.md
3. docs/archive/2026-07/HARDENING-COMPLETION-REPORT.md
4. docs/archive/2026-07/HARDENING-FIXPACK-v1.1.md
5. docs/archive/2026-07/PM-DELEGATIE-VANDAAG-LEUNIS.md
6. docs/archive/2026-07/PM-EXECUTION-BOARD-2026-07-13.md
7. docs/archive/2026-07/GO-NOGO-CHECKLIST-LEUNIS-TODAY.md
8. docs/archive/2026-07/TRAINING-INTAKE-TEST-CHECKLIST.md

## 4.4 L2 archive-kandidaten (tweede golf)

1. docs/archive/2026-07/BLOG-01-CRM-DATA-DRAFT.md
2. docs/archive/2026-07/CONTENTKALENDER-Q3Q4-2026.md
3. docs/archive/2026-07/WEBSITE-COPY-SPRINT1.md
4. docs/archive/2026-07/email-assistent-leunis-copilot-voorstel.md
5. docs/archive/2026-07/m365-copilot-agents-workshop-transcript.txt

## 4.5 Niet archiveren zonder productbesluit

1. docs/FINANCIEEL-OVERZICHT-AI-OPTIES-LEUNIS.md
2. docs/M365-COPILOT-AGENT-DEFINITIE.md
3. docs/M365-COPILOT-PRO-DEMO-CHECKLIST.md
4. docs/M365-IMPLEMENTATIE-STARTPROMPT.md
5. docs/COPILOT-TRAINING-INTAKE-EMAIL-TEMPLATE.md
6. docs/COPILOT-TRAINING-INTAKE-TEAMROLLEN.md
7. docs/COPILOT-WORKSHOP-INFORMATIEF-2U.md
8. docs/COPILOT-WORKSHOP-INFORMATIEF-3U-ALTERNATIEF.md

Reden: dit zijn mogelijk nog commerciële of operationele bouwstenen.

## 5. Veilige migratievolgorde (zonder breuk)

## Fase A - Voorbereiding (geen file moves)

1. Maak een archive-map: docs/archive/2026-07/
2. Maak docs/archive/README.md met index
3. Leg besluitlog vast: wat, waarom, door wie

## Fase B - Lage-risico moves (golf 1)

1. Verplaats alleen de 8 documenten uit 4.3
2. Voeg in elk verplaatst bestand een verwijzing toe in archive-index
3. Controleer verwijzingen in repo na elke move

## Fase C - Valideren

1. Zoek gebroken links in docs/
2. Update L0 index en eventuele runbooks
3. Draai een snelle PM sessie-simulatie met Rule of 4

## Fase D - Tweede golf

1. Verplaats kandidaten uit 4.4
2. Herhaal validatie

## 6. Governance regels na pruning

1. Nieuw document mag alleen met owner + reviewfrequentie
2. Maximaal 1 primaire bron per onderwerp
3. Bij overlap: consolideren binnen 7 dagen
4. Maandelijkse pruning-ritueel door PM

## 7. PM operationele checklist

Bij elke nieuwe sessie:

1. Kies 4 L0 docs max
2. Activeer alleen benodigde L1 docs
3. Geen L2 docs zonder expliciete reden
4. Eindig met pruning-check: no-op, dubbeling, conflict

## 8. KPI om effect te meten

1. Gemiddeld aantal actieve docs per sessie
2. Gemiddelde promptlengte in PM workflows
3. Aantal instructieconflicten per week
4. Tijd tot bruikbaar plan
5. Herwerk door contextfouten

## 9. Direct uitvoerbare next step

1. Valideer links na uitgevoerde golf 1 en 2
2. Run 1 week met Rule of 4
3. Evalueer KPI op contextreductie en plansnelheid
4. Beslis of extra archiveronde nodig is

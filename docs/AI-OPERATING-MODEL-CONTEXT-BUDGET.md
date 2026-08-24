# AI Operating Model - Context Budget

Versie: 2026-07-20
Doel: maximale AI-kwaliteit met minimale context-overload

## 1. Kernprobleem

Te veel documentatie, te veel skills en te veel model-invoked agentbeschrijvingen veroorzaken:

1. Hogere tokenkosten
2. Slechtere focus van agents
3. Meer tegenstrijdige instructies
4. Meer ruis in plannen en output

## 2. Werkprincipe

Niet meer context, maar betere context.

1. Klein, duidelijk, taakgericht
2. Alleen relevante documenten per fase
3. Progressive disclosure: pas extra context laden als nodig

## 3. Documentatielagen

Gebruik 3 lagen:

1. L0 Runtime Docs
Korte documenten die bij vrijwel elke sessie nodig zijn.
Doelgrootte: 80 tot 220 regels.

2. L1 Playbooks
Uitgebreide handleidingen voor specifieke flows.
Alleen laden bij relevante taken.

3. L2 Archive
Historie, oude analyses, experimenten, ruwe notities.
Nooit standaard in actieve context.

## 4. Documenten die standaard in L0 horen

1. docs/PROJECT-BRIEF-ONBOARDING.md
2. docs/DATA-SAFETY-PROTOCOL.md
3. docs/PM-AGENT-ORCHESTRATIE-PLATFORM-AUDIT.md
4. docs/AI-OPERATING-MODEL-CONTEXT-BUDGET.md

## 5. Skill- en agentbeleid

## 5.1 Triggerbeleid

1. Strategische skills en agents: user-invoked
2. Lage-risico routines: model-invoked
3. Bij twijfel: user-invoked

Waarom:

1. Minder onvoorspelbaarheid
2. Lagere context load
3. Betere PM-controle

## 5.2 Structuurbeleid

Elke skill/agentinstructie bevat:

1. Stappen
2. Referentie

Regel:

1. Branch-specifieke referentie staat buiten de hoofdinstructie
2. Hoofdinstructie blijft kort

## 5.3 Sturingbeleid

Gebruik vaste leading words:

1. Vertical slice
2. Data-first
3. Human-in-the-loop
4. Label before launch
5. Verify before merge

## 5.4 Pruningbeleid

Elke 2 weken:

1. Dubbele instructies verwijderen
2. No-op regels verwijderen
3. Oude of irrelevante secties archiveren
4. Grote docs opsplitsen in L0 en L1

## 6. Core loop voor engineering agents

Gebruik altijd deze volgorde:

1. Explore
2. Plan
3. Implement
4. Verify
5. Commit

Extra regels:

1. Minimaal 80% denkinspanning in planfase bij grote features
2. Verify bevat tests en functionele checks
3. Kleine commits met duidelijke intentie

## 7. Tokenbudget regels

1. Max 4 L0 documenten actief per sessie
2. Geen brede full-repo contextinjectie zonder doel
3. Gebruik subagents voor verkenning in plaats van alles in 1 context
4. Houd agentdefinities kort en zonder overbodige voorbeelden

## 8. PM governance checklist per initiatief

1. Is het probleem expliciet geformuleerd?
2. Is de scope beperkt tot een vertical slice?
3. Welke docs zijn L0 voor deze taak?
4. Welke docs zijn expliciet uitgesloten?
5. Welke agent is owner?
6. Welke verify stap bewijst kwaliteit?

## 9. Definition of Done voor documentatie

Documentatie is pas goed als:

1. Een nieuwe engineer binnen 15 minuten de kern begrijpt
2. Een agent de taak kan uitvoeren met maximaal 4 kernbronnen
3. Er geen tegenstrijdige regels in L0 zitten
4. De doc duidelijke eigenaar en updatefrequentie heeft

## 10. Directe acties voor dit project

1. L0 index zichtbaar maken in PM runbook
2. Agents instructeren op contextbudget en leading words
3. Maandelijkse doc-pruning afspraak inbouwen
4. Demo/Pilot/Productie labels afdwingen in admin en docs

# PM Agent Orchestratie - Platform Audit en Launch

Datum: 2026-07-20

## Doel

Deze runbook helpt de PM om gericht opdrachten uit te zetten naar agents in de juiste volgorde.

## Fase -1 - Context Budget Gate

Doel:

Voorkom context-overload voordat werk start.

Verplichte checks:

1. Maximaal 4 L0-documenten in actieve context
2. Alleen user-invoked voor strategische agents
3. Taak geformuleerd als verticale slice
4. Verify-stap vooraf gedefinieerd

Referentie:

docs/AI-OPERATING-MODEL-CONTEXT-BUDGET.md

## Fase 0 - Software design baseline

Agent: PM (met handmatige review)

Doel:

Leg eerst de 4 checklist-assen vast voor elke initiative: Trigger, Structuur, Sturing, Snoeien.

Acceptatiecriteria:

1. Triggerkeuze vastgelegd (user-invoked of model-invoked)
2. Proces opgesplitst in stappen en referentie
3. Leidende woorden bepaald
4. Pruning-check uitgevoerd op no-ops en doublures

Extra:

1. Leading words vastgesteld en hergebruikt in alle prompts
2. Documenten buiten scope expliciet uitgesloten

Referentie:

docs/SOFTWARE-DESIGN-PM-PLAN-OP-BASIS-VAN-SKILL-CHECKLIST.md

## Fase 1 - Functionele helderheid

Agent: Platform Audit & Signal Clarity

Opdrachtprompt:

Audit alle admin modules en API-koppelingen op status: Productie, Pilot, Demo of Afbouwen. Controleer of elke UI-actie echte backend persistency heeft en duidelijke feedback geeft aan gebruiker. Lever een tabel met feature, status, risico, en opschoonadvies.

Acceptatiecriteria:

1. Volledige featuretabel
2. Top 10 ruisbronnen
3. Concrete quick wins (< 1 dag)

## Fase 2 - Launchstrategie

Agent: Business Intelligence Launch Strategist

Opdrachtprompt:

Ontwerp een 30-dagen launchstrategie met 3 experimenten voor portal adoptie. Gebruik A/B-test aanpak, KPI's, en duidelijke Go/No-Go criteria. Focus op eenvoud: eerst vertrouwen, daarna schaal.

Acceptatiecriteria:

1. Maximaal 3 experimenten
2. KPI model met definities
3. Beslisdocument per week

## Fase 3 - AI kwaliteitsborging

Agent: Editorial Governance & AI Quality

Opdrachtprompt:

Ontwerp een content-governance model waarin AI nooit automatisch publiceert. Definieer redactieflow, rollen, kwaliteitschecklist en escalatie bij twijfelachtige output.

Acceptatiecriteria:

1. Human-in-the-loop proces
2. Publicatiechecklist
3. RACI per contenttype

## Fase 4 - Implementatie

Agent: Frontend Developer

Opdrachtprompt:

Voeg zichtbare statuslabels toe in admin (Productie/Pilot/Demo), verberg demo-tools uit hoofdnavigatie en verbeter UX-teksten zodat gebruikers direct weten wat echt live werkt.

Agent: Backend Specialist

Opdrachtprompt:

Bouw backend support voor feature status metadata, audit logging en betrouwbare response-statussen zodat frontend labels data-gedreven zijn.

## Fase 5 - PM Review Gate

PM controleert:

1. Is elk onderdeel gelabeld?
2. Is de contentstrategie versmald naar 1 primaire lijn?
3. Is AI-publicatiebeleid technisch en procesmatig geborgd?
4. Zijn KPI metingen actief?

## Output die PM wekelijks bijhoudt

1. Feature Clarity Score
2. Onboarding Completion Rate
3. AI Quality Acceptance Rate
4. Aantal actieve ruispunten
5. Beslislog van wijzigingen

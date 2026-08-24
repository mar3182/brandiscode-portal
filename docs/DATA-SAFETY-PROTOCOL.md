# Data Safety Protocol (Verplicht)
**Versie:** 1.0  
**Datum:** 2026-07-08  
**Status:** Actief — verplicht voor alle agents

---

## Doel

Dataverlies voorkomen en herstelbaarheid borgen bij elke wijziging in het portal.

Dit protocol is verplicht voor:

1. PM-agent
2. Backend Specialist
3. Frontend Developer
4. Alle sub-agents die code, SQL of configuratie aanpassen

---

## Gate 1 — Voor wijziging (impactcheck)

Controleer en documenteer:

1. Welke tabellen/records worden geraakt?
2. Is er risico op delete/overwrite/constraint-fouten?
3. Is deze wijziging tenant-safe (`client_id`/RLS)?
4. Is er een rollback-pad?

Als één antwoord onbekend is: niet doorzetten naar productie.

---

## Gate 2 — Tijdens wijziging (safe implementation)

Verplichte regels:

1. SQL migraties zijn idempotent (`IF NOT EXISTS`, veilige checks).
2. Geen hardcoded klant-IDs in seeds; altijd dynamische lookup.
3. Geen destructieve SQL (`DROP`, bulk `DELETE`) zonder expliciete PM-goedkeuring.
4. Geen plaintext secrets/keys in code, logs of responses.
5. API routes met gevoelige data zetten `Cache-Control: no-store`.

---

## Gate 3 — Voor release (validatie)

Verplichte checks:

1. Typecheck/build geslaagd.
2. Verificatiequeries voor data-integriteit uitgevoerd of meegeleverd.
3. RLS/policies gecontroleerd voor tenant-isolatie.
4. Back-up/restore punt bevestigd voor wijzigingen met medium/high impact.
5. Handmatige stappen zijn expliciet gedocumenteerd.

---

## Gate 4 — Na release (monitoring)

1. Controle op foutlogs in eerste 30 minuten.
2. Controle op correcte dataweergave in admin + klantcontext.
3. Incidentpad klaar (wie doet wat bij fouten).

---

## Standaard verificatiequeries (template)

```sql
-- 1) Bestaat verwacht record?
SELECT id FROM clients WHERE company = 'Leunis Makelaars';

-- 2) Zijn teamrecords correct gekoppeld?
SELECT cu.name, cu.email, cu.role
FROM client_users cu
JOIN clients c ON c.id = cu.client_id
WHERE c.company = 'Leunis Makelaars'
ORDER BY cu.name;

-- 3) Zijn er orphan records?
SELECT cu.*
FROM client_users cu
LEFT JOIN clients c ON c.id = cu.client_id
WHERE c.id IS NULL;
```

---

## Rollback-minimum (template)

Bij elke datawijziging documenteer minimaal:

1. Welke wijziging is gedaan.
2. Hoe je veilig teruggaat.
3. Welke data mogelijk geraakt is.
4. Welke query gebruikt wordt om herstel te valideren.

---

## Verboden zonder expliciete PM-goedkeuring

1. Bulk deletes op productie.
2. Datamigraties die historiek overschrijven zonder back-up.
3. Schemawijzigingen die bestaande reads/writes direct breken.

---

## Definition of Done (datawijziging)

Een datawijziging is pas klaar als:

1. Gate 1 t/m 4 zijn doorlopen.
2. Verificatie + rollback beschreven zijn.
3. PM akkoord heeft gegeven op release-gereed status.

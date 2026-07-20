# Training Intake - Basis Test Checklist

## Klantflow

1. Login als klant zonder onboarding metadata en controleer redirect naar /dashboard/onboarding.
2. Vul bedrijfsgegevens in en ga naar stap Training Intake.
3. Sla concept op in stap 2 en herlaad de pagina; data moet behouden blijven.
4. Voeg minimaal 1 teamlid toe met alle verplichte velden en sla opnieuw concept op.
5. Controleer samenvatting: ontbrekende velden worden getoond zolang intake incompleet is.
6. Dien intake definitief in en controleer succespagina + redirect naar dashboard.

## Adminflow

1. Open /admin/training-intakes en controleer dat intake zichtbaar is met status submitted.
2. Controleer indicator Ready for training en lijst met ontbrekende velden.
3. Voeg trainernotitie toe en wijzig status naar reviewed/planned.
4. Voeg trainingssessie toe met starttijd, eindtijd en duur.
5. Exporteer CSV en verifieer dat alle intake- en teamlidvelden aanwezig zijn.

## Security

1. Controleer dat klant geen data van andere client_id kan lezen via /api/training-intake.
2. Controleer dat admin routes zonder admin account 401 geven.
3. Controleer response headers van intake endpoints: Cache-Control no-store.

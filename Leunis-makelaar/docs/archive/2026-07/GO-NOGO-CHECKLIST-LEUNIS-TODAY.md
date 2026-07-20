# GO/NO-GO Checklist — Leunis Vandaag

Gebruik: afvinken vlak voor finale mailverzending.

## Security (hard blocker)
- [ ] Oude Google key ongeldig gemaakt
- [ ] Nieuwe Google key werkt in productie
- [ ] OpenAI key geroteerd en werkend
- [ ] Resend key geroteerd en werkend
- [ ] Supabase service role key geroteerd en werkend
- [ ] GitHub token geroteerd (indien gebruikt in pipeline)

## Config & omgeving
- [ ] Productie env vars compleet
- [ ] Staging/prod parity gecontroleerd
- [ ] Geen onverwachte config drift

## Functioneel
- [ ] Intake-link opent correct
- [ ] Intake opslaan werkt
- [ ] Admin ziet intakegegevens correct
- [ ] Niet-trainingsklant ziet geen verplichte training-flow
- [ ] Training blijft standaard uit zonder expliciete activatie

## UX/kwaliteit
- [ ] Teksten zijn duidelijk: algemene intake versus training-intake
- [ ] Responsive check op mobiel/tablet/desktop geslaagd
- [ ] Geen kritieke regressies in basisnavigatie/login

## Administratie
- [ ] Minimale klantgegevens in portal-record compleet
- [ ] Interne voorwaarden/facturatiecheck gedaan
- [ ] Audit trail ingevuld

## Monitoring klaar
- [ ] 30-min post-send monitoringplan staat klaar
- [ ] Rollback-pad naar laatste stabiele release bevestigd

## Eindoordeel
- GO alleen als alle hard blockers en functionele checks groen zijn.
- NO-GO bij 1 of meer security blockers of falende intakeflow.

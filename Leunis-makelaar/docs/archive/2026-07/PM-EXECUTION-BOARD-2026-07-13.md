# PM Execution Board — Vandaag (Leunis)

Datum: 2026-07-13  
Doel: Vandaag veilig intake-link kunnen versturen naar Leunis.  
Randvoorwaarde: Finale klantmail blijft expliciet bij Mary.

## Statuslegend
- NOT STARTED
- IN PROGRESS
- DONE
- BLOCKED

## Werkstroom nu (3 uur)

## Live Status Update (PM)
- Gate 1: GO
- Gate 2: IN HERBEOORDELING
- Delta: backend en frontend training-gating fixpakket doorgevoerd; technische regressiechecks opnieuw uitgevoerd (tsc + tests groen).
- Open punt voor definitieve GO: administratieve checklist nog expliciet op DONE zetten.

### Track A — Security & Backend (Owner: Backend Specialist)
1. Secrets rotatie uitvoeren en valideren (Google, OpenAI, Resend, Supabase service role, GitHub token)
   - Status: DONE
   - Deadline: +60 min
   - Bewijs: oude keys ongeldig, nieuwe keys werken in Vercel
2. Env parity check prod/staging afronden
   - Status: IN PROGRESS
   - Deadline: +90 min
   - Bewijs: vereiste vars aanwezig, geen drift
3. Server-side training gating hard bevestigen
   - Status: DONE
   - Deadline: +120 min
   - Bewijs: niet-trainingsklant kan trainingflow niet gebruiken
   - Uitgevoerd: hard gate toegevoegd op training endpoints via clients.intake_profile.training_enabled.
4. Backend smoke test (auth, intake save, training-uit pad)
   - Status: DONE
   - Deadline: +150 min
   - Bewijs: korte testnotitie met pass/fail
   - Resultaat: typecheck groen en tests groen.

### Track B — Frontend Clarity (Owner: Frontend Developer)
1. UI-controle op scheiding intake vs training (admin + client)
   - Status: DONE
   - Deadline: +60 min
   - Bewijs: screenshots/notes van schermen
   - Uitgevoerd: dashboard + sidebar + training bevestiging tonen alleen bij training_enabled.
2. Copy-check Nederlands op verwarring reduceren
   - Status: DONE
   - Deadline: +90 min
   - Bewijs: lijst met aangepaste labels of bevestiging geen wijziging nodig
3. Responsive smoke (320px, tablet, desktop)
   - Status: IN PROGRESS
   - Deadline: +120 min
   - Bewijs: pass/fail per viewport
   - Extra check: admin training-intakes tabel op 320px heeft risico op leesbaarheid.

### Track C — Administratie & Communicatie (Owners: Administratie + Klantenservice Agent + Leunis Assistent)
1. Administratieve gereedheidscheck afronden
   - Status: BLOCKED
   - Deadline: +45 min
   - Bewijs: checklist volledig op gereed
   - Actie nu: minimale klantgegevens expliciet afvinken + audit trail invullen + interne voorwaarden bevestigen.
2. Berichtenpakket klaarleggen (WhatsApp + mail + 24u reminder)
   - Status: DONE
   - Deadline: afgerond
   - Bewijs: teksten aanwezig
3. Leunis-specifieke intakefacten en Q&A valideren
   - Status: DONE
   - Deadline: afgerond
   - Bewijs: checklist + top 5 vragen aanwezig

## PM Gate Reviews

### Gate 1 — T+90 min
Go als:
1. Secrets rotatie grotendeels afgerond
2. Admin en intakeflow technisch bereikbaar
3. Geen blocker op env-config

No-Go als:
1. Oude keys nog actief
2. Kritieke env-var ontbreekt

### Gate 2 — T+150 min
Go als:
1. Backend smoke groen
2. Frontend clarity en responsive smoke groen
3. Administratieve check groen

No-Go als:
1. Training verschijnt voor niet-trainingsklant
2. Intake save of notificatie faalt

Huidige uitkomst:
- Technisch: voorlopig GO
- Operationeel: wacht op admin-checklist DONE voor definitieve GO

### Herstelpakket voor herbeoordeling Gate 2
1. Backend: training endpoints server-side blokkeren tenzij training expliciet geactiveerd is.
2. Frontend: dashboard/sidebar/onboarding conditioneel maken zodat niet-trainingsklant geen trainingflow opgedrongen krijgt.
3. Frontend: admin training-intakes mobiel leesbaarheidscheck afronden (320px).
4. Administratie: minimum klantdata + interne voorwaarden + audit trail op DONE zetten.
5. PM: her-run van Gate 2 pas na bovenstaande vier herstelpunten.

## Verzenden (alleen Mary)
Pas uitvoeren na Gate 2 = GO:
1. Intake-link plaatsen in finale mailtemplate
2. Mail sturen aan assistent (CC Arno)
3. 30 min monitoring op errors en ontvangst

## Incidentpad (kort)
1. Kritieke fout voor verzending: niet versturen, eerst fix en her-test.
2. Kritieke fout na verzending: direct rollback naar laatste stabiele release + korte klantupdate dat issue in herstel staat.
3. Security-incident: keys opnieuw roteren en auditlog aanvullen.

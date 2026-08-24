# Feature Review, QA & Release Approval
**Role:** PM / Projectmanager  
**Feature:** Adobe Sign Offerte-ondertekening  
**Versie:** 1.0  
**Datum:** 2026-08-24

---

## 🎯 Doel

Als projectmanager review je de implementatie van de Adobe Sign feature, valideer je acceptatiecriteria en geef je sign-off voor de release naar productie.

---

## 📋 Scope

- Scope & requirements review
- Data Safety gate (verplicht)
- End-to-end testing met echte offerte
- Acceptatiecriteria validatie
- Security review
- Performance check
- Release checklist
- Post-release monitoring

---

## 🔍 Taak 1: Scope & Requirements Review

Controleer of beide agents hun scope hebben gehaald:

**Backend Specialist — Checklist:**
```
[ ] Adobe Sign API-client is geïmplementeerd
[ ] POST /api/offertes/:id/send-signature werkt
[ ] GET /api/offertes/:id/signature-status werkt
[ ] POST /api/webhooks/adobe-sign is beveiligd
[ ] Database velden zijn toegevoegd (adobe_sign_agreement_id, signed_at, etc.)
[ ] Supabase Storage is geconfigureerd
[ ] RLS-policies zijn ingesteld
[ ] Ondertekende PDF wordt gedownload en opgeslagen
[ ] Offerte status verandert automatisch naar "getekend"
[ ] Geen hardcoded secrets
[ ] Error handling is robuust
[ ] TypeScript: npx tsc --noEmit = EXIT:0
```

**Frontend Developer — Checklist:**
```
[ ] Offerte detailpagina toont status badge
[ ] "Ondertekenen" button werkt
[ ] Status polling werkt real-time
[ ] Download PDF button werkt
[ ] Mobile design is responsive (320px+)
[ ] Error messages zijn in het Nederlands
[ ] Loading states zijn duidelijk
[ ] TypeScript: npx tsc --noEmit = EXIT:0
[ ] Buttons zijn groot genoeg voor touch (44px+)
```

---

## 🔐 Taak 2: Data Safety Gate (VERPLICHT)

Dit is een **verplichte gate** volgens `docs/DATA-SAFETY-PROTOCOL.md`.

Voer deze stappen uit voordat je approveert:

### A. Schema Wijzigingen
```
[ ] Migration is idempotent (IF NOT EXISTS, etc.)
[ ] Migration kan gereverted worden
[ ] Geen destructieve DELETE/DROP statements
[ ] Constraints zijn logisch
[ ] Indexing is optimaal
```

### B. Gevoelige Data Handling
```
[ ] Adobe Sign credentials zijn in ENV vars, niet in code
[ ] Signing tokens zijn NIET in logs
[ ] Ondertekende PDFs zijn NIET publiek toegankelijk
[ ] Supabase Storage heeft juiste RLS policies
[ ] Klanten kunnen geen andere klanten' PDFs zien
```

### C. Access Control & RLS
```
[ ] Klanten kunnen alleen hun eigen data zien
[ ] Admin kan alles zien
[ ] Cross-tenant leaks zijn onmogelijk
[ ] Webhook endpoint is beveiligd tegen replay attacks
```

### D. Audit Trail
```
[ ] Signing events worden gelogd
[ ] signed_at timestamp is ingevuld
[ ] signed_by_email is vastgelegd
[ ] Audit trail kan niet verwijderd worden
```

### Data Safety Checklist Ondertekenen

Als PM: vul deze in na verificatie:

```markdown
## Data Safety Approval

**Datum:** 2026-08-24
**Reviewer:** [jouw naam]
**Feature:** Adobe Sign Offertes

### Beveiligingsgatsen
- [x] Schema migration is reversible
- [x] Credentials zijn in ENV vars
- [x] RLS policies zijn juist
- [x] Audit trail is vastgelegd
- [x] Geen data leaks

### Gekende risico's
- Geen kritieke beveiligingsrisico's geïdentificeerd

### Goedkeuring
[PM handtekening] — APPROVED
```

---

## 🧪 Taak 3: End-to-End Testing

Dit is de **kritieke test** — doe dit met een echte offerte.

### Setup
```bash
# 1. Zorg dat staging/dev omgeving klaar is
# 2. Zorg dat Adobe Sign is geconfigureerd
# 3. Zorg dat test-klantaccount bestaat

TEST_CLIENT_EMAIL=klant@example.com
TEST_OFFERTE_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

### Test Flow

**Stap 1: Offerte aanmaken (Admin)**
```
[ ] Admin logt in
[ ] Admin maakt test-offerte aan
[ ] Offerte status = "concept"
[ ] Offerte bevat: titel, beschrijving, sprints, bedrag
```

**Stap 2: Ondertekening starten (Admin)**
```
[ ] Admin klikt "Versend voor ondertekening"
[ ] Systeem roept POST /api/offertes/:id/send-signature aan
[ ] API geeft succesbericht
[ ] adobe_sign_agreement_id wordt opgeslagen
```

**Stap 3: Klant ondertekent (Klant)**
```
[ ] Klant ontvangt e-mail van Adobe Sign
[ ] Link in e-mail werkt
[ ] Klant kan digitaal tekenen
[ ] Handtekening is zichtbaar op canvas
[ ] Klant klikkt "Ondertekenen"
[ ] Adobe bevestigt ondertekening
```

**Stap 4: Status update (Systeem)**
```
[ ] Portal haalt status op via GET /api/offertes/:id/signature-status
[ ] Status verandert naar "signed"
[ ] signed_at timestamp wordt ingevuld
[ ] signed_pdf_url wordt ingesteld
[ ] Offerte status in DB = "getekend"
```

**Stap 5: Download (Klant)**
```
[ ] Portal toont "Download getekende PDF" knop
[ ] Klant klikt download
[ ] PDF wordt gedownload
[ ] PDF bevat: handtekening + offerte details
[ ] PDF is leesbaar en compleet
[ ] Klant kan bestand lokaal bewaren
```

**Stap 6: Admin verificatie (Admin)**
```
[ ] Admin ziet offerte status = "getekend"
[ ] Admin kan ondertekende PDF openen
[ ] Admin kan downloads zien in dashboard
[ ] Audit trail toont alle events
```

### Documentatie van Test
Maak een test report:

```markdown
## E2E Test Report — Adobe Sign Ondertekening

**Datum:** 2026-08-24
**Tester:** [PM naam]
**Omgeving:** Staging / Production

### Test Resultaten

| Stap                       | Status | Notities               |
| -------------------------- | ------ | ---------------------- |
| Offerte aanmaken           | ✅      | Succesvol aangemaakt   |
| Versend voor ondertekening | ✅      | Email ontvangen        |
| Klant ondertekent          | ✅      | Handtekening zichtbaar |
| Status update              | ✅      | Automatisch gewijzigd  |
| Download PDF               | ✅      | Compleet en leesbaar   |
| Admin verificatie          | ✅      | Alle data correct      |

### Conclusie
✅ PASSED — Feature is production-ready
```

---

## 🔒 Taak 4: Security Review

Voer deze security checks uit:

### API Security
```
[ ] POST /api/offertes/:id/send-signature is beveiligd met auth
[ ] GET /api/offertes/:id/signature-status is beveiligd
[ ] Webhook endpoint is beveiligd (signature verification)
[ ] Rate limiting op endpoints?
[ ] No hardcoded credentials in code
```

### Storage Security
```
[ ] Supabase Storage bucket is PRIVATE
[ ] Signed URLs hebben TTL (time-to-live)
[ ] RLS policies voorkomen unauthorized access
[ ] PDF files kunnen niet publiek worden gedownload
```

### Data Protection
```
[ ] Adobe Sign tokens worden niet gelogd
[ ] Keine plaintext passwords/secrets
[ ] Encryption in transit (HTTPS)
[ ] Encryption at rest (Supabase default)
```

### Vulnerability Check
```
[ ] Dependencies zijn up-to-date
[ ] npm audit geeft geen kritieke issues
[ ] No known CVEs in Adobe Sign SDK
```

---

## ⚡ Taak 5: Performance Check

Test performance onder normale omstandigheden:

```bash
# 1. Load test offerte detailpagina
# Verwachting: < 2 sec

# 2. Test sign-signature endpoint
# Verwachting: < 5 sec

# 3. Test status polling
# Verwachting: < 1 sec per request

# 4. Test PDF download
# Verwachting: smooth, geen hangs

# Monitoring:
# - Server CPU usage?
# - Database query times?
# - Storage bandwidth?
```

---

## ✅ Taak 6: Acceptatiecriteria Gate

Dit is de **formele quality gate**. Beide agents moeten deze criteria hebben bereikt:

### Backend Acceptatiecriteria
```
MUST HAVE:
[ ] Adobe Sign API is geïntegreerd
[ ] Offerte PDF wordt verstuurd naar Adobe Sign
[ ] Agreement ID wordt opgeslagen in database
[ ] Status wordt gepolld en geupdate
[ ] Ondertekende PDF wordt gedownload en opgeslagen
[ ] Offerte status verandert naar 'getekend'
[ ] RLS-policies zijn juist
[ ] Geen hardcoded secrets

TESTS:
[ ] npx tsc --noEmit = EXIT:0
[ ] Unit tests slagen
[ ] Integration tests slagen
[ ] TypeScript types zijn correct
```

### Frontend Acceptatiecriteria
```
MUST HAVE:
[ ] Offerte status is zichtbaar
[ ] "Ondertekenen" knop werkt
[ ] Status wordt live geüpdatet
[ ] "Download PDF" knop werkt
[ ] Mobile design is responsive
[ ] Error messages zijn duidelijk in NL
[ ] Buttons zijn groot genoeg voor touch

TESTS:
[ ] npx tsc --noEmit = EXIT:0
[ ] Component tests slagen
[ ] No console errors/warnings
[ ] Accessibility: WCAG 2.1 level AA
```

### Feature Acceptance
```
MUST HAVE:
[ ] Klant kan echte digitale handtekening zetten
[ ] Klant kan getekende PDF bewaren
[ ] Admin ziet status in portal
[ ] Data is veilig opgeslagen
[ ] Geen data leaks of security issues
[ ] E2E test is geslaagd
[ ] Performance is acceptabel
```

---

## 📋 Taak 7: Release Checklist

### PRE-MERGE CHECKS
```
Code Quality:
[ ] Alle code reviews zijn goedgekeurd
[ ] Merge conflicts zijn opgelost
[ ] Branch is up-to-date met main
[ ] Commit messages zijn duidelijk

Testing:
[ ] Unit tests slagen
[ ] Integration tests slagen
[ ] E2E tests slagen
[ ] No TypeScript errors
[ ] No console errors

Documentation:
[ ] README is updated
[ ] API is gedocumenteerd
[ ] Error handling is gedocumenteerd
```

### PRE-DEPLOY CHECKS (Staging)
```
Infrastructure:
[ ] CI/CD pipeline is groen
[ ] All status checks pass
[ ] Environment variables zijn ingesteld
[ ] Database migrations kunnen draaien
[ ] Storage is geconfigureerd

Staging Deploy:
[ ] Deployment slaagt
[ ] No startup errors
[ ] Health checks pass
[ ] Logs zijn schoon
```

### PRE-PRODUCTION DEPLOY
```
Final Validation:
[ ] E2E test in staging = SUCCESS
[ ] Performance test = PASS
[ ] Security review = PASS
[ ] Data Safety gate = PASS
[ ] Klant/admin feedback = POSITIEF

Production Deployment:
[ ] Deployment window afgesproken?
[ ] Rollback plan klaar?
[ ] Monitoring is actief?
[ ] Team is on-call?

Go/No-Go Decision:
[ ] Product Owner: GO
[ ] Tech Lead: GO
[ ] PM: GO
```

---

## 📊 Taak 8: Post-Release Monitoring

Na deployment naar production:

```
FIRST HOUR:
[ ] Monitor error logs
[ ] Check Adobe Sign API connectivity
[ ] Verify PDFs are downloading
[ ] Monitor database performance
[ ] Check user feedback/complaints

FIRST DAY:
[ ] Monitor signing success rate
[ ] Check for any data anomalies
[ ] Verify audit trail is logging
[ ] Check customer emails received
[ ] Performance metrics normal?

FIRST WEEK:
[ ] Signing volume report
[ ] Error rate report
[ ] Performance metrics
[ ] Customer satisfaction survey
[ ] Any issues/bugs?
```

**Metrics to track:**
- Signing attempts vs. successes
- Average time to complete signing
- PDF download count
- Error rate
- Average response time

---

## 🎯 Sign-Off Template

Vul dit in als PM wanneer je de feature goedkeurt:

```markdown
# Adobe Sign Feature — Production Sign-Off

**Date:** 2026-08-24
**PM:** [Jouw naam]
**Feature Status:** ✅ APPROVED FOR PRODUCTION

## Quality Gates Passed
- [x] Backend acceptatiecriteria: 100% GEHAALD
- [x] Frontend acceptatiecriteria: 100% GEHAALD
- [x] Data Safety gate: GEHAALD
- [x] E2E test: GESLAAGD
- [x] Security review: GEHAALD
- [x] Performance: ACCEPTABEL

## Release Checklist
- [x] Code reviews: COMPLEET
- [x] Testing: GESLAAGD
- [x] CI/CD: GROEN
- [x] Staging validation: GESLAAGD

## Known Issues / Limitations
- Geen kritieke issues
- Geen limitations

## Rollback Plan
- Revert commit [HASH]
- Remove database migration
- Clear Supabase Storage
- Notify support team

## Sign-Off
**PM:** [Handtekening / naam]  
**Date:** 2026-08-24  
**Status:** ✅ APPROVED — Ready for production

---

*Feature gedeployd naar production: 2026-08-24 14:30 UTC*
```

---

## 📞 Escalation & Support

Zorg dat je support/ops team weet wat ze moeten doen:

```
TEAM: Ops / Support

If Adobe Sign API goes down:
1. Monitor /api/offertes/:id/signature-status
2. Alert users: "Signing temporarily unavailable"
3. Provide workaround: "Email us your signed PDF"

If storage is full:
1. Check Supabase Storage usage
2. Archive old PDFs if needed
3. Alert PM

If RLS policies are broken:
1. Klanten kunnen data van elkaar zien
2. IMMEDIATE: Disable signing feature
3. Alert PM + backend lead
```

---

## ✨ Final Approval

Voor production release moet dit zijn afgevinkt:

- [x] Backend: alle criteria gehaald
- [x] Frontend: alle criteria gehaald
- [x] Data Safety: afgerond
- [x] Security: goedgekeurd
- [x] E2E test: geslaagd
- [x] Performance: OK
- [x] Documentation: compleet

**PM SIGN-OFF:** ✅ APPROVED

---

*Status: ACTIEF — Wacht op implementatie door beide agents*

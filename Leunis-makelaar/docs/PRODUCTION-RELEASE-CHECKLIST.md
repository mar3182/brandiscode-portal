# Production Release Checklist

**Use this checklist for every production release.**

## Pre-Release (48 hours before)

### Planning & Communication
- [ ] Release is scheduled and communicated to team
- [ ] Release notes prepared with feature summary
- [ ] On-call team notified and available
- [ ] Customer communication plan (if breaking changes)
- [ ] Rollback team assigned and briefed

### Code Quality
- [ ] All features merged to `develop` and tested
- [ ] All CI checks passing on `develop` (lint, typecheck, build)
- [ ] No failing tests or known issues
- [ ] Security scan passed (no critical vulnerabilities)
- [ ] Dependency audit passed (moderate level)
- [ ] Code review completed and approved

### Staging Validation
- [ ] Staging environment is stable (24+ hours no errors)
- [ ] Staging smoke tests all passing
- [ ] Manual QA sign-off on key features
- [ ] Performance acceptable (no degradation)
- [ ] No error spikes in staging logs

### Database Preparation
- [ ] All migrations reviewed by database team
- [ ] Migrations tested on staging first
- [ ] Expand-and-contract pattern verified (no risky migrations)
- [ ] Rollback instructions documented in migration comments
- [ ] Validation query present in each migration
- [ ] Backup restore procedure tested (quarterly minimum)

---

## Release Day (Before Deployment)

### Final Verification
- [ ] Backup system operational
- [ ] Backup tested within last 7 days
- [ ] Health check endpoints accessible
- [ ] Monitoring & alerts configured
- [ ] No deployments happening in other environments

### Team Readiness
- [ ] DevOps/Platform team on standby
- [ ] Database team available for migration questions
- [ ] Backend team available for API issues
- [ ] Frontend team available for UI issues
- [ ] Slack/Teams channels monitored for incidents

### Documentation
- [ ] Release runbook reviewed by deployment lead
- [ ] Rollback runbook reviewed by deployment lead
- [ ] Incident response runbook up-to-date
- [ ] On-call contact information verified
- [ ] Escalation contacts documented

---

## During Deployment

### Pre-Deployment (T-1 hour)
- [ ] Create release branch: `release/vX.Y.Z`
- [ ] Final round of staging tests
- [ ] Create Git tag: `release-vX.Y.Z`
- [ ] Git tag pushed to GitHub
- [ ] Team notified: "Release starting in 1 hour"

### Deployment Execution
- [ ] Trigger production CD workflow (GitHub Actions)
- [ ] Monitor pre-deployment validation (< 2 min)
- [ ] Monitor database backup creation (< 5 min)
- [ ] Monitor migrations execution (< 5 min)
- [ ] Monitor build completion (< 5 min)
- [ ] Monitor Blue deployment (< 5 min)
- [ ] Monitor health checks on Blue (< 5 min)
- [ ] Monitor traffic switch (< 2 min)

**Total deployment time: ~20-30 minutes**

### Post-Deployment Verification (T+30 min)
- [ ] New version responding to requests
- [ ] Health endpoint returns healthy status
- [ ] Error rate < 0.1% (normal baseline)
- [ ] Response times normal (no degradation)
- [ ] Database connections healthy
- [ ] No data loss detected (spot check)

### User-Facing Testing (T+30-60 min)
- [ ] Login flow works
- [ ] Key features functional
- [ ] Signature feature works
- [ ] PDF generation works
- [ ] Invoice display correct
- [ ] No new error messages

---

## After Deployment (1-24 hours)

### Immediate Monitoring (First Hour)
- [ ] Error rate stable (< 0.1%)
- [ ] Response times stable
- [ ] No spike in database CPU
- [ ] No spike in memory usage
- [ ] No customer complaints

### Extended Monitoring (First 24 Hours)
- [ ] Deployment stability confirmed
- [ ] No regressions detected
- [ ] New features working correctly
- [ ] Performance metrics acceptable
- [ ] Team confidence high (no hidden issues)

### Communication
- [ ] Release success announced to stakeholders
- [ ] Release notes published (internal)
- [ ] Metrics recorded (deployment frequency, lead time)
- [ ] Team debriefing scheduled (optional, if issues)

---

## Incident Response (If Deployment Fails)

### Immediate (< 5 minutes)
- [ ] Incident severity assessed (P1/P2/P3/P4)
- [ ] On-call team paged
- [ ] Incident channel created
- [ ] Initial status posted: "We're investigating"

### Diagnosis (5-15 minutes)
- [ ] Root cause identified
- [ ] Decision made: Rollback vs Quick Fix
- [ ] If rollback: proceed to rollback section
- [ ] If fix: minimal hotfix prepared & tested

### Resolution (15-30 minutes)
- [ ] Rollback completed OR fix deployed
- [ ] Health checks all green
- [ ] Service stable
- [ ] Status update: "Issue resolved"

### After Incident
- [ ] Postmortem scheduled (24 hours)
- [ ] Incident report created
- [ ] Root cause documented
- [ ] Preventative actions assigned
- [ ] Lessons learned captured

---

## Rollback Decision Flowchart

```
Deployment Complete
        ↓
Health Checks Passing?
    ├─ YES → Continue monitoring
    └─ NO → AUTOMATIC ROLLBACK TRIGGERED
             ├─ Restore database from backup
             ├─ Deploy previous version
             ├─ Wait for health checks
             ├─ Alert incident team
             └─ Proceed to "Incident Response" section
```

---

## Sign-Off

**Before release is considered complete:**

- [ ] Deployment lead: "Release successful, all checks green"
- [ ] DevOps team: "Infrastructure stable, monitoring OK"
- [ ] Database team: "Migrations applied, data integrity verified"
- [ ] Backend team: "API endpoints responding correctly"
- [ ] Frontend team: "UI rendering properly, no JavaScript errors"

---

## Metrics to Record

After each release, record:
- [ ] Start time: __:__ UTC
- [ ] End time: __:__ UTC
- [ ] Total duration: __ minutes
- [ ] Issues encountered: [none / describe]
- [ ] Customer-facing downtime: __ minutes (or "zero")
- [ ] Rollback needed: Yes / No
- [ ] Deployment lead: [name]
- [ ] Approvers: [names]

---

## Common Gotchas (Learn From Others)

- ❌ Forgetting to update DNS after traffic switch
  - ✅ Solution: Include DNS in pre-flight checklist

- ❌ Deploying migrations without testing on staging
  - ✅ Solution: Require staging green light before production deploy

- ❌ Not documenting rollback path for unusual migrations
  - ✅ Solution: Mandate rollback instructions in migration comments

- ❌ Monitoring alerts not configured
  - ✅ Solution: Set alerts **during** deployment planning, not after

- ❌ Backup not tested for weeks
  - ✅ Solution: Test backup restoration quarterly (automated)

- ❌ Wrong team member has access to production secrets
  - ✅ Solution: Audit secret access monthly

---

## Related Runbooks
- 📘 [Release Runbook](./runbooks/release.md)
- 📘 [Rollback Runbook](./runbooks/rollback.md)
- 📘 [Incident Response](./runbooks/incident-response.md)
- 📘 [CI/CD Architecture](./CI-CD-ARCHITECTURE.md)

---

**Version**: 1.0  
**Last Updated**: 2026-06-27  
**Owner**: @team/platform  
**Questions**: @team/platform-lead

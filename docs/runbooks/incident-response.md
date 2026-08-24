# Incident Response Runbook

## Production Incident Response

### Incident Severity Levels

| Level | Impact   | Response Time | Decision              | Example                                            |
| ----- | -------- | ------------- | --------------------- | -------------------------------------------------- |
| P1    | Critical | < 5 min       | Immediate rollback    | Database down, all users unable to access          |
| P2    | High     | < 15 min      | Rollback or quick fix | Auth broken, payments failing                      |
| P3    | Medium   | < 1 hour      | Investigation         | Performance degradation, non-critical feature down |
| P4    | Low      | < 24 hours    | Planning              | Minor UI bug, cosmetic issue                       |

---

## P1 Incident: Critical Production Down

### **Phase 1: Response (0-5 minutes)**

**Objective**: Stop the bleeding, restore service.

#### Step 1: Detect & Alert
- [ ] Monitoring system alerts or customer reports critical issue
- [ ] On-call engineer acknowledged alert
- [ ] Team notified immediately:
  ```
  🚨 CRITICAL INCIDENT - P1
  Title: [Brief description]
  Service: [Platform component]
  Start: [Timestamp]
  Status: INVESTIGATING
  #incident-response
  ```

#### Step 2: Quick Diagnosis (< 2 minutes)
```bash
# Is it the recent deployment?
git log --oneline -1
# If deployed < 10 minutes ago, likely cause

# What's broken?
curl -f https://example.com/api/health
# Expected: 200 OK

# Database connectivity?
supabase db query "SELECT 1;"
# Expected: 1 row

# Errors in logs?
# grep ERROR /var/log/app.log | tail -20
```

#### Step 3: Decision Tree
```
Is health check failing?
  YES → IMMEDIATE ROLLBACK (Step 4)
  NO  → Continue diagnosis (Phase 2)

Did deployment happen < 10 min ago?
  YES → ROLLBACK & INVESTIGATE LATER
  NO  → Attempt quick fix or rollback

Is data integrity compromised?
  YES → ROLLBACK IMMEDIATELY
  NO  → May allow targeted fix
```

#### Step 4: Trigger Immediate Rollback
If diagnosis shows recent deployment caused issue:

```bash
# Via GitHub UI: Actions > Run Workflow > 03-production-cd.yml
#   Input: rollback_version = [previous tag]

# Via CLI:
gh workflow run 03-production-cd.yml \
  -f deploy_target=rollback \
  -f rollback_version=v1.1.9 \
  -f backup_id=backup-1719491100-abc123def
```

**Wait for**: ✅ Green (old version) taking traffic  
**Duration**: 5-10 minutes

#### Step 5: Verification After Rollback
- [ ] Health endpoint returns 200
- [ ] Users can login
- [ ] Core flows working
- [ ] Error rate drops

**If still failing after rollback**:
1. Check backup restoration status
2. Verify database consistency
3. Call @team/database immediately
4. Consider switch to disaster recovery

---

### **Phase 2: Stabilization (5-30 minutes)**

**Objective**: Understand root cause, stabilize systems, prevent recurrence.

#### Step 1: Declare Incident Status
```
🚨 P1 INCIDENT - STATUS UPDATE

Title: [Description]
Start: HH:MM (Duration: X minutes)
Status: PARTIALLY STABILIZED
Action: Rolled back to v1.1.9
Cause: [Initial hypothesis]
Next: Root cause analysis in 1 hour

Owner: @team/devops
Lead: [Engineer name]
```

#### Step 2: Begin Root Cause Investigation
```bash
# What changed in v1.2.0?
git diff release-v1.1.9 release-v1.2.0 --stat | head -20

# Focus on recent commits
git log release-v1.1.9..release-v1.2.0 --oneline | head -10

# Check migrations
ls -la supabase/migration-*.sql | tail -5

# Review logs from deployment
# grep "ERROR\|FATAL\|CRITICAL" deployment.log
```

#### Step 3: Continue Monitoring
- [ ] Error rate: < 0.1%
- [ ] Response time: normal (< 500ms P95)
- [ ] Database CPU: < 80%
- [ ] Memory: < 85%
- [ ] No new customer reports

---

### **Phase 3: Post-Incident (30 minutes - 24 hours)**

#### Step 1: Detailed Root Cause Analysis
1. **What failed?**
   - Deployment code
   - Database migration
   - Environment configuration
   - Infrastructure issue

2. **Why did it fail?**
   - Not tested on staging
   - Edge case not covered
   - Configuration mismatch
   - Race condition

3. **Why wasn't it caught?**
   - CI checks insufficient
   - Staging didn't replicate production
   - No health check for this scenario
   - Monitoring gap

#### Step 2: Timeline (for postmortem)
```
13:45 - Deployment started
13:46 - Database migration began
13:47 - App health check failed
13:48 - Rollback decision made
13:50 - Rollback complete
13:51 - Service restored
```

#### Step 3: Communication
```
✅ INCIDENT RESOLVED

Service: Fully operational
Downtime: 6 minutes (13:47-13:53)
Cause: Migration issue in v1.2.0
Fix: Rolled back to v1.1.9
Data: No data lost, all backups verified
Impact: ~500 users affected (< 5 min each)

Postmortem: 2026-06-28 10:00 UTC
All teams invited.

Thank you for your patience.
```

#### Step 4: Schedule Postmortem (24 hours)
```markdown
# Postmortem: P1 Incident - v1.2.0 Rollback

**Date & Time**: 2026-06-28 10:00-11:00 UTC  
**Attendees**: @team/devops, @team/backend, @team/database, @team/platform

## Agenda
1. Timeline walkthrough (5 min)
2. Root cause (10 min)
3. Why not caught in CI/staging (10 min)
4. Remediations (10 min)
5. Preventative actions (15 min)
6. Key learnings (10 min)
```

---

## P2 Incident: High-Impact Issue

### Response Flow
```
T+0min    → Alert + Verify issue
T+2min    → Assess: Rollback vs Fix?
T+5-30min → Implement solution
T+30min   → Verification complete
T+1h      → Root cause analysis
T+24h     → Postmortem
```

### Assessment Criteria
| Factor              | Rollback     | Quick Fix          |
| ------------------- | ------------ | ------------------ |
| Root cause known?   | No           | Yes                |
| Fix tested?         | No           | Yes                |
| Requires migration? | No           | Yes                |
| Risk of data loss?  | Yes          | No                 |
| **Decision**        | **Rollback** | **Fix & redeploy** |

### Quick Fix Process
1. Create hotfix branch: `hotfix/p2-auth-issue`
2. Implement minimal fix (1-2 line change)
3. Deploy to staging → verify
4. Create PR to main: require 2 approvals
5. Merge & trigger production deployment
6. Verify fix live
7. Backport to develop

---

## P3-P4 Incidents: Medium/Low Impact

### Response Flow
```
T+0   → Alert + verify issue
T+5   → Create investigation ticket
T+1h  → Root cause identified
T+24h → Fix deployed during normal release cycle
T+3d  → Postmortem (if major)
```

### Investigation Steps
1. Gather error logs, screenshots, reproduction steps
2. Attempt reproduction on staging
3. Review recent code changes
4. Document findings in incident ticket
5. Plan fix for next release
6. If workaround exists: publish to team

---

## Incident Communication Template

### For Team Chat (Slack/Teams)

**Initial Alert**:
```
🚨 INCIDENT - P[1-4]
Title: [One line description]
Service: [Component]
Detected: [Time]
Status: INVESTIGATING
Lead: @[engineer]
```

**Update Every 10 minutes**:
```
🔄 UPDATE - [Duration so far]
Status: [Investigating / Fixing / Testing / Resolved]
Latest: [What we found / what we're doing]
Next update: [Time]
```

**Resolution**:
```
✅ RESOLVED - [Total duration]
Cause: [Root cause]
Fix: [Solution]
Impact: [User count, duration]
Postmortem: [Date & time]
```

---

## Incident Severity Decision Matrix

```
                    User Impact
                    ↓
Impact on Service  │ All Users  │ Many (>10%) │ Some (1-10%) │ Few (<1%)
                   ├────────────┼─────────────┼──────────────┼──────────
All features down  │    P1      │     P1      │      P2      │    P2
Core feature broken│    P1      │     P2      │      P2      │    P3
Non-core broken    │    P2      │     P2      │      P3      │    P4
Degradation (slow) │    P2      │     P3      │      P3      │    P4
Minor bug          │    P3      │     P3      │      P4      │    P4
```

---

## Disaster Recovery Plan

**If normal incident response fails**:

### Level 1: Service Mesh Failover
```bash
# Switch traffic to disaster recovery region
# (if multi-region setup exists)
gcloud compute backend-services update primary \
  --global \
  --failover-ratio=100
```

### Level 2: Database Point-in-Time Restore
```bash
# If current backup corrupted, restore from earlier snapshot
supabase db restore --backup-id backup-PREVIOUS-1
```

### Level 3: Rebuild from Scratch
**Only if data completely lost**:
1. Restore from daily backup (24h old)
2. Re-apply transaction logs (if available)
3. Contact customers about partial data loss
4. Trigger incident review immediately

---

## On-Call Checklist

**Before Going On-Call**:
- [ ] Have GitHub access
- [ ] Have Supabase dashboard access
- [ ] Know who to escalate to
- [ ] Have runbooks bookmarked
- [ ] Know team contact info

**During Incident**:
- [ ] Acknowledge alert within 2 minutes
- [ ] Post initial status immediately
- [ ] Avoid panic; follow runbook
- [ ] Communicate every 10 minutes
- [ ] Don't hesitate to escalate
- [ ] Document everything (timeline, decisions, findings)

**After Incident**:
- [ ] Complete incident report
- [ ] Schedule postmortem
- [ ] Log lessons learned
- [ ] Update runbooks if needed

---

## Escalation Contacts

| Situation               | Contact         | Backup              |
| ----------------------- | --------------- | ------------------- |
| P1 Production Down      | @on-call-devops | @team/platform-lead |
| Database Corruption     | @team/database  | @on-call-devops     |
| Security Breach         | @security-team  | @cto                |
| Multiple System Failure | CTO             | CEO                 |

---

## Related Documents
- [Rollback Runbook](./rollback.md)
- [Release Runbook](./release.md)
- [Branch Protection Policy](../.github/policies/BRANCH_PROTECTION_POLICY.md)

---

**Last Updated**: 2026-06-27  
**Owner**: @team/devops  
**Next Review**: 2026-09-27

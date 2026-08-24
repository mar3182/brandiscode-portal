# Rollback Runbook

## Production Rollback Process

### When to Rollback

**Immediate rollback required if**:
- Health check failures (database, API, auth)
- Customer-impacting errors (> 1% error rate)
- Data integrity issues
- Security incident detected
- Deployment health check fails (automatic)

**Consult with team if**:
- Minor bug affecting < 100 users
- Non-critical feature broken
- Temporary service glitch

---

## Automatic Rollback (Built-in)

**If deployment fails**, GitHub Actions automatically:
1. ✅ Detects health check failure
2. ✅ Stops traffic switch in Blue-Green deployment
3. ✅ Keeps Green (old version) live
4. ✅ Initiates backup restoration
5. ✅ Alerts on-call team
6. ✅ Logs incident details

**No manual action needed for automatic rollback.**

---

## Manual Rollback Process

### Prerequisites
- [ ] Access to GitHub Actions
- [ ] Access to production environment
- [ ] Previous version tag: `release-vX.Y.Z`
- [ ] Backup ID from failed deployment
- [ ] Team notified

### Step 1: Verify Backup Exists
```bash
# Check backup from failed deployment
echo "Backup ID: backup-1719491100-abc123def"
echo "Status: Ready for restore"

# In production: use Supabase CLI
# supabase db backups list --project-ref $PROJECT_REF
```

### Step 2: Trigger Rollback Workflow
**Via GitHub UI**:
1. Go to: GitHub Repo > Actions > "Production CD Pipeline"
2. Click "Run workflow"
3. Set workflow dispatch inputs:
   - `target_version`: `release-v1.1.9` (previous stable version)
   - `backup_id`: `backup-1719491100-abc123def`
   - `reason`: "Critical bug in v1.2.0"

**Via CLI**:
```bash
gh workflow run 03-production-cd.yml \
  --ref main \
  -f deploy_target=rollback \
  -f rollback_version=v1.1.9 \
  -f backup_id=backup-1719491100-abc123def
```

### Step 3: Monitor Rollback Execution
GitHub Actions will:
1. Restore database from backup
2. Deploy previous application version
3. Switch traffic back (Green → Blue)
4. Run health checks

**Expected duration**: 5-10 minutes

### Step 4: Verify Rollback Success
```bash
# Check health endpoint
curl -f https://example.com/api/health
# Expected: {"status":"ok","version":"1.1.9"}

# Verify customer data integrity
# - Check latest invoice dates
# - Verify signature records
# - Confirm client list unchanged

# Monitor error rate
echo "Current error rate: < 0.1%"
```

### Step 5: Post-Rollback Communication
1. **Notify stakeholders**:
   ```
   🔄 Production rolled back to v1.1.9
   - Incident: [brief description]
   - Status: Stable
   - Investigation: [will begin in 1 hour]
   ```

2. **Create incident ticket**:
   ```
   Title: Production Incident - v1.2.0 rollback
   Severity: High
   Affected: All users
   Duration: [start time] to [end time]
   ```

3. **Schedule postmortem**: 24 hours after incident

---

## Database Rollback Details

### Rollback Strategy
**Expand-and-contract migrations**: All migrations are backward compatible.
- Old app version can read new schema
- No manual data cleanup needed
- Rollback is just version switch

### Rollback Validation
Before considering rollback complete:
1. ✅ Database connection healthy
2. ✅ All tables accessible
3. ✅ Backup validation query succeeds
4. ✅ Row counts match expectations

**Validation queries**:
```sql
-- Check clients table
SELECT COUNT(*) FROM clients;

-- Check offertes table
SELECT COUNT(*) FROM offertes WHERE status != 'deleted';

-- Check data integrity
SELECT COUNT(*) FROM clients WHERE email IS NULL;
-- Expected: 0 (no NULL emails)
```

---

## Partial Rollback (Advanced)

**If only specific feature is broken**:

### Option 1: Feature Flag (Fastest)
If feature flags are implemented:
```bash
# Disable broken feature without rollback
supabase db query "UPDATE feature_flags SET enabled = false WHERE name = 'new-payment-system';"
```
**Duration**: < 1 minute
**Requires**: Feature flag infrastructure

### Option 2: Rollback Database Only (Keep App)
If bug is database-related only:
```bash
# Restore database only, keep app version
supabase db restore --backup-id backup-1719491100-abc123def
```
**Duration**: 5-10 minutes
**Risk**: App might expect new schema; handle carefully

### Option 3: Full Rollback (Safest)
See "Manual Rollback Process" above.

---

## Common Rollback Scenarios

### Scenario 1: Migration Failed
**Symptoms**:
- Database connection errors
- Schema mismatch
- NULL constraint violation

**Action**:
1. Restore database backup
2. Roll back application version
3. Investigate migration SQL
4. Fix and test on staging
5. Re-release when ready

**Time to production**: ~ 15 minutes

### Scenario 2: API Endpoint Broken
**Symptoms**:
- 500 errors from specific endpoint
- Some users can't login
- Error rate spike (1-5%)

**Action**:
1. Check error logs
2. If unfixable immediately: trigger rollback
3. Deploy fix on new branch
4. Test thoroughly before re-release

**Time to production**: ~ 20 minutes

### Scenario 3: Data Corruption
**Symptoms**:
- Missing invoices
- Duplicate records
- Invalid data in clients table

**Action** (CRITICAL):
1. Immediately take screenshots of issue
2. Trigger full rollback (see above)
3. Do NOT attempt manual cleanup
4. Alert @team/database for investigation
5. Contact customers only after root cause found

**Time to production**: ~ 10 minutes

---

## Post-Rollback Investigation

### Incident Review (Within 24h)
1. **Root cause**: Why did v1.2.0 fail?
   - Code issue?
   - Environment issue?
   - Data issue?

2. **Detection**: How was issue discovered?
   - Automated? (health checks)
   - Customer report?
   - Team noticed?

3. **Prevention**: How to prevent next time?
   - Better testing?
   - Additional staging validation?
   - More comprehensive migrations?

4. **Timeline**:
   - Deployment started: HH:MM
   - Failure detected: HH:MM (delta: __)
   - Rollback initiated: HH:MM
   - Rollback complete: HH:MM
   - Total impact: __ minutes

### Postmortem Template
```markdown
# Postmortem: v1.2.0 Production Incident

## Executive Summary
[1-2 sentence description]

## Timeline
- HH:MM: v1.2.0 deployed
- HH:MM: Health check failed
- HH:MM: Rollback initiated
- HH:MM: v1.1.9 live again

## Impact
- Duration: X minutes
- Affected systems: [list]
- Customer-facing: Yes/No
- Data loss: None/[details]

## Root Cause
[What went wrong and why]

## Remediations (Owner / Timeline)
1. [Fix + Owner + By date]
2. [Fix + Owner + By date]

## Preventative Actions
1. [Action] → Prevents [issue type]
2. [Action] → Detects [issue] faster

## Lessons Learned
1. [What we learned]
2. [What we'll do differently]

## Owner: @team/devops
```

---

## Escalation & Communication

| Scenario                     | Action         | Contact               |
| ---------------------------- | -------------- | --------------------- |
| Automatic rollback triggered | Notify team    | @team/devops          |
| Manual rollback decision     | Consult        | @team/platform (lead) |
| Data integrity issue         | Halt + isolate | @team/database        |
| Multi-environment impact     | Escalate       | CTO / On-call         |

---

## Testing Rollback (Quarterly)

**Simulate rollback without impacting production**:
1. In staging, deploy v1.2.0
2. Create backup
3. Simulate deployment to v1.2.1
4. Create second backup
5. Trigger rollback to first backup
6. Verify all systems operational
7. Document any issues

**Expected result**: Rollback completes in < 5 minutes with zero data loss.

---

## Rollback Decision Criteria

| Metric              | Trigger Rollback | Wait & Fix   |
| ------------------- | ---------------- | ------------ |
| Error rate          | > 1%             | < 1%         |
| Response time       | > 5s P95         | < 5s P95     |
| Database errors     | Any              | None         |
| Customer complaints | > 10 in 5min     | < 10 in 5min |
| Data loss           | Yes              | No           |
| Auth failures       | Yes              | No           |

---

**Last Updated**: 2026-06-27  
**Owner**: @team/devops  
**Next Review**: 2026-09-27

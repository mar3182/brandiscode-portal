# Release Runbook

## Production Release Process

### Pre-Release Checklist (48 hours before release)
- [ ] All features merged to `develop`
- [ ] All tests passing on `develop`
- [ ] Staging environment stable for 24+ hours
- [ ] Database migrations reviewed and approved
- [ ] Release notes prepared
- [ ] Backup strategy confirmed
- [ ] Rollback plan documented
- [ ] On-call team notified

### Step 1: Create Release Branch (T-24h)
```bash
git fetch origin develop
git checkout develop
git pull origin develop
git checkout -b release/v1.2.0
git push origin release/v1.2.0
```

**Rationale**: Release branch allows for last-minute fixes without blocking develop.

### Step 2: Final Testing on Release Branch (T-24h to T-1h)
1. Merge release branch to staging
2. Run full regression tests
3. Verify database migrations on staging
4. Check health endpoints
5. Confirm backup mechanisms working

```bash
# Simulated test run
npm run test:e2e
npm run test:smoke
```

### Step 3: Create Git Tag (T-1h)
Tag signals the exact commit to deploy.

```bash
git checkout release/v1.2.0
git pull origin release/v1.2.0

# Create annotated tag with release notes
git tag -a release-v1.2.0 \
  -m "Release v1.2.0 - [Feature list here]" \
  -m "Database: 3 migrations included" \
  -m "Rollback: release-v1.1.9"

git push origin release-v1.2.0
```

**Naming**: `release-vX.Y.Z` (GitHub Actions filters on `release-*`)

### Step 4: Trigger Production Deployment
**Via GitHub UI** or CLI:
```bash
gh workflow run 03-production-cd.yml --ref release/v1.2.0
```

**Wait for**:
1. ✅ Pre-deployment validation
2. ✅ Database backup created
3. ✅ Migrations executed
4. ✅ Build completed
5. ✅ Blue-Green switch (new version live)
6. ✅ Post-deployment health checks

### Step 5: Post-Deployment Verification (T+30m)
```bash
# Check live health
curl -f https://example.com/api/health
# Expected: {"status":"ok"}

# Verify user-facing flows
# - Login page loads
# - Dashboard renders
# - PDF generation works
# - Signature feature works
```

**Success Indicators**:
- ✅ Zero error spikes in monitoring
- ✅ Response times normal
- ✅ Database connections healthy
- ✅ All migrations applied

### Step 6: Merge Back to Main and Develop
After 30+ minutes of stable operation:

```bash
# Merge release branch back to main (already done by CD)
# Then merge to develop to ensure alignment

git fetch origin
git checkout develop
git merge origin/release/v1.2.0
git push origin develop

# Clean up release branch
git push origin --delete release/v1.2.0
```

---

## Release Notes Template

```markdown
# Release v1.2.0

**Released**: 2026-06-27T14:00:00Z  
**Branch**: release-v1.2.0  
**Commit**: abc123def  
**Backup ID**: backup-1719491100-abc123def

## What's New
- Feature 1: Description
- Feature 2: Description
- Bug fix 1: Description

## Database Changes
- 3 migrations included
- No destructive operations
- Backward compatible
- Rollback time estimate: < 5 minutes

## Deployment Strategy
- Blue-Green deployment
- 5-minute traffic switch window
- Zero downtime expected

## Rollback Plan
If issues detected, rollback to release-v1.1.9:
1. Trigger rollback workflow
2. Restore from backup-ID
3. Verify health checks

See: `docs/runbooks/rollback.md`

## Deployment Team
- Reviewer 1: [name]
- Reviewer 2: [name]
- On-call: [team]
```

---

## Common Issues & Troubleshooting

### Issue: Pre-deployment checks fail
**Action**:
1. Review workflow logs
2. Do NOT proceed
3. Fix issues on release branch
4. Commit fixes and re-tag
5. Re-trigger deployment

### Issue: Database migration fails
**Action**:
1. Deployment automatically pauses
2. Review migration error in logs
3. Restore from pre-deployment backup
4. Fix migration SQL
5. Test on staging first
6. Commit fix and re-tag

### Issue: Health checks fail post-deployment
**Action**:
1. Automatic Blue-Green rollback triggered
2. Old version (Green) still serving traffic
3. Review error logs
4. Fix issue
5. Re-tag and retry deployment
6. See: `docs/runbooks/rollback.md`

---

## Post-Release Checklist (T+1h)
- [ ] All health checks green
- [ ] Error rate normal
- [ ] Database connections healthy
- [ ] No unexpected errors in logs
- [ ] Release notes published
- [ ] Team notified of successful deployment
- [ ] Monitoring alerts configured

---

## Escalation Contacts
- **Deployment failed**: @team/devops
- **Data issues**: @team/database
- **API issues**: @team/backend
- **Frontend issues**: @team/frontend
- **Emergency/Incident**: @team/platform (on-call)

---

**Last Updated**: 2026-06-27  
**Owner**: @team/devops

# CI/CD Infrastructure & Production Deployment Guide

## Overview

This repository contains a **production-grade CI/CD pipeline** for the Brand is Code client portal platform. The setup ensures code quality, security, data integrity, and operational reliability.

### Core Principles
✅ **Quality Gates First**: All code must pass automated checks before merge  
✅ **Security by Default**: Secrets scanned, dependencies audited, migrations validated  
✅ **Data-Safe Deployments**: Backups created, migrations backward-compatible, rollback always available  
✅ **Zero Downtime**: Blue-Green deployment with automatic health checks  
✅ **Transparency**: All deployments logged, auditable, reviewable  

---

## Quick Navigation

| Document                                                                    | Purpose                                 |
| --------------------------------------------------------------------------- | --------------------------------------- |
| [CI/CD Architecture](./docs/CI-CD-ARCHITECTURE.md)                          | System design + flow diagrams           |
| [Branch Protection Policy](../.github/policies/BRANCH_PROTECTION_POLICY.md) | Branching strategy + approval rules     |
| [Release Runbook](./docs/runbooks/release.md)                               | Step-by-step production release process |
| [Rollback Runbook](./docs/runbooks/rollback.md)                             | Emergency rollback procedures           |
| [Incident Response](./docs/runbooks/incident-response.md)                   | How to handle production incidents      |
| [Production Checklist](./docs/PRODUCTION-RELEASE-CHECKLIST.md)              | Pre/during/post deployment verification |
| [Security Policy](./SECURITY.md)                                            | Data protection, secrets, compliance    |
| [Remaining Risks](./docs/REMAINING-RISKS.md)                                | Known risks & mitigation roadmap        |

---

## Branching Strategy

### Production Branches
```
main                    ← Production environment (protected)
  ↑
  └─ release/*          ← Release candidates
  └─ hotfix/*           ← Emergency production fixes

develop                 ← Integration/staging (protected)
  ↑
  └─ feature/*          ← Feature branches (short-lived)
```

### Branch Rules
- **`main`**: Production-ready code only
  - Requires: 2 approvals + all CI checks pass
  - Deploy via: tag `release-vX.Y.Z`
  
- **`develop`**: Integration branch
  - Requires: 1 approval + CI checks pass
  - Auto-deploys to staging
  
- **Feature branches**: Do your work here
  - Created from: `develop`
  - Must pass PR checks before merge
  - Deleted after merge (no accumulation)

---

## Deployment Pipeline

### Stage 1: Pull Request Quality Gates ✅
**Trigger**: PR opened/updated targeting main or develop  
**Duration**: ~5-10 minutes  

```yaml
Jobs (parallel):
  - Lint & code quality
  - Type safety (TypeScript compiler)
  - Unit tests
  - Build verification
  - Dependency vulnerability scan
  - Secret credential scan
  - Database migration safety check
```

**Result**: PR is mergeable only if ALL checks pass ✅

---

### Stage 2: Staging Continuous Deployment 🚀
**Trigger**: Merge to `develop` branch  
**Duration**: ~10-15 minutes  

```yaml
Jobs (sequential):
  - Build artifact
  - Database migration dry-run & validation
  - Deploy to staging.example.com
  - Run smoke tests (health check, auth, API)
  - Perform health checks
  
On failure:
  - Auto-rollback to previous version
  - Team alerted
  - Fix issues and retry
```

**Result**: Staging environment updated with latest code + changes available for QA

---

### Stage 3: Production Continuous Deployment 🟢
**Trigger**: Tag `release-*` OR manual workflow dispatch from main  
**Duration**: ~20-30 minutes  
**Requires**: 2 approvals from authorized reviewers  

```yaml
Jobs (sequential with safety stops):
  1. Pre-deployment validation
  2. Create database backup + checkpoint
  3. Execute backward-compatible migrations
  4. Build production artifact
  5. Deploy to BLUE (new version)
  6. Health checks on BLUE
  7. Smoke tests on BLUE
  8. Switch traffic: GREEN → BLUE
  9. Post-deployment monitoring
  
On failure (any step):
  - Auto-rollback: restore database from backup
  - Traffic stays on GREEN (old version)
  - Team alerted immediately
  - Incident response triggered
```

**Result**: Production live on new version OR automatically rolled back

---

## Environment Setup

### GitHub Environments
1. **staging** (auto-deploy)
   - Deploys automatically on merge to develop
   - Secrets: staging-specific API keys only
   
2. **production** (manual approval)
   - Requires 2 reviewers to approve deployment
   - Secrets: production-only, rotated monthly

### Secrets Configuration (Complete Matrix)

Store these in GitHub Secrets (not in code). **NEVER commit secrets to Git.**

#### Required GitHub Secrets

| Secret Name             | Purpose                         | Used In                         | Where to Get               | Rotation        |
| ----------------------- | ------------------------------- | ------------------------------- | -------------------------- | --------------- |
| `VERCEL_TOKEN`          | Deploy to Vercel                | 02-staging-cd, 03-production-cd | Vercel > Settings > Tokens | Every 90 days   |
| `GITGUARDIAN_API_KEY`   | Secret scanning in PR           | 01-pr-checks                    | GitGuardian dashboard      | Every 180 days  |
| `SUPABASE_ACCESS_TOKEN` | Database backup/restore API     | 03-production-cd                | Supabase org settings      | Every 180 days  |
| `SUPABASE_PROJECT_ID`   | Identify which Supabase project | 03-production-cd                | Supabase project dashboard | N/A (static ID) |

#### GitHub Environments

**Staging Environment**:
- Secrets: SUPABASE_URL_STAGING, SUPABASE_ANON_KEY_STAGING
- Approvals required: 0 (auto-deploy)
- Deployment URL: `https://staging.example.com`

**Production Environment**:
- Secrets: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_DB_URL
- Approvals required: 2 (manual approval gate)
- Deployment URL: `https://example.com`
- Teams with access: @devops, @platform, @engineering-leads

#### Environment Variables (via Vercel)

Set in Vercel project settings:
```
NEXT_PUBLIC_SUPABASE_URL=https://[project-id].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[your-anon-key]
```

#### Local Development Setup

Create `.env.local` (git-ignored):
```bash
# Copy staging credentials for local development
NEXT_PUBLIC_SUPABASE_URL=https://[staging-project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[staging-anon-key]
SUPABASE_SERVICE_ROLE_KEY=[service-role-key]
```

**Never use production secrets locally.**

---

## How to Release (Step-by-Step)

### Quick Start: Release to Production
```bash
# 1. Ensure your code is merged to develop
git checkout develop
git pull origin develop

# 2. Create release branch
git checkout -b release/v1.2.0
git push origin release/v1.2.0

# 3. Final testing on release branch (in staging)
# Wait for staging to deploy...
# Run manual QA...

# 4. Create Git tag (signals exact commit to deploy)
git tag -a release-v1.2.0 \
  -m "Release v1.2.0 - [Feature summary]"
git push origin release-v1.2.0

# 5. This triggers production deployment (GitHub Actions)
# Monitor: GitHub Actions > Workflows > 03-production-cd.yml
```

**For full details, see**: [Release Runbook](./docs/runbooks/release.md)

---

## Incident Response

### If Production Breaks

**Step 1: Assess (< 2 min)**
- Is it the recent deployment? (likely yes if < 10 min old)
- Check health endpoint: `https://example.com/api/health`
- Check error rate: `curl https://example.com/api/health/status`

**Step 2: Decide (< 3 min)**
- Can we fix it quickly in code? → Hotfix branch
- Is data corrupted? → ROLLBACK immediately
- Is database migration broken? → ROLLBACK immediately

**Step 3: Rollback (if needed)**
```bash
# Trigger rollback via GitHub Actions
gh workflow run 03-production-cd.yml \
  -f deploy_target=rollback \
  -f rollback_version=v1.1.9 \
  -f backup_id=backup-[previous-backup-id]
```

**Step 4: Investigate & Fix**
- Review logs, identify root cause
- Fix on develop branch
- Test on staging
- Re-release when ready

**For full details, see**: [Incident Response](./docs/runbooks/incident-response.md)

---

## Pre-Production Checklist

Use this before every release:

- [ ] All features merged to develop
- [ ] All CI checks passing (lint, build, tests, security)
- [ ] Staging environment stable (24+ hours)
- [ ] Staging smoke tests passing
- [ ] Manual QA sign-off completed
- [ ] All database migrations reviewed
- [ ] Backup system tested
- [ ] Rollback plan documented
- [ ] On-call team notified
- [ ] Release notes prepared

**Full checklist**: [Production Release Checklist](./docs/PRODUCTION-RELEASE-CHECKLIST.md)

---

## Security & Data Protection

### What We Protect
✅ Customer data (never in logs, never in Git)  
✅ API credentials (secrets in GitHub only)  
✅ Database integrity (migrations tested, backups available)  
✅ Access control (approvals required, audit logs)  

### What NOT to Commit
❌ .env.local files  
❌ Customer documents (brandiscode/, paasdijkweg-bijlage/)  
❌ Credentials or API keys  
❌ Private spreadsheets or quotes  

**See**: [Security Policy](./SECURITY.md) & [.gitignore](../.gitignore)

---

## Monitoring & Health Checks

### Critical Endpoints
```
GET /api/health              → App status + version
GET /api/health/db           → Database connectivity
GET /api/health/auth         → Auth service status
GET /api/health/api          → Core API responding
```

### Alert Triggers
| Metric             | Threshold | Action        |
| ------------------ | --------- | ------------- |
| Error rate         | > 1%      | Page on-call  |
| Response time      | > 5s P95  | Alert team    |
| Database CPU       | > 80%     | Notify DevOps |
| Deployment failure | Any       | Auto-rollback |

---

## Team & Contacts

| Role            | Responsibility              | Contact                      |
| --------------- | --------------------------- | ---------------------------- |
| Developers      | Write code, create PRs      | @team/frontend @team/backend |
| Reviewers       | Approve code changes        | @team/all (code owners)      |
| Database Admin  | Review migrations           | @team/database               |
| DevOps/Platform | Deploy, monitor, incidents  | @team/devops @team/platform  |
| On-Call         | Handle production incidents | [On-call rotation]           |

---

## Common Questions

### Q: Can I deploy directly to production?
**A**: No. Production requires: tag + 2 approvals + GitHub Actions automation. This prevents individual mistakes.

### Q: What if I need to rollback?
**A**: Trigger rollback via GitHub Actions. Database automatically restored from pre-deployment backup. See [Rollback Runbook](./docs/runbooks/rollback.md).

### Q: Can I merge without a PR?
**A**: No. All code must go through PR with:
- Passing CI checks (lint, build, tests, security)
- At least 1 reviewer approval (main requires 2)
- Code owners sign-off (if applicable)

### Q: What if tests fail on a PR?
**A**: PR cannot merge. Fix code locally, push changes, GitHub re-runs tests automatically.

### Q: How long does a release take?
**A**: ~90 minutes total (including all checks + approvals). Actual deployment is 20-30 minutes.

### Q: Is there downtime during deployment?
**A**: No. Blue-Green deployment ensures zero downtime. Old version (Green) stays live until new version (Blue) is verified, then traffic switches instantly.

---

## Workflow Files

All GitHub Actions workflows are in `.github/workflows/`:

| File                   | Trigger                   | Purpose                  |
| ---------------------- | ------------------------- | ------------------------ |
| `01-pr-checks.yml`     | PR opened/updated         | Quality & security gates |
| `02-staging-cd.yml`    | Merge to develop          | Deploy to staging        |
| `03-production-cd.yml` | Tag release-* or dispatch | Deploy to production     |

---

## Key Metrics

Track these to measure deployment effectiveness:

- **Deployment Frequency**: How often we release (target: daily)
- **Lead Time**: Commit → production (target: < 2 hours)
- **Change Failure Rate**: % of deployments causing incidents (target: < 15%)
- **MTTR**: Mean time to recovery (target: < 15 minutes)
- **Success Rate**: % of deployments that don't require rollback (target: > 95%)

---

## Next Steps

1. **Understand the system**: Read [CI/CD Architecture](./docs/CI-CD-ARCHITECTURE.md)
2. **Learn the rules**: Review [Branch Protection Policy](../.github/policies/BRANCH_PROTECTION_POLICY.md)
3. **Do a release**: Follow [Release Runbook](./docs/runbooks/release.md)
4. **Handle incidents**: Bookmark [Incident Response](./docs/runbooks/incident-response.md)
5. **Ask questions**: Contact @team/platform-lead

---

## Additional Resources

- **GitHub Actions Docs**: https://docs.github.com/en/actions
- **Supabase Migrations**: https://supabase.com/docs/guides/migrations
- **OWASP Security**: https://owasp.org/www-project-top-ten/
- **Database Best Practices**: https://databasesoup.com/

---

## Version History

| Version | Date       | Changes                      |
| ------- | ---------- | ---------------------------- |
| 1.0     | 2026-06-27 | Initial CI/CD infrastructure |
| 1.1     | TBD        | Multi-region DR (planned)    |
| 2.0     | TBD        | Canary deployments (planned) |

---

**Questions?** Reach out to @team/platform  
**Incident?** Follow [incident-response.md](./docs/runbooks/incident-response.md)  
**Feedback?** Create issue on GitHub or discuss in team Slack  

---

**Last Updated**: 2026-06-27  
**Owner**: @team/platform  
**Status**: ✅ Production Ready

---

## GitHub Setup Checklist (One-Time Configuration)

Complete these steps **ONE TIME** when setting up the repository for CI/CD:

### Step 1: Create GitHub Secrets
**Path**: Settings > Secrets and variables > Actions

Add these secrets:
- [ ] `VERCEL_TOKEN` (get from Vercel dashboard)
- [ ] `GITGUARDIAN_API_KEY` (get from GitGuardian)
- [ ] `SUPABASE_ACCESS_TOKEN` (get from Supabase org settings)
- [ ] `SUPABASE_PROJECT_ID` (get from Supabase dashboard, e.g., abcdefg123456)

### Step 2: Create GitHub Environments
**Path**: Settings > Environments

**Create `staging` environment**:
- Deployment branches: `develop`
- Required reviewers: None
- Auto-deploy on merge to develop

**Create `production` environment**:
- Deployment branches: `main` only
- Required reviewers: 2 people from @devops or @platform team
- Manual approval before each deploy

### Step 3: Configure Branch Protection
**Path**: Settings > Branches > Branch protection rules

**For `develop` branch**:
- ✅ Require PR before merging
- ✅ Require 1 approval
- ✅ Require CI checks: `01-pr-checks`
- ✅ Dismiss stale PRs

**For `main` branch**:
- ✅ Require PR before merging
- ✅ Require 2 approvals
- ✅ Require CI checks: `01-pr-checks`
- ✅ Include administrators

### Step 4: Test the Pipeline
1. Create test PR to develop
2. Verify: 01-pr-checks runs
3. Merge PR
4. Verify: 02-staging-cd deploys to staging
5. Create tag: `git tag release-v0.0.1-test && git push origin release-v0.0.1-test`
6. Verify: 03-production-cd runs (approve when prompted)


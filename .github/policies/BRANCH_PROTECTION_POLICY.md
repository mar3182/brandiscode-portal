# Branch Protection & Environment Governance Policy

## Overview
This document defines the branching strategy, protection rules, and environment approval workflows for the Brand is Code client portal platform. These rules ensure code quality, security, and data integrity.

---

## Branching Strategy

### Branch Naming Convention
- **Production**: `main` (protected)
- **Integration**: `develop` (protected)
- **Features**: `feature/*` (short-lived, max 2 weeks)
- **Hotfixes**: `hotfix/*` (for production incidents)
- **Releases**: `release/*` (release preparation)

### Branch Lifetime Rules
- Feature branches must be deleted after merge
- Hotfix branches deleted after merge to both main and develop
- No permanent long-lived branches except main/develop

---

## Protection Rules

### `main` Branch (Production)
**Goal**: Ensure only tested, approved, production-ready code goes live.

#### Required Status Checks:
- ✅ `PR Quality & Security Gates` (all sub-jobs)
- ✅ `Build Artifact` (must succeed)
- ✅ `Type Safety Check` (must succeed)
- ✅ `Dependency Vulnerability Scan` (must pass audit-level=moderate)
- ✅ `Secret & Credential Scan` (must pass)
- ✅ `Database Migration Safety Validation` (no unsafe patterns)

#### Approval Requirements:
- **Minimum reviewers**: 2
- **Dismiss stale approvals**: YES
- **Require code owners review**: YES
- **Allow auto-merge**: NO (manual merge only)
- **Require up-to-date branches**: YES

#### Merge Strategy:
- **Allowed methods**: Squash merge (linear history)
- **Rationale**: Clean commit history, easy to revert

#### Requirements Before Merge:
- All conversations resolved
- All required status checks passing
- All requested reviews approved
- Up-to-date with develop branch
- No conflicts

### `develop` Branch (Integration)
**Goal**: Maintain a working integration point for features.

#### Required Status Checks:
- ✅ `PR Quality & Security Gates` (linting, typecheck, build, security)
- ✅ `Database Migration Safety Validation`

#### Approval Requirements:
- **Minimum reviewers**: 1
- **Dismiss stale approvals**: YES
- **Require code owners review**: YES

#### Merge Strategy:
- **Allowed methods**: Squash merge
- **Auto-merge**: YES (if all checks pass)

#### Requirements:
- All conversations resolved
- All status checks passing
- At least 1 approval

### Feature Branches (`feature/*`)
**No direct protection**; PRs targeting main/develop inherit target branch rules.

### Hotfix Branches (`hotfix/*`)
**Fast-track to production with mandatory immediate testing**:
- Hotfix PRs require: 2 approvals + all status checks
- Hotfix bypasses develop integration; goes direct to main
- After main merge, hotfix must also merge back to develop

---

## GitHub Environments

### Staging Environment
**Purpose**: QA and integration testing before production.

#### Access Control:
- Deployment allowed from: `develop` branch, any commits
- Required reviewers: None (automated)
- Secrets scope: Staging-specific keys only
- Auto-rollback: YES (on failed health checks)

#### Deployment Policy:
```yaml
Environment: staging
Deployment branch protection: No
Required reviewers: None
Secrets: 
  - SUPABASE_URL_STAGING
  - SUPABASE_KEY_STAGING
Retention: 7 days
```

### Production Environment
**Purpose**: Live customer-facing application.

#### Access Control:
- Deployment allowed from: `main` branch, release tags only (`release-*`)
- Required reviewers: 2 (must include DevOps/Platform team)
- Secrets scope: Production keys only
- Manual approval: REQUIRED

#### Deployment Policy:
```yaml
Environment: production
Deployment branch protection: YES
Allowed branches: main, release-*
Required reviewers: 
  - @team/devops
  - @team/platform (at least one)
Secrets:
  - SUPABASE_URL_PROD
  - SUPABASE_KEY_PROD
  - DATABASE_BACKUP_KEY
Retention: 90 days (audit trail)
Concurrent deployments: 1 (serialized)
```

#### Production Approval Checklist:
Before approving a production deployment, reviewers must verify:
- [ ] All CI checks passing (green)
- [ ] Staging smoke tests passed
- [ ] Database migrations tested on staging
- [ ] Release notes/changelog present
- [ ] Backup created and verified
- [ ] Rollback plan documented
- [ ] No breaking API changes
- [ ] No data loss risks

---

## Review & Approval Process

### Code Review Requirements
1. **Submitter**: Creates PR with description, links to issues
2. **Automated checks**: CI/CD runs automatically
3. **Code owners**: GitHub auto-requests reviewers based on CODEOWNERS file
4. **Team lead**: Reviews for architecture/domain concerns
5. **DevOps reviewer** (main only): Reviews deployment plan, security, data safety

### Approval Guidelines
| Domain                   | Minimum Reviewers | Reviewer Type                     |
| ------------------------ | ----------------- | --------------------------------- |
| Frontend (client-portal) | 1                 | @team/frontend                    |
| Backend/API              | 1                 | @team/backend                     |
| Database/Migrations      | 2                 | @team/database + @team/backend    |
| Infrastructure           | 2                 | @team/devops + @team/platform     |
| Security                 | 1                 | @team/platform (security-focused) |

### Dismissing Approvals
Stale approvals are automatically dismissed when:
- New commits are pushed to the PR
- New security issues are detected
- Migration files are modified

---

## Secrets Management

### Storing Secrets in GitHub
1. **Never in code**: Use `.env.local` (ignored by Git)
2. **GitHub Secrets**: Use `Settings > Secrets and variables > Actions`
3. **Environment secrets**: Scoped per environment (staging/production)
4. **Rotation**: Rotate all secrets monthly

### Secret Naming Convention
```
SUPABASE_URL_STAGING
SUPABASE_KEY_STAGING
DATABASE_BACKUP_KEY_PROD
API_KEY_EXTERNAL_SERVICE
```

### Audit Logging
- All secret access logged by GitHub Actions
- Check `Settings > Security > Audit log`
- Review monthly for unauthorized access

---

## Data Protection Policy

### Client Data Handling
- **Never commit**: Customer data, credentials, API keys, private documents
- **Ignore patterns**: See `.gitignore`
- **Artifacts**: Purged within 24 hours (no customer data)
- **Logs**: Sanitized before upload (no secrets/PII)

### Database Migration Safety
All migrations must follow **expand-and-contract pattern**:

#### Forbidden (same release):
```sql
❌ ALTER TABLE clients DROP COLUMN old_field;  -- In same release as code change
❌ ALTER TABLE clients RENAME COLUMN old TO new;  -- Rename only
```

#### Allowed (safe pattern):
```sql
✅ -- Release 1
   ALTER TABLE clients ADD COLUMN new_field TEXT;
   UPDATE clients SET new_field = old_field;
   
✅ -- Release 2 (after verifying new_field is populated)
   ALTER TABLE clients DROP COLUMN old_field;
```

### Rollback-Safe Migrations
Every migration must include:
1. **Purpose**: What does this migration do?
2. **Rollback**: How to undo it
3. **Validation**: Query to verify success
4. **Risks**: What could go wrong?

Example:
```sql
-- MIGRATION PURPOSE: Add payment tracking fields to clients table
-- RISK: Adds columns; no data loss; backward compatible

ALTER TABLE clients ADD COLUMN IF NOT EXISTS last_payment_date TIMESTAMPTZ;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending';

-- VALIDATION: Check new columns exist and are populated
SELECT COUNT(*) FROM clients WHERE last_payment_date IS NOT NULL;

-- ROLLBACK: ALTER TABLE clients DROP COLUMN last_payment_date;
--           ALTER TABLE clients DROP COLUMN payment_status;
```

---

## Enforcement & Automation

### GitHub Actions Automation
1. **Auto-dismiss stale approvals**: Enabled
2. **Require status checks**: Enforced
3. **Require updated branches**: Enforced
4. **Auto-delete head branches**: Enabled (after merge)

### Deployment Automation
1. **Staging**: Auto-deploys on merge to develop (no approval needed)
2. **Production**: Requires manual trigger + 2 approvals
3. **Rollback**: Manual trigger via GitHub Actions `workflow_dispatch`

### Audit & Compliance
- All deployments logged with commit SHA, approver, timestamp
- Deployment history retained for 90 days
- Access logs available in GitHub Audit Log

---

## Incident Response

### Production Hotfix Process
1. Create `hotfix/incident-description` from main
2. Fix issue, write tests
3. Create PR to main: requires 2 approvals + all checks
4. After main merge: immediately create PR back to develop
5. Both PRs must pass approval before merging
6. Deployment automatically triggered after main merge approval

### Emergency Access (Break Glass)
**Only in critical incidents where customer data is at risk:**

1. Create `emergency/incident-XXX` from main
2. Document incident in PR description
3. Notify @team/platform immediately
4. Override branch protection **only with Platform Lead approval**
5. Post-mortem required within 24 hours

---

## Implementation Checklist

### Setup Steps
- [ ] Enable branch protection for `main`
- [ ] Enable branch protection for `develop`
- [ ] Create GitHub Environments: `staging`, `production`
- [ ] Configure environment protection rules
- [ ] Add required status checks to workflows
- [ ] Upload CODEOWNERS file
- [ ] Store secrets in GitHub (non-test values)
- [ ] Configure audit logging
- [ ] Brief team on approval process

### Monitoring
- [ ] Weekly review of deployment history
- [ ] Monthly security audit (check secrets access)
- [ ] Quarterly review of branch protection rules
- [ ] After every production incident: postmortem + policy update

---

## Questions & Escalation

| Question                    | Contact                  |
| --------------------------- | ------------------------ |
| Branch protection questions | @team/platform           |
| Secret management           | @team/devops             |
| Deployment approval         | @team/platform           |
| Emergency/incident          | @team/platform (on-call) |

---

**Policy Version**: 1.0  
**Last Updated**: 2026-06-27  
**Next Review**: 2026-09-27

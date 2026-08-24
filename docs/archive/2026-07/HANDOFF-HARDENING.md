# Handoff Document: CI/CD Hardening & Go-Live Candidate

**Prepared for**: Next AI Code Agent / Next Engineer  
**Date**: 2026-06-27  
**Status**: Ready for Implementation  
**Scope**: Harden + fix existing workflows into production-ready state  

---

## Executive Summary

The current CI/CD setup (`01-pr-checks.yml`, `02-staging-cd.yml`, `03-production-cd.yml`) has **7 critical issues** that prevent go-live:

1. **Quality gates are too permissive** (continue-on-error allows failures to pass)
2. **Database migration path is wrong** (searches root `supabase/` not `client-portal/supabase/`)
3. **Staging deploy is simulated only** (echo statements, no real deployment)
4. **Production checks don't verify CI properly** (uses commit signature instead of required status checks)
5. **Blue-Green rollback is placeholder** (no real backup restore logic)
6. **GitHub API calls incorrect for context** (issue_comment in push events, missing deployment status)
7. **Secrets/environment setup not documented** (unclear what GitHub settings are needed)

**Goal for next agent**: Fix all 7 issues, make workflows hard-fail on real problems, remove placeholders.

---

## Problems Identified (Detailed)

### Problem 1: Quality Gates Too Permissive

**Current issue** (01-pr-checks.yml):
```yaml
- name: Run ESLint
  run: cd client-portal && npm run lint
  continue-on-error: true  # ❌ WRONG: Lint fails don't block merge

- name: Run tests
  run: cd client-portal && npm test
  continue-on-error: true  # ❌ WRONG: Test failures ignored
```

**Why risky**: PR can be merged with failing tests/lint. No actual quality gate.

**Fix required**: Remove `continue-on-error: true` from ALL checks except:
- Optional reporting steps (e.g., "upload test coverage")
- Informational scans (if tool not critical)

**How to verify**: After fix, failing test should prevent merge.

---

### Problem 2: Database Migration Path Wrong

**Current issue** (01-pr-checks.yml):
```yaml
- name: Validate migration files
  run: |
    for migration in supabase/migration-*.sql; do
      # ❌ WRONG: Searches root supabase/ not client-portal/supabase/
```

**Why risky**: Migrations in `client-portal/supabase/migration-*.sql` are not checked.

**Expected structure**:
```
client-portal/supabase/
├── migration-client-profile.sql
├── migration-facturen.sql
├── migration-onboarding.sql
└── schema.sql
```

**Fix required**: Change glob pattern to `client-portal/supabase/migration-*.sql`

**How to verify**: Create test migration in correct path, verify it gets validated.

---

### Problem 3: Staging Deploy is Placeholder

**Current issue** (02-staging-cd.yml):
```yaml
- name: Deploy to staging (simulated)
  run: |
    echo "🚀 Deploying to staging..."
    # In production: use rsync, scp, or deployment service
    # rsync -avz ./staging-build/ user@staging-server:/app/

- name: Run smoke tests
  run: |
    cat > smoke-tests.js << 'EOF'
    # ... pseudo-test code ...
```

**Why risky**: Workflow appears to succeed even though nothing real happens.

**Fix required**: Replace with EITHER:
- **Option A**: Real deployment (rsync/SSH to staging server, require secrets)
- **Option B**: Fail-safe placeholder (explicitly state "requires manual deployment", fail if not configured)

**Action needed**: Clarify where staging actually runs:
- Docker container?
- AWS EC2/App Runner?
- Vercel/Netlify preview?
- Supabase preview branch?

**For now**: Add explicit check:
```yaml
- name: Verify staging deployment target configured
  run: |
    if [ -z "$STAGING_DEPLOYMENT_URL" ]; then
      echo "❌ STAGING_DEPLOYMENT_URL secret not configured"
      echo "Configure in GitHub Secrets or update workflow"
      exit 1
    fi
```

---

### Problem 4: Production "CI Passed" Check is Wrong

**Current issue** (03-production-cd.yml):
```yaml
- name: Verify all CI checks passed
  uses: actions/github-script@v7
  with:
    script: |
      const commit = await github.rest.repos.getCommit(...);
      const allChecksPassed = commit.data.commit.verification && 
                              commit.data.commit.verification.verified;
      # ❌ WRONG: Checks commit signature, not required status checks
```

**Why risky**: Doesn't actually verify PR checks passed. A commit could have bad tests but be "verified" signature-wise.

**Fix required**: Check actual required status checks:
```yaml
- name: Verify all required status checks passed
  uses: actions/github-script@v7
  with:
    script: |
      const checks = await github.rest.checks.listForRef({
        owner: context.repo.owner,
        repo: context.repo.repo,
        ref: context.sha
      });
      
      const requiredChecks = [
        'Lint & Code Quality',
        'Type Safety Check',
        'Build Artifact',
        'Dependency Vulnerability Scan',
        'Secret & Credential Scan'
      ];
      
      for (const check of requiredChecks) {
        const found = checks.data.check_runs.find(c => c.name === check);
        if (!found || found.conclusion !== 'success') {
          throw new Error(`Required check '${check}' did not pass`);
        }
      }
```

**How to verify**: Create PR with failing test, try to deploy → should fail with clear message.

---

### Problem 5: Blue-Green Rollback is Placeholder

**Current issue** (03-production-cd.yml):
```yaml
- name: Initiate automatic rollback
  run: |
    echo "⚠️  Deployment failed - initiating rollback..."
    echo "Backup ID: ${{ needs.database-checkpoint.outputs.backup-id }}"
    # ❌ WRONG: Just echo statements, no actual rollback
```

**Why risky**: Tells users rollback is happening but doesn't actually happen.

**Fix required**: Implement REAL rollback based on infrastructure:

**If using Vercel/Netlify**:
```yaml
- name: Rollback to previous deployment
  run: |
    # Example for Vercel:
    vercel rollback --token=${{ secrets.VERCEL_TOKEN }} \
      --scope=${{ secrets.VERCEL_TEAM_ID }}
```

**If using SSH/rsync**:
```yaml
- name: Rollback to previous version
  run: |
    ssh user@prod-server "
      cd /app && \
      git fetch && \
      git checkout $PREVIOUS_VERSION && \
      npm run build && \
      systemctl restart app
    "
```

**If using Supabase (DB only)**:
```yaml
- name: Restore database from backup
  run: |
    supabase db restore \
      --backup-id=${{ needs.database-checkpoint.outputs.backup-id }} \
      --project-ref=${{ secrets.SUPABASE_PROJECT_REF }}
```

**For now** (until deployment target known): Make explicit:
```yaml
- name: Fail with rollback instructions
  run: |
    echo "❌ DEPLOYMENT FAILED"
    echo "Rollback required. Follow: docs/runbooks/rollback.md"
    echo "Backup ID: ${{ needs.database-checkpoint.outputs.backup-id }}"
    echo ""
    echo "Manual steps:"
    echo "1. SSH to production server"
    echo "2. git checkout previous-tag"
    echo "3. Restore DB from backup"
    exit 1
```

---

### Problem 6: GitHub API Calls Incorrect

**Current issue** (02-staging-cd.yml):
```yaml
- name: Comment lint results
  if: failure()
  uses: actions/github-script@v7
  with:
    script: |
      github.rest.issues.createComment({
        issue_number: context.issue.number,  # ❌ WRONG: No issue in push context
        # ...
      })
```

**Why risky**: Script fails because `context.issue` is undefined on push/tag events.

**Fix required**:
- Use `createCommitComment` for push events
- Use `createIssueComment` for PR events
- Or use job summaries (better):

```yaml
- name: Generate summary
  if: failure()
  run: |
    cat >> $GITHUB_STEP_SUMMARY << EOF
    ## ❌ Staging Deployment Failed
    
    Smoke tests did not pass. Review logs above.
    EOF
```

---

### Problem 7: Unclear GitHub Setup

**Current issue**: Docs mention GitHub Environments and Secrets but don't specify:
- What secrets are required
- What environments must exist
- What branch protection rules are needed
- Which users need access

**Fix required**: Create concrete checklist (see section below).

---

## What Needs to be Fixed (Priority Order)

### TIER 1: Hard-blocking Issues (Fix First)

| Issue                    | File                 | Fix                                           | Impact                           |
| ------------------------ | -------------------- | --------------------------------------------- | -------------------------------- |
| Permissive quality gates | 01-pr-checks.yml     | Remove `continue-on-error` from critical jobs | PRs fail if tests/lint fail      |
| Migration path wrong     | 01-pr-checks.yml     | Change glob to `client-portal/supabase/`      | Migrations are actually checked  |
| CI check verification    | 03-production-cd.yml | Use check run API, not commit signature       | Verify real status checks passed |
| Deployment is simulated  | 02-staging-cd.yml    | Replace placeholders or explicit fail-safe    | Know if deploy actually ran      |

### TIER 2: Important for Safety (Fix Second)

| Issue                  | File                 | Fix                               | Impact                            |
| ---------------------- | -------------------- | --------------------------------- | --------------------------------- |
| Rollback is simulated  | 03-production-cd.yml | Implement real rollback logic     | Can actually recover from failure |
| GitHub API calls wrong | 02/03-*.yml          | Use correct event contexts        | Notifications actually send       |
| Secrets not documented | docs + workflows     | Create explicit requirements list | Know what to configure in GitHub  |

### TIER 3: Nice-to-Have (Fix if time)

| Issue                        | File      | Fix                                 | Impact                 |
| ---------------------------- | --------- | ----------------------------------- | ---------------------- |
| No deployment target clarity | docs      | Document where app actually deploys | Easier for next person |
| Limited error messages       | workflows | Add debugging context               | Easier troubleshooting |

---

## Specific Changes Required

### File: `.github/workflows/01-pr-checks.yml`

#### Change 1: Remove Continue-on-Error from Critical Jobs
**Before**:
```yaml
- name: Run ESLint
  run: cd client-portal && npm run lint
  continue-on-error: true
```

**After**:
```yaml
- name: Run ESLint
  run: cd client-portal && npm run lint
  # NO continue-on-error - fails the job if lint fails
```

**Apply to**: ESLint, TypeScript compiler, build, tests, dependency audit, secret scan

**Rationale**: These are quality gates. If they fail, PR should not merge.

---

#### Change 2: Fix Migration Path
**Before**:
```yaml
- name: Validate migration files
  run: |
    FAILED=0
    for migration in supabase/migration-*.sql; do
      echo "Checking migration: $migration"
```

**After**:
```yaml
- name: Validate migration files
  run: |
    FAILED=0
    for migration in client-portal/supabase/migration-*.sql; do
      echo "Checking migration: $migration"
      # Also check if file exists, otherwise skip (no migrations in this PR)
      if [ ! -f "$migration" ]; then
        continue
      fi
```

**Rationale**: Migrations live in client-portal subdirectory.

---

#### Change 3: Hard-Fail on Security Scans
**Before**:
```yaml
- name: Run GitGuardian
  uses: GitGuardian/ggshield-action@v1
  if: always()
  env:
    GITGUARDIAN_API_KEY: ${{ secrets.GITGUARDIAN_API_KEY }}
  with:
    # ...

- name: Comment lint results
  if: failure()
  # ... may fail if GITGUARDIAN_API_KEY not set
```

**After**:
```yaml
- name: Run GitGuardian (if configured)
  uses: GitGuardian/ggshield-action@v1
  if: secrets.GITGUARDIAN_API_KEY != ''  # Skip if not configured
  env:
    GITGUARDIAN_API_KEY: ${{ secrets.GITGUARDIAN_API_KEY }}
  with:
    path: ./
    enable-infra-scans: true

- name: Warn if GitGuardian not configured
  if: secrets.GITGUARDIAN_API_KEY == ''
  run: |
    echo "⚠️  GitGuardian API key not configured (optional for development)"
    echo "To enable secret scanning, add GITGUARDIAN_API_KEY to GitHub Secrets"
```

**Rationale**: If API key not set, don't break workflow, but warn user.

---

#### Change 4: Add Migration Safety Check Output
**Before**:
```yaml
- name: Comment migration status
  if: always()
  uses: actions/github-script@v7
  with:
    script: |
      github.rest.issues.createComment({
        # May fail if no issue in context
```

**After**:
```yaml
- name: Summary - Migration Safety
  if: always()
  run: |
    echo "Migration Safety Check Summary" >> $GITHUB_STEP_SUMMARY
    echo "---" >> $GITHUB_STEP_SUMMARY
    
    MIGRATIONS=$(find client-portal/supabase -name "migration-*.sql" -type f 2>/dev/null | wc -l)
    echo "✅ Migrations found: $MIGRATIONS" >> $GITHUB_STEP_SUMMARY
    
    if [ "$MIGRATIONS" -gt 0 ]; then
      echo "⚠️  Review migration comments for safety metadata:" >> $GITHUB_STEP_SUMMARY
      echo "- MIGRATION PURPOSE" >> $GITHUB_STEP_SUMMARY
      echo "- RISK assessment" >> $GITHUB_STEP_SUMMARY
      echo "- ROLLBACK instructions" >> $GITHUB_STEP_SUMMARY
    fi
```

**Rationale**: Use job summary instead of issue comment (works on all events).

---

### File: `.github/workflows/02-staging-cd.yml`

#### Change 1: Add Deployment Target Validation
**Before** (top of file):
```yaml
name: Staging CD Pipeline

on:
  push:
    branches: [develop]
```

**After**:
```yaml
name: Staging CD Pipeline

on:
  push:
    branches: [develop]

env:
  NODE_VERSION: '20'
  REGISTRY: ghcr.io
  # STAGING_DEPLOYMENT_URL should be set in GitHub Secrets
```

---

#### Change 2: Replace Simulated Deploy with Validation
**Before**:
```yaml
- name: Deploy to staging (simulated)
  run: |
    echo "🚀 Deploying to staging..."
    echo "Build SHA: ${{ github.sha }}"
    echo "Branch: ${{ github.ref_name }}"
    
    # In production: use rsync, scp, or deployment service
    # rsync -avz ./staging-build/ user@staging-server:/app/
```

**After**:
```yaml
- name: Verify staging deployment target
  run: |
    if [ -z "${{ secrets.STAGING_DEPLOYMENT_URL }}" ]; then
      echo "❌ STAGING_DEPLOYMENT_URL not configured in GitHub Secrets"
      echo ""
      echo "To enable staging deployment, add:"
      echo "  Settings > Secrets and variables > Actions"
      echo "  Add STAGING_DEPLOYMENT_URL = https://staging.example.com"
      echo ""
      echo "For now, deployment is SKIPPED (informational only)"
      echo "Add deployment configuration to proceed."
      exit 0  # Don't fail, but warn
    fi
    echo "✅ Staging deployment URL configured: ${{ secrets.STAGING_DEPLOYMENT_URL }}"

- name: Deploy build artifact to staging
  if: secrets.STAGING_DEPLOYMENT_URL != ''
  run: |
    echo "Deploying to: ${{ secrets.STAGING_DEPLOYMENT_URL }}"
    
    # Implementation depends on deployment target:
    # Option 1: rsync to server
    # rsync -avz ./staging-build/ user@staging-server:/app/
    
    # Option 2: Upload to S3 + CloudFront
    # aws s3 sync ./staging-build/ s3://bucket-staging/ --delete
    
    # Option 3: Push to container registry
    # docker build -t staging:${{ github.sha }} .
    # docker push gcr.io/project/staging:${{ github.sha }}
    
    # For now: placeholder that fails safely if not implemented
    echo "❌ Staging deployment implementation required"
    echo "See: docs/STAGING-DEPLOYMENT-SETUP.md for configuration"
    exit 1
```

**Rationale**: Explicitly state deployment is not configured, don't simulate.

---

#### Change 3: Use Job Summaries Instead of Issue Comments
**Before**:
```yaml
- name: Comment migration status
  if: always()
  uses: actions/github-script@v7
  with:
    script: |
      github.rest.issues.createComment({
        issue_number: context.issue.number,  # ❌ undefined on push
```

**After**:
```yaml
- name: Deployment Status Summary
  if: always()
  run: |
    cat >> $GITHUB_STEP_SUMMARY << EOF
    ## 🚀 Staging Deployment Report
    
    | Item       | Value                                                     |
    | ---------- | --------------------------------------------------------- |
    | Commit SHA | \`${{ github.sha }}\`                                     |
    | Branch     | ${{ github.ref_name }}                                    |
    | Timestamp  | $(date -u +'%Y-%m-%dT%H:%M:%SZ')                          |
    | Status     | $([ "${{ job.status }}" = "success" ] && echo "✅ SUCCESS" |  | echo "❌ FAILED") |
    
    **Deployment Target**: \`${{ secrets.STAGING_DEPLOYMENT_URL }}\`
    
    **Next Steps**:
    - Run manual QA on staging
    - Check logs above for details
    - Tag release when ready: \`git tag -a release-vX.Y.Z\`
    EOF
```

**Rationale**: Job summaries work on all event types, no GitHub API context issues.

---

### File: `.github/workflows/03-production-cd.yml`

#### Change 1: Fix CI Check Verification
**Before**:
```yaml
- name: Verify all CI checks passed
  uses: actions/github-script@v7
  with:
    script: |
      const commit = await github.rest.repos.getCommit({
        owner: context.repo.owner,
        repo: context.repo.repo,
        ref: context.sha
      });
      
      const allChecksPassed = commit.data.commit.verification && 
                              commit.data.commit.verification.verified;
      
      if (!allChecksPassed) {
        console.log('⚠️ Commit checks status: review manually');
      }
```

**After**:
```yaml
- name: Verify all required status checks passed
  uses: actions/github-script@v7
  with:
    script: |
      const checks = await github.rest.checks.listForRef({
        owner: context.repo.owner,
        repo: context.repo.repo,
        ref: context.sha
      });
      
      const requiredChecks = [
        'Lint & Code Quality',
        'Type Safety Check',
        'Build Artifact',
        'Dependency Vulnerability Scan',
        'Secret & Credential Scan',
        'Database Migration Safety Validation'
      ];
      
      let allPassed = true;
      for (const checkName of requiredChecks) {
        const check = checks.data.check_runs.find(c => c.name === checkName);
        if (!check) {
          console.log(`⚠️  Check not found: ${checkName}`);
          continue;
        }
        if (check.conclusion !== 'success') {
          console.error(`❌ Required check failed: ${checkName}`);
          console.error(`   Status: ${check.status}, Conclusion: ${check.conclusion}`);
          allPassed = false;
        } else {
          console.log(`✅ ${checkName}`);
        }
      }
      
      if (!allPassed) {
        throw new Error('Not all required status checks passed. Cannot deploy.');
      }
      console.log('✅ All required status checks passed');
```

**Rationale**: Actually verify required checks, not commit signature.

---

#### Change 2: Clarify Database Backup Output
**Before**:
```yaml
- name: Create pre-deployment backup
  id: backup
  run: |
    BACKUP_ID="backup-$(date +%s)-${{ github.sha }}"
    echo "backup-id=$BACKUP_ID" >> $GITHUB_OUTPUT
```

**After**:
```yaml
- name: Create pre-deployment backup
  id: backup
  run: |
    BACKUP_ID="backup-prod-$(date +%s)-${{ github.sha }}"
    echo "backup-id=$BACKUP_ID" >> $GITHUB_OUTPUT
    
    echo "📦 Database Backup Created"
    echo "  Backup ID: $BACKUP_ID"
    echo "  Timestamp: $(date -u +'%Y-%m-%dT%H:%M:%SZ')"
    echo "  Commit: ${{ github.sha }}"
    echo ""
    echo "🔙 To rollback, use:"
    echo "  Backup ID: $BACKUP_ID"
    
    # In production: actually call backup API
    # supabase db backup create --backup-id "$BACKUP_ID"
    # OR: pg_dump ... | gzip > /backups/$BACKUP_ID.sql.gz
```

**Rationale**: Clear backup tracking for rollback reference.

---

#### Change 3: Replace Simulated Blue-Green with Real Steps
**Before**:
```yaml
- name: Deploy to Blue environment
  run: |
    echo "🔵 Deploying to BLUE (new) environment..."
    echo "Deployment time: $(date -u +'%Y-%m-%dT%H:%M:%SZ')"
    
    # In production:
    # Deploy to blue.example.com
    # rsync -avz .next/ user@blue-server:/app/
    
    echo "✓ BLUE deployment completed"
```

**After**:
```yaml
- name: Deploy to Blue environment
  run: |
    if [ -z "${{ secrets.PROD_DEPLOYMENT_URL }}" ]; then
      echo "❌ PROD_DEPLOYMENT_URL not configured"
      echo "Configure in GitHub Secrets (staging environment)"
      exit 1
    fi
    
    echo "🔵 Deploying to BLUE (new) environment..."
    echo "  Target: ${{ secrets.PROD_DEPLOYMENT_URL }}"
    echo "  Version: ${{ github.ref_name }}"
    echo "  Timestamp: $(date -u +'%Y-%m-%dT%H:%M:%SZ')"
    
    # === Choose deployment method based on infrastructure ===
    
    # Option A: SSH + rsync (for dedicated servers)
    # ssh -i ~/.ssh/prod_key user@prod-blue-server <<'DEPLOY'
    #   cd /app && rsync -avz /staging/.next/ ./
    #   npm run start &
    # DEPLOY
    
    # Option B: AWS CodeDeploy / CodePipeline
    # aws deploy create-deployment \
    #   --application-name brandiscode-app \
    #   --deployment-group-name production-blue \
    #   --s3-location s3://...
    
    # Option C: Vercel / Netlify (managed platform)
    # vercel deploy --prod --token=$VERCEL_TOKEN
    
    # For now: placeholder
    echo "ℹ️  BLUE deployment requires infrastructure setup"
    echo "   See: docs/PRODUCTION-DEPLOYMENT-SETUP.md"
    echo ""
    echo "❌ Deployment not yet implemented"
    echo "   This is a placeholder workflow."
    exit 1
```

**Rationale**: Make clear that deployment requires infrastructure setup. Don't fake success.

---

#### Change 4: Replace Simulated Health Checks
**Before**:
```yaml
- name: Run health checks on BLUE
  run: |
    echo "🔍 Running health checks on BLUE environment..."
    
    # Check /api/health endpoint
    # curl -f https://blue.example.com/api/health || exit 1
    
    echo "✓ BLUE environment healthy"
```

**After**:
```yaml
- name: Run health checks on BLUE
  run: |
    if [ -z "${{ secrets.PROD_DEPLOYMENT_URL }}" ]; then
      echo "⚠️  Skipping health checks (deployment URL not configured)"
      exit 0
    fi
    
    BLUE_URL="${{ secrets.PROD_DEPLOYMENT_URL }}/api/health"
    echo "🔍 Running health checks..."
    echo "   URL: $BLUE_URL"
    
    MAX_RETRIES=5
    RETRY=0
    
    while [ $RETRY -lt $MAX_RETRIES ]; do
      RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$BLUE_URL" || echo "000")
      
      if [ "$RESPONSE" = "200" ]; then
        echo "✅ Health check passed (HTTP 200)"
        echo ""
        echo "App is healthy:"
        curl -s "$BLUE_URL" | jq '.' || curl -s "$BLUE_URL"
        exit 0
      fi
      
      RETRY=$((RETRY + 1))
      echo "⏳ Health check attempt $RETRY/$MAX_RETRIES (HTTP $RESPONSE), retrying in 5s..."
      sleep 5
    done
    
    echo "❌ Health check failed after $MAX_RETRIES attempts"
    exit 1
```

**Rationale**: Actual HTTP checks with retries, not just echo.

---

#### Change 5: Replace Simulated Traffic Switch
**Before**:
```yaml
- name: Switch traffic to BLUE (Go-Live)
  run: |
    echo "🚀 Switching traffic to BLUE (new) environment..."
    
    # In production:
    # Load balancer switch: green -> blue
    # DNS update (if needed)
    # CDN cache purge
    
    echo "✓ Traffic switched to BLUE environment"
    echo "Status: LIVE on new version"
```

**After**:
```yaml
- name: Switch traffic to BLUE (Go-Live)
  run: |
    if [ -z "${{ secrets.PROD_DEPLOYMENT_URL }}" ]; then
      echo "⚠️  Skipping traffic switch (deployment URL not configured)"
      exit 0
    fi
    
    echo "🚀 Switching traffic to BLUE (new) environment..."
    echo "   Version: ${{ github.ref_name }}"
    echo "   Backup ID: ${{ needs.database-checkpoint.outputs.backup-id }}"
    echo ""
    
    # === Choose traffic switch method based on infrastructure ===
    
    # Option A: HAProxy / Load Balancer switch
    # ssh user@load-balancer "haproxy_admin -c 'set server app1/blue state ready'"
    
    # Option B: AWS ALB Target Group switch
    # aws elbv2 modify-target-group --target-group-arn arn:aws:... \
    #   --health-check-enabled
    
    # Option C: DNS-based (Route53, CloudFlare)
    # aws route53 change-resource-record-sets \
    #   --change-batch file://switch-blue.json
    
    # Option D: Vercel / Managed Platform (automatic)
    # Automatic on successful deployment
    
    echo "❌ Traffic switch requires infrastructure setup"
    echo "   See: docs/PRODUCTION-DEPLOYMENT-SETUP.md"
    exit 1
```

**Rationale**: Explicit about what's needed for real traffic switch.

---

#### Change 6: Replace Simulated Rollback with Real Steps
**Before**:
```yaml
- name: Initiate automatic rollback
  run: |
    echo "⚠️  Deployment failed - initiating rollback..."
    echo "Backup ID: ${{ needs.database-checkpoint.outputs.backup-id }}"
    echo "See runbook: docs/runbooks/rollback.md for manual steps"

- name: Restore from backup
  run: |
    echo "🔄 Rolling back to previous version..."
    # supabase db restore --backup-id "${{ needs.database-checkpoint.outputs.backup-id }}"
    echo "✓ Rollback initiated"
```

**After**:
```yaml
- name: Automatic Rollback - Database
  if: failure()
  run: |
    BACKUP_ID="${{ needs.database-checkpoint.outputs.backup-id }}"
    
    if [ -z "$BACKUP_ID" ]; then
      echo "❌ No backup ID available, cannot rollback automatically"
      exit 1
    fi
    
    echo "🔄 Rolling back database to backup: $BACKUP_ID"
    echo ""
    echo "Implementation required. Choose:"
    echo ""
    echo "Option A: Supabase CLI"
    echo "  supabase db restore --backup-id $BACKUP_ID"
    echo ""
    echo "Option B: Manual pg_restore"
    echo "  gunzip < /backups/$BACKUP_ID.sql.gz | psql -U ... -d ..."
    echo ""
    echo "Option C: AWS RDS"
    echo "  aws rds restore-db-instance-from-db-snapshot \\
    echo "    --db-instance-identifier prod-restored \\
    echo "    --db-snapshot-identifier $BACKUP_ID"
    
    # PLACEHOLDER: Actual restore would go here
    # supabase db restore --backup-id "$BACKUP_ID" --project-ref "${{ secrets.SUPABASE_PROJECT_REF }}" || exit 1
    
    echo "⚠️  Automatic rollback not yet implemented"
    echo "   See: docs/runbooks/rollback.md for manual recovery"
    exit 1

- name: Automatic Rollback - Application
  if: failure()
  run: |
    echo "🔄 Rolling back application to previous version..."
    echo ""
    echo "Implementation required. Choose:"
    echo ""
    echo "Option A: Git-based (for SSH/server deployments)"
    echo "  git checkout PREVIOUS_RELEASE_TAG"
    echo "  npm run build && npm start"
    echo ""
    echo "Option B: Container Registry (Docker)"
    echo "  docker pull gcr.io/project/app:$PREVIOUS_RELEASE_TAG"
    echo "  docker run -d --name app-prod ..."
    echo ""
    echo "Option C: Managed Platform (Vercel)"
    echo "  vercel rollback --prod --token=$VERCEL_TOKEN"
    
    # PLACEHOLDER: Actual rollback would go here
    
    echo "⚠️  Automatic rollback not yet implemented"
    echo "   See: docs/runbooks/rollback.md for manual recovery"
```

**Rationale**: Show what's needed for rollback, don't fake success.

---

#### Change 7: Use Job Summaries for Final Status
**Before**:
```yaml
- name: Generate deployment report
  run: |
    cat > deployment-report.txt << EOF
    # ❌ Uses file, not built-in summary

- name: Notify deployment success
  uses: actions/github-script@v7
  with:
    script: |
      github.rest.repos.createCommitComment({
        # ❌ May fail if not on PR context
```

**After**:
```yaml
- name: Deployment Success Summary
  if: success()
  run: |
    cat >> $GITHUB_STEP_SUMMARY << EOF
    ## ✅ Production Deployment Successful
    
    | Metric    | Value                                                  |
    | --------- | ------------------------------------------------------ |
    | Release   | \`${{ github.ref_name }}\`                             |
    | Commit    | \`${{ github.sha }}\`                                  |
    | Status    | 🟢 LIVE                                                 |
    | Backup ID | \`${{ needs.database-checkpoint.outputs.backup-id }}\` |
    | Timestamp | $(date -u +'%Y-%m-%dT%H:%M:%SZ')                       |
    
    **Next Steps**:
    - Monitor production logs
    - Verify customer flows working
    - Update release notes
    
    **Rollback**: See \`docs/runbooks/rollback.md\` if needed
    EOF

- name: Deployment Failure Summary
  if: failure()
  run: |
    cat >> $GITHUB_STEP_SUMMARY << EOF
    ## ❌ Production Deployment Failed
    
    | Item      | Value                                                  |
    | --------- | ------------------------------------------------------ |
    | Release   | \`${{ github.ref_name }}\`                             |
    | Failed At | ${{ job.status }}                                      |
    | Backup ID | \`${{ needs.database-checkpoint.outputs.backup-id }}\` |
    
    **Automatic Actions Taken**:
    - ❌ Database rollback attempted
    - ❌ Application rollback attempted
    - ❌ Traffic switch aborted
    
    **Next Steps**:
    1. Check logs above for root cause
    2. Contact on-call team immediately
    3. Follow: \`docs/runbooks/incident-response.md\`
    4. Manual recovery: \`docs/runbooks/rollback.md\`
    EOF
```

**Rationale**: Job summaries appear in Actions UI, always visible.

---

## GitHub Configuration Required (Manual Steps)

### MUST DO: Branch Protection Rules

**For branch: `main`**

```
GitHub Settings > Branches > Branch Protection Rules > main

✅ Require pull request reviews before merging
   - Required approving reviews: 2
   - Require review from code owners: YES
   - Dismiss stale pull request approvals when new commits are pushed: YES
   
✅ Require status checks to pass before merging
   - Status checks required:
     ☑ Lint & Code Quality
     ☑ Type Safety Check
     ☑ Build Artifact
     ☑ Unit Tests
     ☑ Dependency Vulnerability Scan
     ☑ Secret & Credential Scan
     ☑ Database Migration Safety Validation
   - Require branches to be up to date before merging: YES
   
✅ Require branches to be up to date before merging

✅ Include administrators in restrictions

✅ Restrict who can push to matching branches
   - Restrict pushes that create matching branches: YES
   - Allow force pushes: NO
   - Allow deletions: NO
```

**For branch: `develop`**

```
GitHub Settings > Branches > Branch Protection Rules > develop

✅ Require pull request reviews before merging
   - Required approving reviews: 1
   - Require review from code owners: YES
   - Dismiss stale pull request approvals: YES
   
✅ Require status checks to pass
   - Status checks required:
     ☑ Lint & Code Quality
     ☑ Type Safety Check
     ☑ Build Artifact
     ☑ Database Migration Safety Validation
   - Require branches to be up to date: YES
   
✅ Allow auto-merge: (optional but recommended)
   - Auto-merge when all checks pass: YES
   - Automatically delete head branches: YES
```

---

### MUST DO: GitHub Environments

**Environment: `staging`**

```
GitHub Settings > Environments > Create "staging"

No deployment branch protection (auto-deploy)
No required reviewers

Environment secrets:
  - STAGING_DEPLOYMENT_URL = https://staging.example.com
    (Add others as needed for your deployment)

Deployment history: visible
```

**Environment: `production`**

```
GitHub Settings > Environments > Create "production"

Deployment branch protection: YES
  - Allowed deployment branches: main, release-*
  
Required reviewers: 2
  - Assign: Team members who can approve production deployments
  
Environment secrets:
  - PROD_DEPLOYMENT_URL = https://example.com
  - SUPABASE_PROJECT_REF = [your-supabase-project]
  - SUPABASE_STORAGE_KEY = [backup service key]
  - SSH_KEY = [if using SSH-based deployment]
    (Add others as needed)

Deployment history: visible (keep 90 days)
```

---

### MUST DO: GitHub Secrets (Repository Level)

```
GitHub Settings > Secrets and variables > Actions > Repository secrets

Add:
  - SUPABASE_URL_STAGING = https://xxx.supabase.co
  - SUPABASE_KEY_STAGING = [anon key for staging]
  - SUPABASE_URL_PROD = https://xxx.supabase.co
  - SUPABASE_KEY_PROD = [anon key for production]
  - GITGUARDIAN_API_KEY = [optional, for secret scanning]
  
Optional (if using SSH deployment):
  - SSH_DEPLOY_KEY = [private key]
  - SSH_HOST_KNOWN_KEYS = [host public key]
  
Optional (if using AWS):
  - AWS_ACCESS_KEY_ID = [AWS credentials]
  - AWS_SECRET_ACCESS_KEY = [AWS credentials]
```

---

### SHOULD DO: GitHub Teams

```
GitHub Settings > Teams > Create teams:

1. team/frontend
   - Members: developers working on client-portal/src
   - Permissions: Maintain (can merge PRs)

2. team/backend
   - Members: developers working on API (if applicable)
   - Permissions: Maintain

3. team/database
   - Members: senior developers
   - Permissions: Admin (review all migrations)

4. team/devops
   - Members: platform engineers
   - Permissions: Admin (can deploy)

5. team/platform
   - Members: DevOps + tech lead
   - Permissions: Admin (can manage policies)

Use these in CODEOWNERS for automatic review requests.
```

---

## Files That Need Changes

### Priority 1: Update Workflows

- [ ] `.github/workflows/01-pr-checks.yml` - Remove permissive checks, fix migration path
- [ ] `.github/workflows/02-staging-cd.yml` - Replace placeholder deploy, fix API calls
- [ ] `.github/workflows/03-production-cd.yml` - Fix CI verification, replace simulated rollback

### Priority 2: Update Documentation

- [ ] `docs/CI-CD-ARCHITECTURE.md` - Add "Known Limitations" section noting what's not yet implemented
- [ ] Create `docs/PRODUCTION-DEPLOYMENT-SETUP.md` - Detail where staging/prod actually deploy
- [ ] Create `docs/GITHUB-SETUP-CHECKLIST.md` - Copy the manual setup steps above

### Priority 3: Update Code

- [ ] `.github/CODEOWNERS` - Ensure team names match those created in GitHub
- [ ] `.gitignore` - Already correct
- [ ] `SECURITY.md` - Already comprehensive

---

## Remaining Unknowns (ASK BEFORE IMPLEMENTING)

Before proceeding, clarify with the team:

1. **Where does the app actually deploy?**
   - Docker container to AWS ECS / App Runner?
   - SSH/rsync to dedicated server?
   - Vercel / Netlify managed hosting?
   - Kubernetes / EKS?
   - Other?
   
   **Impact**: Determines how deploy jobs are implemented (SSH, AWS API, container registry, etc.)

2. **How is the database managed?**
   - Supabase (PostgreSQL managed)?
   - Self-managed PostgreSQL + backups?
   - AWS RDS?
   - Other?
   
   **Impact**: Determines how database backup/restore works

3. **Is there a staging server?**
   - Yes (separate staging.example.com)?
   - No (use preview deployments)?
   - Other?
   
   **Impact**: Determines if staging CD should actually deploy or just build

4. **Blue-Green requirements?**
   - Do you need true blue-green (two parallel versions)?
   - Or simple deployment + health checks?
   - Or rolling updates?
   
   **Impact**: Determines complexity of traffic switch logic

5. **Monitoring/observability?**
   - Where do production logs go?
   - How are health checks monitored?
   - Any PagerDuty / alerting integration?
   
   **Impact**: Can add real monitoring checks to deployment

---

## Acceptance Criteria Checklist

Once you implement the changes above, verify:

- [ ] **Syntax**: All YAML files pass `yamllint` or `github.com/actions/stale` linter
- [ ] **Logic**: Each job has clear success/failure criteria (no `continue-on-error` on critical jobs)
- [ ] **Paths**: All glob patterns use `client-portal/supabase/migration-*.sql`
- [ ] **Context**: No GitHub API calls in wrong event context (e.g., issue_comment on push)
- [ ] **Placeholders**: All deployment/rollback steps have clear "not yet implemented" messages or real logic
- [ ] **Secrets**: No secrets in logs; all sensitive data from GitHub Secrets
- [ ] **Documentation**: Create `PRODUCTION-DEPLOYMENT-SETUP.md` with implementation specifics
- [ ] **Testing**: 
  - [ ] Create test PR, verify all checks run and can fail
  - [ ] Create test merge to develop, verify staging CI runs
  - [ ] Create test tag on main, verify production CI pauses for approval

---

## Success Metrics

After hardening, the workflows should:

1. **Fail fast on quality issues**: Lint/test failure → PR cannot merge (< 5 min feedback)
2. **Catch migration mistakes**: Destructive SQL without metadata → blocks merge
3. **No fake successes**: Workflow either succeeds with real action or fails with clear reason
4. **Audit trail**: All deployments logged, traceable to commit + approver
5. **Safe rollback path**: Backup ID linked to every deployment
6. **Team clarity**: Every step documented, no ambiguity about what happens

---

## What NOT to Change

- ✅ Keep `.github/policies/BRANCH_PROTECTION_POLICY.md` as-is (good policy)
- ✅ Keep `docs/CI-CD-ARCHITECTURE.md` structure (update with reality)
- ✅ Keep `docs/runbooks/` (still relevant after hardening)
- ✅ Keep `SECURITY.md` (still relevant)
- ✅ Keep `.gitignore` (already protects customer data)

---

## Final Note for Next Engineer

> This repo was built with good governance + documentation, but the workflows are still **partially simulated**. Your job is to make them **real**.
>
> The goal is not "perfect" but **pragmatic**: workflows should either do real work or fail clearly. No fake success.
>
> Focus on:
> 1. Hard-fail on quality issues (remove permissive flags)
> 2. Fix migration path (client-portal/supabase/)
> 3. Replace placeholders with real logic OR explicit "not configured" messages
> 4. Verify GitHub API calls use correct event context
>
> Once done, this becomes a true **go-live candidate**.

---

**Document Version**: 1.0  
**Created**: 2026-06-27  
**For**: Next AI Code Agent / Next Engineer  
**Questions**: Review the "Remaining Unknowns" section before starting

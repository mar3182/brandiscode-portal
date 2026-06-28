# Security Policy & Data Protection

## Data Classification

### Prohibited in Repository (NEVER Commit)
| Data Type     | Examples                             | Impact                      |
| ------------- | ------------------------------------ | --------------------------- |
| Customer Data | Names, emails, invoices, signatures  | Breach risk, GDPR violation |
| Credentials   | API keys, database passwords, tokens | Account compromise          |
| Internal Docs | Client quotes, pricing, strategies   | Competitive disadvantage    |
| Secrets       | .env.local, certificates, SSH keys   | System compromise           |

### Safe in Repository
- [ ] Application code (TypeScript, JavaScript)
- [ ] Configuration templates (.env.example)
- [ ] Architecture & infrastructure code
- [ ] Tests & test utilities
- [ ] Documentation & runbooks
- [ ] Security policies & guidelines

---

## Secret Management

### In Development
```bash
# ✅ Correct: Use .env.local (ignored by Git)
echo "SUPABASE_KEY=abc123" > .env.local

# ❌ Wrong: Never commit secrets to Git
git add .env.local  # DON'T DO THIS

# ✅ Share template
cat .env.example
# SUPABASE_KEY=your-key-here
```

### In Production (GitHub Actions)
```yaml
# ✅ Use GitHub Secrets
env:
  SUPABASE_URL: ${{ secrets.SUPABASE_URL_PROD }}
  SUPABASE_KEY: ${{ secrets.SUPABASE_KEY_PROD }}

# ❌ Never hardcode
env:
  SUPABASE_URL: https://abc123.supabase.co  # NEVER
```

### Secret Rotation Schedule
- [ ] Monthly: Rotate all production secrets
- [ ] On team member departure: Rotate immediately
- [ ] After suspected breach: Rotate within 1 hour
- [ ] Quarterly: Review access logs for unusual activity

---

## CI/CD Security

### Workflow Security
1. **No secrets in logs**
   ```yaml
   - name: Run tests
     run: npm test
     # Secrets never printed to console
   ```

2. **Artifact expiration**
   ```yaml
   - uses: actions/upload-artifact@v3
     with:
       retention-days: 1  # Delete after 24 hours
   ```

3. **Branch protection**
   - Require 2 approvals for main branch
   - Require status checks passing
   - Dismiss stale approvals
   - Require up-to-date branches

### Deployment Security
1. **Manual approval for production**
   - Requires explicit decision by authorized person
   - 2+ reviews for significant changes

2. **Backup before deployment**
   - Create checkpoint before each production change
   - Test rollback procedure quarterly

3. **Health check after deployment**
   - Automated verification of critical endpoints
   - Monitoring for errors/performance degradation

---

## Database Security

### Migration Safety

**Expand-and-Contract Pattern** (always):
```sql
-- ✅ SAFE: Release 1
ALTER TABLE clients ADD COLUMN new_field TEXT;
UPDATE clients SET new_field = old_field;

-- ✅ SAFE: Release 2+ (after verifying data)
ALTER TABLE clients DROP COLUMN old_field;

-- ❌ UNSAFE: Same release
ALTER TABLE clients RENAME COLUMN old TO new;  -- + code depends on new_field
```

**Required Metadata in Every Migration**:
```sql
-- MIGRATION PURPOSE: [What this does and why]
-- RISK: [Potential issues, impact analysis]
-- ROLLBACK: [Exact steps to undo]
-- VALIDATION: [Query to verify success]
```

### Data Integrity
- No dropping columns without 2-release separation
- No renames without explicit code refactor first
- All migrations tested on staging before production
- Backup created before every production migration

### Access Control
- Database credentials: Only DevOps/Platform team
- Supabase API keys: Scoped per environment (staging/production)
- Service role key: Never exposed in public code
- Audit logging: All production queries logged

---

## Code Security

### Dependency Management
1. **Regular audits**
   ```bash
   npm audit --audit-level=moderate
   # Must pass before merge to main
   ```

2. **Vulnerability scanning**
   - Dependency Check (npm audit)
   - Secret scanning (TruffleHog + GitGuardian)
   - SBOM generation (when available)

3. **Supply chain protection**
   - Pin major versions (^14.0.0 not *14)
   - Lock files committed (package-lock.json)
   - Reviewers approve dependency changes

### Code Review
1. Security checklist in PR template:
   - [ ] No hardcoded secrets
   - [ ] No unvalidated user input in logs
   - [ ] Proper error handling (no stack traces to users)
   - [ ] No direct SQL queries (use ORM/parameterized)

2. CODEOWNERS enforce review:
   - Database: Reviewed by @team/database
   - API: Reviewed by @team/backend
   - Deployments: Reviewed by @team/devops

---

## Authentication & Authorization

### API Security
- [ ] All endpoints require authentication (except public endpoints)
- [ ] Use JWT tokens (not session cookies for API)
- [ ] Tokens expire after 1 hour (refresh token for longer)
- [ ] Validate token signature on every request
- [ ] Log failed auth attempts

### Access Levels
| Role     | Can Do                                          |
| -------- | ----------------------------------------------- |
| User     | View/edit own profile, offertes, signatures     |
| Admin    | Manage users, view all offertes, export reports |
| DevOps   | Deploy, backup, rollback, view logs             |
| Platform | Manage secrets, policies, audit logs            |

---

## Monitoring & Auditing

### What We Log
✅ Authentication attempts (success/failure)  
✅ Authorization checks (access denied)  
✅ Deployments (who, when, what version)  
✅ Database migrations (what changed)  
✅ Errors (non-sensitive only)  

### What We DON'T Log
❌ User passwords  
❌ API keys or tokens  
❌ Customer email addresses (unless necessary)  
❌ Payment information  
❌ PII beyond minimal needed context  

### Log Retention
- Development logs: 7 days
- Staging logs: 14 days
- Production logs: 90 days (compliance)
- Deployment logs: 90 days (audit trail)

---

## Incident Response

### Security Incident Classification
| Level    | Example                    | Action                          |
| -------- | -------------------------- | ------------------------------- |
| Critical | Data breach, active attack | Isolate immediately + notify    |
| High     | Vulnerability discovered   | Patch + review access logs      |
| Medium   | Policy violation           | Remediate + review + retraining |
| Low      | Minor misconfiguration     | Fix + document                  |

### Breach Response Steps
1. Isolate affected system
2. Notify @security-team
3. Review access logs (who had access?)
4. Assess impact (what data exposed?)
5. Notify customers if required by GDPR
6. Implement fix
7. Post-mortem within 24 hours

---

## Compliance & Standards

### Frameworks Aligned With
- GDPR (EU data protection)
- SOC 2 (information security)
- OWASP Top 10 (web security)

### Key Controls
- ✅ Least privilege access (minimal permissions)
- ✅ Separation of duties (one person can't deploy + approve)
- ✅ Change approval (all production changes reviewed)
- ✅ Audit logging (all actions logged)
- ✅ Backup & recovery (tested quarterly)

---

## Employee & Contractor Security

### Onboarding
- [ ] Complete security training
- [ ] Sign NDA + code of conduct
- [ ] 2FA enabled on GitHub
- [ ] VPN access configured
- [ ] Secrets access scoped to role

### Offboarding
- [ ] GitHub access revoked within 24h
- [ ] AWS/Supabase keys rotated
- [ ] Access logs reviewed for unusual activity
- [ ] Equipment returned
- [ ] Exit interview completed

### Training
- [ ] Quarterly security updates
- [ ] Phishing simulations
- [ ] Secure coding workshop (annual)
- [ ] Incident response drills (bi-annual)

---

## Third-Party Security

### Vendor Assessment
Before integrating external service:
- [ ] Review security documentation
- [ ] Check SOC 2 / ISO 27001 certification
- [ ] Assess data handling practices
- [ ] Review incident response SLA
- [ ] Verify GDPR compliance

### API Key Management
- Each service gets unique API key
- Keys rotated when team member changes
- Keys scoped to minimal required permissions
- No service uses same key for staging + production

---

## Security Checklist for Releases

Before each production release:
- [ ] All dependencies up-to-date
- [ ] No security warnings in npm audit
- [ ] Secret scanning passed
- [ ] Code review complete (security eyes)
- [ ] Database migrations reviewed
- [ ] Backup created and tested
- [ ] Rollback plan documented
- [ ] Monitoring/alerts configured

---

## Reporting Security Issues

### Internal Discovery
1. Don't commit it
2. Notify @security-team immediately
3. Document: what, when, who, impact
4. Follow incident response runbook

### External Discovery
1. Email security@example.com (not public issues)
2. Provide details: vulnerability type, reproduction steps
3. Allow 48 hours for response
4. Coordinated disclosure: don't publish until fixed

---

## Related Documents
- [Branch Protection Policy](../.github/policies/BRANCH_PROTECTION_POLICY.md)
- [Incident Response Runbook](./docs/runbooks/incident-response.md)
- [CI/CD Workflows](./.github/workflows/)

---

**Last Updated**: 2026-06-27  
**Owner**: @team/platform  
**Next Review**: 2026-09-27  
**Incident Contact**: @security-team

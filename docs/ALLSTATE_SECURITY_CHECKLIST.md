# Allstate Internal Application Security Checklist

This checklist covers security requirements for internal applications based on:
- NAIC Insurance Data Security Model Law
- Allstate Information Security Standards
- Industry best practices for insurance applications

**Application:** Bealer Agency Todo List
**Last Review:** 2026-02-04
**Reviewer:** Security Team

---

## 1. Authentication & Access Control

### 1.1 User Authentication
| Requirement | Status | Notes |
|-------------|--------|-------|
| Unique user identification | ✅ Done | UUID-based user IDs |
| Strong password/PIN policy | ⚠️ Partial | 4-digit PIN only (user requested no change) |
| Account lockout after failed attempts | ✅ Done | 5 attempts, 5-min lockout (serverLockout.ts) |
| Session timeout for inactivity | ✅ Done | 30-minute idle timeout |
| Secure session management | ✅ Done | HttpOnly cookies (sessionCookies.ts) |
| Multi-factor authentication (MFA) | ❌ Not Implemented | Recommended for owner/admin accounts |

### 1.2 Authorization
| Requirement | Status | Notes |
|-------------|--------|-------|
| Role-based access control (RBAC) | ✅ Done | owner/admin/member roles |
| Principle of least privilege | ✅ Done | Goals restricted to owner/admin |
| Access control enforcement on server | ✅ Done | API routes validate roles |
| No hardcoded credentials | ✅ Done | Removed hardcoded owner name |

---

## 2. Data Protection

### 2.1 Data at Rest
| Requirement | Status | Notes |
|-------------|--------|-------|
| Database encryption | ✅ Done | Supabase AES-256 encryption |
| Field-level encryption for PII | ✅ Done | AES-256-GCM (fieldEncryption.ts) |
| Encrypted backups | ✅ Done | Supabase PITR encrypted |
| Secure key management | ✅ Done | Keys in Railway env vars |
| Key rotation procedures | ✅ Done | Documented in SECURITY_RUNBOOKS.md |

### 2.2 Data in Transit
| Requirement | Status | Notes |
|-------------|--------|-------|
| TLS 1.2+ for all connections | ✅ Done | Railway enforces HTTPS |
| No sensitive data in URLs | ✅ Done | POST bodies used |
| Certificate validation | ✅ Done | Platform-managed |

### 2.3 Data Classification
| Requirement | Status | Notes |
|-------------|--------|-------|
| PII identified and documented | ✅ Done | transcription, notes fields |
| Sensitive data inventory | ✅ Done | Documented in runbooks |
| Data retention policy | ✅ Done | SECURITY_RUNBOOKS.md |
| Secure data disposal | ✅ Done | SQL cleanup procedures |

---

## 3. Application Security

### 3.1 Input Validation
| Requirement | Status | Notes |
|-------------|--------|-------|
| Server-side input validation | ✅ Done | API routes validate input |
| SQL injection prevention | ✅ Done | Supabase parameterized queries |
| XSS prevention | ✅ Done | React auto-escaping + CSP |
| File upload validation | ✅ Done | fileValidator.ts |
| API rate limiting | ✅ Done | Fail-closed (rateLimit.ts) |

### 3.2 Output Encoding
| Requirement | Status | Notes |
|-------------|--------|-------|
| HTML encoding | ✅ Done | React JSX auto-escaping |
| JSON encoding | ✅ Done | NextResponse.json() |
| Content-Type headers | ✅ Done | Proper MIME types |

### 3.3 Security Headers
| Requirement | Status | Notes |
|-------------|--------|-------|
| Content-Security-Policy | ✅ Done | Strict CSP in next.config.ts |
| X-Frame-Options | ✅ Done | DENY |
| X-Content-Type-Options | ✅ Done | nosniff |
| Strict-Transport-Security | ✅ Done | Railway enforces |
| X-XSS-Protection | ✅ Done | 1; mode=block |
| Referrer-Policy | ✅ Done | strict-origin-when-cross-origin |

### 3.4 Error Handling
| Requirement | Status | Notes |
|-------------|--------|-------|
| No sensitive info in errors | ✅ Done | Generic error messages |
| Proper error logging | ✅ Done | logger.ts with sanitization |
| Custom error pages | ✅ Done | Next.js error handling |

---

## 4. Logging & Monitoring

### 4.1 Audit Logging
| Requirement | Status | Notes |
|-------------|--------|-------|
| Authentication events logged | ✅ Done | auth_failure_log table |
| Authorization failures logged | ✅ Done | security_audit_log table |
| Data access logged | ✅ Done | activity_log table |
| Admin actions logged | ✅ Done | Database audit triggers |
| Log integrity protection | ✅ Done | Append-only tables |

### 4.2 Log Security
| Requirement | Status | Notes |
|-------------|--------|-------|
| No PII in logs | ✅ Done | sanitizeSensitiveData() |
| Centralized logging | ✅ Done | securityMonitor.ts with SIEM support |
| Log retention policy | ✅ Done | 7 years for security logs |
| Log access controls | ✅ Done | Railway dashboard access |

### 4.3 Monitoring & Alerting
| Requirement | Status | Notes |
|-------------|--------|-------|
| Security event alerting | ✅ Done | Webhook alerts (Slack/Discord) |
| Failed login monitoring | ✅ Done | Auto-alerts on thresholds |
| Rate limit alerts | ✅ Done | Integrated with securityMonitor |
| Anomaly detection | ⚠️ Partial | Threshold-based detection |

---

## 5. Vulnerability Management

### 5.1 Secure Development
| Requirement | Status | Notes |
|-------------|--------|-------|
| Static code analysis (SAST) | ✅ Done | Semgrep + CodeQL in CI |
| Dependency scanning | ✅ Done | npm audit in CI |
| Secret detection | ✅ Done | TruffleHog in CI |
| Code review requirements | ⚠️ Partial | PR reviews recommended |

### 5.2 Patch Management
| Requirement | Status | Notes |
|-------------|--------|-------|
| Dependency updates | ⚠️ Manual | Consider Dependabot |
| Security patch SLA | ⚠️ Not Defined | Define critical patch timeline |
| Vulnerability tracking | ✅ Done | GitHub Security Advisories |

---

## 6. Third-Party Security

### 6.1 Vendor Assessment
| Requirement | Status | Notes |
|-------------|--------|-------|
| Vendor security review | ✅ Done | SECURITY_RUNBOOKS.md |
| SOC 2 compliance verification | ✅ Done | All vendors SOC 2 certified |
| Data processing agreements | ⚠️ Verify | Check DPAs with vendors |
| Vendor incident notification | ⚠️ Partial | Monitor vendor status pages |

### 6.2 API Security
| Requirement | Status | Notes |
|-------------|--------|-------|
| API authentication | ✅ Done | API keys for Outlook |
| API key rotation | ✅ Done | Procedures documented |
| API rate limiting | ✅ Done | Per-endpoint limits |
| API input validation | ✅ Done | Request validation |

---

## 7. Incident Response

### 7.1 Incident Procedures
| Requirement | Status | Notes |
|-------------|--------|-------|
| Incident response plan | ✅ Done | SECURITY_RUNBOOKS.md |
| Severity classification | ✅ Done | P0-P3 levels defined |
| Contact information | ✅ Done | Documented |
| Escalation procedures | ✅ Done | Documented |

### 7.2 Recovery
| Requirement | Status | Notes |
|-------------|--------|-------|
| Backup procedures | ✅ Done | Supabase PITR |
| Recovery testing | ⚠️ Not Tested | Schedule quarterly tests |
| Business continuity | ⚠️ Partial | Define RTO/RPO |

---

## 8. Compliance

### 8.1 NAIC Model Law Requirements
| Requirement | Status | Notes |
|-------------|--------|-------|
| Written information security program | ⚠️ Partial | This doc + runbooks |
| Risk assessment | ⚠️ Partial | Consider formal assessment |
| Board oversight | N/A | Small agency |
| Third-party oversight | ✅ Done | Vendor assessments |
| Incident response program | ✅ Done | Documented |
| Annual certification | ❌ Not Done | Schedule annual review |

### 8.2 Privacy Requirements
| Requirement | Status | Notes |
|-------------|--------|-------|
| Privacy policy | ⚠️ Not Present | Create if user-facing |
| Data subject rights | ✅ Done | Export/delete procedures |
| Consent management | N/A | Internal app |
| Cross-border transfers | ⚠️ Verify | All vendors US-based |

---

## 9. Physical & Environmental (Platform)

| Requirement | Status | Notes |
|-------------|--------|-------|
| Data center security | ✅ Done | AWS us-east-1 (SOC 2) |
| Redundancy | ✅ Done | Supabase HA |
| Disaster recovery | ✅ Done | Multi-AZ deployment |

---

## Summary

### Compliance Score

| Category | Complete | Partial | Missing | Total |
|----------|----------|---------|---------|-------|
| Authentication & Access | 5 | 1 | 1 | 7 |
| Data Protection | 10 | 0 | 0 | 10 |
| Application Security | 14 | 0 | 0 | 14 |
| Logging & Monitoring | 10 | 1 | 0 | 11 |
| Vulnerability Management | 4 | 2 | 0 | 6 |
| Third-Party Security | 5 | 2 | 0 | 7 |
| Incident Response | 5 | 2 | 0 | 7 |
| Compliance | 3 | 3 | 1 | 7 |
| Allstate Identity (NEW) | 0 | 1 | 2 | 3 |
| **Total** | **56** | **12** | **4** | **72** |

**Overall Compliance: 78% Complete, 17% Partial, 5% Missing**

> ⚠️ **Note:** Allstate Identity section added Feb 2026. Federated SSO is a **blocking requirement** for production deployment to Allstate agencies.

---

## 10. Allstate Identity Ecosystem

### 10.1 Identity Providers (IdPs)

Allstate uses a **fragmented identity ecosystem** depending on who is logging in:

| Provider | Purpose | Notes |
|----------|---------|-------|
| **OneLogin** | Primary SSO for internal employees | Active Directory integration |
| **Microsoft Active Directory** | Backbone user management | Corporate directory |
| **Ping Identity** | Legacy federated access | Used in some older integrations |

### 10.2 Federation Requirements (ISSAS Standards)

**CRITICAL:** You cannot directly connect to Allstate's internal AD. Their **ISSAS** security standards require vendors to support **Federated SSO**.

| Requirement | Protocol | Status |
|-------------|----------|--------|
| Federated authentication | SAML 2.0 or OIDC | ❌ Not Implemented |
| No direct password collection | N/A | ⚠️ Current PIN system |
| IdP-initiated login support | SAML | ❌ Not Implemented |

**Authentication Flow (Required):**
```
1. User clicks "Log in with Allstate" on your app
2. App redirects to Allstate's IdP (OneLogin/Ping login page)
3. User authenticates at Allstate's IdP
4. Allstate sends SAML Assertion (token) back to your app
5. App creates local session from assertion
```

### 10.3 Agency Types & Access Methods

| Agent Type | Access Method | Identity Source |
|------------|---------------|-----------------|
| **Exclusive Agents (Captive)** | Allstate Gateway (MyConnection) | SAML via portal tile |
| **Independent Agents** | NOT Allstate corporate login | Ivans ID or own Microsoft 365 |

**Implication:** App may need to be added as a "tile" in MyConnection portal for captive agents.

### 10.4 Recommended Implementation: Auth Broker Pattern

**DO NOT:**
- ❌ Build a login form asking for "Allstate Username/Password" (triggers security audit failure, looks like phishing)
- ❌ Hard-code a specific identity provider

**DO:**
- ✅ Implement an **Auth Broker** (Auth0, AWS Cognito, or Clerk)
- ✅ Support "SAML Enterprise Connection" toggle
- ✅ Accept Allstate's metadata URL during vendor onboarding (no code changes needed)

| Auth Broker | SAML Support | OIDC Support | Recommended |
|-------------|--------------|--------------|-------------|
| **Auth0** | ✅ Enterprise | ✅ | ✅ Best for multi-tenant |
| **AWS Cognito** | ✅ | ✅ | Good if already on AWS |
| **Clerk** | ✅ Enterprise | ✅ | Modern DX, easy setup |
| **NextAuth.js** | ⚠️ Manual | ✅ | Already in codebase |

### 10.5 Migration Path

**Phase 1: Auth Broker Setup**
1. Add Auth0/Clerk as authentication layer
2. Keep existing PIN login as fallback during transition
3. Configure SAML Enterprise Connection (disabled initially)

**Phase 2: Allstate Onboarding**
1. Request Allstate IdP metadata URL during vendor registration
2. Paste metadata into Auth0/Clerk admin console
3. Enable "Log in with Allstate" button

**Phase 3: Deprecate PIN**
1. Migrate existing users to federated login
2. Remove PIN authentication option
3. Complete compliance with ISSAS standards

---

## Priority Action Items

### High Priority (Address within 30 days)
1. ❌ **Implement Federated SSO** via Auth Broker (Auth0/Clerk) - See Section 10
2. ✅ ~~**Set up SIEM integration** or centralized log monitoring~~ (DONE - securityMonitor.ts)
3. ⚠️ **Define security patch SLA** (e.g., critical within 24h)
4. ⚠️ **Enable Dependabot** for automated dependency updates

### Medium Priority (Address within 90 days)
5. ⚠️ **Conduct formal risk assessment** (NIST CSF or similar)
6. ⚠️ **Test backup recovery** procedures quarterly
7. ⚠️ **Define RTO/RPO** for business continuity
8. ⚠️ **Verify DPAs** with all vendors
9. ❌ **Schedule annual security certification** review

### Low Priority (Track for future)
10. ❌ **Implement anomaly detection** for suspicious patterns
11. ⚠️ **Create formal information security program** document
12. ⚠️ **Set up vendor status monitoring** for incident notification

---

## Review Schedule

| Review Type | Frequency | Next Due |
|-------------|-----------|----------|
| Security checklist review | Quarterly | 2026-04-26 |
| Penetration testing | Annual | TBD |
| Vendor assessment refresh | Annual | 2027-01-25 |
| Key rotation | 90 days | 2026-04-26 |
| Incident response drill | Annual | TBD |

---

**Document Version:** 1.1
**Classification:** Internal Use Only
**Owner:** Security Team
**Change Log:**
- v1.1 (2026-02-04): Added Section 10 - Allstate Identity Ecosystem & SSO requirements

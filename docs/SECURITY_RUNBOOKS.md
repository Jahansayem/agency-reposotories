# Security Runbooks

This document contains operational procedures for security-related tasks.

## Table of Contents

1. [API Key Rotation](#api-key-rotation)
2. [Incident Response Plan](#incident-response-plan)
3. [Third-Party Vendor Assessment](#third-party-vendor-assessment)
4. [Data Retention Policy](#data-retention-policy)

---

## Field-Level Encryption

### Overview

Sensitive PII fields (transcriptions, notes) are encrypted at rest using AES-256-GCM.
The encryption is transparent - data is encrypted before storage and decrypted on retrieval.

### Setup

```bash
# Generate a 32-byte encryption key
openssl rand -hex 32

# Add to Railway environment variables
railway variables set FIELD_ENCRYPTION_KEY="your-64-character-hex-key"
```

### Key Rotation Procedure

1. Generate new key: `openssl rand -hex 32`
2. Run migration script to re-encrypt all data (see `scripts/rotate-encryption-key.ts`)
3. Update `FIELD_ENCRYPTION_KEY` in Railway
4. Deploy immediately
5. Verify data can be read/written correctly
6. Document rotation in security log

### Encrypted Fields

| Table | Field | Contains |
|-------|-------|----------|
| `todos` | `transcription` | Voicemail transcriptions with customer info |
| `todos` | `notes` | Task notes that may contain PII |
| `messages` | `text` | DMs that may contain sensitive info |

### API Endpoints with Encryption

- `POST/PUT /api/todos` - Encrypts before storage
- `GET /api/todos` - Decrypts on retrieval
- Components using direct Supabase client should migrate to use `/api/todos`

---

## Security Monitoring & SIEM Integration

### Overview

The application includes centralized security monitoring (`src/lib/securityMonitor.ts`) that:
- Tracks security events in real-time
- Sends webhook alerts for threshold violations
- Ships logs to external SIEM systems
- Provides an API for security dashboards

### Setup

#### 1. Slack/Discord Webhook Alerts

```bash
# Add webhook URL to Railway
railway variables set SECURITY_WEBHOOK_URL="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
```

Alert thresholds (configured in securityMonitor.ts):
- 5 auth failures in 5 min → HIGH alert
- 1 account lockout → HIGH alert
- 10 rate limit violations in 1 min → MEDIUM alert
- 1 CSRF violation → CRITICAL alert
- 1 privilege escalation attempt → CRITICAL alert

#### 2. External SIEM Integration

For enterprise SIEM systems (Splunk, Elastic, Datadog):

```bash
# Add SIEM endpoint
railway variables set SIEM_ENDPOINT="https://your-siem.example.com/api/events"
railway variables set SIEM_API_KEY="your-siem-api-key"
```

Events are shipped in CEF-compatible JSON format.

#### 3. Security Dashboard API

Access security events via:
```
GET /api/security/events?hours=24
```

Requires admin/owner role. Returns:
- Event summary by type
- Auth failure statistics
- Recent audit logs
- Grouped metrics

### Monitored Events

| Event Type | Severity | Threshold |
|------------|----------|-----------|
| `auth_failure` | MEDIUM | 5 in 5 min |
| `auth_lockout` | HIGH | 1 event |
| `access_denied` | MEDIUM | 5 in 5 min |
| `rate_limit_exceeded` | MEDIUM | 10 in 1 min |
| `invalid_api_key` | HIGH | 3 in 5 min |
| `csrf_violation` | CRITICAL | 1 event |
| `privilege_escalation_attempt` | CRITICAL | 1 event |

---

## API Key Rotation

### Overview

API keys should be rotated:
- Every 90 days (scheduled)
- Immediately if compromised
- When team members with access leave

### Keys Requiring Rotation

| Key | Location | Rotation Frequency |
|-----|----------|-------------------|
| `OUTLOOK_ADDON_API_KEY` | Railway env vars | 90 days |
| `ANTHROPIC_API_KEY` | Railway env vars | 90 days |
| `OPENAI_API_KEY` | Railway env vars | 90 days |
| `SUPABASE_SERVICE_ROLE_KEY` | Railway env vars | Annual |
| `UPSTASH_REDIS_REST_TOKEN` | Railway env vars | 90 days |

### Rotation Procedure

#### 1. Outlook API Key

```bash
# 1. Generate new key (32+ chars, alphanumeric)
openssl rand -base64 32

# 2. Update Railway environment variable
railway variables set OUTLOOK_ADDON_API_KEY="new-key-here"

# 3. Update Outlook add-in configuration
# (Update manifest.xml or add-in settings with new key)

# 4. Deploy the update
railway up

# 5. Verify add-in still works
# Test creating a task from Outlook

# 6. Document rotation in security log
```

#### 2. Anthropic/OpenAI API Keys

```bash
# 1. Generate new key in provider console
# - Anthropic: https://console.anthropic.com/settings/keys
# - OpenAI: https://platform.openai.com/api-keys

# 2. Update Railway environment variable
railway variables set ANTHROPIC_API_KEY="new-key-here"
railway variables set OPENAI_API_KEY="new-key-here"

# 3. Deploy
railway up

# 4. Test AI features (smart parse, email generation, transcription)

# 5. Revoke old key in provider console

# 6. Document rotation
```

#### 3. Supabase Service Role Key

**Warning:** This key has full database access. Rotate with extreme care.

```bash
# 1. Generate new key in Supabase Dashboard
# Settings > API > Service Role Key > Regenerate

# 2. Update Railway immediately
railway variables set SUPABASE_SERVICE_ROLE_KEY="new-key-here"

# 3. Deploy immediately
railway up

# 4. Verify all functionality:
#    - File uploads
#    - Database writes
#    - Real-time subscriptions

# 5. Old key is automatically invalidated
```

### Emergency Rotation (Key Compromised)

1. **Immediately** rotate the compromised key using above procedures
2. Check `security_audit_log` for unauthorized access
3. Check `auth_failure_log` for suspicious activity
4. Notify stakeholders
5. File incident report

---

## Incident Response Plan

### Severity Levels

| Level | Description | Response Time | Examples |
|-------|-------------|---------------|----------|
| P0 - Critical | Active breach, data exfiltration | Immediate | Credentials leaked, unauthorized access |
| P1 - High | Potential breach, vulnerability discovered | < 4 hours | RCE vulnerability, auth bypass |
| P2 - Medium | Security weakness, non-critical | < 24 hours | Missing headers, weak validation |
| P3 - Low | Best practice deviation | < 1 week | Outdated dependency, logging gap |

### Response Procedure

#### Phase 1: Detection & Triage (0-30 min)

1. **Identify the incident**
   - Check `security_audit_log` table
   - Check `auth_failure_log` table
   - Review Railway logs
   - Check Sentry for errors

2. **Assess severity**
   - What data is affected?
   - How many users impacted?
   - Is the attack ongoing?

3. **Notify stakeholders**
   - P0/P1: Immediate notification to Derrick
   - P2/P3: Next business day notification

#### Phase 2: Containment (30 min - 2 hours)

1. **Isolate affected systems**
   ```bash
   # If needed, disable the application
   railway down

   # Or disable specific features via environment
   railway variables set MAINTENANCE_MODE=true
   ```

2. **Preserve evidence**
   ```sql
   -- Export security logs
   COPY (SELECT * FROM security_audit_log
         WHERE created_at > NOW() - INTERVAL '24 hours')
   TO '/tmp/incident_audit.csv' WITH CSV HEADER;

   COPY (SELECT * FROM auth_failure_log
         WHERE created_at > NOW() - INTERVAL '24 hours')
   TO '/tmp/incident_auth.csv' WITH CSV HEADER;
   ```

3. **Block attacker (if identified)**
   - Add IP to blocklist
   - Invalidate compromised sessions
   - Rotate affected credentials

#### Phase 3: Eradication (2-24 hours)

1. **Identify root cause**
   - Code review
   - Log analysis
   - Vulnerability assessment

2. **Develop and test fix**
   - Create fix in development
   - Test thoroughly
   - Security review

3. **Deploy fix**
   ```bash
   git checkout -b security-fix/incident-XXX
   # Make fixes
   git push origin security-fix/incident-XXX
   # Create PR, get review, merge
   railway up
   ```

#### Phase 4: Recovery (24-72 hours)

1. **Verify fix effectiveness**
   - Penetration testing
   - Log monitoring
   - User verification

2. **Restore normal operations**
   ```bash
   railway variables set MAINTENANCE_MODE=false
   ```

3. **Notify affected users** (if applicable)
   - Email notification
   - In-app notification
   - Compliance notification (if PII affected)

#### Phase 5: Post-Incident (1-2 weeks)

1. **Document incident**
   - Timeline of events
   - Actions taken
   - Impact assessment

2. **Conduct post-mortem**
   - What went wrong?
   - What went right?
   - What could be improved?

3. **Implement improvements**
   - Update security controls
   - Improve monitoring
   - Update runbooks

### Contact Information

| Role | Name | Contact |
|------|------|---------|
| Owner | Derrick | [Internal contact] |
| Technical Lead | [Name] | [Contact] |
| Supabase Support | N/A | support@supabase.io |
| Railway Support | N/A | support@railway.app |

---

## Third-Party Vendor Assessment

### Vendor: Supabase

**Service:** PostgreSQL Database, Real-time Subscriptions, File Storage

**Security Assessment:**

| Control | Status | Notes |
|---------|--------|-------|
| SOC 2 Type II | ✅ Certified | Annual audit |
| Data Encryption at Rest | ✅ Yes | AES-256 |
| Data Encryption in Transit | ✅ Yes | TLS 1.3 |
| Access Controls | ✅ Yes | RLS, API keys |
| Backup & Recovery | ✅ Yes | Point-in-time recovery |
| Incident Response | ✅ Yes | 24/7 monitoring |
| GDPR Compliant | ✅ Yes | DPA available |
| Data Location | ⚠️ US | us-east-1 |

**Risk Level:** LOW

**Recommendations:**
- Enable Point-in-Time Recovery
- Review RLS policies quarterly
- Monitor for security advisories

---

### Vendor: Anthropic (Claude API)

**Service:** AI-powered task parsing, email generation

**Security Assessment:**

| Control | Status | Notes |
|---------|--------|-------|
| SOC 2 Type II | ✅ Certified | |
| Data Encryption | ✅ Yes | TLS, encrypted at rest |
| Data Retention | ✅ 30 days | Then deleted |
| Training on Data | ✅ No | Not used for training |
| Access Controls | ✅ Yes | API key based |
| Rate Limiting | ✅ Yes | Built-in |

**Risk Level:** LOW

**Data Handling:**
- Prompts may contain task descriptions (low sensitivity)
- No PII should be sent (enforced by promptSanitizer.ts)
- Transcriptions may contain customer info (masked)

**Recommendations:**
- Continue using promptSanitizer.ts
- Monitor for data handling policy changes
- Review API usage monthly

---

### Vendor: OpenAI (Whisper API)

**Service:** Voice transcription

**Security Assessment:**

| Control | Status | Notes |
|---------|--------|-------|
| SOC 2 Type II | ✅ Certified | |
| Data Encryption | ✅ Yes | |
| Data Retention | ✅ 30 days | API data |
| Training on Data | ✅ Opt-out | Enterprise plan |
| HIPAA | ⚠️ Limited | Not for PHI |

**Risk Level:** MEDIUM

**Data Handling:**
- Audio may contain customer conversations
- Voicemails may contain PII

**Recommendations:**
- Consider enterprise plan for zero retention
- Warn users about PII in voice notes
- Review data handling policy quarterly

---

### Vendor: Railway

**Service:** Application hosting, Docker deployment

**Security Assessment:**

| Control | Status | Notes |
|---------|--------|-------|
| SOC 2 Type II | ✅ Certified | |
| Infrastructure | ✅ AWS | us-east-1 |
| Secrets Management | ✅ Yes | Encrypted env vars |
| Network Isolation | ✅ Yes | Private networking |
| DDoS Protection | ✅ Yes | Cloudflare |
| SSL/TLS | ✅ Yes | Auto-provisioned |

**Risk Level:** LOW

**Recommendations:**
- Enable private networking if available
- Review deployment logs monthly
- Use deployment protection rules

---

### Vendor: Upstash

**Service:** Redis for rate limiting

**Security Assessment:**

| Control | Status | Notes |
|---------|--------|-------|
| SOC 2 Type II | ✅ Certified | |
| Data Encryption | ✅ Yes | TLS, encrypted at rest |
| Data Location | ⚠️ Global | Edge deployment |
| Access Controls | ✅ Yes | Token-based |

**Risk Level:** LOW

**Data Stored:**
- Rate limit counters only
- No PII
- Auto-expires

---

## Data Retention Policy

### Retention Periods

| Data Type | Retention Period | Justification |
|-----------|------------------|---------------|
| Active tasks | Indefinite | Business need |
| Completed tasks | 2 years | Audit trail |
| Archived tasks | 2 years | Regulatory |
| Chat messages | 1 year | Business need |
| Activity logs | 2 years | Audit/compliance |
| Security audit logs | 7 years | Compliance |
| Auth failure logs | 1 year | Security analysis |
| User sessions | 30 days after expiry | Security |
| File attachments | With parent task | Business need |
| Daily digests | 90 days | Business need |

### Automated Cleanup

Create a scheduled job to run monthly:

```sql
-- Delete old completed tasks (older than 2 years)
DELETE FROM todos
WHERE completed = true
  AND completed_at < NOW() - INTERVAL '2 years';

-- Delete old chat messages (older than 1 year)
DELETE FROM messages
WHERE created_at < NOW() - INTERVAL '1 year'
  AND deleted_at IS NOT NULL;

-- Delete old auth failures (older than 1 year)
DELETE FROM auth_failure_log
WHERE created_at < NOW() - INTERVAL '1 year';

-- Delete expired sessions (older than 30 days past expiry)
DELETE FROM user_sessions
WHERE expires_at < NOW() - INTERVAL '30 days';

-- Delete old daily digests (older than 90 days)
DELETE FROM daily_digests
WHERE created_at < NOW() - INTERVAL '90 days';

-- Note: security_audit_log is NEVER deleted (compliance requirement)
```

### Data Export (User Request)

If a user requests their data:

```sql
-- Export user's data
SELECT * FROM todos WHERE created_by = 'UserName' OR assigned_to = 'UserName';
SELECT * FROM messages WHERE created_by = 'UserName' OR recipient = 'UserName';
SELECT * FROM activity_log WHERE user_name = 'UserName';
```

### Data Deletion (User Request)

If a user requests deletion (right to be forgotten):

1. Export data for records
2. Anonymize rather than delete where audit trail required
3. Delete personal data:

```sql
-- Anonymize user in tasks (preserve task for others)
UPDATE todos SET
  created_by = 'Deleted User',
  assigned_to = CASE WHEN assigned_to = 'UserName' THEN NULL ELSE assigned_to END
WHERE created_by = 'UserName';

-- Delete user's direct messages
DELETE FROM messages WHERE created_by = 'UserName' AND recipient IS NOT NULL;

-- Anonymize team messages
UPDATE messages SET created_by = 'Deleted User' WHERE created_by = 'UserName';

-- Delete user account
DELETE FROM users WHERE name = 'UserName';
```

---

## Revision History

| Date | Version | Author | Changes |
|------|---------|--------|---------|
| 2026-01-25 | 1.0 | Security Team | Initial version |

---

**Last Updated:** 2026-01-25
**Classification:** Internal Use Only
**Owner:** Security Team

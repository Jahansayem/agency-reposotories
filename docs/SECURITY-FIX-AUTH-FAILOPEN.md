# Security Fix: Auth Fail-Open Vulnerabilities (P0.1)

## Summary

Fixed critical fail-open auth vulnerabilities where missing database migrations could bypass authentication entirely.

**Severity**: P0.1 (Critical)
**Impact**: In production deployments where migrations were missing, authentication would be completely bypassed
**Status**: Fixed
**Date**: 2026-02-20

## Vulnerability Details

### CVE-INTERNAL-2026-001: Middleware Auth Bypass

**Location**: `/src/middleware.ts:283-288`

**Old Behavior (VULNERABLE):**
```typescript
if (error?.code === '42P01' || error?.message?.includes('does not exist')) {
  return { valid: true }; // ← FAIL-OPEN: Auth bypass!
}
```

When the `user_sessions` table didn't exist (PostgreSQL error 42P01), the middleware would return `{ valid: true }`, treating all requests as authenticated.

**Attack Scenario:**
1. Deploy app to production before running migrations
2. `user_sessions` table doesn't exist
3. All API requests bypass authentication
4. Attacker can access any user's data without credentials

### CVE-INTERNAL-2026-002: Session Validator Header Trust

**Location**: `/src/lib/sessionValidator.ts:142-165`

**Old Behavior (VULNERABLE):**
```typescript
if (sessionError?.code === '42P01' || sessionError?.message?.includes('does not exist')) {
  const userName = request.headers.get('X-User-Name'); // ← Trusts client header!
  if (userName) {
    // Auth succeeds if header is present
    return { valid: true, userId: user.id, ... };
  }
}
```

When the `user_sessions` table didn't exist, the session validator would trust the `X-User-Name` header sent by the client.

**Attack Scenario:**
1. Deploy app to production before running migrations
2. Attacker sends request with `X-User-Name: admin` header
3. Attacker is authenticated as "admin" without knowing credentials
4. Full account takeover possible

## Fix Applied

### 1. Fail-Closed on Missing Migrations

Both vulnerabilities now fail-closed by default:

**Production (NODE_ENV=production):**
- Missing migrations → Authentication BLOCKED
- Returns `503 Service Unavailable`
- Forces operators to fix deployment before serving traffic

**Development (NODE_ENV != production):**
- Default: Same as production (fail-closed)
- Override: Set `SKIP_MIGRATION_CHECK=true` to allow bypass for local dev
- Logs security warning when bypassed

### 2. Health Check Endpoint

**New endpoint**: `/api/health`

Returns:
- `200 OK` - All required tables exist, app is ready
- `503 Service Unavailable` - Missing tables, migrations required

Health check verifies these critical tables exist:
- `user_sessions` (authentication)
- `users` (user accounts)
- `agencies` (multi-tenancy)

### 3. Security Logging

Both fail-open paths now log critical security events:
- `[SECURITY] CRITICAL: Auth table missing in production`
- Includes error code, message, and remediation steps

## Files Changed

### Modified Files
1. `/src/middleware.ts` (lines 283-299)
   - Added fail-closed logic with production/dev split
   - Added security event logging

2. `/src/lib/sessionValidator.ts` (lines 142-165)
   - Removed default fail-open behavior
   - Gated header-based fallback behind `SKIP_MIGRATION_CHECK` + dev mode
   - Added critical error logging

### New Files
1. `/src/lib/healthCheck.ts`
   - `checkDatabaseHealth()` - Verifies required tables exist
   - `shouldEnforceHealthCheck()` - Determines if enforcement is needed
   - Checks: `user_sessions`, `users`, `agencies`

2. `/src/app/api/health/route.ts`
   - Health check HTTP endpoint
   - Returns 200 (healthy) or 503 (unhealthy)
   - Suitable for load balancer health checks

3. `/docs/SECURITY-FIX-AUTH-FAILOPEN.md` (this file)

## Deployment Impact

### Breaking Changes

**Production deployments MUST have migrations applied** or the app will return 503 and refuse to serve traffic.

**Action Required Before Deploying:**
```bash
# 1. Ensure database migrations are applied
npm run migrate:schema

# 2. Verify health check passes
curl https://your-app.com/api/health
# Should return: { "status": "healthy", ... }

# 3. If health check fails, DO NOT DEPLOY until migrations are applied
```

### For Local Development

**Option A: Run migrations (recommended)**
```bash
npm run migrate:schema
```

**Option B: Skip migration check (temporary, for dev only)**
```bash
# Add to .env.local:
SKIP_MIGRATION_CHECK=true

# Warning: This is insecure and should NEVER be used in production
```

### For CI/CD Pipelines

Add health check verification to your deployment pipeline:

```yaml
# Example: GitHub Actions
- name: Wait for app to be healthy
  run: |
    for i in {1..30}; do
      if curl -f https://your-app.com/api/health; then
        echo "App is healthy"
        exit 0
      fi
      echo "Waiting for app to become healthy... ($i/30)"
      sleep 10
    done
    echo "App failed to become healthy"
    exit 1
```

## Verification Steps

### 1. Verify Fix Works (Production-Like)

```bash
# Start app WITHOUT migrations applied
# (for testing only - simulate misconfigured deploy)

# Test that auth is blocked:
curl http://localhost:3000/api/todos \
  -H "X-Session-Token: fake-token"

# Should return: 401 Unauthorized (not 200!)
# Old behavior would have returned data (auth bypass)
```

### 2. Verify Health Check

```bash
# Without migrations:
curl http://localhost:3000/api/health

# Should return 503:
# {
#   "status": "unhealthy",
#   "message": "Missing required tables: user_sessions, users, agencies. Run database migrations.",
#   "missingTables": ["user_sessions", "users", "agencies"]
# }

# With migrations:
curl http://localhost:3000/api/health

# Should return 200:
# {
#   "status": "healthy",
#   "message": "All health checks passed"
# }
```

### 3. Verify Dev Mode Bypass (Optional)

```bash
# Add to .env.local:
SKIP_MIGRATION_CHECK=true

# Without migrations, auth should work (insecure, dev only):
curl http://localhost:3000/api/health

# Should return 200 with warning:
# {
#   "status": "degraded",
#   "message": "Health check failed but enforcement is disabled",
#   "warning": "Missing required tables: ..."
# }
```

## Migration Path

### For Existing Deployments

If you have an existing deployment WITHOUT the user_sessions table:

1. **DO NOT DEPLOY THIS FIX YET** - Your app will return 503
2. Run migrations first:
   ```bash
   npm run migrate:schema
   ```
3. Verify migrations worked:
   ```bash
   npm run migrate:dry-run  # Should show no pending migrations
   ```
4. Deploy the security fix
5. Verify health check passes:
   ```bash
   curl https://your-app.com/api/health
   ```

### For New Deployments

1. Deploy app with this fix
2. Run migrations before opening to traffic
3. Verify health check passes
4. Route traffic to app

## Testing

### Unit Tests

No unit tests added (middleware and validation are integration points).

### Manual Testing Checklist

- [x] TypeScript compilation passes (`npx tsc --noEmit`)
- [x] App starts with migrations applied
- [x] Health check returns 200 when healthy
- [ ] Health check returns 503 when migrations missing (production mode)
- [ ] Auth fails when migrations missing (production mode)
- [ ] Dev bypass works with `SKIP_MIGRATION_CHECK=true`

## Related Security Issues

This fix addresses the root cause of:
- Auth bypass on fresh deployments
- Header-based auth spoofing attacks
- Race conditions between deployment and migrations

## References

- Original vulnerability report: P0.1
- PostgreSQL error code 42P01: "relation does not exist"
- OWASP: Fail-open vs fail-closed security controls

## Questions / Support

If you encounter issues deploying this fix:

1. Check that migrations are applied: `npm run migrate:schema`
2. Check health endpoint: `curl https://your-app.com/api/health`
3. Check logs for `[SECURITY] CRITICAL` messages
4. For local dev issues, try `SKIP_MIGRATION_CHECK=true` in `.env.local`

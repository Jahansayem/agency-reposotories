# Security Fixes - February 20, 2026

## Overview

This document describes critical security vulnerabilities fixed on 2026-02-20 and provides migration guidance.

**Priority**: P0.5, P1.2, P1.7 (Critical)

## Summary of Issues

| Issue | Severity | Description | Status |
|-------|----------|-------------|--------|
| P0.5 | Critical | Sensitive datasets with PII tracked in git | ✅ Fixed |
| P1.2 | High | Field-level encryption fails open on errors | ✅ Fixed |
| P1.7 | High | Sensitive data leaked via application logs | ✅ Fixed |

---

## Issue P0.5: Sensitive Data in Git Repository

### Problem

The following files containing customer PII (names, phone numbers, addresses) were tracked in the git repository:

- `src/data/bealer-model/**` - CSV files with customer data
- `ios-app/SharedTodoList/Resources/Secrets.plist` - API keys and credentials

**Risk**: Anyone with access to the repository (including git history) could view sensitive customer data.

### Fix Applied

1. **Removed sensitive directories**:
   - Deleted `src/data/bealer-model/` from working tree
   - Removed `Secrets.plist` from git tracking

2. **Updated `.gitignore`**:
   ```gitignore
   # Sensitive data - NEVER commit PII
   src/data/bealer-model/
   src/data/**/*.csv
   src/data/**/*.pdf
   !src/data/**/README.md
   !src/data/**/.gitkeep
   ```

3. **Created documentation**:
   - `/src/data/DATA_SECURITY.md` - Data storage guidelines
   - `ios-app/SharedTodoList/Resources/Secrets.example.plist` - Template for secrets

### Migration Required

#### For Data Files

If you were using `src/data/bealer-model/` in your code:

1. **Download data from secure storage**:
   ```bash
   # Example: AWS S3
   aws s3 cp s3://your-encrypted-bucket/bealer-model/ \
     src/data/local/bealer-model/ --recursive

   # Example: Google Cloud Storage
   gcloud storage cp -r gs://your-bucket/bealer-model/ \
     src/data/local/bealer-model/
   ```

2. **Update code references**:
   ```typescript
   // Before
   import data from '@/data/bealer-model/file.csv';

   // After
   import data from '@/data/local/bealer-model/file.csv';
   ```

3. **Verify `.gitignore`** excludes `src/data/local/`:
   ```bash
   git check-ignore src/data/local/
   # Should output: src/data/local/
   ```

#### For iOS Secrets

1. **Create local secrets file**:
   ```bash
   cp ios-app/SharedTodoList/Resources/Secrets.example.plist \
      ios-app/SharedTodoList/Resources/Secrets.plist
   ```

2. **Fill in actual values**:
   - Get `SUPABASE_URL` from Supabase dashboard
   - Get `SUPABASE_ANON_KEY` from Supabase dashboard
   - Get `API_BASE_URL` from Railway/Vercel deployment

3. **Verify exclusion**:
   ```bash
   git check-ignore ios-app/SharedTodoList/Resources/Secrets.plist
   # Should output: ios-app/SharedTodoList/Resources/Secrets.plist
   ```

### Production Deployment

For Railway/Vercel deployments:

1. **Store data in secure storage**:
   - Use Railway volumes for large files
   - Use S3/GCS for shared datasets
   - Use environment variables for small configs

2. **Set environment variables**:
   ```bash
   # Example: S3 configuration
   DATA_STORAGE_TYPE=s3
   S3_BUCKET=your-encrypted-bucket
   S3_REGION=us-west-2
   S3_ACCESS_KEY_ID=xxxxx
   S3_SECRET_ACCESS_KEY=xxxxx
   ```

3. **Update data loading code**:
   ```typescript
   // Example: Load from S3 in production
   async function loadData() {
     if (process.env.DATA_STORAGE_TYPE === 's3') {
       return await loadFromS3();
     } else {
       return await loadFromLocal();
     }
   }
   ```

### Security Recommendations

1. **Rotate any exposed secrets** that may have been committed historically
2. **Audit git history** for additional sensitive files
3. **Consider making repository private** if currently public
4. **Add pre-commit hooks** to prevent future incidents (see `/src/data/DATA_SECURITY.md`)

---

## Issue P1.2: Field-Level Encryption Fails Open

### Problem

The field encryption module (`src/lib/fieldEncryption.ts`) had fail-open behavior on errors:

**Before**:
```typescript
// Missing/invalid encryption key
if (!masterKey) {
  logger.error('Missing key');
  return null; // ❌ FAIL OPEN - allows plaintext storage
}

// Encryption error
try {
  // ... encrypt ...
} catch (error) {
  logger.error('Encryption failed');
  return plaintext; // ❌ FAIL OPEN - stores PII in plaintext
}
```

**Risk**: In production, if encryption fails due to misconfiguration, PII would be stored in plaintext in the database.

### Fix Applied

**After** - FAIL CLOSED in production:
```typescript
function getEncryptionKey(): Buffer | null {
  const keyHex = process.env.FIELD_ENCRYPTION_KEY;
  const isProduction = process.env.NODE_ENV === 'production';

  if (!keyHex) {
    if (isProduction) {
      throw new Error('FIELD_ENCRYPTION_KEY is not set'); // ✅ FAIL CLOSED
    }
    logger.error('Missing key - dev mode fallback');
    return null; // Allow dev fallback
  }

  if (keyHex.length !== 64) {
    if (isProduction) {
      throw new Error('Invalid key length'); // ✅ FAIL CLOSED
    }
    return null;
  }

  // ... similar for invalid format
}
```

```typescript
export function encryptField(plaintext: string, fieldName: string): string | null {
  const masterKey = getEncryptionKey();
  if (!masterKey) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Encryption key unavailable'); // ✅ FAIL CLOSED
    }
    return plaintext; // Dev fallback
  }

  try {
    // ... encryption logic ...
  } catch (error) {
    logger.error('Encryption failed', error);
    throw new Error('Encryption failed - refusing to store plaintext PII'); // ✅ FAIL CLOSED
  }
}
```

### Behavior Changes

#### Development (NODE_ENV !== 'production')
- Missing/invalid key → Logs warning, allows plaintext (for local dev)
- Encryption error → Logs error, allows plaintext

#### Production (NODE_ENV === 'production')
- Missing/invalid key → **Throws error, request fails**
- Encryption error → **Throws error, request fails**
- Decryption error → Returns `[DECRYPTION_ERROR: ...]` instead of corrupted data

### Migration Required

#### Verify Encryption Key is Set

1. **Check environment variables**:
   ```bash
   # Production (Railway/Vercel)
   railway variables get FIELD_ENCRYPTION_KEY
   # or
   vercel env pull
   ```

2. **If missing, generate and set**:
   ```bash
   # Generate key
   openssl rand -hex 32

   # Set in Railway
   railway variables set FIELD_ENCRYPTION_KEY=<generated-key>

   # Set in Vercel
   vercel env add FIELD_ENCRYPTION_KEY
   ```

3. **Verify length** (must be exactly 64 hex characters):
   ```bash
   echo -n "$FIELD_ENCRYPTION_KEY" | wc -c
   # Should output: 64
   ```

#### Test Error Handling

1. **Test with invalid key** (in staging):
   ```bash
   # Set invalid key temporarily
   export FIELD_ENCRYPTION_KEY="invalid"
   npm run dev

   # Try creating a task with notes
   # Should fail with: "Invalid key length"
   ```

2. **Test with missing key** (in staging):
   ```bash
   unset FIELD_ENCRYPTION_KEY
   export NODE_ENV=production
   npm run dev

   # Try creating a task
   # Should fail with: "FIELD_ENCRYPTION_KEY is not set"
   ```

### Monitoring Recommendations

Add alerts for encryption failures:

```typescript
// Example: DataDog/Sentry integration
if (process.env.NODE_ENV === 'production') {
  Sentry.captureException(new Error('Encryption failed'), {
    level: 'critical',
    tags: { component: 'fieldEncryption' }
  });
}
```

---

## Issue P1.7: Sensitive Data in Application Logs

### Problem

Multiple API routes logged raw AI prompts and responses containing customer PII:

**Before**:
```typescript
logger.error('Failed to parse AI response', undefined, {
  component: 'ParseFileAPI',
  responseText: textContent.text // ❌ Contains customer names, phones, etc.
});
```

**Risk**: Application logs (CloudWatch, DataDog, Railway logs) would contain customer PII, violating data privacy requirements.

### Fix Applied

1. **Created log redaction utility** (`src/lib/logRedaction.ts`):
   ```typescript
   // Redacts content, returns metadata only
   export function redactContent(content: string): RedactedContent {
     return {
       contentHash: sha256(content).substring(0, 16),
       charCount: content.length,
       byteSize: Buffer.byteLength(content, 'utf8'),
       preview: content.substring(0, 50),
       redacted: true,
     };
   }

   export function redactAIRequest(params: {
     prompt: string;
     model?: string;
     // ...
   }): RedactedAIRequest {
     // Returns hash, token counts, model info
     // Does NOT include prompt text
   }
   ```

2. **Updated affected routes**:
   - `src/app/api/outlook/parse-email/route.ts`
   - `src/app/api/ai/parse-file/route.ts`
   - `src/app/api/ai/breakdown-task/route.ts`
   - `src/app/api/ai/smart-parse/route.ts`
   - `src/app/api/ai/enhance-task/route.ts`
   - `src/app/api/ai/parse-content-to-subtasks/route.ts`
   - `src/app/api/ai/daily-digest/route.ts`
   - `src/app/api/digest/generate/route.ts`
   - `src/app/api/patterns/analyze/route.ts`

**After**:
```typescript
import { redactAIRequest, redactAIResponse, generateRequestId } from '@/lib/logRedaction';

const requestId = generateRequestId();

// Log redacted request metadata (no PII)
logger.info('AI request initiated', {
  component: 'OutlookParseEmailAPI',
  ...redactAIRequest({
    prompt,
    model: 'claude-sonnet-4-20250514',
    requestId,
  }),
});

// Call AI API...

// Log redacted response metadata (no PII)
logger.info('AI response received', {
  component: 'OutlookParseEmailAPI',
  ...redactAIResponse({
    content: responseText,
    model: 'claude-sonnet-4-20250514',
    inputTokens: usage?.input_tokens,
    outputTokens: usage?.output_tokens,
    requestId,
  }),
});
```

### What Gets Logged Now

**Before** (unsafe):
```json
{
  "level": "error",
  "message": "Failed to parse AI response",
  "responseText": "{\"name\": \"John Doe\", \"phone\": \"555-1234\"}"
}
```

**After** (safe):
```json
{
  "level": "error",
  "message": "Failed to parse AI response",
  "responseCharCount": 45,
  "responseHash": "a3f2b8c1e9d4f7a2",
  "requestId": "req_1708473241_abc123"
}
```

### Migration Required

#### Update Custom Logging Code

If you have custom API routes that log AI responses:

1. **Import redaction utilities**:
   ```typescript
   import { redactAIRequest, redactAIResponse } from '@/lib/logRedaction';
   ```

2. **Replace raw logging**:
   ```typescript
   // Before ❌
   logger.info('AI response', { response: aiResponse });

   // After ✅
   logger.info('AI response', redactAIResponse({
     content: aiResponse,
     model: 'claude-3-5-sonnet-20241022',
   }));
   ```

3. **Use request IDs for correlation**:
   ```typescript
   const requestId = generateRequestId();

   logger.info('AI request', { requestId, ...redactAIRequest({ prompt, requestId }) });
   // ... API call ...
   logger.info('AI response', { requestId, ...redactAIResponse({ content, requestId }) });
   ```

#### Audit Existing Logs

1. **Search for potentially leaked PII**:
   ```bash
   # Check recent logs for patterns
   railway logs | grep -E '\b\d{3}-\d{3}-\d{4}\b' # Phone numbers
   railway logs | grep -E '\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b' # Emails
   ```

2. **Rotate logs if PII found**:
   ```bash
   # Request log deletion from your logging provider
   # Example: DataDog
   curl -X DELETE "https://api.datadoghq.com/api/v2/logs/archives/..." \
     -H "DD-API-KEY: ${DD_API_KEY}"
   ```

3. **Set log retention policies**:
   - Railway: Logs automatically expire after 7 days
   - CloudWatch: Set retention to 7 days for sensitive routes
   - DataDog: Enable log scrubbing rules

### Testing

Run unit tests to verify redaction works:

```bash
npm run test -- src/test/logRedaction.test.ts
```

Expected output:
```
✓ should redact content and return metadata
✓ should redact AI request with all metadata
✓ should detect SSN
✓ should detect phone numbers
✓ should detect email addresses
```

---

## Deployment Checklist

Before deploying these changes to production:

- [ ] Verify `FIELD_ENCRYPTION_KEY` is set in production environment
- [ ] Test encryption fail-closed behavior in staging
- [ ] Audit existing logs for leaked PII
- [ ] Set log retention policies
- [ ] Download any required data files from git history to secure storage
- [ ] Create `Secrets.plist` for iOS app (local and CI/CD)
- [ ] Run `npx tsc --noEmit` to verify no TypeScript errors
- [ ] Run `npm run test` to verify all tests pass
- [ ] Deploy to staging and test end-to-end

---

## Backward Compatibility

### Field Encryption

- **Existing encrypted data** - Continues to decrypt normally
- **Existing plaintext data** - Will be encrypted on next write
- **Development mode** - No behavior change (still allows fallback)
- **Production mode** - Now fails closed on errors

### Logging

- **No breaking changes** - All log calls remain functional
- **Log structure change** - Some logs now include `responseHash` instead of `responseText`
- **Request IDs** - New field for correlation (optional, doesn't break existing tools)

---

## Contact

For questions or issues related to these security fixes:

- **Security team**: security@example.com
- **Repository owner**: Adrian Stier
- **Issue tracking**: Create issue in GitHub with `security` label

---

## References

- [P0.5 Data Privacy Issue](../src/data/DATA_SECURITY.md)
- [P1.2 Field Encryption](../src/lib/fieldEncryption.ts)
- [P1.7 Log Redaction](../src/lib/logRedaction.ts)
- [Log Redaction Tests](../src/test/logRedaction.test.ts)

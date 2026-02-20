# Data Security & Storage Guidelines

## Sensitive Data Removed from Repository

**Date**: 2026-02-20
**Issue**: P0.5 - Sensitive datasets with PII were tracked in git

### What Was Removed

The following directory has been removed from the repository and added to `.gitignore`:

- `src/data/bealer-model/**` - Contains CSV files with customer PII (names, phone numbers, addresses)

**CRITICAL**: Historical git commits (prior to 2026-02-20) still contain this sensitive data. The data has NOT been purged from git history to avoid repository corruption risks.

### Recommended Storage Locations

Sensitive datasets should NEVER be committed to the repository. Store them in one of these secure locations:

1. **Railway Secrets** (Production)
   - Store as environment variables if small
   - Use Railway volumes for larger datasets
   - Ensure encryption at rest is enabled

2. **AWS S3 / Google Cloud Storage** (Recommended for large datasets)
   - Use private buckets with IAM/service account access
   - Enable server-side encryption (SSE-S3 or SSE-KMS)
   - Set bucket policies to prevent public access
   - Use presigned URLs for temporary access

3. **Supabase Storage** (Recommended for app-integrated data)
   - Store in private buckets
   - Use Row Level Security (RLS) policies
   - Generate signed URLs for controlled access

4. **Separate Private Repository**
   - Create a dedicated private repo for datasets
   - Restrict access to authorized team members only
   - Use git-crypt or git-secret for encryption
   - NEVER make the repo public

### Loading Data in Development

For local development, create a `src/data/local/` directory (also gitignored) and download data from the secure storage location:

```bash
# Example: Download from S3
aws s3 cp s3://your-bucket/bealer-model/ src/data/local/bealer-model/ --recursive

# Example: Download from Google Cloud Storage
gcloud storage cp -r gs://your-bucket/bealer-model/ src/data/local/bealer-model/
```

Update your code to reference `src/data/local/bealer-model/` instead of the old path.

### Loading Data in Production

Use environment variables to specify the data source:

```bash
# .env (DO NOT COMMIT)
DATA_STORAGE_TYPE=s3
S3_BUCKET=your-encrypted-bucket
S3_REGION=us-west-2
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
```

Or use Railway volumes:

```bash
railway volume create bealer-data
railway volume mount bealer-data /data
# Upload data via Railway CLI or dashboard
```

## iOS Secrets Configuration

The `ios-app/SharedTodoList/Resources/Secrets.plist` file is gitignored and should never be committed.

### Setup

1. Copy the example file:
   ```bash
   cp ios-app/SharedTodoList/Resources/Secrets.example.plist \
      ios-app/SharedTodoList/Resources/Secrets.plist
   ```

2. Fill in your actual values:
   - `SUPABASE_URL`: Your Supabase project URL
   - `SUPABASE_ANON_KEY`: Your Supabase anon key (safe to expose in client apps)
   - `API_BASE_URL`: Your production API URL
   - `OUTLOOK_API_KEY`: (if using Outlook integration)

3. **NEVER** commit `Secrets.plist` - it's already in `.gitignore`

### CI/CD Integration

For automated builds:

1. Store secrets in your CI environment variables
2. Generate `Secrets.plist` at build time:
   ```yaml
   # Example: GitHub Actions
   - name: Generate Secrets.plist
     run: |
       cat > ios-app/SharedTodoList/Resources/Secrets.plist <<EOF
       <?xml version="1.0" encoding="UTF-8"?>
       <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
       <plist version="1.0">
       <dict>
         <key>SUPABASE_URL</key>
         <string>${{ secrets.SUPABASE_URL }}</string>
         <key>SUPABASE_ANON_KEY</key>
         <string>${{ secrets.SUPABASE_ANON_KEY }}</string>
         <key>API_BASE_URL</key>
         <string>${{ secrets.API_BASE_URL }}</string>
       </dict>
       </plist>
       EOF
   ```

## Git History Considerations

### Historical Commits

Commits prior to 2026-02-20 contain:
- Customer PII in `src/data/bealer-model/**`
- Potentially real secrets in `ios-app/SharedTodoList/Resources/Secrets.plist`

**Actions Required**:
1. **Rotate any secrets** that may have been committed historically
2. **Inform stakeholders** that PII was exposed in git history
3. **Do NOT clone** the repository to untrusted environments
4. Consider making the repository private if it's currently public

### Why We Didn't Purge History

Rewriting git history with `git filter-branch` or BFG Repo-Cleaner is risky because:
- It invalidates all existing clones and forks
- It can break PRs and issues if hosted on GitHub/GitLab
- Team members must force-pull and can lose work
- Historical commit SHAs change, breaking audit trails

Instead, we've removed the files going forward and documented the risk.

## Preventing Future Incidents

### Pre-commit Hooks

Consider adding a pre-commit hook to prevent accidental commits:

```bash
# .git/hooks/pre-commit
#!/bin/bash
if git diff --cached --name-only | grep -qE '\.csv$|\.pdf$|Secrets\.plist$'; then
  echo "ERROR: Attempting to commit sensitive files (.csv, .pdf, or Secrets.plist)"
  echo "Please remove them from the commit."
  exit 1
fi
```

### Code Review Checklist

When reviewing PRs, check for:
- [ ] No CSV/PDF files in `src/data/`
- [ ] No `Secrets.plist` in iOS project
- [ ] No hardcoded API keys or passwords
- [ ] No customer PII in test fixtures
- [ ] Environment variables documented in `.env.example`

## Questions?

Contact the security team or repository owner if you're unsure about:
- Where to store sensitive data
- How to access data in production
- Whether a file contains PII
- Setting up encryption for datasets

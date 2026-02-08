# Analytics & Segmentation Troubleshooting Guide

**Last Updated:** February 2026
**For:** Developers and Support Team

This guide provides detailed troubleshooting steps for common issues with the Analytics system, Customer Segmentation Dashboard, and Customer Lookup features.

---

## Table of Contents

1. [Customer Segmentation Issues](#customer-segmentation-issues)
2. [Data Upload Problems](#data-upload-problems)
3. [API Errors](#api-errors)
4. [Performance Issues](#performance-issues)
5. [Data Quality Issues](#data-quality-issues)
6. [Security & Encryption](#security--encryption)

---

## Customer Segmentation Issues

### Issue: Dashboard Shows "Demo Data" Instead of Live Data

**Symptoms:**
- Dashboard displays `○ Demo Data` badge (amber)
- Segment counts match demo data (112 Elite, 52 Premium, etc.)
- Recent uploads don't appear in segmentation

**Common Causes:**
1. No customer data uploaded yet
2. API segmentation call failed
3. Customer list hook (`useCustomers`) not loading data
4. Field name mismatch between database and API

**Debugging Steps:**

1. **Check if customers exist in database:**
   ```sql
   SELECT COUNT(*) FROM customer_insights WHERE agency_id = 'your-agency-id';
   ```
   - If count is 0: No data uploaded yet
   - If count > 0: Data exists, but segmentation API may be failing

2. **Check browser console for errors:**
   - Open DevTools → Console tab
   - Look for errors from `/api/analytics/segmentation`
   - Common error: `Failed to fetch segmentation`

3. **Verify useCustomers hook is fetching data:**
   ```typescript
   // In CustomerSegmentationDashboard.tsx
   console.log('[Segmentation] Customers loaded:', {
     count: customerList.customers.length,
     loading: customerList.loading,
     error: customerList.error
   });
   ```

4. **Check field name mappings:**
   - API expects: `productCount`, `annualPremium`
   - Database has: `total_policies`, `total_premium`
   - Dashboard maps: `policyCount`, `totalPremium`
   - Verify transformation in `fetchSegmentation()`:
     ```typescript
     const customerData = customers.map(c => ({
       customerId: c.id,
       productCount: c.policyCount,   // Correct mapping
       annualPremium: c.totalPremium, // Correct mapping
     }));
     ```

**Resolution:**

**If no data exists:**
- Upload customer data via Analytics → Upload Data
- Use CSV or Excel with columns: Name, Premium, Policy Count

**If API call is failing:**
- Check API logs: `vercel logs` or Railway logs
- Verify `ANTHROPIC_API_KEY` is set (for analytics calculations)
- Check for 500 errors in `/api/analytics/segmentation`

**If data exists but not displaying:**
- Verify `fetchSegmentation` is being called in `useEffect`
- Check that `customerList.customers.length > 0` before calling API
- Add debug logging to trace data flow

---

### Issue: Segment Names Show "low_value" Instead of "entry"

**Symptoms:**
- Dashboard displays segment named "low_value"
- Should display "entry" per UI design
- API response includes `low_value` in segment names

**Root Cause:**
API uses `low_value` as the internal segment name, but UI displays `entry` for user-facing text.

**Resolution:**
Ensure the `API_TO_DASHBOARD_SEGMENT` mapping is applied:

```typescript
const API_TO_DASHBOARD_SEGMENT: Record<string, string> = {
  elite: 'elite',
  premium: 'premium',
  standard: 'standard',
  low_value: 'entry',  // Transform API name to UI name
};

// When processing API response:
const transformedSegments = Object.entries(apiSegments).map(
  ([apiSegmentName, analysis]) => {
    const dashboardSegment = API_TO_DASHBOARD_SEGMENT[apiSegmentName] || apiSegmentName;
    return {
      segment: dashboardSegment,  // Uses "entry", not "low_value"
      ...
    };
  }
);
```

**Verification:**
- Check component renders "entry" not "low_value"
- Verify `SEGMENT_CONFIG[segment]` exists (it won't if using "low_value")

---

### Issue: Refresh Button Spinning Forever

**Symptoms:**
- Click refresh button
- Button shows spinning icon indefinitely
- No error in console
- Data doesn't update

**Common Causes:**
1. `useCustomers` hook not refreshing
2. Circular dependency in `useEffect` hooks
3. Network timeout
4. API not responding

**Debugging Steps:**

1. **Check refresh flow:**
   ```typescript
   const handleRefresh = useCallback(async () => {
     console.log('[Refresh] Starting refresh');
     setIsRefreshing(true);
     customerList.refresh();  // Triggers customer list refresh
   }, [customerList]);
   ```

2. **Verify customer list completes:**
   ```typescript
   useEffect(() => {
     console.log('[Refresh] Customer list state:', {
       loading: customerList.loading,
       isRefreshing,
       count: customerList.customers.length
     });

     if (!customerList.loading && isRefreshing && customerList.customers.length > 0) {
       fetchSegmentation(customerList.customers);
     }
   }, [customerList.loading, customerList.customers, isRefreshing, fetchSegmentation]);
   ```

3. **Check network tab:**
   - DevTools → Network
   - Filter by `customers` and `segmentation`
   - Look for stuck pending requests

**Resolution:**

**If customer refresh doesn't complete:**
- Check `useCustomers` hook for errors
- Verify `/api/customers` endpoint is responding
- Add timeout to refresh call:
  ```typescript
  const timeout = setTimeout(() => {
    setIsRefreshing(false);
    setSegmentationError('Refresh timeout');
  }, 10000);
  ```

**If segmentation API times out:**
- Reduce batch size (try 500 customers first)
- Add timeout to fetch call
- Fall back to demo data on timeout

---

### Issue: Segment Counts Don't Match Expectations

**Symptoms:**
- Elite count is too high or too low
- Segments seem incorrectly classified
- Customer appears in wrong tier

**Common Causes:**
1. Misunderstanding segmentation criteria
2. Data quality issues (missing premium/policy count)
3. Algorithm threshold mismatch

**Debugging Steps:**

1. **Review segmentation criteria:**
   - Elite: (Premium ≥$15K AND 3+ policies) OR Premium ≥$20K OR 5+ policies
   - Premium: (Premium ≥$7K AND 2+ policies) OR Premium ≥$10K OR 4+ policies
   - Standard: Premium ≥$3K OR 2+ policies
   - Entry: Everything else

2. **Test specific customer:**
   ```typescript
   import { getCustomerSegment } from '@/lib/segmentation';

   const customerPremium = 18000;
   const customerPolicies = 4;
   const segment = getCustomerSegment(customerPremium, customerPolicies);
   console.log(`Customer with $${customerPremium} and ${customerPolicies} policies: ${segment}`);
   // Expected: "elite"
   ```

3. **Check for data anomalies:**
   ```sql
   -- Find customers with missing data
   SELECT customer_name, total_premium, total_policies
   FROM customer_insights
   WHERE total_premium IS NULL OR total_policies IS NULL OR total_policies = 0;
   ```

**Resolution:**

**If criteria are misunderstood:**
- Review `src/lib/segmentation.ts` for canonical algorithm
- Note: Algorithm uses OR logic - high in ONE dimension can qualify

**If data quality is poor:**
- Re-upload customer data with all required fields
- Validate CSV has Premium and Policy Count columns
- Check for $0 premiums or 0 policy counts (invalid)

**If algorithm needs adjustment:**
- Modify thresholds in `SEGMENT_THRESHOLDS` (src/lib/segmentation.ts)
- Coordinate with business stakeholders
- Update documentation to match new thresholds

---

## Data Upload Problems

### Issue: AI Upload Fails to Detect Schema

**Symptoms:**
- Upload modal shows "Failed to detect schema"
- AI-powered upload doesn't work
- Manual mapping required every time

**Common Causes:**
1. CSV/Excel file has no header row
2. Column names are ambiguous or foreign language
3. File is corrupted
4. ANTHROPIC_API_KEY missing or invalid

**Debugging Steps:**

1. **Check file format:**
   - Open CSV/Excel manually
   - Verify first row contains column headers
   - Column names should be in English

2. **Check API key:**
   ```bash
   # In Railway or Vercel
   echo $ANTHROPIC_API_KEY | cut -c1-10
   # Should show: sk-ant-api...
   ```

3. **Review AI prompt:**
   - Check `/api/analytics/ai-upload/route.ts`
   - Verify prompt includes sample data rows
   - Look for AI response in logs

**Resolution:**

**If headers are missing:**
- Add header row manually
- Re-upload with headers: Name, Premium, Policy Count, etc.

**If API key is missing:**
- Set environment variable in deployment platform
- Restart deployment after adding key

**If AI is failing consistently:**
- Fall back to manual CSV upload
- Use predefined column mappings
- File issue for AI prompt improvement

---

### Issue: Upload Succeeds but No Customers Appear

**Symptoms:**
- Upload completes with success message
- `data_upload_batches` table has entry
- `customer_insights` table is empty
- Customer Segmentation shows Demo Data

**Common Causes:**
1. Parser failed to extract customer data
2. Data validation rejected all rows
3. Database transaction rollback
4. Agency ID mismatch

**Debugging Steps:**

1. **Check upload batch record:**
   ```sql
   SELECT * FROM data_upload_batches
   ORDER BY uploaded_at DESC
   LIMIT 1;
   ```
   - Look at `records_processed` field
   - Check `status` (should be 'completed')

2. **Check for failed inserts:**
   ```sql
   -- Check if customer_insights has entries
   SELECT COUNT(*) FROM customer_insights
   WHERE created_at > NOW() - INTERVAL '1 hour';
   ```

3. **Review upload API logs:**
   - Look for validation errors
   - Check for database constraint violations
   - Search for "Skipping customer" messages

**Resolution:**

**If parser failed:**
- Check CSV format matches expected schema
- Verify column types (Premium should be numeric)
- Look for special characters or encoding issues

**If validation rejected rows:**
- Check data quality: non-null names, positive premiums
- Ensure policy count is numeric
- Remove duplicate customer names

**If agency ID mismatch:**
- Verify upload includes correct `agency_id`
- Check user's agency context
- Ensure RLS policies allow insertion

---

## API Errors

### Issue: 500 Internal Server Error from /api/analytics/segmentation

**Symptoms:**
- API returns 500 status code
- Error message: "Failed to analyze customer segments"
- Segmentation dashboard fails to load

**Common Causes:**
1. Missing required fields in request body
2. Invalid customer data format
3. Analytics library error
4. Database connection issue

**Debugging Steps:**

1. **Check request payload:**
   ```typescript
   console.log('Segmentation request:', {
     customerCount: customerData.length,
     sampleCustomer: customerData[0],
     hasMarketingBudget: !!marketingBudget
   });
   ```

2. **Verify data types:**
   - `productCount` must be number (not string)
   - `annualPremium` must be number (not string)
   - `customerId` is optional but must be string if provided

3. **Check server logs:**
   ```bash
   # Railway logs
   railway logs

   # Vercel logs
   vercel logs
   ```
   - Look for stack traces
   - Check for NaN or undefined values

**Resolution:**

**If request format is invalid:**
- Ensure all required fields are present
- Validate data types before sending
- Add request validation middleware

**If analytics library throws error:**
- Check `src/lib/analytics.ts` for bugs
- Verify `classifyCustomer` and `calculateCustomerLtv` functions
- Add try-catch around analytics calls

**If database is down:**
- Check Supabase status
- Verify connection string
- Test with simple query first

---

### Issue: 401 Unauthorized from /api/customers

**Symptoms:**
- API returns 401 status code
- Error: "Unauthorized"
- Customer lookup fails

**Common Causes:**
1. Missing session authentication
2. Agency context not set
3. RLS policy blocking query
4. Invalid service role key

**Debugging Steps:**

1. **Check session:**
   ```typescript
   const session = localStorage.getItem('todoSession');
   console.log('Session:', JSON.parse(session));
   ```

2. **Verify agency context:**
   ```typescript
   const { currentAgency } = useAgencyContext();
   console.log('Current agency:', currentAgency?.id);
   ```

3. **Test authentication:**
   ```bash
   curl -H "Cookie: session=..." https://your-app.com/api/customers
   ```

**Resolution:**

**If session is missing:**
- Re-login to create new session
- Check session expiration (30 min idle timeout)

**If agency context is wrong:**
- Switch to correct agency
- Verify user is member of agency

**If RLS is blocking:**
- Check Supabase RLS policies on `customer_insights` table
- Verify `agency_id` matches user's agency
- Consider adding OR condition for null agency_id (demo data)

---

## Performance Issues

### Issue: Segmentation API Takes >5 Seconds

**Symptoms:**
- Segmentation API call takes 5-10 seconds
- Dashboard feels slow to load
- Refresh takes too long

**Performance Baseline:**
- 1,000 customers: ~64ms (tested)
- 5,000 customers: ~320ms (estimated)
- 10,000 customers: ~640ms (estimated)

**Common Causes:**
1. Too many customers in single batch
2. Unoptimized database query
3. Network latency
4. Analytics calculation overhead

**Debugging Steps:**

1. **Measure API time:**
   ```typescript
   const start = performance.now();
   const response = await fetch('/api/analytics/segmentation', {...});
   const elapsed = performance.now() - start;
   console.log(`Segmentation API: ${elapsed}ms`);
   ```

2. **Check customer count:**
   ```typescript
   console.log('Sending customers:', customerData.length);
   // If > 5,000, consider batching
   ```

3. **Profile analytics functions:**
   ```typescript
   // In src/lib/analytics.ts
   console.time('classifyCustomer');
   const segment = classifyCustomer(productCount, annualPremium);
   console.timeEnd('classifyCustomer');
   ```

**Resolution:**

**If batch is too large:**
- Implement pagination: fetch 1,000 customers at a time
- Aggregate results client-side
- Cache segmentation results

**If calculation is slow:**
- Optimize `classifyCustomer` function (add memoization)
- Pre-calculate segments in database
- Use Web Worker for heavy computation

**If network is slow:**
- Compress response payload
- Cache segmentation results (5-minute TTL)
- Use HTTP/2 for faster requests

---

## Data Quality Issues

### Issue: Duplicate Customers in Segmentation

**Symptoms:**
- Same customer appears multiple times
- Total customer count is inflated
- Segments have duplicate entries

**Common Causes:**
1. Customer name variations (e.g., "John Smith" vs "Smith, John")
2. Multiple uploads of same data
3. Merge logic not deduplicating correctly

**Debugging Steps:**

1. **Check for duplicates:**
   ```sql
   SELECT customer_name, COUNT(*) as count
   FROM customer_insights
   GROUP BY customer_name
   HAVING COUNT(*) > 1;
   ```

2. **Check merge logic:**
   ```typescript
   // In /api/customers/route.ts
   const customerMap = new Map<string, Customer>();
   // Map uses customer name as key - should dedupe automatically
   ```

**Resolution:**

**If database has duplicates:**
- Run deduplication script:
  ```sql
  DELETE FROM customer_insights
  WHERE id NOT IN (
    SELECT MIN(id)
    FROM customer_insights
    GROUP BY customer_name
  );
  ```

**If merge logic is broken:**
- Verify Map key is consistent (lowercase names?)
- Add normalization: `name.toLowerCase().trim()`

---

### Issue: Missing Customer Data (Email, Phone)

**Symptoms:**
- Customer email shows as `null`
- Phone number is `null`
- Expected encrypted data is missing

**Common Causes:**
1. Decryption failure (invalid key)
2. Data never encrypted in upload
3. Field name mismatch

**Debugging Steps:**

1. **Check encryption key:**
   ```bash
   echo $FIELD_ENCRYPTION_KEY | wc -c
   # Should be 64 characters (32 bytes hex)
   ```

2. **Check database:**
   ```sql
   SELECT customer_email, customer_phone
   FROM customer_insights
   LIMIT 1;
   ```
   - If shows encrypted: `enc_v1:...`
   - If shows null: data wasn't saved
   - If shows plaintext: encryption failed

3. **Test decryption:**
   ```typescript
   import { decryptField } from '@/lib/fieldEncryption';
   const decrypted = decryptField(encryptedValue, 'customer_insights.customer_email');
   ```

**Resolution:**

**If decryption failing:**
- Verify `FIELD_ENCRYPTION_KEY` is correct (32 bytes hex)
- Check encryption version matches (v1)
- Fall back to null if decryption fails (graceful degradation)

**If data never saved:**
- Check upload parsing includes email/phone fields
- Verify CSV has Email and Phone columns
- Ensure encryption happens before database insert

---

## Security & Encryption

### Issue: Encrypted Fields Showing as Ciphertext

**Symptoms:**
- Customer email displays as: `enc_v1:abc123...`
- Phone shows encrypted value instead of plaintext
- Data is unusable in UI

**Root Cause:**
Decryption is not being applied before returning data to client.

**Resolution:**

```typescript
// In /api/customers/route.ts
try {
  decryptedEmail = decryptField(customer.customer_email, 'customer_insights.customer_email');
} catch {
  // Decryption failed - return null instead of ciphertext
  decryptedEmail = null;
}
```

**Verification:**
- API response should have plaintext email/phone
- Never expose ciphertext to client
- Log decryption failures for monitoring

---

### Issue: Cannot Search by Email or Phone

**Symptoms:**
- Search query for email returns no results
- Phone number search doesn't work
- Only name search works

**Root Cause:**
Email and phone are encrypted at rest. PostgreSQL cannot perform ILIKE queries on encrypted text.

**Limitation:**
This is by design for PII security. Encrypted fields cannot be searched using SQL ILIKE.

**Workaround:**
1. Search by name only (not encrypted)
2. Fetch all customers and filter client-side (only for small datasets)
3. Implement encrypted search index (future enhancement)

---

## Common Error Messages

### "Failed to fetch segmentation"

**Cause:** API call to `/api/analytics/segmentation` failed
**Fix:** Check browser console for specific error, verify API is responding

### "No customers found"

**Cause:** Customer list is empty or filtered too narrowly
**Fix:** Upload customer data or adjust search filters

### "Decryption failed for field"

**Cause:** Encryption key mismatch or corrupted data
**Fix:** Verify `FIELD_ENCRYPTION_KEY` environment variable is correct

### "Unauthorized"

**Cause:** Session expired or invalid
**Fix:** Re-login to create new session

---

## Diagnostic Checklist

Before escalating an issue, run through this checklist:

- [ ] Customer data exists in `customer_insights` table
- [ ] User is logged in with valid session
- [ ] Agency context is set correctly
- [ ] Encryption key is configured (for PII fields)
- [ ] API logs show no 500 errors
- [ ] Browser console has no errors
- [ ] Network tab shows successful API responses
- [ ] Data format matches API expectations (field names, types)
- [ ] Segmentation algorithm criteria are understood

---

## Support & Escalation

### For Users
1. Check this troubleshooting guide first
2. Verify data has been uploaded
3. Try refreshing the browser (hard refresh: Cmd+Shift+R or Ctrl+F5)
4. Contact your agency admin

### For Developers
1. Check API logs for errors
2. Review browser console for client-side errors
3. Verify environment variables are set
4. Test API endpoints with Postman or curl
5. Review recent code changes

### For Critical Issues
- Email: support@bealeragency.com
- Slack: #analytics-support
- GitHub: File issue with [Analytics] tag

---

**Last Updated:** February 2026
**Maintained by:** Development Team

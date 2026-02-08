# Customer Segmentation Dashboard - Monitoring & Analytics Plan (Phase 4)

**Date**: 2026-02-06
**Status**: Ready for Implementation
**Owner**: Data Science / DevOps Team

---

## Overview

This document outlines the monitoring and analytics strategy for the CustomerSegmentationDashboard to ensure:
1. **Performance monitoring** - Track API response times, memory usage, errors
2. **Usage analytics** - Understand how users interact with segmentation features
3. **Business insights** - Measure impact on agency operations
4. **Proactive alerting** - Detect issues before users report them

---

## Phase 4.1: PostHog Analytics Tracking

### Events to Track

#### 1. Dashboard Interactions
```typescript
// CustomerSegmentationDashboard.tsx additions

import posthog from 'posthog-js';

// Track dashboard view
useEffect(() => {
  posthog.capture('segmentation_dashboard_viewed', {
    data_mode: isLiveData ? 'live' : 'demo',
    customer_count: customerList.customers.length,
    segment_count: segments.length,
  });
}, [isLiveData]);

// Track refresh action
const handleRefresh = useCallback(async () => {
  posthog.capture('segmentation_refresh_clicked', {
    data_mode_before: isLiveData ? 'live' : 'demo',
    customer_count: customerList.customers.length,
  });

  setIsRefreshing(true);
  customerList.refresh();
}, [customerList, isLiveData]);

// Track methodology panel toggle
const toggleMethodology = useCallback(() => {
  posthog.capture('segmentation_methodology_toggled', {
    action: showMethodology ? 'close' : 'open',
  });
  setShowMethodology(!showMethodology);
}, [showMethodology]);

// Track segment card interactions
const handleSegmentClick = useCallback((segment: string) => {
  posthog.capture('segmentation_segment_clicked', {
    segment_name: segment,
    customer_count: segments.find(s => s.segment === segment)?.count || 0,
  });
}, [segments]);

// Track errors
useEffect(() => {
  if (segmentationError) {
    posthog.capture('segmentation_error_occurred', {
      error_message: segmentationError,
      customer_count: customerList.customers.length,
      data_mode: isLiveData ? 'live' : 'demo',
    });
  }
}, [segmentationError]);
```

#### 2. API Performance Events
```typescript
// Track API call duration
const fetchSegmentation = useCallback(async (customers) => {
  const startTime = performance.now();

  try {
    const response = await fetch('/api/analytics/segmentation', { ... });
    const duration = performance.now() - startTime;

    posthog.capture('segmentation_api_success', {
      duration_ms: Math.round(duration),
      customer_count: customers.length,
      segment_count: result.portfolioAnalysis.segments.length,
    });
  } catch (error) {
    posthog.capture('segmentation_api_error', {
      error: error.message,
      customer_count: customers.length,
    });
  }
}, []);
```

#### 3. Data Mode Transitions
```typescript
// Track when dashboard switches between live and demo data
useEffect(() => {
  if (isLiveData !== previousDataMode) {
    posthog.capture('segmentation_data_mode_changed', {
      from: previousDataMode ? 'live' : 'demo',
      to: isLiveData ? 'live' : 'demo',
      customer_count: customerList.customers.length,
    });
  }
}, [isLiveData]);
```

### PostHog Dashboard Setup

**Create Dashboard**: "Customer Segmentation Analytics"

**Widgets**:
1. **Total Views** (Insight: Trend)
   - Event: `segmentation_dashboard_viewed`
   - Filter: Last 30 days
   - Chart: Line chart

2. **Data Mode Distribution** (Insight: Funnel)
   - Events: `segmentation_dashboard_viewed`
   - Breakdown: `data_mode` property
   - Chart: Pie chart

3. **Refresh Actions** (Insight: Trend)
   - Event: `segmentation_refresh_clicked`
   - Filter: Last 7 days
   - Chart: Bar chart (daily)

4. **API Performance** (Insight: Trend)
   - Event: `segmentation_api_success`
   - Aggregation: Average of `duration_ms`
   - Chart: Line chart with percentiles (p50, p95, p99)

5. **Error Rate** (Insight: Trend)
   - Events: `segmentation_api_error`, `segmentation_error_occurred`
   - Chart: Line chart
   - Alert: > 5% error rate

6. **Segment Popularity** (Insight: Trend)
   - Event: `segmentation_segment_clicked`
   - Breakdown: `segment_name`
   - Chart: Bar chart (horizontal)

7. **Customer Count Distribution** (Insight: Trend)
   - Event: `segmentation_dashboard_viewed`
   - Property: `customer_count`
   - Chart: Histogram

### Implementation Effort
- **Development**: 2 hours
- **Testing**: 30 minutes
- **PostHog dashboard setup**: 30 minutes
- **Total**: 3 hours

---

## Phase 4.2: Performance Monitoring

### Metrics to Monitor

#### 1. API Response Times (Segmentation Endpoint)

**Setup**: Railway Logs + Custom Middleware

```typescript
// src/app/api/analytics/segmentation/route.ts

export async function POST(request: Request) {
  const startTime = performance.now();
  const customerId = request.headers.get('x-customer-id');

  try {
    // ... existing logic

    const duration = performance.now() - startTime;
    console.log(JSON.stringify({
      event: 'api_segmentation_success',
      duration_ms: Math.round(duration),
      customer_count: customers.length,
      timestamp: new Date().toISOString(),
    }));

    return NextResponse.json(result);
  } catch (error) {
    const duration = performance.now() - startTime;
    console.error(JSON.stringify({
      event: 'api_segmentation_error',
      duration_ms: Math.round(duration),
      error: error.message,
      timestamp: new Date().toISOString(),
    }));

    throw error;
  }
}
```

**Monitoring**: Parse Railway logs for JSON events

**Alert Thresholds**:
- ⚠️ Warning: p95 > 500ms
- 🔴 Critical: p95 > 1,000ms or p99 > 2,000ms

#### 2. Memory Usage (Client-Side)

**Setup**: Performance Observer in Dashboard Component

```typescript
// CustomerSegmentationDashboard.tsx

useEffect(() => {
  if ('memory' in performance) {
    const memory = (performance as any).memory;

    posthog.capture('segmentation_memory_snapshot', {
      used_js_heap_mb: Math.round(memory.usedJSHeapSize / 1048576),
      total_js_heap_mb: Math.round(memory.totalJSHeapSize / 1048576),
      heap_limit_mb: Math.round(memory.jsHeapSizeLimit / 1048576),
    });
  }
}, [segments]); // Capture after data loads
```

**Alert Thresholds**:
- ⚠️ Warning: Heap > 150MB
- 🔴 Critical: Heap growth > 50MB per refresh cycle

#### 3. Error Monitoring (Sentry Integration)

**Setup**: Add Sentry to Next.js

```bash
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

**Configure** `sentry.client.config.ts`:
```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1, // 10% of transactions
  environment: process.env.NODE_ENV,
  beforeSend(event, hint) {
    // Filter out segmentation-specific errors for analysis
    if (event.tags?.component === 'CustomerSegmentationDashboard') {
      event.tags.feature = 'segmentation';
    }
    return event;
  },
});
```

**Tag Errors in Component**:
```typescript
try {
  const response = await fetch('/api/analytics/segmentation', { ... });
} catch (error) {
  Sentry.captureException(error, {
    tags: {
      component: 'CustomerSegmentationDashboard',
      data_mode: isLiveData ? 'live' : 'demo',
      customer_count: customerList.customers.length,
    },
  });
  setSegmentationError(error.message);
}
```

**Alert Setup**: Sentry notifications for:
- > 10 errors/hour
- Error rate > 5%
- New error types

#### 4. Database Query Performance

**Setup**: Supabase Dashboard Monitoring

**Queries to Monitor**:
1. `SELECT * FROM customer_insights WHERE agency_id = ?`
   - Target: < 100ms for 1,000 rows
   - Alert: > 500ms

2. Segmentation API aggregations
   - Target: < 50ms
   - Alert: > 200ms

**Actions if slow**:
- Add indexes: `CREATE INDEX idx_customer_insights_agency ON customer_insights(agency_id)`
- Materialize views for large datasets
- Consider pagination for > 5,000 customers

### Performance Dashboard (Grafana/Railway)

**Metrics Panel**:
1. API latency (p50, p95, p99)
2. Error rate (%)
3. Request volume (req/min)
4. Memory usage (MB)
5. Database query time (ms)

**Time Range**: Last 24 hours (default)

### Implementation Effort
- **Sentry setup**: 1 hour
- **Performance logging**: 1 hour
- **Dashboard configuration**: 2 hours
- **Testing alerts**: 30 minutes
- **Total**: 4.5 hours

---

## Alerting Strategy

### Alert Channels
1. **Slack** (#engineering) - All alerts
2. **Email** (engineering@bealeragency.com) - Critical alerts only
3. **PagerDuty** (on-call) - Critical production outages

### Alert Levels

#### 🟢 INFO (Log only, no notification)
- Segmentation dashboard viewed
- Refresh button clicked
- Normal API response times

#### ⚠️ WARNING (Slack notification)
- API p95 latency > 500ms
- Error rate > 1%
- Memory usage > 150MB

#### 🔴 CRITICAL (Slack + Email + PagerDuty)
- API p95 latency > 1,000ms
- Error rate > 5%
- API endpoint down (5 consecutive failures)
- Memory leak detected (growth > 50MB/refresh)

### Alert Examples

**Slack Alert** (Warning):
```
⚠️ Segmentation API Slow
p95 latency: 620ms (threshold: 500ms)
Customer count: 1,200
Time: 2026-02-06 14:32:00 UTC
Dashboard: https://posthog.com/...
```

**Slack Alert** (Critical):
```
🔴 CRITICAL: Segmentation API Down
Error rate: 8.5% (threshold: 5%)
Affected users: ~15 agencies
Last error: "Cannot connect to database"
Time: 2026-02-06 14:35:00 UTC
Runbook: https://docs.bealeragency.com/runbooks/segmentation-api
On-call: @engineer-oncall
```

---

## Business Insights (Phase 4 Analytics)

### Usage Reports (Weekly)

**Report**: "Segmentation Dashboard Usage Summary"

**Metrics**:
1. **Adoption Rate**
   - % of agencies accessing dashboard
   - Target: > 50% Week 1, > 80% Month 1

2. **Data Mode Distribution**
   - % using Live Data vs Demo Data
   - Target: > 80% Live Data after CSV uploads

3. **Engagement**
   - Average session duration
   - Refresh actions per session
   - Segment interactions

4. **Performance**
   - Average API response time
   - Error rate
   - Customer count distribution

**Delivery**: Email to product@ and leadership@ every Monday

### Business Impact Metrics (Monthly)

**Report**: "Segmentation Business Impact"

**Metrics**:
1. **Revenue Impact**
   - Cross-sell opportunities identified via Elite/Premium segments
   - Revenue from customers in each tier

2. **Operational Efficiency**
   - Time saved in customer classification
   - Reduction in manual segmentation tasks

3. **Customer Service**
   - Service tier adoption (Elite → white-glove, Entry → self-service)
   - Customer satisfaction by segment

**Delivery**: Quarterly board presentation

### Implementation Effort
- **PostHog insights setup**: 2 hours
- **Report automation**: 4 hours
- **Data pipeline**: 2 hours
- **Total**: 8 hours

---

## Monitoring SLOs (Service Level Objectives)

### Dashboard Availability
- **Target**: 99.9% uptime (< 43 minutes downtime/month)
- **Measurement**: Synthetic monitoring (Pingdom/UptimeRobot)
- **Alert**: 3 consecutive failures

### API Performance
- **Target**: p95 < 500ms, p99 < 1,000ms
- **Measurement**: Railway logs + PostHog
- **Alert**: 5 consecutive measurements above threshold

### Error Rate
- **Target**: < 0.1% error rate
- **Measurement**: Sentry + PostHog
- **Alert**: > 1% sustained for 5 minutes

### Data Freshness
- **Target**: Data < 5 minutes old after refresh
- **Measurement**: Timestamp comparison
- **Alert**: Stale data > 15 minutes

---

## Cost Estimates (Monthly)

| Service | Tier | Cost | Notes |
|---------|------|------|-------|
| **PostHog** | Free/Startup | $0-$50 | < 1M events/month |
| **Sentry** | Team | $26 | < 50K errors/month |
| **UptimeRobot** | Free | $0 | 50 monitors |
| **Slack** (existing) | $0 | $0 | Alert channel |
| **Total** | | **$26-$76/month** | Scales with usage |

---

## Implementation Checklist

### Phase 4.1: Analytics Tracking (2-3 hours)
- [ ] Add PostHog events to CustomerSegmentationDashboard
- [ ] Test events in PostHog debugging mode
- [ ] Create PostHog dashboard
- [ ] Verify events in production

### Phase 4.2: Performance Monitoring (4-5 hours)
- [ ] Add Sentry to Next.js project
- [ ] Configure error tagging
- [ ] Add performance logging to API
- [ ] Set up Railway log parsing
- [ ] Configure memory monitoring
- [ ] Create Grafana dashboard (optional)

### Phase 4.3: Alerting (1-2 hours)
- [ ] Configure Slack webhook
- [ ] Set up PagerDuty integration (optional)
- [ ] Test alert delivery
- [ ] Document escalation procedures

### Phase 4.4: Business Insights (6-8 hours)
- [ ] Create weekly usage report template
- [ ] Set up automated report delivery
- [ ] Build business impact dashboard
- [ ] Train stakeholders on insights

**Total Estimated Effort**: 13-18 hours

---

## Success Criteria

### Week 1
- [ ] All PostHog events firing correctly
- [ ] Sentry capturing errors
- [ ] Alerts tested and working
- [ ] First usage report generated

### Month 1
- [ ] Performance baselines established
- [ ] Alert thresholds tuned (< 5 false positives/week)
- [ ] Business insights dashboard live
- [ ] > 80% dashboard adoption

### Quarter 1
- [ ] Full SLO compliance (99.9% uptime)
- [ ] Zero critical production incidents
- [ ] Measurable business impact (revenue/efficiency)
- [ ] Continuous optimization based on insights

---

## Runbook: Responding to Alerts

### API Slow (p95 > 500ms)

**Investigate**:
1. Check customer count in request: `railway logs | grep segmentation_api_success`
2. Check database query time in Supabase dashboard
3. Check for concurrent requests (spike in traffic)

**Mitigate**:
- If customer count > 5,000: Implement pagination
- If DB slow: Add indexes or materialize views
- If concurrent spike: Add rate limiting

**Escalate** if unresolved after 30 minutes

### API Down (error rate > 5%)

**Investigate**:
1. Check Railway deployment status
2. Check Supabase connection: `railway logs | grep -i "database"`
3. Check recent deploys: `git log -n 5 --oneline`

**Mitigate**:
- If recent deploy: Rollback via Railway dashboard
- If DB down: Check Supabase status page
- If code error: Review Sentry stack trace

**Escalate** immediately if user-facing

### Memory Leak (heap growth > 50MB)

**Investigate**:
1. Open Chrome DevTools → Performance → Memory
2. Record refresh cycle, take heap snapshots
3. Look for detached DOM nodes or retained objects

**Mitigate**:
- Review useEffect cleanup functions
- Check for event listener leaks
- Profile with React DevTools Profiler

**Fix** in next sprint (not production emergency)

---

## Next Steps After Phase 4

1. **Optimize** based on performance data (Week 2-4)
2. **Iterate** on segment tier thresholds based on business feedback
3. **Expand** monitoring to other analytics dashboards
4. **Build** predictive models using segmentation data

---

## Conclusion

This monitoring plan provides comprehensive visibility into:
- ✅ Technical performance (latency, errors, memory)
- ✅ User behavior (adoption, engagement, data modes)
- ✅ Business impact (revenue, efficiency, satisfaction)

**Estimated Total Investment**: 13-18 hours + $26-$76/month

**Expected ROI**:
- Proactive issue detection (prevent 90% of user-reported bugs)
- Data-driven optimization (10-20% performance improvements)
- Business insights (measurable revenue impact)

---

**Document Version**: 1.0
**Last Updated**: 2026-02-06
**Next Review**: After Phase 4.1 implementation

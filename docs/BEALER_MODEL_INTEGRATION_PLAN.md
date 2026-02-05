# Bealer Lead Model Integration Plan

## Overview

This document outlines the integration of analytics models ported from the `bealer-lead-model` Python repository into the `shared-todo-list` Next.js application.

**Date**: February 2026
**Status**: In Progress

---

## Current State

### Ported TypeScript Models (`src/lib/`)
| Model | Lines | Purpose | Integration Status |
|-------|-------|---------|-------------------|
| `lead-scoring.ts` | 912 | Lead quality scoring, vendor ROI | Pending |
| `agency-simulator.ts` | ~1,980 | Full agency simulation | Pending |
| `cash-flow-model.ts` | 657 | Cash flow projections | Pending |
| `seasonality-model.ts` | ~980 | Monthly patterns | Pending |
| `cross-sell-timing.ts` | 958 | Optimal contact timing | Pending |
| `referral-growth-model.ts` | 877 | Referral program optimization | Pending |
| `loss-ratio-predictor.ts` | 731 | Claims/loss predictions | Pending |
| `rate-environment-model.ts` | ~750 | Market rate analysis | Pending |
| `enhanced-agency-model.ts` | 1,605 | Comprehensive agency reporting | Pending |
| `lead-analysis-api.ts` | 2,500+ | Full lead analysis | Pending |
| `parse-agency-data.ts` | 1,130 | Excel/CSV parsing | Pending |
| `extract-real-metrics.ts` | ~600 | Metrics extraction | Pending |
| `customer-segmentation.ts` | 491 | Customer LTV stratification | Integrated |
| `allstate-parser.ts` | 903 | Cross-sell scoring | Integrated |

### Existing Analytics APIs (`src/app/api/analytics/`)
- `POST /api/analytics/upload` - Import CSV files
- `GET/POST/PATCH/DELETE /api/analytics/cross-sell` - CRUD operations
- `POST /api/analytics/cross-sell/generate-tasks` - Task generation
- `GET/POST/PATCH /api/analytics/calendar` - Renewal calendar
- `GET/POST /api/analytics/seed` - Demo data seeding
- `GET /api/opportunities/today` - Daily work queue
- `GET/POST /api/opportunities/[id]/contact` - Contact history

---

## Integration Phases

### Phase 1: Clean Exports & Index Files

Create barrel exports for easy importing of analytics models.

**Files to Create:**
- `src/lib/analytics/index.ts` - Main analytics export
- `src/types/analytics/index.ts` - Types export

### Phase 2: Connect Lead Scoring Model

The new `lead-scoring.ts` provides more sophisticated scoring than the existing `allstate-parser.ts`. We'll create an enhanced scoring option.

**Integration Points:**
1. Create `src/lib/analytics/enhanced-scoring.ts` that combines both approaches
2. Add feature flag to `/api/analytics/upload` to use enhanced scoring
3. Maintain backward compatibility with existing scores (0-150 range)

### Phase 3: New Analytics API Endpoints

Create new endpoints to expose model functionality:

| Endpoint | Method | Model | Purpose |
|----------|--------|-------|---------|
| `/api/analytics/simulate` | POST | agency-simulator | Project growth scenarios |
| `/api/analytics/optimal-times` | POST | cross-sell-timing | Calculate best contact times |
| `/api/analytics/cash-flow` | POST | cash-flow-model | Cash flow projections |
| `/api/analytics/lead-quality` | POST | lead-scoring | Score new leads |
| `/api/analytics/retention-risk` | POST | loss-ratio-predictor | Predict churn |
| `/api/analytics/segmentation` | POST | customer-segmentation | Segment customers |

### Phase 4: Adapt Dashboard Components

Move reference components to production and fix imports:

**Components to Adapt:**
1. `BookOfBusinessDashboard` - Portfolio overview
2. `CrossSellDashboard` - Cross-sell metrics
3. `CompensationDashboard` - Commission tracking
4. `TodayOpportunitiesPanel` - Daily work queue

**Required Changes:**
- Update import paths to use `@/` aliases
- Replace config imports with centralized config
- Add proper TypeScript types
- Connect to existing API endpoints

### Phase 5: Navigation Integration

Add analytics section to the main application:

1. Add "Analytics" tab to navigation
2. Create analytics page layout
3. Add sub-navigation for different dashboards
4. Integrate with existing permission system

---

## Implementation Details

### Index File Structure

```typescript
// src/lib/analytics/index.ts
export * from '../lead-scoring';
export * from '../agency-simulator';
export * from '../cash-flow-model';
export * from '../seasonality-model';
export * from '../cross-sell-timing';
export * from '../referral-growth-model';
export * from '../loss-ratio-predictor';
export * from '../rate-environment-model';
export * from '../enhanced-agency-model';
export * from '../customer-segmentation';
export * from '../allstate-parser';
```

### Enhanced Scoring Integration

```typescript
// src/lib/analytics/enhanced-scoring.ts
import { scoreLead } from '../lead-scoring';
import { calculatePriorityScore } from '../allstate-parser';

export function calculateEnhancedScore(record, options = {}) {
  const baseScore = calculatePriorityScore(record);

  if (options.useLeadScoring) {
    const leadScore = scoreLead(/* converted record */);
    // Blend scores or use lead score
    return blendScores(baseScore, leadScore.score);
  }

  return baseScore;
}
```

### API Endpoint Pattern

```typescript
// src/app/api/analytics/simulate/route.ts
import { simulateScenario } from '@/lib/analytics';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { parameters, scenarios } = body;

  const results = simulateScenario(parameters, scenarios);

  return NextResponse.json({ results });
}
```

---

## Risk Mitigation

1. **Backward Compatibility**: All new features behind feature flags
2. **Score Range**: Maintain 0-150 scoring range for existing data
3. **Type Safety**: Proper TypeScript interfaces for all models
4. **Testing**: Unit tests for each integrated model
5. **Rollback**: Database migrations are additive only

---

## Timeline

| Phase | Tasks | Status |
|-------|-------|--------|
| 1 | Create index files | Pending |
| 2 | Connect lead scoring | Pending |
| 3 | New API endpoints | Pending |
| 4 | Adapt dashboards | Pending |
| 5 | Navigation | Pending |

---

## Success Criteria

- [ ] All models accessible via clean imports
- [ ] Lead scoring integrated with existing upload flow
- [ ] New API endpoints functional
- [ ] At least 2 dashboards adapted and working
- [ ] Analytics accessible from main navigation
- [ ] Build passes with no TypeScript errors
- [ ] Existing functionality unchanged


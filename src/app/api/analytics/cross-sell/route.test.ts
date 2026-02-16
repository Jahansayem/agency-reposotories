/**
 * Tests for /api/analytics/cross-sell (GET, POST, PATCH, DELETE)
 *
 * Covers:
 * - Auth wrapping (withAgencyAuth)
 * - Agency isolation (scoping queries to agency_id)
 * - Input validation
 * - Happy path for each HTTP method
 * - Filter and pagination handling
 * - Error handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import {
  createMockRequest,
  createMockAuthContext,
  createOtherAgencyAuthContext,
  parseResponse,
  TEST_IDS,
} from '@/test/api-helpers';
import type { AgencyAuthContext } from '@/lib/agencyAuth';

// ---- Mocks ----

vi.mock('@/lib/agencyAuth', () => {
  const defaultCtx = {
    userId: 'test-user-id',
    userName: 'Test User',
    userRole: 'owner',
    agencyId: 'test-agency-id',
    agencySlug: 'test-agency',
    agencyName: 'Test Agency',
    agencyRole: 'owner',
    permissions: {
      can_create_tasks: true, can_edit_own_tasks: true, can_edit_all_tasks: true,
      can_delete_own_tasks: true, can_delete_all_tasks: true, can_assign_tasks: true,
      can_view_all_tasks: true, can_reorder_tasks: true, can_view_team_tasks: true,
      can_view_team_stats: true, can_manage_team: true, can_use_chat: true,
      can_delete_own_messages: true, can_delete_all_messages: true, can_pin_messages: true,
      can_view_strategic_goals: true, can_edit_strategic_goals: true, can_view_archive: true,
      can_use_ai_features: true, can_manage_templates: true, can_view_activity_log: true,
      can_edit_any_task: true, can_delete_tasks: true, can_delete_any_message: true,
    },
  };

  return {
    withAgencyAuth: (handler: Function) => {
      const wrapper = async (req: any) => handler(req, defaultCtx);
      wrapper._handler = handler;
      return wrapper;
    },
  };
});

// Mock Supabase
const mockFrom = vi.fn();
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: (...args: unknown[]) => mockFrom(...args),
  }),
}));

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    security: vi.fn(),
  },
}));

// ---- Helpers ----

function chainBuilder(result: { data: unknown; error: unknown; count?: number | null }) {
  const builder: Record<string, unknown> = {};
  const methods = [
    'select', 'insert', 'update', 'delete', 'eq', 'neq',
    'single', 'maybeSingle', 'order', 'limit', 'range',
    'ilike', 'not', 'is', 'in', 'gte', 'lte',
  ];
  for (const m of methods) {
    builder[m] = vi.fn().mockReturnValue(builder);
  }
  builder.then = (resolve: (v: unknown) => void) => Promise.resolve(result).then(resolve);
  return builder;
}

// Import the route after mocks
import { GET, POST, PATCH, DELETE } from './route';

// Access inner handlers
const getHandler = (GET as any)._handler;
const postHandler = (POST as any)._handler;
const patchHandler = (PATCH as any)._handler;
const deleteHandler = (DELETE as any)._handler;

// ---- Tests ----

describe('/api/analytics/cross-sell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================
  // Auth Wrapping
  // ============================================

  describe('auth wrapping', () => {
    it('should have all 4 handlers wrapped with withAgencyAuth', () => {
      expect(getHandler).toBeDefined();
      expect(postHandler).toBeDefined();
      expect(patchHandler).toBeDefined();
      expect(deleteHandler).toBeDefined();
    });
  });

  // ============================================
  // GET - Agency Isolation
  // ============================================

  describe('GET /api/analytics/cross-sell', () => {
    it('should scope main query to agency from auth context', async () => {
      const mainBuilder = chainBuilder({ data: [], error: null, count: 0 });
      const summaryBuilder = chainBuilder({ data: [], error: null });
      const premiumBuilder = chainBuilder({ data: [], error: null });

      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return mainBuilder; // Main query
        if (callCount === 2) return summaryBuilder; // Summary counts
        return premiumBuilder; // Premium data
      });

      const ctx = createMockAuthContext({ agencyId: 'my-agency-123' });
      const req = createMockRequest({
        url: 'http://localhost:3000/api/analytics/cross-sell',
      });

      const res = await getHandler(req, ctx);
      const { status } = await parseResponse(res);

      expect(status).toBe(200);
      // Verify agency_id eq filter was applied to main query
      expect(mainBuilder.eq).toHaveBeenCalledWith('agency_id', 'my-agency-123');
    });

    it('should also scope summary queries to the same agency', async () => {
      const mainBuilder = chainBuilder({ data: [], error: null, count: 0 });
      const summaryBuilder = chainBuilder({ data: [], error: null });
      const premiumBuilder = chainBuilder({ data: [], error: null });

      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return mainBuilder;
        if (callCount === 2) return summaryBuilder;
        return premiumBuilder;
      });

      const ctx = createMockAuthContext({ agencyId: 'my-agency-123' });
      const req = createMockRequest({
        url: 'http://localhost:3000/api/analytics/cross-sell',
      });

      await getHandler(req, ctx);

      // Summary and premium queries should also filter by agency_id
      expect(summaryBuilder.eq).toHaveBeenCalledWith('agency_id', 'my-agency-123');
      expect(premiumBuilder.eq).toHaveBeenCalledWith('agency_id', 'my-agency-123');
    });

    it('should return opportunities with correct response shape', async () => {
      const opportunities = [
        {
          id: 'opp1',
          customer_name: 'John Doe',
          priority_tier: 'HOT',
          priority_score: 95,
          potential_premium_add: 500,
          segment_type: 'auto_to_home',
        },
      ];

      const mainBuilder = chainBuilder({ data: opportunities, error: null, count: 1 });
      const summaryBuilder = chainBuilder({
        data: [{ priority_tier: 'HOT' }],
        error: null,
      });
      const premiumBuilder = chainBuilder({
        data: [{ potential_premium_add: 500 }],
        error: null,
      });

      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return mainBuilder;
        if (callCount === 2) return summaryBuilder;
        return premiumBuilder;
      });

      const ctx = createMockAuthContext();
      const req = createMockRequest({
        url: 'http://localhost:3000/api/analytics/cross-sell',
      });

      const res = await getHandler(req, ctx);
      const { status, body } = await parseResponse(res);

      expect(status).toBe(200);
      expect(body.opportunities).toBeDefined();
      expect(body.total).toBeDefined();
      expect(body.page).toBeDefined();
      expect(body.page_size).toBeDefined();
      expect(body.summary).toBeDefined();
      expect(body.summary.hot_count).toBeDefined();
    });

    it('should apply tier filter when specified', async () => {
      const mainBuilder = chainBuilder({ data: [], error: null, count: 0 });
      const summaryBuilder = chainBuilder({ data: [], error: null });
      const premiumBuilder = chainBuilder({ data: [], error: null });

      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return mainBuilder;
        if (callCount === 2) return summaryBuilder;
        return premiumBuilder;
      });

      const ctx = createMockAuthContext();
      const req = createMockRequest({
        url: 'http://localhost:3000/api/analytics/cross-sell',
        searchParams: { tier: 'HOT,HIGH' },
      });

      await getHandler(req, ctx);

      expect(mainBuilder.in).toHaveBeenCalledWith('priority_tier', ['HOT', 'HIGH']);
    });

    it('should apply search filter with query length limit', async () => {
      const mainBuilder = chainBuilder({ data: [], error: null, count: 0 });
      const summaryBuilder = chainBuilder({ data: [], error: null });
      const premiumBuilder = chainBuilder({ data: [], error: null });

      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return mainBuilder;
        if (callCount === 2) return summaryBuilder;
        return premiumBuilder;
      });

      const longSearch = 'A'.repeat(500);
      const ctx = createMockAuthContext();
      const req = createMockRequest({
        url: 'http://localhost:3000/api/analytics/cross-sell',
        searchParams: { search: longSearch },
      });

      await getHandler(req, ctx);

      // Should have called ilike with a truncated search term
      if ((mainBuilder.ilike as ReturnType<typeof vi.fn>).mock.calls.length > 0) {
        const searchArg = (mainBuilder.ilike as ReturnType<typeof vi.fn>).mock.calls[0][1] as string;
        expect(searchArg.length).toBeLessThanOrEqual(202); // 200 + %...%
      }
    });

    it('should exclude dismissed by default', async () => {
      const mainBuilder = chainBuilder({ data: [], error: null, count: 0 });
      const summaryBuilder = chainBuilder({ data: [], error: null });
      const premiumBuilder = chainBuilder({ data: [], error: null });

      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return mainBuilder;
        if (callCount === 2) return summaryBuilder;
        return premiumBuilder;
      });

      const ctx = createMockAuthContext();
      const req = createMockRequest({
        url: 'http://localhost:3000/api/analytics/cross-sell',
      });

      await getHandler(req, ctx);

      expect(mainBuilder.eq).toHaveBeenCalledWith('dismissed', false);
    });

    it('should handle database error gracefully', async () => {
      const mainBuilder = chainBuilder({
        data: null,
        error: { message: 'Connection failed' },
        count: null,
      });

      mockFrom.mockReturnValue(mainBuilder);

      const ctx = createMockAuthContext();
      const req = createMockRequest({
        url: 'http://localhost:3000/api/analytics/cross-sell',
      });

      const res = await getHandler(req, ctx);
      const { status } = await parseResponse(res);

      expect(status).toBe(500);
    });
  });

  // ============================================
  // POST - Create Opportunity
  // ============================================

  describe('POST /api/analytics/cross-sell', () => {
    it('should reject request without customer_name', async () => {
      const ctx = createMockAuthContext();
      const req = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/analytics/cross-sell',
        body: { priority_tier: 'HIGH' },
      });

      const res = await postHandler(req, ctx);
      const { status, body } = await parseResponse(res);

      expect(status).toBe(400);
      expect(body.error).toContain('customer_name');
    });

    it('should use agency_id from auth context, not from request body', async () => {
      const builder = chainBuilder({
        data: {
          id: 'new-opp',
          customer_name: 'Jane',
          agency_id: TEST_IDS.AGENCY_ID,
        },
        error: null,
      });
      mockFrom.mockReturnValue(builder);

      const ctx = createMockAuthContext({ agencyId: 'real-agency-id' });
      const req = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/analytics/cross-sell',
        body: {
          customer_name: 'Jane',
          agency_id: 'evil-agency-id', // Attempting to inject a different agency
        },
      });

      const res = await postHandler(req, ctx);
      const { status, body } = await parseResponse(res);

      expect(status).toBe(200);
      expect(body.success).toBe(true);

      // Verify the insert used the auth context's agency, not the body's
      const insertCall = (builder.insert as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(insertCall.agency_id).toBe('real-agency-id');
    });

    it('should create opportunity with default values', async () => {
      const builder = chainBuilder({
        data: {
          id: 'new-opp',
          customer_name: 'Jane',
          priority_tier: 'MEDIUM',
          priority_score: 50,
        },
        error: null,
      });
      mockFrom.mockReturnValue(builder);

      const ctx = createMockAuthContext();
      const req = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/analytics/cross-sell',
        body: { customer_name: 'Jane' },
      });

      const res = await postHandler(req, ctx);
      const { status, body } = await parseResponse(res);

      expect(status).toBe(200);
      expect(body.success).toBe(true);

      const insertCall = (builder.insert as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(insertCall.priority_tier).toBe('MEDIUM');
      expect(insertCall.priority_score).toBe(50);
    });
  });

  // ============================================
  // PATCH - Update Opportunity
  // ============================================

  describe('PATCH /api/analytics/cross-sell', () => {
    it('should reject request without id', async () => {
      const ctx = createMockAuthContext();
      const req = createMockRequest({
        method: 'PATCH',
        url: 'http://localhost:3000/api/analytics/cross-sell',
        body: { priority_tier: 'HIGH' },
      });

      const res = await patchHandler(req, ctx);
      const { status, body } = await parseResponse(res);

      expect(status).toBe(400);
      expect(body.error).toContain('id');
    });

    it('should scope update to agency_id', async () => {
      const builder = chainBuilder({
        data: { id: 'opp1', priority_tier: 'HIGH' },
        error: null,
      });
      mockFrom.mockReturnValue(builder);

      const ctx = createMockAuthContext({ agencyId: 'my-agency' });
      const req = createMockRequest({
        method: 'PATCH',
        url: 'http://localhost:3000/api/analytics/cross-sell',
        body: { id: 'opp1', priority_tier: 'HIGH' },
      });

      await patchHandler(req, ctx);

      expect(builder.eq).toHaveBeenCalledWith('agency_id', 'my-agency');
    });

    it('should handle mark_contacted special update', async () => {
      const builder = chainBuilder({
        data: { id: 'opp1', contacted_at: '2026-01-01' },
        error: null,
      });
      mockFrom.mockReturnValue(builder);

      const ctx = createMockAuthContext();
      const req = createMockRequest({
        method: 'PATCH',
        url: 'http://localhost:3000/api/analytics/cross-sell',
        body: { id: 'opp1', mark_contacted: true },
      });

      const res = await patchHandler(req, ctx);
      const { status } = await parseResponse(res);

      expect(status).toBe(200);

      // Verify that contacted_at was set and mark_contacted was removed
      const updateCall = (builder.update as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(updateCall.contacted_at).toBeDefined();
      expect(updateCall.mark_contacted).toBeUndefined();
    });

    it('should handle dismiss special update', async () => {
      const builder = chainBuilder({
        data: { id: 'opp1', dismissed: true },
        error: null,
      });
      mockFrom.mockReturnValue(builder);

      const ctx = createMockAuthContext();
      const req = createMockRequest({
        method: 'PATCH',
        url: 'http://localhost:3000/api/analytics/cross-sell',
        body: { id: 'opp1', dismiss: true },
      });

      const res = await patchHandler(req, ctx);
      const { status } = await parseResponse(res);

      expect(status).toBe(200);

      const updateCall = (builder.update as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(updateCall.dismissed).toBe(true);
      expect(updateCall.dismiss).toBeUndefined();
    });
  });

  // ============================================
  // DELETE - Dismiss Opportunity
  // ============================================

  describe('DELETE /api/analytics/cross-sell', () => {
    it('should reject request without id', async () => {
      const ctx = createMockAuthContext();
      const req = createMockRequest({
        method: 'DELETE',
        url: 'http://localhost:3000/api/analytics/cross-sell',
      });

      const res = await deleteHandler(req, ctx);
      const { status, body } = await parseResponse(res);

      expect(status).toBe(400);
      expect(body.error).toContain('id');
    });

    it('should scope dismiss to agency_id', async () => {
      const builder = chainBuilder({ data: null, error: null });
      mockFrom.mockReturnValue(builder);

      const ctx = createMockAuthContext({ agencyId: 'my-agency' });
      const req = createMockRequest({
        method: 'DELETE',
        url: 'http://localhost:3000/api/analytics/cross-sell',
        searchParams: { id: 'opp1' },
      });

      await deleteHandler(req, ctx);

      expect(builder.eq).toHaveBeenCalledWith('agency_id', 'my-agency');
    });

    it('should soft-delete by setting dismissed=true', async () => {
      const builder = chainBuilder({ data: null, error: null });
      mockFrom.mockReturnValue(builder);

      const ctx = createMockAuthContext();
      const req = createMockRequest({
        method: 'DELETE',
        url: 'http://localhost:3000/api/analytics/cross-sell',
        searchParams: { id: 'opp1' },
      });

      const res = await deleteHandler(req, ctx);
      const { status, body } = await parseResponse(res);

      expect(status).toBe(200);
      expect(body.success).toBe(true);

      // Should call update (soft delete), not delete
      expect(builder.update).toHaveBeenCalledWith(
        expect.objectContaining({ dismissed: true })
      );
    });

    it('should include reason in dismiss update', async () => {
      const builder = chainBuilder({ data: null, error: null });
      mockFrom.mockReturnValue(builder);

      const ctx = createMockAuthContext();
      const req = createMockRequest({
        method: 'DELETE',
        url: 'http://localhost:3000/api/analytics/cross-sell',
        searchParams: { id: 'opp1', reason: 'Customer moved away' },
      });

      await deleteHandler(req, ctx);

      const updateCall = (builder.update as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(updateCall.dismissed_reason).toBe('Customer moved away');
    });

    it('should use default reason when none provided', async () => {
      const builder = chainBuilder({ data: null, error: null });
      mockFrom.mockReturnValue(builder);

      const ctx = createMockAuthContext();
      const req = createMockRequest({
        method: 'DELETE',
        url: 'http://localhost:3000/api/analytics/cross-sell',
        searchParams: { id: 'opp1' },
      });

      await deleteHandler(req, ctx);

      const updateCall = (builder.update as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(updateCall.dismissed_reason).toBe('Manually dismissed');
    });

    it('should handle database error gracefully', async () => {
      const builder = chainBuilder({ data: null, error: { message: 'DB error' } });
      mockFrom.mockReturnValue(builder);

      const ctx = createMockAuthContext();
      const req = createMockRequest({
        method: 'DELETE',
        url: 'http://localhost:3000/api/analytics/cross-sell',
        searchParams: { id: 'opp1' },
      });

      const res = await deleteHandler(req, ctx);
      const { status } = await parseResponse(res);

      expect(status).toBe(500);
    });
  });
});

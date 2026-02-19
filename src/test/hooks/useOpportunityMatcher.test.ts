import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// Mock fetch
global.fetch = vi.fn();

describe('useOpportunityMatcher', () => {
  beforeEach(() => vi.clearAllMocks());

  it('starts loading and transitions to matched on successful API response', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        matched: true,
        customer: { id: 'cust-1', name: 'Janis Urich', segment: 'premium' },
        opportunity: {
          id: 'opp-1', priorityTier: 'HOT', priorityScore: 120,
          recommendedProduct: 'Home Insurance', potentialPremiumAdd: 340,
          talkingPoint1: 'tp1', talkingPoint2: 'tp2', talkingPoint3: 'tp3',
          currentProducts: 'Auto', tenureYears: 9, currentPremium: 890, daysUntilRenewal: 12,
        },
      }),
    } as Response);

    const { useOpportunityMatcher } = await import('@/hooks/useOpportunityMatcher');
    const { result } = renderHook(() =>
      useOpportunityMatcher({ taskId: 'task-1', taskText: 'Call Janis about claim', agencyId: 'agency-1', existingCustomerId: null })
    );

    await waitFor(() => expect(result.current.state).toBe('matched'));
    expect(result.current.customer?.name).toBe('Janis Urich');
    expect(result.current.opportunity?.priorityTier).toBe('HOT');
  });

  it('transitions to none when no match found', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, matched: false, customer: null, opportunity: null }),
    } as Response);

    const { useOpportunityMatcher } = await import('@/hooks/useOpportunityMatcher');
    const { result } = renderHook(() =>
      useOpportunityMatcher({ taskId: 'task-2', taskText: 'Review documents', agencyId: 'agency-1', existingCustomerId: null })
    );

    await waitFor(() => expect(result.current.state).toBe('none'));
  });

  it('skips API call if existingCustomerId is set', async () => {
    const { useOpportunityMatcher } = await import('@/hooks/useOpportunityMatcher');
    const { result } = renderHook(() =>
      useOpportunityMatcher({ taskId: 'task-3', taskText: 'Call someone', agencyId: 'agency-1', existingCustomerId: 'already-linked' })
    );

    expect(fetch).not.toHaveBeenCalled();
    expect(result.current.state).toBe('idle');
  });

  it('transitions to confirmed and calls onConfirm on confirm()', async () => {
    const mockOnConfirm = vi.fn().mockResolvedValue(undefined);
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true, matched: true,
          customer: { id: 'cust-1', name: 'Janis Urich', segment: 'premium' },
          opportunity: { id: 'opp-1', priorityTier: 'HOT', priorityScore: 120, recommendedProduct: 'Home', potentialPremiumAdd: 340, talkingPoint1: 'tp1', talkingPoint2: 'tp2', talkingPoint3: 'tp3', currentProducts: 'Auto', tenureYears: 9, currentPremium: 890, daysUntilRenewal: 12 },
        }),
      } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) } as Response); // PATCH call

    const { useOpportunityMatcher } = await import('@/hooks/useOpportunityMatcher');
    const { result } = renderHook(() =>
      useOpportunityMatcher({ taskId: 'task-4', taskText: 'Call Janis', agencyId: 'agency-1', existingCustomerId: null, onConfirm: mockOnConfirm })
    );

    await waitFor(() => expect(result.current.state).toBe('matched'));
    await act(async () => { await result.current.confirm(); });

    expect(result.current.state).toBe('confirmed');
    expect(mockOnConfirm).toHaveBeenCalledWith({ id: 'cust-1', name: 'Janis Urich', segment: 'premium' });
  });

  it('transitions to dismissed on dismiss()', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, matched: true, customer: { id: 'c', name: 'Bob', segment: 'standard' }, opportunity: { id: 'o', priorityTier: 'HIGH', priorityScore: 80, recommendedProduct: 'Home', potentialPremiumAdd: 200, talkingPoint1: 'tp1', talkingPoint2: 'tp2', talkingPoint3: 'tp3', currentProducts: 'Auto', tenureYears: 3, currentPremium: 600, daysUntilRenewal: 20 } }),
    } as Response);

    const { useOpportunityMatcher } = await import('@/hooks/useOpportunityMatcher');
    const { result } = renderHook(() =>
      useOpportunityMatcher({ taskId: 'task-5', taskText: 'Call Bob', agencyId: 'agency-1', existingCustomerId: null })
    );

    await waitFor(() => expect(result.current.state).toBe('matched'));
    act(() => { result.current.dismiss(); });

    expect(result.current.state).toBe('dismissed');
  });
});

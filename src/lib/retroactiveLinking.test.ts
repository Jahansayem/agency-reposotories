import { describe, it, expect } from 'vitest';
import {
  calculateMatchConfidence,
  getMatchReason,
  getConfidenceLevel,
} from './retroactiveLinking';

describe('retroactiveLinking', () => {
  const mockCustomer = {
    name: 'James Wilson',
    email: 'jwilson@example.com',
    phone: '(555) 123-4567',
  };

  describe('calculateMatchConfidence', () => {
    it('returns high confidence for full name match', () => {
      const confidence = calculateMatchConfidence(
        'Call James Wilson about renewal',
        mockCustomer
      );
      expect(confidence).toBeGreaterThanOrEqual(0.7);
    });

    it('returns medium confidence for last name only', () => {
      const confidence = calculateMatchConfidence(
        'Follow up with Wilson',
        mockCustomer
      );
      expect(confidence).toBeGreaterThan(0.3);
      expect(confidence).toBeLessThan(0.7);
    });

    it('returns high confidence for email match', () => {
      const confidence = calculateMatchConfidence(
        'Send quote to jwilson@example.com',
        mockCustomer
      );
      expect(confidence).toBeGreaterThanOrEqual(0.7);
    });

    it('returns zero for no match', () => {
      const confidence = calculateMatchConfidence(
        'Generic task with no customer info',
        mockCustomer
      );
      expect(confidence).toBe(0);
    });

    it('caps at 1.0 for multiple matches', () => {
      const confidence = calculateMatchConfidence(
        'Email James Wilson at jwilson@example.com call 5551234567',
        mockCustomer
      );
      expect(confidence).toBeLessThanOrEqual(1.0);
    });

    it('handles full name match which also triggers last name (both score)', () => {
      // Full name "James Wilson" includes "Wilson" (>3 chars), so both fire
      // 0.8 (full name) + 0.4 (last name) = 1.2 -> capped to 1.0
      const confidence = calculateMatchConfidence(
        'Call James Wilson tomorrow',
        mockCustomer
      );
      expect(confidence).toBe(1.0);
    });

    it('handles phone match with formatted number', () => {
      const confidence = calculateMatchConfidence(
        'Call (555) 123-4567 to discuss policy',
        mockCustomer
      );
      expect(confidence).toBeGreaterThanOrEqual(0.6);
    });

    it('skips short last names (<=3 chars) to avoid false positives', () => {
      const shortNameCustomer = { name: 'John Lee', email: null, phone: null };
      const confidence = calculateMatchConfidence(
        'Please follow up with Lee on the policy',
        shortNameCustomer
      );
      // "Lee" is only 3 chars, so the last-name check should not fire
      expect(confidence).toBe(0);
    });

    it('handles customer with no email or phone', () => {
      const bareCustomer = { name: 'Sarah Johnson', email: null, phone: null };
      const confidence = calculateMatchConfidence(
        'Call Sarah Johnson about auto insurance',
        bareCustomer
      );
      expect(confidence).toBeGreaterThanOrEqual(0.7);
    });

    it('is case-insensitive for name matching', () => {
      const confidence = calculateMatchConfidence(
        'call JAMES WILSON about renewal',
        mockCustomer
      );
      expect(confidence).toBeGreaterThanOrEqual(0.7);
    });

    it('is case-insensitive for email matching', () => {
      const confidence = calculateMatchConfidence(
        'Send quote to JWILSON@EXAMPLE.COM',
        mockCustomer
      );
      expect(confidence).toBeGreaterThanOrEqual(0.7);
    });

    it('does not match phone when phone has fewer than 10 digits', () => {
      const shortPhoneCustomer = { name: 'Test User', email: null, phone: '555-1234' };
      const confidence = calculateMatchConfidence(
        'Call 555-1234',
        shortPhoneCustomer
      );
      // Phone only has 7 digits, below the 10-digit threshold
      expect(confidence).toBe(0);
    });
  });

  describe('getMatchReason', () => {
    it('identifies full name match', () => {
      const reason = getMatchReason('Call James Wilson', mockCustomer, 0.8);
      expect(reason).toContain('Full name match');
    });

    it('identifies multiple match types', () => {
      const reason = getMatchReason(
        'Email James Wilson at jwilson@example.com',
        mockCustomer,
        0.9
      );
      expect(reason).toContain('Full name match');
      expect(reason).toContain('Email match');
    });

    it('returns Partial match for no identifiers', () => {
      const reason = getMatchReason('random task', mockCustomer, 0.1);
      expect(reason).toBe('Partial match');
    });

    it('identifies last name match when full name is absent', () => {
      const reason = getMatchReason(
        'Follow up with Wilson on policy',
        mockCustomer,
        0.4
      );
      expect(reason).toContain('Last name match');
    });

    it('does not report last name when full name already matches', () => {
      // getMatchReason skips last name if full name reason is already present
      const reason = getMatchReason(
        'Call James Wilson tomorrow',
        mockCustomer,
        0.8
      );
      expect(reason).toContain('Full name match');
      expect(reason).not.toContain('Last name match');
    });

    it('identifies phone number match', () => {
      const reason = getMatchReason(
        'Call 5551234567 to discuss policy',
        mockCustomer,
        0.6
      );
      expect(reason).toContain('Phone number match');
    });

    it('joins multiple reasons with " + "', () => {
      const reason = getMatchReason(
        'Email James Wilson at jwilson@example.com call 5551234567',
        mockCustomer,
        1.0
      );
      expect(reason).toContain(' + ');
    });
  });

  describe('getConfidenceLevel', () => {
    it('returns high for >= 0.7', () => {
      expect(getConfidenceLevel(0.8)).toBe('high');
    });

    it('returns high for exactly 0.7', () => {
      expect(getConfidenceLevel(0.7)).toBe('high');
    });

    it('returns medium for 0.4-0.69', () => {
      expect(getConfidenceLevel(0.5)).toBe('medium');
    });

    it('returns medium for exactly 0.4', () => {
      expect(getConfidenceLevel(0.4)).toBe('medium');
    });

    it('returns low for < 0.4', () => {
      expect(getConfidenceLevel(0.3)).toBe('low');
    });

    it('returns high for 1.0', () => {
      expect(getConfidenceLevel(1.0)).toBe('high');
    });

    it('returns low for 0', () => {
      expect(getConfidenceLevel(0)).toBe('low');
    });
  });
});

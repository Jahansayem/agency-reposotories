/**
 * DuplicateDetection Library Tests
 *
 * Tests for phone, email, name extraction and duplicate detection logic
 */

import { describe, it, expect } from 'vitest';
import {
  extractPhoneNumbers,
  extractEmails,
  extractPotentialNames,
  stringSimilarity,
  findPotentialDuplicates,
  shouldCheckForDuplicates,
} from '@/lib/duplicateDetection';
import { Todo } from '@/types/todo';

// Helper to create a mock todo
const createMockTodo = (overrides: Partial<Todo> = {}): Todo => ({
  id: `todo-${Date.now()}-${Math.random()}`,
  text: 'Test todo',
  completed: false,
  status: 'todo',
  priority: 'medium',
  created_at: new Date().toISOString(),
  created_by: 'TestUser',
  ...overrides,
});

describe('duplicateDetection', () => {
  describe('extractPhoneNumbers', () => {
    it('should extract standard US phone numbers', () => {
      const text = 'Call me at 555-123-4567 about the policy';
      const phones = extractPhoneNumbers(text);
      expect(phones).toHaveLength(1);
      expect(phones[0]).toBe('5551234567');
    });

    it('should extract phone with parentheses', () => {
      const text = 'Contact number: (555) 123-4567';
      const phones = extractPhoneNumbers(text);
      expect(phones).toHaveLength(1);
      expect(phones[0]).toBe('5551234567');
    });

    it('should extract phone with country code', () => {
      const text = 'International: +1-555-123-4567';
      const phones = extractPhoneNumbers(text);
      expect(phones).toHaveLength(1);
      expect(phones[0]).toBe('15551234567');
    });

    it('should extract multiple phone numbers', () => {
      const text = 'Call 555-111-2222 or 555-333-4444';
      const phones = extractPhoneNumbers(text);
      expect(phones).toHaveLength(2);
    });

    it('should return empty array for no phones', () => {
      const text = 'No phone numbers here';
      const phones = extractPhoneNumbers(text);
      expect(phones).toHaveLength(0);
    });

    it('should extract phone with dots as separator', () => {
      const text = 'Phone: 555.123.4567';
      const phones = extractPhoneNumbers(text);
      expect(phones).toHaveLength(1);
      expect(phones[0]).toBe('5551234567');
    });

    it('should filter out numbers that are too short', () => {
      const text = 'Call 555-1234'; // Only 7 digits
      const phones = extractPhoneNumbers(text);
      expect(phones).toHaveLength(0);
    });
  });

  describe('extractEmails', () => {
    it('should extract simple email', () => {
      const text = 'Email me at john@example.com';
      const emails = extractEmails(text);
      expect(emails).toHaveLength(1);
      expect(emails[0]).toBe('john@example.com');
    });

    it('should extract email with dots and plus', () => {
      const text = 'Contact: john.doe+work@company.co.uk';
      const emails = extractEmails(text);
      expect(emails).toHaveLength(1);
      expect(emails[0]).toBe('john.doe+work@company.co.uk');
    });

    it('should extract multiple emails', () => {
      const text = 'CC: alice@test.com and bob@test.com';
      const emails = extractEmails(text);
      expect(emails).toHaveLength(2);
    });

    it('should lowercase emails', () => {
      const text = 'Email: John.Doe@Example.COM';
      const emails = extractEmails(text);
      expect(emails[0]).toBe('john.doe@example.com');
    });

    it('should return empty array for no emails', () => {
      const text = 'No email addresses here';
      const emails = extractEmails(text);
      expect(emails).toHaveLength(0);
    });
  });

  describe('extractPotentialNames', () => {
    it('should extract single name', () => {
      // The regex matches capitalized word pairs, so "Contact John" is captured together
      // Use a lowercase word before the name
      const text = 'please contact John about his policy';
      const names = extractPotentialNames(text);
      expect(names).toContain('John');
    });

    it('should extract full name', () => {
      const text = 'Meeting with John Smith tomorrow';
      const names = extractPotentialNames(text);
      expect(names).toContain('John Smith');
    });

    it('should filter out common words', () => {
      const text = 'The Monday meeting is Important';
      const names = extractPotentialNames(text);
      expect(names).not.toContain('The');
      expect(names).not.toContain('Monday');
      expect(names).not.toContain('Important');
    });

    it('should filter out day names', () => {
      const text = 'Tuesday Wednesday Thursday';
      const names = extractPotentialNames(text);
      expect(names).toHaveLength(0);
    });

    it('should filter out month names', () => {
      const text = 'January February March April';
      const names = extractPotentialNames(text);
      expect(names).toHaveLength(0);
    });

    it('should extract multiple names', () => {
      const text = 'John called about Sarah renewal';
      const names = extractPotentialNames(text);
      expect(names).toContain('John');
      expect(names).toContain('Sarah');
    });

    it('should return empty array for no names', () => {
      const text = 'just some lowercase text here';
      const names = extractPotentialNames(text);
      expect(names).toHaveLength(0);
    });
  });

  describe('stringSimilarity', () => {
    it('should return 1 for identical strings', () => {
      expect(stringSimilarity('hello world', 'hello world')).toBe(1);
    });

    it('should be case insensitive', () => {
      expect(stringSimilarity('Hello World', 'hello world')).toBe(1);
    });

    it('should return 0.8 for substring match', () => {
      expect(stringSimilarity('Call John about policy', 'Call John')).toBe(0.8);
    });

    it('should return partial score for word overlap', () => {
      const score = stringSimilarity('Call John about policy', 'Email John about renewal');
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThan(1);
    });

    it('should return 0 for no overlap', () => {
      const score = stringSimilarity('abc def', 'xyz uvw');
      expect(score).toBe(0);
    });

    it('should handle empty or short strings', () => {
      expect(stringSimilarity('a b', 'c d')).toBe(0);
    });
  });

  describe('findPotentialDuplicates', () => {
    it('should find duplicate by phone number', () => {
      const existingTodos = [
        createMockTodo({ text: 'Call customer at 555-123-4567' }),
        createMockTodo({ text: 'Unrelated task' }),
      ];

      const matches = findPotentialDuplicates('Follow up 555-123-4567', existingTodos);

      expect(matches).toHaveLength(1);
      expect(matches[0].matchReasons).toContain('Same phone number');
      expect(matches[0].score).toBeGreaterThanOrEqual(0.5);
    });

    it('should find duplicate by email', () => {
      const existingTodos = [
        createMockTodo({ text: 'Email john@example.com about renewal' }),
        createMockTodo({ text: 'Other task' }),
      ];

      const matches = findPotentialDuplicates('Contact john@example.com', existingTodos);

      expect(matches).toHaveLength(1);
      expect(matches[0].matchReasons).toContain('Same email address');
    });

    it('should find duplicate by customer name', () => {
      const existingTodos = [
        createMockTodo({ text: 'Call John Smith about policy' }),
        createMockTodo({ text: 'Other task' }),
      ];

      const matches = findPotentialDuplicates('Follow up with John Smith', existingTodos);

      expect(matches.length).toBeGreaterThanOrEqual(1);
      expect(matches[0].matchReasons.some(r => r.includes('Same customer'))).toBe(true);
    });

    it('should find duplicate by similar text', () => {
      const existingTodos = [
        createMockTodo({ text: 'Review auto policy renewal for client' }),
      ];

      const matches = findPotentialDuplicates('Review auto policy renewal', existingTodos, 0.1);

      expect(matches.length).toBeGreaterThanOrEqual(1);
      expect(matches[0].matchReasons).toContain('Similar task description');
    });

    it('should skip completed todos', () => {
      const existingTodos = [
        createMockTodo({ text: 'Call 555-123-4567', completed: true }),
      ];

      const matches = findPotentialDuplicates('Call 555-123-4567', existingTodos);

      expect(matches).toHaveLength(0);
    });

    it('should check notes for duplicates', () => {
      const existingTodos = [
        createMockTodo({
          text: 'Customer follow up',
          notes: 'Phone: 555-123-4567',
        }),
      ];

      const matches = findPotentialDuplicates('Call 555-123-4567', existingTodos);

      expect(matches).toHaveLength(1);
    });

    it('should check transcription for duplicates', () => {
      const existingTodos = [
        createMockTodo({
          text: 'Voicemail task',
          transcription: 'This is John Smith calling about my policy',
        }),
      ];

      const matches = findPotentialDuplicates('Contact John Smith', existingTodos);

      expect(matches.length).toBeGreaterThanOrEqual(1);
    });

    it('should sort matches by score descending', () => {
      const existingTodos = [
        createMockTodo({ text: 'Call 555-111-2222' }), // Phone match = 0.5
        createMockTodo({ text: 'Call 555-123-4567 and email john@test.com' }), // Phone + email = 0.9
      ];

      const matches = findPotentialDuplicates('Contact 555-123-4567 john@test.com', existingTodos);

      expect(matches[0].score).toBeGreaterThan(matches[1]?.score || 0);
    });

    it('should limit results to top 5', () => {
      const existingTodos = Array(10).fill(null).map((_, i) =>
        createMockTodo({ text: `Call 555-123-4567 task ${i}` })
      );

      const matches = findPotentialDuplicates('Contact 555-123-4567', existingTodos);

      expect(matches.length).toBeLessThanOrEqual(5);
    });

    it('should return empty array for no matches', () => {
      const existingTodos = [
        createMockTodo({ text: 'Unrelated task one' }),
        createMockTodo({ text: 'Unrelated task two' }),
      ];

      const matches = findPotentialDuplicates('Completely different task', existingTodos);

      expect(matches).toHaveLength(0);
    });

    it('should match partial phone numbers (suffix match)', () => {
      const existingTodos = [
        createMockTodo({ text: 'Call +1-555-123-4567' }),
      ];

      const matches = findPotentialDuplicates('Follow up 5551234567', existingTodos);

      expect(matches.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('shouldCheckForDuplicates', () => {
    it('should return true for text with phone number', () => {
      expect(shouldCheckForDuplicates('Call 555-123-4567')).toBe(true);
    });

    it('should return true for text with email', () => {
      expect(shouldCheckForDuplicates('Email john@example.com')).toBe(true);
    });

    it('should return true for text with names', () => {
      expect(shouldCheckForDuplicates('Call John Smith')).toBe(true);
    });

    it('should return false for generic text without identifying info', () => {
      expect(shouldCheckForDuplicates('complete the task')).toBe(false);
    });

    it('should return false for empty text', () => {
      expect(shouldCheckForDuplicates('')).toBe(false);
    });

    it('should return true for text with both phone and name', () => {
      expect(shouldCheckForDuplicates('Call John at 555-123-4567')).toBe(true);
    });
  });
});

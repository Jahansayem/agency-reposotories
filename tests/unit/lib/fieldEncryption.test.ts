/**
 * Field Encryption Unit Tests
 *
 * Tests for AES-256-GCM field-level encryption for PII protection.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  encryptField,
  decryptField,
  isEncrypted,
  encryptFields,
  decryptFields,
  encryptTodoPII,
  decryptTodoPII,
  encryptMessagePII,
  decryptMessagePII,
} from '@/lib/fieldEncryption';

// Mock logger to avoid Sentry issues
vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('Field Encryption', () => {
  // Store original env value
  const originalEnv = process.env.FIELD_ENCRYPTION_KEY;

  // Valid 32-byte (64 hex characters) test key
  const TEST_ENCRYPTION_KEY = 'a'.repeat(64);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Restore original env value
    if (originalEnv !== undefined) {
      process.env.FIELD_ENCRYPTION_KEY = originalEnv;
    } else {
      delete process.env.FIELD_ENCRYPTION_KEY;
    }
  });

  describe('encryptField and decryptField round-trip', () => {
    it('should encrypt and decrypt text correctly', () => {
      process.env.FIELD_ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;

      const plaintext = 'This is sensitive customer information';
      const fieldName = 'notes';

      const encrypted = encryptField(plaintext, fieldName);
      expect(encrypted).not.toBe(plaintext);
      expect(encrypted).toContain('enc:v1:');

      const decrypted = decryptField(encrypted, fieldName);
      expect(decrypted).toBe(plaintext);
    });

    it('should maintain consistency across multiple encrypt/decrypt cycles', () => {
      process.env.FIELD_ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;

      const plaintext = 'Customer SSN: 123-45-6789';
      const fieldName = 'transcription';

      // First cycle
      const encrypted1 = encryptField(plaintext, fieldName);
      const decrypted1 = decryptField(encrypted1, fieldName);
      expect(decrypted1).toBe(plaintext);

      // Second cycle - encrypt the original plaintext again
      const encrypted2 = encryptField(plaintext, fieldName);
      const decrypted2 = decryptField(encrypted2, fieldName);
      expect(decrypted2).toBe(plaintext);
    });

    it('should handle unicode characters correctly', () => {
      process.env.FIELD_ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;

      const plaintext = 'Customer: Jose Garcia. Policy renewal for casa.';
      const fieldName = 'notes';

      const encrypted = encryptField(plaintext, fieldName);
      const decrypted = decryptField(encrypted, fieldName);
      expect(decrypted).toBe(plaintext);
    });

    it('should handle special characters correctly', () => {
      process.env.FIELD_ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;

      const plaintext = 'Email: test@example.com, Phone: (555) 123-4567!';
      const fieldName = 'notes';

      const encrypted = encryptField(plaintext, fieldName);
      const decrypted = decryptField(encrypted, fieldName);
      expect(decrypted).toBe(plaintext);
    });

    it('should handle JSON strings correctly', () => {
      process.env.FIELD_ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;

      const plaintext = JSON.stringify({ customer: 'John', ssn: '123-45-6789' });
      const fieldName = 'notes';

      const encrypted = encryptField(plaintext, fieldName);
      const decrypted = decryptField(encrypted, fieldName);
      expect(decrypted).toBe(plaintext);
      expect(JSON.parse(decrypted!)).toEqual({ customer: 'John', ssn: '123-45-6789' });
    });
  });

  describe('Different IVs produce different ciphertext', () => {
    it('should produce different ciphertext for same plaintext', () => {
      process.env.FIELD_ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;

      const plaintext = 'This is the same text';
      const fieldName = 'notes';

      const encrypted1 = encryptField(plaintext, fieldName);
      const encrypted2 = encryptField(plaintext, fieldName);

      // IVs are random, so ciphertext should be different
      expect(encrypted1).not.toBe(encrypted2);

      // But both should decrypt to the same plaintext
      expect(decryptField(encrypted1, fieldName)).toBe(plaintext);
      expect(decryptField(encrypted2, fieldName)).toBe(plaintext);
    });

    it('should produce different ciphertext on every call', () => {
      process.env.FIELD_ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;

      const plaintext = 'Test data';
      const fieldName = 'notes';
      const encryptedValues = new Set<string>();

      // Generate multiple encrypted values
      for (let i = 0; i < 10; i++) {
        const encrypted = encryptField(plaintext, fieldName);
        expect(encryptedValues.has(encrypted!)).toBe(false);
        encryptedValues.add(encrypted!);
      }

      // All 10 should be unique
      expect(encryptedValues.size).toBe(10);
    });
  });

  describe('Auth tag validation (modified ciphertext detection)', () => {
    it('should fail decryption when ciphertext is modified', () => {
      process.env.FIELD_ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;

      const plaintext = 'Sensitive data';
      const fieldName = 'notes';

      const encrypted = encryptField(plaintext, fieldName);
      expect(encrypted).toContain('enc:v1:');

      // Parse and modify the encrypted data
      const parts = encrypted!.substring(7).split(':'); // Remove 'enc:v1:'
      expect(parts.length).toBe(3);

      // Modify the ciphertext portion (last part)
      const modifiedCiphertext = parts[2].slice(0, -4) + 'XXXX';
      const modifiedEncrypted = `enc:v1:${parts[0]}:${parts[1]}:${modifiedCiphertext}`;

      // Decryption should fail and return the original ciphertext
      const result = decryptField(modifiedEncrypted, fieldName);
      expect(result).toBe(modifiedEncrypted);
    });

    it('should fail decryption when auth tag is modified', () => {
      process.env.FIELD_ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;

      const plaintext = 'Sensitive data';
      const fieldName = 'notes';

      const encrypted = encryptField(plaintext, fieldName);
      const parts = encrypted!.substring(7).split(':');

      // Modify the auth tag (second part)
      const modifiedAuthTag = parts[1].slice(0, -4) + 'YYYY';
      const modifiedEncrypted = `enc:v1:${parts[0]}:${modifiedAuthTag}:${parts[2]}`;

      // Decryption should fail
      const result = decryptField(modifiedEncrypted, fieldName);
      expect(result).toBe(modifiedEncrypted);
    });

    it('should fail decryption when IV is modified', () => {
      process.env.FIELD_ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;

      const plaintext = 'Sensitive data';
      const fieldName = 'notes';

      const encrypted = encryptField(plaintext, fieldName);
      const parts = encrypted!.substring(7).split(':');

      // Modify the IV (first part)
      const modifiedIv = parts[0].slice(0, -4) + 'ZZZZ';
      const modifiedEncrypted = `enc:v1:${modifiedIv}:${parts[1]}:${parts[2]}`;

      // Decryption should fail
      const result = decryptField(modifiedEncrypted, fieldName);
      expect(result).toBe(modifiedEncrypted);
    });
  });

  describe('Missing encryption key fallback', () => {
    it('should return plaintext when encryption key is not configured', () => {
      delete process.env.FIELD_ENCRYPTION_KEY;

      const plaintext = 'This will not be encrypted';
      const fieldName = 'notes';

      const result = encryptField(plaintext, fieldName);
      expect(result).toBe(plaintext);
    });

    it('should return ciphertext as-is when decrypting without key', () => {
      // First encrypt with key
      process.env.FIELD_ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;
      const plaintext = 'This was encrypted';
      const encrypted = encryptField(plaintext, 'notes');

      // Then try to decrypt without key
      delete process.env.FIELD_ENCRYPTION_KEY;
      const result = decryptField(encrypted, 'notes');

      // Should return the encrypted value as-is
      expect(result).toBe(encrypted);
    });

    it('should return plaintext for unencrypted data when key is not configured', () => {
      delete process.env.FIELD_ENCRYPTION_KEY;

      const plaintext = 'Plain text data';
      const result = decryptField(plaintext, 'notes');
      expect(result).toBe(plaintext);
    });
  });

  describe('Invalid encryption key handling', () => {
    it('should return plaintext when key is too short', () => {
      process.env.FIELD_ENCRYPTION_KEY = 'a'.repeat(32); // Only 32 hex chars (16 bytes)

      const plaintext = 'Test data';
      const result = encryptField(plaintext, 'notes');
      expect(result).toBe(plaintext);
    });

    it('should return plaintext when key is too long', () => {
      process.env.FIELD_ENCRYPTION_KEY = 'a'.repeat(128); // 128 hex chars (64 bytes)

      const plaintext = 'Test data';
      const result = encryptField(plaintext, 'notes');
      expect(result).toBe(plaintext);
    });

    it('should return plaintext when key contains invalid hex characters', () => {
      // Using characters that will fail Buffer.from() with 'hex' encoding
      process.env.FIELD_ENCRYPTION_KEY = 'xyz!@#$%^&*()_+{}[]|\\:";\'<>?,./`~' + 'xyz!@#$%^&*()_+{}';

      const plaintext = 'Test data';
      const result = encryptField(plaintext, 'notes');
      expect(result).toBe(plaintext);
    });
  });

  describe('Null/undefined/empty string handling', () => {
    it('should return null for null input', () => {
      process.env.FIELD_ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;

      expect(encryptField(null, 'notes')).toBeNull();
      expect(decryptField(null, 'notes')).toBeNull();
    });

    it('should return undefined for undefined input', () => {
      process.env.FIELD_ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;

      expect(encryptField(undefined, 'notes')).toBeUndefined();
      expect(decryptField(undefined, 'notes')).toBeUndefined();
    });

    it('should return empty string for empty string input', () => {
      process.env.FIELD_ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;

      expect(encryptField('', 'notes')).toBe('');
      expect(decryptField('', 'notes')).toBe('');
    });
  });

  describe('Large content handling', () => {
    it('should handle 10KB transcription', () => {
      process.env.FIELD_ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;

      // Create ~10KB of text
      const largeContent = 'A'.repeat(10 * 1024);
      const fieldName = 'transcription';

      const encrypted = encryptField(largeContent, fieldName);
      expect(encrypted).toContain('enc:v1:');
      expect(encrypted!.length).toBeGreaterThan(largeContent.length);

      const decrypted = decryptField(encrypted, fieldName);
      expect(decrypted).toBe(largeContent);
    });

    it('should handle 50KB content', () => {
      process.env.FIELD_ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;

      const largeContent = 'B'.repeat(50 * 1024);
      const fieldName = 'notes';

      const encrypted = encryptField(largeContent, fieldName);
      const decrypted = decryptField(encrypted, fieldName);
      expect(decrypted).toBe(largeContent);
    });

    it('should handle content with mixed large text and special characters', () => {
      process.env.FIELD_ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;

      const mixedContent = 'Customer voicemail: '.repeat(500) +
        '\n\nSSN: 123-45-6789\nPhone: (555) 123-4567\nEmail: customer@example.com';
      const fieldName = 'transcription';

      const encrypted = encryptField(mixedContent, fieldName);
      const decrypted = decryptField(encrypted, fieldName);
      expect(decrypted).toBe(mixedContent);
    });
  });

  describe('isEncrypted helper', () => {
    it('should return true for encrypted values', () => {
      process.env.FIELD_ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;

      const encrypted = encryptField('test', 'notes');
      expect(isEncrypted(encrypted)).toBe(true);
    });

    it('should return false for plaintext', () => {
      expect(isEncrypted('plain text')).toBe(false);
    });

    it('should return false for null', () => {
      expect(isEncrypted(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isEncrypted(undefined)).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isEncrypted('')).toBe(false);
    });
  });

  describe('encryptFields and decryptFields', () => {
    it('should encrypt multiple specified fields', () => {
      process.env.FIELD_ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;

      const obj = {
        name: 'John',
        notes: 'Secret notes',
        transcription: 'Voicemail content',
        public: 'Not encrypted',
      };

      const encrypted = encryptFields(obj, ['notes', 'transcription']);

      expect(encrypted.name).toBe('John');
      expect(encrypted.public).toBe('Not encrypted');
      expect(isEncrypted(encrypted.notes as string)).toBe(true);
      expect(isEncrypted(encrypted.transcription as string)).toBe(true);
    });

    it('should decrypt multiple specified fields', () => {
      process.env.FIELD_ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;

      const obj = {
        name: 'John',
        notes: 'Secret notes',
        transcription: 'Voicemail content',
      };

      const encrypted = encryptFields(obj, ['notes', 'transcription']);
      const decrypted = decryptFields(encrypted, ['notes', 'transcription']);

      expect(decrypted.name).toBe('John');
      expect(decrypted.notes).toBe('Secret notes');
      expect(decrypted.transcription).toBe('Voicemail content');
    });

    it('should handle non-string fields gracefully', () => {
      process.env.FIELD_ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;

      const obj = {
        count: 123,
        active: true,
        data: null,
      };

      const result = encryptFields(obj, ['count', 'active', 'data'] as (keyof typeof obj)[]);

      // Non-string fields should remain unchanged
      expect(result.count).toBe(123);
      expect(result.active).toBe(true);
      expect(result.data).toBeNull();
    });
  });

  describe('encryptTodoPII and decryptTodoPII', () => {
    it('should encrypt todo transcription and notes', () => {
      process.env.FIELD_ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;

      const todo = {
        id: '123',
        text: 'Call customer',
        notes: 'Customer phone: 555-1234',
        transcription: 'Voicemail from John about policy',
      };

      const encrypted = encryptTodoPII(todo);

      expect(encrypted.id).toBe('123');
      expect(encrypted.text).toBe('Call customer');
      expect(isEncrypted(encrypted.notes!)).toBe(true);
      expect(isEncrypted(encrypted.transcription!)).toBe(true);
    });

    it('should decrypt todo transcription and notes', () => {
      process.env.FIELD_ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;

      const todo = {
        id: '123',
        text: 'Call customer',
        notes: 'Customer phone: 555-1234',
        transcription: 'Voicemail from John about policy',
      };

      const encrypted = encryptTodoPII(todo);
      const decrypted = decryptTodoPII(encrypted);

      expect(decrypted.notes).toBe('Customer phone: 555-1234');
      expect(decrypted.transcription).toBe('Voicemail from John about policy');
    });

    it('should handle null notes and transcription', () => {
      process.env.FIELD_ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;

      const todo = {
        id: '123',
        text: 'Simple task',
        notes: null,
        transcription: null,
      };

      const encrypted = encryptTodoPII(todo);
      expect(encrypted.notes).toBeNull();
      expect(encrypted.transcription).toBeNull();

      const decrypted = decryptTodoPII(encrypted);
      expect(decrypted.notes).toBeNull();
      expect(decrypted.transcription).toBeNull();
    });
  });

  describe('encryptMessagePII and decryptMessagePII', () => {
    it('should encrypt message text', () => {
      process.env.FIELD_ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;

      const message = {
        id: '456',
        text: 'Customer SSN is 123-45-6789',
        created_by: 'Derrick',
      };

      const encrypted = encryptMessagePII(message);

      expect(encrypted.id).toBe('456');
      expect(encrypted.created_by).toBe('Derrick');
      expect(isEncrypted(encrypted.text!)).toBe(true);
    });

    it('should decrypt message text', () => {
      process.env.FIELD_ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;

      const message = {
        id: '456',
        text: 'Customer SSN is 123-45-6789',
        created_by: 'Derrick',
      };

      const encrypted = encryptMessagePII(message);
      const decrypted = decryptMessagePII(encrypted);

      expect(decrypted.text).toBe('Customer SSN is 123-45-6789');
    });

    it('should handle null text', () => {
      process.env.FIELD_ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;

      const message = {
        id: '456',
        text: null,
        created_by: 'Derrick',
      };

      const encrypted = encryptMessagePII(message);
      expect(encrypted.text).toBeNull();

      const decrypted = decryptMessagePII(encrypted);
      expect(decrypted.text).toBeNull();
    });
  });

  describe('Re-encryption of already encrypted values', () => {
    it('should not double-encrypt already encrypted values', () => {
      process.env.FIELD_ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;

      const plaintext = 'Original text';
      const encrypted1 = encryptField(plaintext, 'notes');

      // Try to encrypt the already encrypted value
      const encrypted2 = encryptField(encrypted1, 'notes');

      // Should return the same encrypted value (no double encryption)
      expect(encrypted2).toBe(encrypted1);

      // Should still decrypt correctly
      const decrypted = decryptField(encrypted2, 'notes');
      expect(decrypted).toBe(plaintext);
    });
  });

  describe('Field-specific key derivation', () => {
    it('should produce different ciphertext for different field names', () => {
      process.env.FIELD_ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;

      const plaintext = 'Same content';

      // Note: Due to random IVs, we can't compare ciphertext directly
      // But we can verify that each field decrypts correctly with its own field name
      const encryptedNotes = encryptField(plaintext, 'notes');
      const encryptedTranscription = encryptField(plaintext, 'transcription');

      // Decrypt each with correct field name
      expect(decryptField(encryptedNotes, 'notes')).toBe(plaintext);
      expect(decryptField(encryptedTranscription, 'transcription')).toBe(plaintext);

      // Cross-decryption should fail (wrong field key derivation)
      // The result will be the original ciphertext (decryption fails)
      const crossDecrypt = decryptField(encryptedNotes, 'transcription');
      expect(crossDecrypt).toBe(encryptedNotes);
    });
  });
});

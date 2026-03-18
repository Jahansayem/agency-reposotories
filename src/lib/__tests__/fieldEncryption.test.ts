import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { encryptField, decryptField } from '../fieldEncryption';

// A valid 64-hex-character key (32 bytes) for use in tests.
// Production uses FIELD_ENCRYPTION_KEY from the environment; we set it here
// so the module actually performs encryption rather than the plaintext fallback.
const TEST_KEY = 'a'.repeat(64); // 64 hex chars = 32 bytes, valid AES-256 key

describe('fieldEncryption', () => {
  const testFieldName = 'test_field';
  const testData = 'sensitive-data-12345';

  beforeEach(() => {
    process.env.FIELD_ENCRYPTION_KEY = TEST_KEY;
  });

  afterEach(() => {
    delete process.env.FIELD_ENCRYPTION_KEY;
  });

  describe('encryptField', () => {
    it('should encrypt data successfully', () => {
      const encrypted = encryptField(testData, testFieldName);

      expect(encrypted).toBeDefined();
      expect(encrypted).not.toBe(testData);
      expect(encrypted!.length).toBeGreaterThan(testData.length);
    });

    it('should produce different ciphertext for same plaintext (randomized IV)', () => {
      const encrypted1 = encryptField(testData, testFieldName);
      const encrypted2 = encryptField(testData, testFieldName);

      expect(encrypted1).not.toBe(encrypted2);
    });

    it('should handle empty strings', () => {
      // Production returns empty string unchanged (not encrypted)
      const result = encryptField('', testFieldName);
      expect(result).toBe('');
    });

    it('should handle special characters', () => {
      const specialChars = '!@#$%^&*()_+-=[]{}|;:\'",.<>?/~`';
      const encrypted = encryptField(specialChars, testFieldName);

      expect(encrypted).toBeDefined();
      const decrypted = decryptField(encrypted, testFieldName);
      expect(decrypted).toBe(specialChars);
    });

    it('should handle Unicode characters', () => {
      const unicode = '你好世界 🌍 مرحبا';
      const encrypted = encryptField(unicode, testFieldName);

      const decrypted = decryptField(encrypted, testFieldName);
      expect(decrypted).toBe(unicode);
    });
  });

  describe('decryptField', () => {
    it('should decrypt previously encrypted data', () => {
      const encrypted = encryptField(testData, testFieldName);
      const decrypted = decryptField(encrypted, testFieldName);

      expect(decrypted).toBe(testData);
    });

    it('should return value unchanged for non-encrypted ciphertext (no enc:v1: prefix)', () => {
      // Production returns the value as-is when it does not start with the
      // "enc:v1:" prefix — it does not throw.
      const result = decryptField('invalid-ciphertext', testFieldName);
      expect(result).toBe('invalid-ciphertext');
    });

    it('should return ciphertext unchanged for tampered encrypted data', () => {
      // Production catches decryption errors and returns the ciphertext
      // rather than throwing — this prevents data loss.
      const encrypted = encryptField(testData, testFieldName);
      const tampered = encrypted!.slice(0, -10) + 'XXXXXXXXXX';

      // Should return the tampered string as-is rather than throwing
      const result = decryptField(tampered, testFieldName);
      expect(result).toBe(tampered);
    });

    it('should return ciphertext unchanged for wrong encryption key', () => {
      // Production catches decryption errors and returns the ciphertext
      // rather than throwing — this prevents data loss.
      const encrypted = encryptField(testData, testFieldName);

      // Use wrong key
      process.env.FIELD_ENCRYPTION_KEY = 'b'.repeat(64);

      // Should return the ciphertext as-is rather than throwing
      const result = decryptField(encrypted, testFieldName);
      expect(result).toBe(encrypted);

      // Restore the correct key
      process.env.FIELD_ENCRYPTION_KEY = TEST_KEY;
    });
  });

  describe('encryption roundtrip', () => {
    it('should handle large data (>1MB)', () => {
      const largeData = 'A'.repeat(1024 * 1024); // 1MB of 'A'
      const encrypted = encryptField(largeData, testFieldName);
      const decrypted = decryptField(encrypted, testFieldName);

      expect(decrypted).toBe(largeData);
    });

    it('should be deterministic for decryption', () => {
      const encrypted = encryptField(testData, testFieldName);

      const decrypted1 = decryptField(encrypted, testFieldName);
      const decrypted2 = decryptField(encrypted, testFieldName);

      expect(decrypted1).toBe(decrypted2);
      expect(decrypted1).toBe(testData);
    });
  });

  describe('error handling', () => {
    it('should return plaintext when encryption key is missing (non-production fallback)', () => {
      // Production only throws in NODE_ENV=production. In test (non-production)
      // envs it logs a warning and returns the plaintext as-is.
      delete process.env.FIELD_ENCRYPTION_KEY;

      const result = encryptField(testData, testFieldName);
      // Falls back to plaintext in non-production environments
      expect(result).toBe(testData);

      process.env.FIELD_ENCRYPTION_KEY = TEST_KEY;
    });

    it('should return ciphertext unchanged when decryption fails (non-throwing fallback)', () => {
      // Production catches errors and returns the ciphertext rather than
      // throwing — to prevent data loss.  Error details go to the logger.
      // 'malformed' does not start with 'enc:v1:' so it is returned as-is.
      const result = decryptField('malformed', testFieldName);
      expect(result).toBe('malformed');
    });
  });
});

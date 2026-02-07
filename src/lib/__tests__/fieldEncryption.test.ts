import { describe, it, expect, beforeEach } from 'vitest';
import { encryptField, decryptField } from '../fieldEncryption';

describe('fieldEncryption', () => {
  const testFieldName = 'test_field';
  const testData = 'sensitive-data-12345';

  describe('encryptField', () => {
    it('should encrypt data successfully', () => {
      const encrypted = encryptField(testData, testFieldName);
      
      expect(encrypted).toBeDefined();
      expect(encrypted).not.toBe(testData);
      expect(encrypted.length).toBeGreaterThan(testData.length);
    });

    it('should produce different ciphertext for same plaintext (randomized IV)', () => {
      const encrypted1 = encryptField(testData, testFieldName);
      const encrypted2 = encryptField(testData, testFieldName);
      
      expect(encrypted1).not.toBe(encrypted2);
    });

    it('should handle empty strings', () => {
      const encrypted = encryptField('', testFieldName);
      expect(encrypted).toBeDefined();
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

    it('should throw error for invalid ciphertext format', () => {
      expect(() => {
        decryptField('invalid-ciphertext', testFieldName);
      }).toThrow();
    });

    it('should throw error for tampered ciphertext', () => {
      const encrypted = encryptField(testData, testFieldName);
      const tampered = encrypted.slice(0, -10) + 'XXXXXXXXXX';
      
      expect(() => {
        decryptField(tampered, testFieldName);
      }).toThrow();
    });

    it('should throw error for wrong encryption key', () => {
      // This test assumes the encryption key is read from environment
      // In a real scenario, you'd mock the environment variable
      const encrypted = encryptField(testData, testFieldName);
      
      // Save original key
      const originalKey = process.env.FIELD_ENCRYPTION_KEY;
      
      // Use wrong key
      process.env.FIELD_ENCRYPTION_KEY = 'wrong-key-' + originalKey;
      
      expect(() => {
        decryptField(encrypted, testFieldName);
      }).toThrow();
      
      // Restore original key
      process.env.FIELD_ENCRYPTION_KEY = originalKey;
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
    it('should handle missing encryption key gracefully', () => {
      const originalKey = process.env.FIELD_ENCRYPTION_KEY;
      delete process.env.FIELD_ENCRYPTION_KEY;
      
      expect(() => {
        encryptField(testData, testFieldName);
      }).toThrow(/encryption key/i);
      
      process.env.FIELD_ENCRYPTION_KEY = originalKey;
    });

    it('should provide meaningful error messages', () => {
      try {
        decryptField('malformed', testFieldName);
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('decrypt');
      }
    });
  });
});

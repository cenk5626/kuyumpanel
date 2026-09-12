import { describe, it, test, expect, setTestContext } from '../helpers/test-utils';
import {
  IDENTITY_PURPOSE,
  IDENTITY_PURPOSE_LABELS,
  IDENTITY_STATUS,
  RETENTION_PERIOD_YEARS,
  TCKN_RULES,
} from '../../src/constants/identity-vault';
import {
  validateTckn,
  generateTcknFingerprint,
} from '../../src/lib/security/tckn-utils';
import { maskTckn } from '../../src/lib/security/masking';
import { encryptSecret, decryptSecret } from '../../src/lib/security/encryption';

export function registerF44CustomerIdentityVaultTests() {
  setTestContext(
    'Tier 1',
    44,
    'Customer Identity Vault & Security',
    'F44: Müşteri Kimlik Havuzu (TCKN Vault)'
  );

  describe('Feature 44 - Müşteri Kimlik Havuzu, TCKN Algoritması & AES-256 Şifreleme', () => {
    // Algoritmik olarak geçerli test TCKN'si: 10000000146
    // Tekler: 1+0+0+0+1 = 2. Çiftler: 0+0+0+0 = 0.
    // 10. hane: ((2*7) - 0) % 10 = 14 % 10 = 4.
    // İlk 10 toplam: 1+0+0+0+0+0+0+0+1+4 = 6. 11. hane: 6 % 10 = 6.
    const validTckn = '10000000146';

    test('44.1 Should validate 11-digit Turkish TCKN checksum algorithmically (10th and 11th digits)', () => {
      const res = validateTckn(validTckn);
      expect(res.isValid).toBe(true);
      expect(res.cleanedTcNo).toBe(validTckn);
    });

    test('44.2 Should reject invalid TCKN (length, zero leading digit, non-digit, or bad checksum)', () => {
      // 10 hane
      expect(validateTckn('1000000014').isValid).toBe(false);

      // Sıfır ile başlayan
      expect(validateTckn('01234567890').isValid).toBe(false);

      // Harf içeren
      expect(validateTckn('1000000014A').isValid).toBe(false);

      // Yanlış kontrol hanesi
      expect(validateTckn('10000000145').isValid).toBe(false);
    });

    test('44.3 Should generate HMAC/SHA-256 fingerprint for unique indexed lookup without plain text leakage', () => {
      const fp = generateTcknFingerprint(validTckn);
      expect(fp.length).toBe(64);
      expect(fp).not.toContain(validTckn);

      const fp2 = generateTcknFingerprint(`  ${validTckn}  `);
      expect(fp).toBe(fp2); // Boşluk toleransı
    });

    test('44.4 Should mask TCKN properly preserving first 3 and last 2 digits (100*****46)', () => {
      const masked = maskTckn(validTckn);
      expect(masked.startsWith('100')).toBe(true);
      expect(masked.endsWith('46')).toBe(true);
      expect(masked).toContain('*');
      expect(masked.length).toBe(11);
    });

    test('44.5 Should calculate retention periods (1, 5, 10 years) for MASAK & KVKK compliance', () => {
      expect(RETENTION_PERIOD_YEARS.SHORT).toBe(1);
      expect(RETENTION_PERIOD_YEARS.STANDARD).toBe(5);
      expect(RETENTION_PERIOD_YEARS.MASAK_LEGAL).toBe(10);

      const now = new Date('2026-09-09T12:00:00.000Z');
      const retention10 = new Date(now);
      retention10.setFullYear(retention10.getFullYear() + RETENTION_PERIOD_YEARS.MASAK_LEGAL);

      expect(retention10.getFullYear()).toBe(2036);
    });

    test('44.6 Should encrypt and decrypt TCKN payload using AES-256-GCM', () => {
      const encrypted = encryptSecret(validTckn);
      expect(encrypted).not.toContain(validTckn);

      const decrypted = decryptSecret(encrypted);
      expect(decrypted).toBe(validTckn);
    });

    test('44.7 Should verify all essential identity purposes and status labels exist', () => {
      expect(IDENTITY_PURPOSE.MASAK_AML).toBe('MASAK_AML');
      expect(IDENTITY_PURPOSE.FATURA_DUZENLEME).toBe('FATURA_DUZENLEME');
      expect(IDENTITY_PURPOSE.YUKSEK_TUTARLI_ISLEM).toBe('YUKSEK_TUTARLI_ISLEM');
      expect(IDENTITY_PURPOSE_LABELS[IDENTITY_PURPOSE.MASAK_AML]).toContain('MASAK');

      expect(IDENTITY_STATUS.ACTIVE).toBe('ACTIVE');
      expect(IDENTITY_STATUS.EXPIRED).toBe('EXPIRED');
      expect(IDENTITY_STATUS.DESTROYED).toBe('DESTROYED');
    });
  });
}

import { describe, it, test, expect, setTestContext } from '../helpers/test-utils';
import {
  TURKISH_BANKS,
  BANK_ACCOUNT_CURRENCY,
  IBAN_RULES,
} from '../../src/constants/bank-account';
import {
  validateTurkishIban,
  generateIbanFingerprint,
} from '../../src/lib/banking/iban-utils';
import { maskIban } from '../../src/lib/security/masking';
import { encryptSecret, decryptSecret } from '../../src/lib/security/encryption';

export function registerF43BusinessBankAccountsTests() {
  setTestContext(
    'Tier 1',
    43,
    'Business Bank Accounts & Security',
    'F43: İşletme IBAN Yönetimi & Güvenlik'
  );

  describe('Feature 43 - İşletme IBAN Kayıt Yönetimi & AES-256 Şifreleme', () => {
    // Geçerli test IBAN'ları (ISO 13616 Mod-97 checksum doğrulaması)
    const validIban1 = 'TR380006100519782500002519'; // 26 hane, geçerli checksum
    const validIbanFormatted = 'TR38 0006 1005 1978 2500 0025 19';

    test('43.1 Should validate valid Turkish IBAN checksum via ISO 13616 Mod-97 algorithm', () => {
      const res = validateTurkishIban(validIban1);
      expect(res.isValid).toBe(true);
      expect(res.cleanedIban).toBe(validIban1);
      expect(res.formattedIban).toBe(validIbanFormatted);
    });

    test('43.2 Should reject invalid IBAN length, prefix or checksum', () => {
      // Eksik uzunluk
      const shortRes = validateTurkishIban('TR3300061005');
      expect(shortRes.isValid).toBe(false);
      expect(shortRes.error).toContain('26 karakter');

      // Yanlış ülke kodu
      const foreignRes = validateTurkishIban('DE89370400440532013000');
      expect(foreignRes.isValid).toBe(false);
      expect(foreignRes.error).toContain('TR');

      // Yanlış kontrol hanesi
      const wrongChecksum = 'TR340006100519782500002519';
      const invalidRes = validateTurkishIban(wrongChecksum);
      expect(invalidRes.isValid).toBe(false);
      expect(invalidRes.error).toContain('kontrol hanesi');
    });

    test('43.3 Should generate deterministic HMAC/SHA-256 fingerprint for indexed unique lookup', () => {
      const fp1 = generateIbanFingerprint(validIban1);
      const fp2 = generateIbanFingerprint(validIbanFormatted);

      expect(fp1).toBe(fp2); // Boşluk farkını tolere eder
      expect(fp1.length).toBe(64); // 256-bit hex
      expect(fp1).not.toContain(validIban1); // Asla düz IBAN içermez
    });

    test('43.4 Should mask IBAN properly preserving country code and last 4 digits (TR** **** **** **12 34)', () => {
      const masked = maskIban(validIban1);
      expect(masked.startsWith('TR**')).toBe(true);
      expect(masked.endsWith('25 19')).toBe(true);
      expect(masked).not.toBe(validIban1);
    });

    test('43.5 Should encrypt and decrypt IBAN payload using AES-256-GCM without plaintext leakage', () => {
      const encrypted = encryptSecret(validIban1);
      expect(encrypted).not.toContain(validIban1);
      expect(encrypted.split(':').length).toBe(3); // iv:tag:ciphertext format

      const decrypted = decryptSecret(encrypted);
      expect(decrypted).toBe(validIban1);
    });

    test('43.6 Should verify Turkish banks catalog contains major banks with EFT codes', () => {
      expect(TURKISH_BANKS.length).toBeGreaterThanOrEqual(15);
      const bankNames = TURKISH_BANKS.map((b) => b.name);
      expect(bankNames.some((b) => b.includes('Ziraat'))).toBe(true);
      expect(bankNames.some((b) => b.includes('İş Bankası'))).toBe(true);
      expect(bankNames.some((b) => b.includes('Garanti'))).toBe(true);
      expect(bankNames.some((b) => b.includes('Akbank'))).toBe(true);
      expect(bankNames.some((b) => b.includes('Kredi'))).toBe(true);
      expect(bankNames.some((b) => b.includes('Kuveyt'))).toBe(true);
    });
  });
}

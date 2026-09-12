import crypto from 'crypto';
import { TCKN_RULES } from '@/constants/identity-vault';

export interface TcknValidationResult {
  isValid: boolean;
  error?: string;
  cleanedTcNo?: string;
}

/**
 * 11 Haneli T.C. Kimlik Numarası Resmi Algoritma Doğrulaması.
 */
export function validateTckn(rawTcNo: string | null | undefined): TcknValidationResult {
  if (!rawTcNo || typeof rawTcNo !== 'string') {
    return { isValid: false, error: 'T.C. Kimlik Numarası boş bırakılamaz.' };
  }

  const cleaned = rawTcNo.trim();

  if (cleaned.length !== TCKN_RULES.LENGTH) {
    return { isValid: false, error: `T.C. Kimlik No 11 haneli olmalıdır (Girilen: ${cleaned.length} hane).` };
  }

  if (!/^\d{11}$/.test(cleaned)) {
    return { isValid: false, error: 'T.C. Kimlik No yalnızca rakamlardan oluşmalıdır.' };
  }

  if (cleaned[0] === '0') {
    return { isValid: false, error: 'T.C. Kimlik No ilk hanesi sıfır (0) olamaz.' };
  }

  const digits = cleaned.split('').map(Number);

  // 1, 3, 5, 7, 9. haneler (0, 2, 4, 6, 8 indeksleri)
  const sumOdd = digits[0] + digits[2] + digits[4] + digits[6] + digits[8];
  // 2, 4, 6, 8. haneler (1, 3, 5, 7 indeksleri)
  const sumEven = digits[1] + digits[3] + digits[5] + digits[7];

  // 10. hane kuralı: ((sumOdd * 7) - sumEven) % 10
  const tenthDigitExpected = (((sumOdd * 7) - sumEven) % 10 + 10) % 10;
  if (digits[9] !== tenthDigitExpected) {
    return { isValid: false, error: 'T.C. Kimlik Numarası 10. kontrol hanesi doğrulanamadı.' };
  }

  // 11. hane kuralı: İlk 10 hanenin toplamının mod 10'u
  const sumFirst10 = digits.slice(0, 10).reduce((acc, curr) => acc + curr, 0);
  const eleventhDigitExpected = sumFirst10 % 10;
  if (digits[10] !== eleventhDigitExpected) {
    return { isValid: false, error: 'T.C. Kimlik Numarası 11. kontrol hanesi doğrulanamadı.' };
  }

  return {
    isValid: true,
    cleanedTcNo: cleaned,
  };
}

/**
 * TCKN tekillik ve sorgulama kontrolü için HMAC/SHA-256 parmak izi üretir.
 */
export function generateTcknFingerprint(tcNo: string): string {
  const cleaned = tcNo.trim();
  const secret = process.env.ENCRYPTION_SECRET || process.env.NEXTAUTH_SECRET || 'kuyumpanel-tckn-fingerprint-salt-2026';
  return crypto.createHmac('sha256', secret).update(cleaned).digest('hex');
}

import crypto from 'crypto';
import { IBAN_RULES } from '@/constants/bank-account';

export interface IbanValidationResult {
  isValid: boolean;
  error?: string;
  cleanedIban?: string;
  formattedIban?: string;
}

/**
 * Türkiye IBAN formatı ve ISO 13616 Mod-97 checksum doğrulaması.
 */
export function validateTurkishIban(rawIban: string | null | undefined): IbanValidationResult {
  if (!rawIban || typeof rawIban !== 'string') {
    return { isValid: false, error: 'IBAN alanı boş bırakılamaz.' };
  }

  const cleaned = rawIban.replace(/\s+/g, '').toUpperCase();

  if (!cleaned.startsWith(IBAN_RULES.COUNTRY_CODE)) {
    return { isValid: false, error: 'Türkiye IBAN numarası TR ile başlamalıdır.' };
  }

  if (cleaned.length !== IBAN_RULES.LENGTH) {
    return {
      isValid: false,
      error: `IBAN tam 26 karakter uzunluğunda olmalıdır (Girilen: ${cleaned.length} karakter).`,
    };
  }

  // TR ve ardından 24 rakam
  if (!/^TR\d{24}$/.test(cleaned)) {
    return { isValid: false, error: 'TR harflerinden sonra yalnızca rakam bulunmalıdır.' };
  }

  // ISO 7064 Mod 97-10 algoritması:
  // İlk 4 karakteri (TRxx) sona taşı: [24 rakam] + T (29) + R (27) + xx (2 hane)
  const rearranged = cleaned.substring(4) + '2927' + cleaned.substring(2, 4);

  // BigInt ile mod 97 hesaplama
  try {
    const remainder = BigInt(rearranged) % BigInt(97);
    if (remainder !== BigInt(1)) {
      return { isValid: false, error: 'IBAN kontrol hanesi (checksum) doğrulanamadı.' };
    }
  } catch {
    return { isValid: false, error: 'IBAN sağlama algoritması çalıştırılamadı.' };
  }

  // Formatlı gösterim (4'erli bloklar)
  const formatted = cleaned.replace(/(.{4})/g, '$1 ').trim();

  return {
    isValid: true,
    cleanedIban: cleaned,
    formattedIban: formatted,
  };
}

/**
 * Veritabanında tekillik (duplicate check) için güvenli HMAC/SHA-256 parmak izi üretir.
 */
export function generateIbanFingerprint(iban: string): string {
  const cleaned = iban.replace(/\s+/g, '').toUpperCase();
  const secret = process.env.ENCRYPTION_SECRET || process.env.NEXTAUTH_SECRET || 'kuyumpanel-iban-fingerprint-salt-2026';
  return crypto.createHmac('sha256', secret).update(cleaned).digest('hex');
}

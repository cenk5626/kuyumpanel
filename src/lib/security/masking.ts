import { SECURITY_CONFIG } from '@/constants/security';

/**
 * TCKN / VKN Maskeleme (İlk 3 ve son 2 hane görünür, aradaki 6 hane gizlenir)
 * Örnek: 12345678901 -> 123******01
 */
export function maskTckn(tckn: string | null | undefined): string {
  if (!tckn || typeof tckn !== 'string') return '';
  const clean = tckn.trim();
  if (clean.length < 5) return '***';
  const prefix = clean.substring(0, 3);
  const suffix = clean.substring(clean.length - 2);
  const stars = SECURITY_CONFIG.MASK_CHAR.repeat(Math.max(1, clean.length - 5));
  return `${prefix}${stars}${suffix}`;
}

/**
 * IBAN Maskeleme (İlk TR ve son 4 hane görünür)
 * Örnek: TR120006200000012345678901 -> TR** **** **** **** **89 01
 */
export function maskIban(iban: string | null | undefined): string {
  if (!iban || typeof iban !== 'string') return '';
  const clean = iban.replace(/\s+/g, '');
  if (clean.length < 8) return 'TR** ****';
  const prefix = clean.substring(0, 2);
  const suffix = clean.substring(clean.length - 4);
  return `${prefix}** **** **** **** **${suffix.substring(0, 2)} ${suffix.substring(2)}`;
}

/**
 * GSM Telefon Numarası Maskeleme
 * Örnek: 05321234567 -> 0532 *** **67
 */
export function maskPhone(phone: string | null | undefined): string {
  if (!phone || typeof phone !== 'string') return '';
  const clean = phone.replace(/[^\d+]/g, '');
  if (clean.length < 6) return '***';
  const prefix = clean.substring(0, 4);
  const suffix = clean.substring(clean.length - 2);
  return `${prefix} *** **${suffix}`;
}

/**
 * İsim Soyisim Maskeleme
 * Örnek: Ahmet Yılmaz -> Ah*** Yıl***
 */
export function maskName(name: string | null | undefined): string {
  if (!name || typeof name !== 'string') return '';
  return name
    .split(' ')
    .map((part) => {
      if (part.length <= 2) return part;
      return part.substring(0, 2) + SECURITY_CONFIG.MASK_CHAR.repeat(part.length - 2);
    })
    .join(' ');
}

/**
 * CSV / Excel Formül Enjeksiyonu (Formula Injection / DDE attack) Önleme
 * Hücre başında '=', '+', '-', '@', '\t', '\r' varsa başına tek tırnak "'" ekler.
 */
export function sanitizeCsvCell(value: any): string {
  if (value === null || value === undefined) return '';
  const raw = String(value);
  if (raw.length === 0) return '';
  if (SECURITY_CONFIG.CSV_INJECTION_CHARS.includes(raw.charAt(0) as any)) {
    return `'${raw}`;
  }
  const str = raw.trim();
  if (str.length > 0 && SECURITY_CONFIG.CSV_INJECTION_CHARS.includes(str.charAt(0) as any)) {
    return `'${str}`;
  }
  return str;
}

/**
 * Log ve API yanıtlarında hassas alanları (şifre, token, secret) otomatik temizler / maskeler.
 */
export function redactSensitiveData<T>(input: T): T {
  if (!input || typeof input !== 'object') return input;

  if (Array.isArray(input)) {
    return input.map((item) => redactSensitiveData(item)) as unknown as T;
  }

  const sensitiveKeys = [
    'password',
    'token',
    'secret',
    'twofactorsecret',
    'recoverycodes',
    'apikey',
    'geminiapikey',
    'openaiapikey',
    'wacloudaccesstoken',
    'wagatewaytoken',
  ];

  const result: any = {};
  for (const [key, value] of Object.entries(input)) {
    const lowerKey = key.toLowerCase();
    if (sensitiveKeys.some((s) => lowerKey.includes(s))) {
      result[key] = '[REDACTED]';
    } else if (value && typeof value === 'object') {
      result[key] = redactSensitiveData(value);
    } else {
      result[key] = value;
    }
  }

  return result;
}

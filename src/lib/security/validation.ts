/**
 * API ve Girdi Güvenliği Doğrulama Yardımcıları
 * Mass-assignment, NaN, negatif sayı ve geçersiz tarih saldırılarını engeller.
 */

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Mass-assignment Koruması: Gelen gövdeden (body) YALNIZCA izin verilen anahtarları süzer.
 * Beklenmeyen / saldırgan alanlar (örn: `role: 'SUPER_ADMIN'`, `dealerId: 'victim'`) ayıklanır.
 */
export function sanitizeBody<T extends Record<string, any>>(
  body: any,
  allowedKeys: readonly (keyof T)[]
): Partial<T> {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return {};
  }

  const sanitized: Partial<T> = {};
  for (const key of allowedKeys) {
    if (key in body) {
      sanitized[key] = body[key as string];
    }
  }

  return sanitized;
}

/**
 * Pozitif sayı doğrulaması (NaN, sonsuz veya negatif değerleri engeller).
 */
export function parseSafePositiveNumber(
  value: any,
  fieldName: string = 'Değer',
  allowZero: boolean = true
): number {
  const num = Number(value);

  if (isNaN(num) || !isFinite(num)) {
    throw new ValidationError(`${fieldName} geçerli bir sayı olmalıdır.`);
  }

  if (allowZero ? num < 0 : num <= 0) {
    throw new ValidationError(`${fieldName} ${allowZero ? 'sıfır veya daha büyük' : 'sıfırdan büyük'} bir değer olmalıdır.`);
  }

  return num;
}

/**
 * Para birimi hassasiyeti (2 basamaklı kuruş yuvarlama).
 */
export function roundMoney(amount: number): number {
  if (isNaN(amount) || !isFinite(amount)) return 0;
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

/**
 * Kuyumculuk altın hassasiyeti (3 basamaklı miligram / gramaj yuvarlama).
 */
export function roundGrams(grams: number): number {
  if (isNaN(grams) || !isFinite(grams)) return 0;
  return Math.round((grams + Number.EPSILON) * 1000) / 1000;
}

/**
 * Güvenli Tarih Ayrıştırıcı (Invalid Date kaynaklı Prisma çökmelerini engeller).
 */
export function parseSafeDate(value: any, fallback: Date = new Date()): Date {
  if (!value) return fallback;

  if (value instanceof Date) {
    return isNaN(value.getTime()) ? fallback : value;
  }

  const parsed = new Date(value);
  return isNaN(parsed.getTime()) ? fallback : parsed;
}

/**
 * Metin uzunluğu ve boşluk temizleme doğrulaması.
 */
export function validateStringLength(
  value: any,
  fieldName: string,
  minLen: number = 1,
  maxLen: number = 255
): string {
  if (typeof value !== 'string') {
    throw new ValidationError(`${fieldName} metin türünde olmalıdır.`);
  }

  const trimmed = value.trim();
  if (trimmed.length < minLen) {
    throw new ValidationError(`${fieldName} en az ${minLen} karakter olmalıdır.`);
  }

  if (trimmed.length > maxLen) {
    throw new ValidationError(`${fieldName} en fazla ${maxLen} karakter olabilir.`);
  }

  return trimmed;
}

/**
 * Güvenli Sayfalama ve Sıralama Parametreleri Temizliği (SQL Injection & Aşırı Yük Koruması).
 */
export function sanitizePagination(
  searchParams: URLSearchParams,
  allowedSortFields: readonly string[] = ['createdAt', 'updatedAt', 'id']
): {
  page: number;
  limit: number;
  skip: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
} {
  const pageRaw = Number(searchParams.get('page'));
  const limitRaw = Number(searchParams.get('limit'));

  const page = isNaN(pageRaw) || pageRaw < 1 ? 1 : Math.min(Math.floor(pageRaw), 1000);
  const limit = isNaN(limitRaw) || limitRaw < 1 ? 50 : Math.min(Math.floor(limitRaw), 100);
  const skip = (page - 1) * limit;

  const sortByRaw = searchParams.get('sortBy') || 'createdAt';
  const sortBy = allowedSortFields.includes(sortByRaw) ? sortByRaw : 'createdAt';

  const sortOrderRaw = (searchParams.get('sortOrder') || 'desc').toLowerCase();
  const sortOrder = sortOrderRaw === 'asc' ? 'asc' : 'desc';

  return { page, limit, skip, sortBy, sortOrder };
}

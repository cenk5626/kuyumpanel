interface RateLimitRecord {
  timestamps: number[];
}

const store = new Map<string, RateLimitRecord>();

// Her 10 dakikada bir bayat kayıtları bellekten temizle
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of store.entries()) {
      record.timestamps = record.timestamps.filter((ts) => now - ts < 15 * 60 * 1000);
      if (record.timestamps.length === 0) {
        store.delete(key);
      }
    }
  }, 10 * 60 * 1000).unref?.();
}

/**
 * Kayan pencere (Sliding Window) rate limiter kontrolü.
 */
export function checkRateLimit(
  key: string,
  limitConfig: { max: number; windowMs: number }
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const record = store.get(key) || { timestamps: [] };

  // Pencere dışındaki eski zaman damgalarını filtrele
  record.timestamps = record.timestamps.filter((ts) => now - ts < limitConfig.windowMs);

  if (record.timestamps.length >= limitConfig.max) {
    const oldestTimestamp = record.timestamps[0];
    const resetTime = oldestTimestamp + limitConfig.windowMs;
    return {
      allowed: false,
      remaining: 0,
      resetTime,
    };
  }

  // Yeni isteği kaydet
  record.timestamps.push(now);
  store.set(key, record);

  return {
    allowed: true,
    remaining: limitConfig.max - record.timestamps.length,
    resetTime: now + limitConfig.windowMs,
  };
}

/**
 * Belirli bir anahtar için limit sayacını sıfırlar (örn: başarılı giriş sonrası).
 */
export function resetRateLimit(key: string): void {
  store.delete(key);
}

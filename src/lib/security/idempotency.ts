import { SECURITY_CONFIG } from '@/constants/security';

interface IdempotencyEntry {
  createdAt: number;
  status: 'PROCESSING' | 'COMPLETED';
  responsePayload?: any;
}

const idempotencyStore = new Map<string, IdempotencyEntry>();

// Periyodik temizlik
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of idempotencyStore.entries()) {
      if (now - entry.createdAt > SECURITY_CONFIG.IDEMPOTENCY_TTL_MS) {
        idempotencyStore.delete(key);
      }
    }
  }, SECURITY_CONFIG.IDEMPOTENCY_TTL_MS).unref?.();
}

/**
 * Idempotency anahtarı kontrolü.
 * Çift istek gelirse mükerrer işlemi önler.
 */
export function checkIdempotency(
  key: string | null | undefined,
  dealerId: string,
  action: string
): {
  isDuplicate: boolean;
  cachedResponse?: any;
  markCompleted: (responsePayload?: any) => void;
  release: () => void;
} {
  if (!key) {
    return {
      isDuplicate: false,
      markCompleted: () => {},
      release: () => {},
    };
  }

  const compositeKey = `${dealerId}:${action}:${key}`;
  const existing = idempotencyStore.get(compositeKey);
  const now = Date.now();

  if (existing && now - existing.createdAt < SECURITY_CONFIG.IDEMPOTENCY_TTL_MS) {
    return {
      isDuplicate: true,
      cachedResponse: existing.responsePayload,
      markCompleted: () => {},
      release: () => {},
    };
  }

  // İşleme alındı olarak kaydet
  idempotencyStore.set(compositeKey, {
    createdAt: now,
    status: 'PROCESSING',
  });

  return {
    isDuplicate: false,
    markCompleted: (responsePayload?: any) => {
      idempotencyStore.set(compositeKey, {
        createdAt: now,
        status: 'COMPLETED',
        responsePayload,
      });
    },
    release: () => {
      idempotencyStore.delete(compositeKey);
    },
  };
}

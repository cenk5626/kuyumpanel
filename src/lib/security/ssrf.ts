import { SECURITY_CONFIG } from '@/constants/security';

/**
 * Verilen URL'in izin verilen güvenli harici servisler listesinde olup olmadığını doğrular (SSRF Koruması).
 */
export function isUrlAllowed(urlString: string): boolean {
  if (!urlString || typeof urlString !== 'string') return false;

  try {
    const parsed = new URL(urlString);

    // Geliştirme ortamı dışında HTTP engellenir
    if (parsed.protocol !== 'https:' && parsed.hostname !== 'localhost' && parsed.hostname !== '127.0.0.1') {
      return false;
    }

    const host = parsed.hostname.toLowerCase();

    // Özel IP aralıklarını ve metadata servislerini doğrudan engelle (169.254.169.254, 10.x, 192.168.x vb.)
    if (
      host === '169.254.169.254' ||
      host.startsWith('10.') ||
      host.startsWith('192.168.') ||
      host.startsWith('172.16.')
    ) {
      return false;
    }

    // İzinli alan adları kontrolü
    const isAllowed = SECURITY_CONFIG.ALLOWED_EXTERNAL_DOMAINS.some(
      (domain) => host === domain || host.endsWith(`.${domain}`)
    );

    return isAllowed;
  } catch {
    return false;
  }
}

/**
 * SSRF korumalı güvenli fetch fonksiyonu.
 */
export async function safeFetch(
  urlString: string,
  init?: RequestInit,
  timeoutMs: number = 8000
): Promise<Response> {
  if (!isUrlAllowed(urlString)) {
    throw new Error(`[SSRF Blocked] Request to untrusted domain rejected: ${urlString}`);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(urlString, {
      ...init,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

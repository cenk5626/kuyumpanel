import WebSocket from 'ws';
import { ALTIS_WS_URL } from '@/constants/prices';

export interface AltisRawPrice {
  Code: string;
  Bid: number;
  Ask: number;
}

/**
 * Node.js sunucu tarafında Altis WebSocket'e 1.5 saniye bağlanıp en güncel fiyatları çeker.
 * Vercel / HTTPS ortamında tarayıcı engeline taktırmadan sunucudan veri almayı sağlar.
 */
export async function fetchAltisPricesServer(): Promise<Record<string, { bid: number; ask: number }>> {
  return new Promise((resolve) => {
    const result: Record<string, { bid: number; ask: number }> = {};
    let resolved = false;

    const finish = () => {
      if (!resolved) {
        resolved = true;
        try { ws.close(); } catch {}
        resolve(result);
      }
    };

    const timeout = setTimeout(finish, 1800);

    const ws = new WebSocket(ALTIS_WS_URL);

    ws.on('open', () => {
      // Bağlantı sağlandı, mesaj bekleniyor
    });

    ws.on('message', (data) => {
      try {
        const parsed = JSON.parse(data.toString());
        if (Array.isArray(parsed)) {
          parsed.forEach((item: AltisRawPrice) => {
            if (item.Code && typeof item.Bid === 'number' && typeof item.Ask === 'number') {
              if (item.Bid > 0 && item.Ask > 0) {
                result[item.Code] = { bid: item.Bid, ask: item.Ask };
              }
            }
          });
        }
      } catch (e) {}

      // Veri çekildiyse süreyi beklemeden tamamla
      if (Object.keys(result).length > 0) {
        clearTimeout(timeout);
        finish();
      }
    });

    ws.on('error', () => {
      clearTimeout(timeout);
      finish();
    });
  });
}

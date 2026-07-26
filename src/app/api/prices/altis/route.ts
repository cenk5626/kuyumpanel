import { NextResponse } from 'next/server';
import { fetchAltisPricesServer } from '@/lib/altis-server';

/**
 * GET /api/prices/altis — Node.js sunucu tarafında Altis ws://5.250.255.86:17356 adresine bağlanır,
 * canlı Altis fiyat verilerini çeker ve JSON olarak ön yüze aktarır.
 */
export async function GET() {
  try {
    const data = await fetchAltisPricesServer();
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || String(error) }, { status: 500 });
  }
}

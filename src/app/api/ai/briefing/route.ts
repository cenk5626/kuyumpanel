import { NextResponse } from 'next/server';
import { getAuthenticatedContext } from '@/lib/security/auth-context';
import { generateAiResponse } from '@/lib/ai-engine';
import { sendWhatsAppNotification } from '@/lib/whatsapp-sender';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const ctx = await getAuthenticatedContext();
    const dealerId = ctx.dealerId;

    const body = await req.json().catch(() => ({}));
    const { sendToWhatsApp, targetPhone } = body;

    const briefingPrompt = [
      {
        role: 'user' as const,
        content: `Lütfen mağazam için detaylı bir "Yönetim & Patron Brifingi" hazırla.
Rapor şu bölümleri içersin:
1. 📊 Genel Finansal Durum & Canlı Net Varlıklar (Kasa, Alacaklar, Borçlar)
2. 💎 Vitrin & Stok Sağlığı (Azalan ürünler, Kritik stok ikazları)
3. ⚠️ Borç-Alacak & Tahsilat Risk Analizi (Vadesi yaklaşanlar, Has altın riskleri)
4. 💡 Bu Hafta İçin 3 Kritik Aksiyon & Kârlılık Önerisi`,
      },
    ];

    const briefingText = await generateAiResponse(dealerId, briefingPrompt);

    let whatsappResult = null;
    if (sendToWhatsApp) {
      whatsappResult = await sendWhatsAppNotification(dealerId, targetPhone, briefingText);
    }

    return NextResponse.json({
      briefing: briefingText,
      whatsappResult,
    });
  } catch (error: any) {
    console.error('[AI Briefing Error]:', error);
    return NextResponse.json({
      error: error?.message || 'Brifing oluşturulamadı.',
    }, { status: error?.statusCode || 500 });
  }
}


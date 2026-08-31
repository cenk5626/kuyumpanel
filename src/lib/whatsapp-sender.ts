import { prisma } from './prisma';
import { buildWhatsAppLink } from './whatsapp';

export interface WhatsAppSendResult {
  success: boolean;
  provider: 'WEB_INTENT' | 'GATEWAY';
  webLink?: string;
  messageId?: string;
  error?: string;
}

/**
 * Bayinin tanımladığı WhatsApp sağlayıcısına göre mesajı iletir:
 * 1. WEB_INTENT (wa.me Doğrudan Cihaz Linki - Ücretsiz & Sıfır Kurulum)
 * 2. GATEWAY (QR Kod ile Mağaza Numarasını Eşleme - UltraMsg / GreenAPI ile Arka Planda Otomatik Gönderim)
 */
export async function sendWhatsAppNotification(
  dealerId: string,
  targetPhone: string,
  messageText: string
): Promise<WhatsAppSendResult> {
  const dealer = await prisma.dealer.findUnique({
    where: { id: dealerId },
    select: {
      whatsappProvider: true,
      whatsappPhone: true,
      waGatewayInstanceId: true,
      waGatewayToken: true,
    },
  });

  const provider = (dealer?.whatsappProvider === 'GATEWAY' ? 'GATEWAY' : 'WEB_INTENT') as 'WEB_INTENT' | 'GATEWAY';
  const recipientPhone = targetPhone || dealer?.whatsappPhone;

  if (!recipientPhone) {
    return {
      success: false,
      provider: 'WEB_INTENT',
      error: 'Hedef telefon numarası belirtilmedi.',
    };
  }

  // 1. WEB INTENT (wa.me Doğrudan Cihaz / Web Linki - %100 Ücretsiz)
  if (provider === 'WEB_INTENT') {
    const webLink = buildWhatsAppLink(recipientPhone, messageText);
    return {
      success: true,
      provider: 'WEB_INTENT',
      webLink,
    };
  }

  // 2. QR KOD GATEWAY (UltraMsg / GreenAPI ile Mağaza Numarasından Otomatik Gönderim)
  if (provider === 'GATEWAY') {
    if (!dealer?.waGatewayInstanceId || !dealer?.waGatewayToken) {
      const webLink = buildWhatsAppLink(recipientPhone, messageText);
      return {
        success: true,
        provider: 'WEB_INTENT',
        webLink,
        error: 'QR Gateway anahtarları eksik, tarayıcı linki oluşturuldu.',
      };
    }

    try {
      const cleanPhone = recipientPhone.replace(/\D/g, '');
      const formattedPhone = cleanPhone.startsWith('90') ? cleanPhone : `90${cleanPhone.replace(/^0/, '')}`;

      // UltraMsg / GreenAPI REST standardı
      const res = await fetch(`https://api.ultramsg.com/${dealer.waGatewayInstanceId}/messages/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          token: dealer.waGatewayToken,
          to: formattedPhone,
          body: messageText,
        }),
      });

      if (!res.ok) {
        throw new Error(`Gateway sunucu hatası (${res.status})`);
      }

      const resData = await res.json();
      return {
        success: true,
        provider: 'GATEWAY',
        messageId: resData?.id,
      };
    } catch (err: any) {
      const webLink = buildWhatsAppLink(recipientPhone, messageText);
      return {
        success: false,
        provider: 'GATEWAY',
        webLink,
        error: err.message,
      };
    }
  }

  const webLink = buildWhatsAppLink(recipientPhone, messageText);
  return {
    success: true,
    provider: 'WEB_INTENT',
    webLink,
  };
}


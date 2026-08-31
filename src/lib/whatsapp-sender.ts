import { prisma } from './prisma';
import { buildWhatsAppLink } from './whatsapp';

export interface WhatsAppSendResult {
  success: boolean;
  provider: 'WEB_INTENT' | 'CLOUD_API' | 'GATEWAY';
  webLink?: string;
  messageId?: string;
  error?: string;
}

/**
 * Bayinin tanımladığı WhatsApp sağlayıcısına göre mesajı iletir.
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
      waCloudAccessToken: true,
      waCloudPhoneId: true,
      waGatewayInstanceId: true,
      waGatewayToken: true,
    },
  });

  const provider = (dealer?.whatsappProvider || 'WEB_INTENT').toUpperCase() as 'WEB_INTENT' | 'CLOUD_API' | 'GATEWAY';
  const recipientPhone = targetPhone || dealer?.whatsappPhone;

  if (!recipientPhone) {
    return {
      success: false,
      provider: 'WEB_INTENT',
      error: 'Hedef telefon numarası belirtilmedi.',
    };
  }

  // 1. WEB INTENT (wa.me Linki)
  if (provider === 'WEB_INTENT') {
    const webLink = buildWhatsAppLink(recipientPhone, messageText);
    return {
      success: true,
      provider: 'WEB_INTENT',
      webLink,
    };
  }

  // 2. META CLOUD API
  if (provider === 'CLOUD_API') {
    if (!dealer?.waCloudAccessToken || !dealer?.waCloudPhoneId) {
      // Bilgiler eksikse güvenli geri dönüş olarak webLink üret
      const webLink = buildWhatsAppLink(recipientPhone, messageText);
      return {
        success: true,
        provider: 'WEB_INTENT',
        webLink,
        error: 'Meta Cloud API anahtarları eksik, tarayıcı linki oluşturuldu.',
      };
    }

    try {
      const cleanPhone = recipientPhone.replace(/\D/g, '');
      const formattedPhone = cleanPhone.startsWith('90') ? cleanPhone : `90${cleanPhone.replace(/^0/, '')}`;

      const res = await fetch(`https://graph.facebook.com/v22.0/${dealer.waCloudPhoneId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${dealer.waCloudAccessToken}`,
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: formattedPhone,
          type: 'text',
          text: { body: messageText },
        }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson?.error?.message || 'Meta API gönderim hatası.');
      }

      const resData = await res.json();
      return {
        success: true,
        provider: 'CLOUD_API',
        messageId: resData?.messages?.[0]?.id,
      };
    } catch (err: any) {
      const webLink = buildWhatsAppLink(recipientPhone, messageText);
      return {
        success: false,
        provider: 'CLOUD_API',
        webLink,
        error: err.message,
      };
    }
  }

  // 3. QR GATEWAY (GreenAPI / UltraMsg)
  if (provider === 'GATEWAY') {
    if (!dealer?.waGatewayInstanceId || !dealer?.waGatewayToken) {
      const webLink = buildWhatsAppLink(recipientPhone, messageText);
      return {
        success: true,
        provider: 'WEB_INTENT',
        webLink,
        error: 'Gateway anahtarları eksik, tarayıcı linki oluşturuldu.',
      };
    }

    try {
      const cleanPhone = recipientPhone.replace(/\D/g, '');
      const formattedPhone = cleanPhone.startsWith('90') ? cleanPhone : `90${cleanPhone.replace(/^0/, '')}`;

      // UltraMsg REST endpoint standardı
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

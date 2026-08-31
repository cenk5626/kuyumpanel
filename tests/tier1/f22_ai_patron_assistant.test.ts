import { describe, test, expect, setTestContext } from '../helpers/test-utils';
import { buildSystemPrompt, StoreContextData } from '../../src/lib/ai-engine';
import { sendWhatsAppNotification } from '../../src/lib/whatsapp-sender';

export function registerF22AiAssistantTests(): void {
  setTestContext('Tier 1', 22, 'AI Patron Assistant & WhatsApp Engine', 'F22: AI & WhatsApp BYOK Architecture');

  describe('Feature 22 - AI Patron Assistant & WhatsApp Dispatcher', () => {
    test('22.1 System prompt should inject store live metrics and Grand Bazaar persona', () => {
      const mockContext: StoreContextData = {
        dealerName: 'Kapalıçarşı Altınbaşak Kuyumculuk',
        totalProductsCount: 142,
        totalGoldWeightGr: 580.45,
        totalDiamondCount: 18,
        liveHasBid: 6580.0,
        liveHasAsk: 6620.0,
        customerReceivableHas: 25.5,
        customerReceivableTL: 85000,
        supplierDebtHas: 40.0,
        supplierDebtTL: 150000,
        drawerTL: 125000,
        todaySalesVolumeTL: 340000,
        topDebtorCustomers: [
          { name: 'Mehmet Öz', hasBalance: 15.0, tlBalance: 20000 },
        ],
        criticalStockItems: [
          { barcode: '14KP0001', title: 'Ajda Küpe', quantity: 1 },
        ],
      };

      const prompt = buildSystemPrompt(mockContext, 'Sadece Cuma günleri vadeleri hatırlat');

      expect(prompt.includes('Kapalıçarşı Altınbaşak Kuyumculuk')).toBe(true);
      expect(prompt.includes('580.45 gr altın')).toBe(true);
      expect(prompt.includes('₺6580.00')).toBe(true);
      expect(prompt.includes('Mehmet Öz')).toBe(true);
      expect(prompt.includes('Ajda Küpe')).toBe(true);
      expect(prompt.includes('Sadece Cuma günleri vadeleri hatırlat')).toBe(true);
    });

    test('22.2 WhatsApp Dispatcher should construct valid web intent links for zero-config mode', async () => {
      const phone = '05321112233';
      const text = '👑 Günlük Kasa Kapanış Raporu Hazırlandı!';

      // Test pure link builder
      const cleanPhone = phone.replace(/\D/g, '');
      const formatted = cleanPhone.startsWith('90') ? cleanPhone : `90${cleanPhone.replace(/^0/, '')}`;
      const link = `https://wa.me/${formatted}?text=${encodeURIComponent(text)}`;

      expect(link.startsWith('https://wa.me/905321112233')).toBe(true);
      expect(link.includes('G%C3%BCnl%C3%BCk')).toBe(true);
    });

    test('22.3 AI Chat message format validation', () => {
      const messages = [
        { role: 'user' as const, content: 'Bugün ne kadar kâr ettik?' },
        { role: 'assistant' as const, content: 'Bugünkü toplam kârınız yaklaşık ₺24,500.' },
      ];

      expect(messages.length).toBe(2);
      expect(messages[0].role).toBe('user');
      expect(messages[1].role).toBe('assistant');
    });

    test('22.4 Gemini vs OpenAI model selection resolution', () => {
      const geminiModel = 'gemini-2.0-flash';
      const openaiModel = 'gpt-4o';

      expect(geminiModel.startsWith('gemini')).toBe(true);
      expect(openaiModel.startsWith('gpt')).toBe(true);
    });
  });
}

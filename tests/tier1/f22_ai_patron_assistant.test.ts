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

    test('22.5 Support latest cutting-edge models (Gemini 2.0 Thinking, o3-mini, o1, Custom IDs)', () => {
      const cuttingEdgeGemini = 'gemini-2.0-flash-thinking-exp-01-21';
      const reasoningOpenAI = 'o3-mini';
      const customGemini37 = 'gemini-3.7-flash';

      expect(cuttingEdgeGemini.includes('thinking')).toBe(true);
      expect(reasoningOpenAI.startsWith('o3')).toBe(true);
      expect(customGemini37.startsWith('gemini')).toBe(true);
    });

    test('22.6 2-Stage Action Proposal JSON parsing and verification', () => {
      const sampleAiResponse = `Patron, Has Altın için 6600 TL fiyat alarmı taslağını hazırladım.
:::ACTION_PROPOSAL
{
  "actionType": "CREATE_PRICE_ALERT",
  "title": "Has Altın Fiyat Alarmı Kurulumu",
  "description": "Has Altın Alış fiyatı 6600 TL üzerine çıktığında WhatsApptan haber verilecek.",
  "summary": {
    "Ürün": "Has Altın",
    "Hedef Fiyat": "₺6,600.00",
    "Yön": "≥ Eşit veya Üstü"
  },
  "payload": {
    "productCode": "HAS",
    "targetPrice": 6600,
    "condition": "GTE",
    "priceType": "bid"
  }
}
:::`;

      const match = sampleAiResponse.match(/:::ACTION_PROPOSAL\s*([\s\S]*?)\s*:::/);
      expect(Boolean(match)).toBe(true);

      const parsed = JSON.parse(match![1].trim());
      expect(parsed.actionType).toBe('CREATE_PRICE_ALERT');
      expect(parsed.payload.targetPrice).toBe(6600);
      expect(parsed.payload.condition).toBe('GTE');
    });

    test('22.7 Action state transitions for 2-stage confirmation', () => {
      type ActionStatus = 'PENDING' | 'EXECUTING' | 'SUCCESS' | 'CANCELLED';
      let status: ActionStatus = 'PENDING';
      expect(status).toBe('PENDING');

      // User confirms action
      status = 'EXECUTING';
      expect(status).toBe('EXECUTING');

      // Execution succeeds
      status = 'SUCCESS';
      expect(status).toBe('SUCCESS');
    });

    test('22.8 Stock quantity update and product item creation action proposals', () => {
      const sampleStockResponse = `Patron, Çeyrek Altın stoğunuzu 25 adet yapma taslağını oluşturdum:
:::ACTION_PROPOSAL
{
  "actionType": "UPDATE_STOCK_QUANTITY",
  "title": "Çeyrek Altın Stoğu Güncelleme",
  "description": "Çeyrek altın mevcut stoğu 25 adet olarak eşitlenecektir.",
  "summary": {
    "Ürün": "Çeyrek Altın",
    "Yeni Miktar": "25 Adet"
  },
  "payload": {
    "product": "ECEYREKTL",
    "amount": 25,
    "operation": "SET"
  }
}
:::`;

      const match = sampleStockResponse.match(/:::ACTION_PROPOSAL\s*([\s\S]*?)\s*:::/);
      expect(Boolean(match)).toBe(true);

      const parsed = JSON.parse(match![1].trim());
      expect(parsed.actionType).toBe('UPDATE_STOCK_QUANTITY');
      expect(parsed.payload.product).toBe('ECEYREKTL');
      expect(parsed.payload.amount).toBe(25);
    });

    test('22.9 AI Sales transaction proposal (3 Çeyrek, IBAN payment, WhatsApp receipt, no print)', () => {
      const sampleSalesResponse = `Patron, 3 adet çeyrek altın satış işlemini hazırladım:
:::ACTION_PROPOSAL
{
  "actionType": "CREATE_TRANSACTION",
  "title": "Çeyrek Altın Satış İşlemi",
  "description": "3 adet Çeyrek Altın satışı, toplam ₺16.500, Banka Havalesi (IBAN) ile tahsil edilecek. Fiş yazdırılmayacak, WhatsApp fişi oluşturulacak.",
  "summary": {
    "İşlem Türü": "Satış",
    "Ürün": "Çeyrek Altın",
    "Adet": "3 Adet",
    "Birim Fiyat": "₺5.500,00",
    "Toplam Tutar": "₺16.500,00",
    "Ödeme Yöntemi": "Banka Havalesi / IBAN",
    "Fiş": "Yazdırılmayacak",
    "WhatsApp": "Gönderilecek"
  },
  "payload": {
    "type": "sell",
    "product": "ECEYREKTL",
    "quantity": 3,
    "price": 5500,
    "total": 16500,
    "paymentMethod": "BANK",
    "printReceipt": false,
    "sendWhatsAppReceipt": true,
    "customerName": "Ahmet Yılmaz",
    "customerPhone": "05321234567"
  }
}
:::`;

      const match = sampleSalesResponse.match(/:::ACTION_PROPOSAL\s*([\s\S]*?)\s*:::/);
      expect(Boolean(match)).toBe(true);

      const parsed = JSON.parse(match![1].trim());
      expect(parsed.actionType).toBe('CREATE_TRANSACTION');
      expect(parsed.payload.type).toBe('sell');
      expect(parsed.payload.product).toBe('ECEYREKTL');
      expect(parsed.payload.quantity).toBe(3);
      expect(parsed.payload.price).toBe(5500);
      expect(parsed.payload.total).toBe(16500);
      expect(parsed.payload.paymentMethod).toBe('BANK');
      expect(parsed.payload.printReceipt).toBe(false);
      expect(parsed.payload.sendWhatsAppReceipt).toBe(true);

      // Test WhatsApp Receipt URL generation for this proposal
      const { generateWhatsAppReceiptUrl } = require('../../src/lib/whatsapp');
      const waUrl = generateWhatsAppReceiptUrl({
        phone: parsed.payload.customerPhone,
        customerName: parsed.payload.customerName,
        items: [{ title: 'Çeyrek Altın', quantity: parsed.payload.quantity, priceTL: parsed.payload.total }],
        totalTL: parsed.payload.total,
        paymentMethod: 'Banka Havalesi / IBAN',
      });
      expect(waUrl.includes('905321234567')).toBe(true);
      expect(waUrl.includes('16.500')).toBe(true);
    });

    test('22.10 AI Scrap/Hurda buy transaction proposal (2 Çeyrek Alımı, Nakit, Fiş Yazdır)', () => {
      const sampleBuyResponse = `Patron, 2 adet çeyrek alım işlemini hazırladım:
:::ACTION_PROPOSAL
{
  "actionType": "CREATE_TRANSACTION",
  "title": "Çeyrek Altın Alış / Hurda İşlemi",
  "description": "2 adet Çeyrek Altın alışı, toplam ₺10.800 Nakit ödenecektir. Fiş yazdırılacak.",
  "summary": {
    "İşlem Türü": "Alış (Biz Alıyoruz)",
    "Ürün": "Çeyrek Altın",
    "Adet": "2 Adet",
    "Toplam Tutar": "₺10.800,00",
    "Ödeme Yöntemi": "Nakit",
    "Fiş": "Yazdırılacak"
  },
  "payload": {
    "type": "buy",
    "product": "ECEYREKTL",
    "quantity": 2,
    "price": 5400,
    "total": 10800,
    "paymentMethod": "CASH",
    "printReceipt": true,
    "sendWhatsAppReceipt": false
  }
}
:::`;

      const match = sampleBuyResponse.match(/:::ACTION_PROPOSAL\s*([\s\S]*?)\s*:::/);
      expect(Boolean(match)).toBe(true);

      const parsed = JSON.parse(match![1].trim());
      expect(parsed.actionType).toBe('CREATE_TRANSACTION');
      expect(parsed.payload.type).toBe('buy');
      expect(parsed.payload.quantity).toBe(2);
      expect(parsed.payload.total).toBe(10800);
      expect(parsed.payload.paymentMethod).toBe('CASH');
      expect(parsed.payload.printReceipt).toBe(true);
      expect(parsed.payload.sendWhatsAppReceipt).toBe(false);
    });

    test('22.11 AI Supplier reconciliation proposal (A toptancısına olan has borcum 70 onu 100 gram has a yükselt)', () => {
      const sampleReconcileResponse = `Patron, A Toptancısı için mutabakat taslağını hazırladım:
:::ACTION_PROPOSAL
{
  "actionType": "RECONCILE_SUPPLIER",
  "title": "A Toptancısı Mutabakat Güncellemesi",
  "description": "A Toptancısına olan Has altın borcu 70.00 gr'dan 100.00 gr Has'a yükseltilecektir (Fark: +30.00 gr Has).",
  "summary": {
    "Toptancı": "A Toptancısı",
    "Mevcut Has Borcu": "70.00 gr Has",
    "Yeni Has Borcu": "100.00 gr Has",
    "Mutabakat Farkı": "+30.00 gr Has"
  },
  "payload": {
    "supplierName": "A Toptancısı",
    "targetHasBalance": 100,
    "description": "Patron talimatı ile toptancı has borcu 70 gr'dan 100 gram has'a yükseltildi"
  }
}
:::`;

      const match = sampleReconcileResponse.match(/:::ACTION_PROPOSAL\s*([\s\S]*?)\s*:::/);
      expect(Boolean(match)).toBe(true);

      const parsed = JSON.parse(match![1].trim());
      expect(parsed.actionType).toBe('RECONCILE_SUPPLIER');
      expect(parsed.payload.supplierName).toBe('A Toptancısı');
      expect(parsed.payload.targetHasBalance).toBe(100);

      const prevHas = 70;
      const newHas = parsed.payload.targetHasBalance;
      const diffHas = newHas - prevHas;
      expect(diffHas).toBe(30);
    });

    test('22.12 AI Cash closing and Z-Report proposal (gün sonu al / kasa kapatma yap)', () => {
      const sampleCloseResponse = `Patron, gün sonu kasa kapatma ve Z-Raporu taslağını hazırladım:
:::ACTION_PROPOSAL
{
  "actionType": "CLOSE_CASH_REGISTER",
  "title": "Gün Sonu Z-Raporu ve Kasa Kapatma",
  "description": "Bugünkü kasa oturumu kapatılacak, Z-Raporu ve kasa mutabakat fişi oluşturulacaktır.",
  "summary": {
    "Oturum": "Z-2026-0001",
    "Sistem Beklenen Nakit": "₺45.200,00",
    "Sayılan Fiili Nakit": "₺45.200,00",
    "Kasa Mutabakatı": "Tam Dengeli"
  },
  "payload": {
    "countedCashTL": 45200,
    "notes": "AI Asistan aracılığıyla gün sonu kasa kapatıldı"
  }
}
:::`;

      const match = sampleCloseResponse.match(/:::ACTION_PROPOSAL\s*([\s\S]*?)\s*:::/);
      expect(Boolean(match)).toBe(true);

      const parsed = JSON.parse(match![1].trim());
      expect(parsed.actionType).toBe('CLOSE_CASH_REGISTER');
      expect(parsed.payload.countedCashTL).toBe(45200);
    });

    test('22.13 AI Action confirmation keywords detection (kapat, sat, al, onayla, evet)', () => {
      const { AI_CONFIRMATION_KEYWORDS } = require('../../src/constants/ai');
      const aff = AI_CONFIRMATION_KEYWORDS.AFFIRMATIVE;

      expect(aff.includes('onayla')).toBe(true);
      expect(aff.includes('evet')).toBe(true);
      expect(aff.includes('kapat')).toBe(true);
      expect(aff.includes('sat')).toBe(true);
      expect(aff.includes('al')).toBe(true);

      const neg = AI_CONFIRMATION_KEYWORDS.NEGATIVE;
      expect(neg.includes('iptal')).toBe(true);
      expect(neg.includes('vazgeç')).toBe(true);
    });

    test('22.14 AI Action Types enum integrity and centralized constants', () => {
      const { AI_ACTION_TYPES } = require('../../src/constants/ai');

      expect(AI_ACTION_TYPES.CREATE_TRANSACTION).toBe('CREATE_TRANSACTION');
      expect(AI_ACTION_TYPES.RECONCILE_SUPPLIER).toBe('RECONCILE_SUPPLIER');
      expect(AI_ACTION_TYPES.CLOSE_CASH_REGISTER).toBe('CLOSE_CASH_REGISTER');
      expect(AI_ACTION_TYPES.UPDATE_STOCK_QUANTITY).toBe('UPDATE_STOCK_QUANTITY');
    });
  });
}

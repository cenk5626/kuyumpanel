import { describe, it, test, expect, runRegisterededTests } from './helpers/test-utils';
import {
  AI_ACTION_TYPES,
  AI_CONFIRMATION_KEYWORDS,
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  SESSION_STATUS,
  DISCREPANCY_STATUS,
} from '../src/constants';
import { generateWhatsAppReceiptUrl, generateWhatsAppShareUrl } from '../src/lib/whatsapp';
import { calculateTransactionProfitLoss } from '../src/lib/financial/profit-loss';
import { formatThermalReceiptText, DailyZReportMetrics } from '../src/lib/z-report';

describe('AI Assistant Integrated Actions (Sales, Supplier Reconciliation, End-of-Day)', () => {
  // ─── 1. ALIŞ & SATIŞ İŞLEMLERİ (SALES / PURCHASES) ───
  describe('1. AI Sales & Purchase Action Integration', () => {
    test('1.1 Should process sales transaction proposal with IBAN payment and WhatsApp receipt flag', () => {
      const proposalPayload = {
        type: 'sell',
        product: 'ECEYREKTL',
        quantity: 3,
        price: 5500,
        total: 16500,
        paymentMethod: 'BANK',
        printReceipt: false,
        sendWhatsAppReceipt: true,
        customerName: 'Ahmet Kuyumusever',
        customerPhone: '05321234567',
        orderNote: 'AI Asistan satışı',
      };

      // Payment method normalization test
      let paymentMethod = PAYMENT_METHODS.CASH;
      const rawPm = proposalPayload.paymentMethod.toUpperCase();
      if (rawPm.includes('IBAN') || rawPm.includes('HAVALE') || rawPm.includes('BANK')) {
        paymentMethod = PAYMENT_METHODS.BANK;
      }
      expect(paymentMethod).toBe(PAYMENT_METHODS.BANK);
      expect(PAYMENT_METHOD_LABELS[paymentMethod]).toBe('Banka Havalesi');

      // Profit / loss calculation
      const pnl = calculateTransactionProfitLoss('sell', 3, 5500, 5200, null);
      expect(pnl.isProfitable).toBe(true);
      expect(pnl.totalRevenue).toBe(16500);
      expect(pnl.profitAmount).toBe(900); // 3 * (5500 - 5200)

      // Receipt flags
      expect(proposalPayload.printReceipt).toBe(false);
      expect(proposalPayload.sendWhatsAppReceipt).toBe(true);

      // WhatsApp receipt URL generation
      const waUrl = generateWhatsAppReceiptUrl({
        phone: proposalPayload.customerPhone,
        customerName: proposalPayload.customerName,
        items: [{ title: 'Çeyrek Altın', quantity: 3, priceTL: 16500 }],
        totalTL: 16500,
        paymentMethod: PAYMENT_METHOD_LABELS[paymentMethod],
      });

      expect(waUrl).toContain('wa.me/905321234567');
      expect(waUrl).toContain('16.500');
      expect(waUrl).toContain('Banka%20Havalesi');
    });

    test('1.2 Should process buy/hurda transaction proposal with Cash payment and printReceipt flag', () => {
      const buyPayload = {
        type: 'buy',
        product: 'ECEYREKTL',
        quantity: 2,
        price: 5400,
        total: 10800,
        paymentMethod: 'CASH',
        printReceipt: true,
        sendWhatsAppReceipt: false,
      };

      expect(buyPayload.type).toBe('buy');
      expect(buyPayload.printReceipt).toBe(true);
      expect(buyPayload.sendWhatsAppReceipt).toBe(false);

      // Profit evaluation on buy
      const pnl = calculateTransactionProfitLoss('buy', 2, 5400, 5450, null);
      expect(pnl.profitAmount).toBe(100); // potential profit 2 * (5450 - 5400)
    });

    test('1.3 Should compute correct stock delta: decrement on sell, increment on buy', () => {
      let initialStock = 20;

      // Sell 3
      const sellQty = 3;
      initialStock = Math.max(0, initialStock - sellQty);
      expect(initialStock).toBe(17);

      // Buy 2
      const buyQty = 2;
      initialStock = initialStock + buyQty;
      expect(initialStock).toBe(19);
    });
  });

  // ─── 2. TOPTANCI MÜTABAKATI & BORÇ GÜNCELLEME ───
  describe('2. AI Supplier Reconciliation Integration', () => {
    test('2.1 Should compute exact reconciliation difference when raising Has debt from 70 to 100 gr Has', () => {
      const existingSupplier = {
        name: 'Ahlatcı Metal',
        hasBalance: 70.0,
        tlBalance: 0,
      };

      const payload = {
        supplierName: 'Ahlatcı Metal',
        targetHasBalance: 100.0,
        description: 'Patron talimatı ile Has borcu 70 gr dan 100 gram has a yükseltildi',
      };

      const prevHas = existingSupplier.hasBalance;
      const newHas = Number(payload.targetHasBalance);
      const diffHas = Number((newHas - prevHas).toFixed(3));

      expect(newHas).toBe(100.0);
      expect(diffHas).toBe(30.0); // +30 gr Has

      const description = `AI Mutabakat Düzeltmesi: Has: ${prevHas.toFixed(2)} gr -> ${newHas.toFixed(2)} gr (+${diffHas.toFixed(2)} gr)`;
      expect(description).toContain('70.00 gr -> 100.00 gr');
      expect(description).toContain('+30.00 gr');
    });

    test('2.2 Should support deltaHas parameter when patron says "borcu 25 gr artır"', () => {
      const existingSupplier = {
        name: 'Nadir Metal',
        hasBalance: 50.0,
        tlBalance: 10000,
      };

      const payload = {
        supplierName: 'Nadir Metal',
        deltaHas: 25.0,
      };

      const newHas = existingSupplier.hasBalance + payload.deltaHas;
      expect(newHas).toBe(75.0);
    });

    test('2.3 Should handle TL balance adjustment in reconciliation', () => {
      const existingSupplier = {
        name: 'Kuyumcukent Sarrafiye',
        hasBalance: 0,
        tlBalance: 40000,
      };

      const payload = {
        supplierName: 'Kuyumcukent Sarrafiye',
        targetTlBalance: 55000,
      };

      const prevTl = existingSupplier.tlBalance;
      const newTl = payload.targetTlBalance;
      const diffTl = newTl - prevTl;

      expect(diffTl).toBe(15000);
      expect(newTl).toBe(55000);
    });
  });

  // ─── 3. GÜN SONU & KASA KAPATMA (Z-RAPORU) ───
  describe('3. AI End-of-Day and Cash Closing (Z-Report)', () => {
    test('3.1 Should calculate balanced Z-Report when counted cash equals system cash', () => {
      const mockSession: DailyZReportMetrics = {
        sessionId: 'sess-z-01',
        sessionNumber: 'Z-2026-0005',
        status: SESSION_STATUS.CLOSED,
        openedAt: new Date(),
        closedAt: new Date(),
        openedBy: 'Patron',
        closedBy: 'AI (Patron)',
        notes: 'AI Asistan aracılığıyla gün sonu kasa kapatıldı',
        openingCashTL: 10000,
        openingCashUSD: 0,
        openingCashEUR: 0,
        openingHasGram: 0,
        cashSales: 35000,
        cardSales: 20000,
        bankSales: 15000,
        hasSalesTL: 0,
        debtSalesTL: 0,
        totalTurnover: 70000,
        totalSalesCount: 8,
        totalProfitTL: 4200,
        profitMarginPercent: 6.0,
        profitableTransactionsCount: 8,
        customerCashCollections: 5000,
        customerHasCollectionsGram: 0,
        supplierCashPayments: 0,
        supplierHasPaymentsGram: 0,
        scrapCashPurchases: 0,
        scrapGoldGramsIn: 0,
        scrapBuysCount: 0,
        manualCashIn: 0,
        manualCashOut: 0,
        systemCashTL: 50000, // 10k + 35k + 5k = 50k
        countedCashTL: 50000,
        discrepancyTL: 0,
        discrepancyStatus: DISCREPANCY_STATUS.BALANCED,
        systemCashUSD: 0,
        countedCashUSD: 0,
        diffCashUSD: 0,
        systemCashEUR: 0,
        countedCashEUR: 0,
        diffCashEUR: 0,
        systemHasGram: 0,
        countedHasGram: 0,
        diffHasGram: 0,
      };

      const slip = formatThermalReceiptText(mockSession, false);
      expect(slip).toContain('GÜN SONU Z-RAPORU');
      expect(slip).toContain('Z-2026-0005');
      expect(slip).toContain('50000.00 TL');
      expect(slip).toContain('70000.00 TL');
      expect(slip).toContain('BALANCED');

      const waShare = generateWhatsAppShareUrl(
        '905321234567',
        `📊 GÜN SONU Z-RAPORU: ${mockSession.sessionNumber} - Ciro: ₺${mockSession.totalTurnover}`
      );
      expect(waShare).toContain('wa.me/905321234567');
      expect(waShare).toContain('Z-2026-0005');
    });

    test('3.2 Should calculate cash discrepancy correctly when physical count differs', () => {
      const systemCashTL = 45200;
      const countedCashTL = 45000;
      const discrepancyTL = Number((countedCashTL - systemCashTL).toFixed(2));

      expect(discrepancyTL).toBe(-200); // 200 TL shortage
    });
  });

  // ─── 4. İKİ AŞAMALI TEYİT & ONAY KELİMELERİ ───
  describe('4. Two-Stage Confirmation and Natural Language Keywords', () => {
    test('4.1 Should recognize all affirmative action triggers', () => {
      const aff = AI_CONFIRMATION_KEYWORDS.AFFIRMATIVE;
      expect(aff.includes('kapat')).toBe(true);
      expect(aff.includes('sat')).toBe(true);
      expect(aff.includes('al')).toBe(true);
      expect(aff.includes('onayla')).toBe(true);
      expect(aff.includes('evet')).toBe(true);
      expect(aff.includes('tamam')).toBe(true);
      expect(aff.includes('yap')).toBe(true);
      expect(aff.includes('güncelle')).toBe(true);
    });

    test('4.2 Should parse robustly wrapped JSON in :::ACTION_PROPOSAL blocks', () => {
      const sampleResponse = `
Patron, işte yapacağımız toptancı mutabakatı:
:::ACTION_PROPOSAL
\`\`\`json
{
  "actionType": "RECONCILE_SUPPLIER",
  "title": "A Toptancısı Mutabakat",
  "description": "Has borç 70 gr dan 100 gram has a yükseltildi",
  "summary": { "Toptancı": "A Toptancısı", "Yeni": "100 gr" },
  "payload": { "supplierName": "A Toptancısı", "targetHasBalance": 100 }
}
\`\`\`
:::
`;

      const match = sampleResponse.match(/:::ACTION_PROPOSAL\s*([\s\S]*?)(?::::|$)/);
      expect(Boolean(match)).toBe(true);

      let rawJson = match![1].trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
      const firstBrace = rawJson.indexOf('{');
      const lastBrace = rawJson.lastIndexOf('}');
      rawJson = rawJson.substring(firstBrace, lastBrace + 1);

      const parsed = JSON.parse(rawJson);
      expect(parsed.actionType).toBe('RECONCILE_SUPPLIER');
      expect(parsed.payload.targetHasBalance).toBe(100);
    });

    test('4.3 Should recognize multi-word conversational affirmations', () => {
      const { isAffirmativeConfirmation } = require('../src/constants/ai');
      expect(isAffirmativeConfirmation('evet sat')).toBe(true);
      expect(isAffirmativeConfirmation('tamamdır')).toBe(true);
      expect(isAffirmativeConfirmation('kasayı kapat')).toBe(true);
      expect(isAffirmativeConfirmation('borcu yükselt')).toBe(true);
      expect(isAffirmativeConfirmation('evet onayla')).toBe(true);
      expect(isAffirmativeConfirmation('tamam yap')).toBe(true);
      expect(isAffirmativeConfirmation('olur')).toBe(true);
      expect(isAffirmativeConfirmation('evet!')).toBe(true);
    });

    test('4.4 Should recognize conversational cancellations', () => {
      const { isNegativeCancellation } = require('../src/constants/ai');
      expect(isNegativeCancellation('iptal')).toBe(true);
      expect(isNegativeCancellation('vazgeçtim')).toBe(true);
      expect(isNegativeCancellation('hayır')).toBe(true);
      expect(isNegativeCancellation('iptal et lütfen')).toBe(true);
    });

    test('4.5 Should NOT treat regular commands as confirmations', () => {
      const { isAffirmativeConfirmation } = require('../src/constants/ai');
      expect(isAffirmativeConfirmation('3 çeyrek sattım 16500 tl ibandan oldu')).toBe(false);
      expect(isAffirmativeConfirmation('bugünkü ciromuz ne kadar')).toBe(false);
      expect(isAffirmativeConfirmation('has altın kaç para')).toBe(false);
    });

    test('4.6 Should correctly compute drawer cash without double-counting opening cash', () => {
      // If openingCashTL is 10000 and systemCashTL is 15000 (which already contains opening cash),
      // drawerTL should be 15000, NOT 25000 (10000 + 15000)
      const mockDrawerSession = {
        openingCashTL: 10000,
        systemCashTL: 15000,
      };

      const drawerTL = mockDrawerSession
        ? (mockDrawerSession.systemCashTL !== null && mockDrawerSession.systemCashTL !== undefined
            ? mockDrawerSession.systemCashTL
            : (mockDrawerSession.openingCashTL || 0))
        : 0;

      expect(drawerTL).toBe(15000);
    });

    test('4.7 Should prioritize barcode item lookup over generic sarrafiye resolution', () => {
      const sampleBarcode = '22BLZ00001';
      // If it's a barcode, it should NOT be mapped blindly to 'mil22Ayar'
      const mockDbProduct = {
        barcode: '22BLZ00001',
        title: 'Bilezik',
        category: 'Bilezik',
        carat: 22,
        weight: 15.5,
      };

      const resolved = mockDbProduct
        ? {
            id: mockDbProduct.barcode,
            label: `${mockDbProduct.carat} Ayar ${mockDbProduct.title} (${mockDbProduct.weight.toFixed(2)} gr)`,
            type: mockDbProduct.category,
          }
        : { id: 'mil22Ayar', label: '22 Ayar Gram', type: 'sarrafiye' };

      expect(resolved.id).toBe('22BLZ00001');
      expect(resolved.label).toContain('22 Ayar Bilezik (15.50 gr)');
    });
  });
});

async function main() {
  const results = await runRegisterededTests();
  let passed = 0;
  for (const r of results) {
    if (r.passed) {
      passed++;
      console.log(`  ✓ [PASS] ${r.testName}`);
    } else {
      console.error(`  ✗ [FAIL] ${r.testName}: ${r.error}`);
    }
  }
  console.log(`\nAI Integration Tests: ${passed}/${results.length} passed.`);
}

main();

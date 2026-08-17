import { describe, it, test, expect, setTestContext } from '../helpers/test-utils';
import {
  validateAndProcessPosSale,
  consolidateCashSession,
  computeCustomerStatement,
  calculateTurnoverMetric,
  generateReorderDraft,
  generateKelebekZPL,
  buildWhatsAppSaleReceiptUrl,
  formatThermalZReportSlip,
  PosTransactionPayload,
  CashMovementInput,
  CustomerTransactionInput,
  TURNOVER_SPEEDS,
} from '../helpers/domain-engines';
import { PAYMENT_METHODS, CASH_MOVEMENT_TYPES, SESSION_STATUS } from '../../src/constants/kasa';
import { CUSTOMER_TRANSACTION_TYPES, ASSET_TYPES, calculateHasEquivalent } from '../../src/constants/cari';

export function registerTier3Tests() {
  setTestContext('Tier 3', 20, 'Cross-Feature Integration Combinations', 'Tier 3: Multi-Module Business Flows');

  describe('Tier 3 - Cross-Feature Integration Scenarios', () => {
    test('3.1 POS Sale with Mixed Card/Cash + Customer Veresiye + Stock Alert + WhatsApp Receipt', () => {
      // Step 1: Initial inventory state
      let stockAmount = 6;
      const minThreshold = 5;
      const spotRate = 3000;

      // Step 2: Sale of 2 items (Total = 60,000 TL)
      const salePayload: PosTransactionPayload = {
        saleTotalTL: 60000,
        customerId: 'cust-mehmet',
        payments: [
          { method: PAYMENT_METHODS.CASH, amount: 20000 },
          { method: PAYMENT_METHODS.CARD, amount: 20000 },
          { method: PAYMENT_METHODS.DEBT, amount: 20000 },
        ],
        items: [
          { barcode: '22BLZ001', title: '22K Burma Bilezik', quantity: 2, unitPriceTL: 30000 },
        ],
      };

      const posResult = validateAndProcessPosSale(salePayload);
      expect(posResult.isValid).toBe(true);
      expect(posResult.cashPortion).toBe(20000);
      expect(posResult.cardPortion).toBe(20000);
      expect(posResult.debtPortion).toBe(20000);

      // Step 3: Stock decrement and Critical Stock trigger
      stockAmount -= 2; // 6 - 2 = 4 <= 5 (Triggers critical alert!)
      expect(stockAmount).toBe(4);
      expect(stockAmount).toBeLessThanOrEqual(minThreshold);

      const reorderDraft = generateReorderDraft([
        { product: '22BLZ001', label: '22K Burma Bilezik', amount: stockAmount, minThreshold, supplierName: 'Ahlatçı' },
      ]);
      expect(reorderDraft.length).toBe(1);
      // Target = 10 -> Suggested = 10 - 4 = 6
      expect(reorderDraft[0].suggestedQuantity).toBe(6);

      // Step 4: Cash session update
      const sessionMovements: CashMovementInput[] = [
        { type: CASH_MOVEMENT_TYPES.POS_SALE, amount: posResult.cashPortion, currency: 'TL' },
        { type: CASH_MOVEMENT_TYPES.POS_SALE, amount: posResult.cardPortion, currency: 'CARD' },
      ];
      const session = consolidateCashSession('SESS-DAY1', '2026-08-17', 10000, sessionMovements, 30000);
      expect(session.cashSales).toBe(20000);
      expect(session.cardSales).toBe(20000);
      expect(session.expectedClosingCash).toBe(30000); // 10k opening + 20k cash sale

      // Step 5: Customer veresiye ledger update (20,000 TL debt converted to Gram Has at spot rate)
      const hasDebtEquivalent = calculateHasEquivalent('TL', posResult.debtPortion, spotRate);
      const customerTxs: CustomerTransactionInput[] = [
        {
          customerId: 'cust-mehmet',
          type: CUSTOMER_TRANSACTION_TYPES.BORC,
          assetType: ASSET_TYPES.HAS,
          amount: hasDebtEquivalent, // 20,000 / 3000 = 6.6667 gr Has
          unitPrice: spotRate,
          description: 'POS Satış Kalan Veresiye Bakiyesi',
        },
      ];
      const customerLedger = computeCustomerStatement(customerTxs, spotRate);
      expect(customerLedger.summary.hasBalance).toBeCloseTo(6.6667, 3);
      expect(customerLedger.summary.estimatedTotalTL).toBeCloseTo(20000, 0);

      // Step 6: WhatsApp receipt generation
      const waUrl = buildWhatsAppSaleReceiptUrl(
        '05321234567',
        'Mehmet Bey',
        [{ title: '22K Burma Bilezik (2 Adet)', carat: 22, weight: 20.0, priceTL: 60000 }],
        60000
      );
      expect(waUrl).toContain('https://wa.me/905321234567');
      expect(decodeURIComponent(waUrl)).toContain('60.000 TL');
    });

    test('3.2 Scrap Gold Buyout + Drawer Cash Outflow + Physical Scrap Inventory Inflow', () => {
      // Customer brings 15.20 gr 22K scrap gold
      const scrapWeight22K = 15.20;
      const scrapHasEquivalent = calculateHasEquivalent('22K', scrapWeight22K); // 15.20 * 0.916 = 13.9232 gr Has
      const scrapGramPrice = 2800; // Store buys scrap at 2800 TL/gr
      const totalCashPayout = scrapWeight22K * scrapGramPrice; // 42,560 TL

      // Cash register drawer outflow
      const movements: CashMovementInput[] = [
        {
          type: CASH_MOVEMENT_TYPES.SCRAP_BUY,
          amount: totalCashPayout,
          currency: 'TL',
          hasWeight: scrapHasEquivalent,
          description: 'Müşteri 22K Hurda Bilezik Alımı',
        },
      ];

      const openingCash = 50000;
      const session = consolidateCashSession('SESS-SCRAP', '2026-08-17', openingCash, movements, 7440);
      expect(session.scrapCashPurchases).toBe(42560);
      expect(session.scrapGoldGramsIn).toBeCloseTo(13.923, 2);
      expect(session.expectedClosingCash).toBe(7440); // 50,000 - 42,560 = 7,440 TL
      expect(session.discrepancy).toBe(0);
    });

    test('3.3 Customer Veresiye Collection + Cash Drawer Inflow + Customer Statement Settlement', () => {
      const spotRate = 3000;
      // Customer previously owes 10.0 gr Has gold
      const historyTxs: CustomerTransactionInput[] = [
        { customerId: 'cust-veli', type: CUSTOMER_TRANSACTION_TYPES.BORC, assetType: ASSET_TYPES.HAS, amount: 10.0, createdAt: '2026-08-01' },
      ];

      // Customer comes to pay 4.0 gr Has in Cash (4.0 * 3000 = 12,000 TL)
      const collectionTxs: CustomerTransactionInput[] = [
        ...historyTxs,
        {
          customerId: 'cust-veli',
          type: CUSTOMER_TRANSACTION_TYPES.TAHSILAT,
          assetType: ASSET_TYPES.HAS,
          amount: 4.0,
          unitPrice: spotRate,
          createdAt: '2026-08-17',
          description: 'Kısmi Has Borç Nakit Tahsilatı',
        },
      ];

      const ledger = computeCustomerStatement(collectionTxs, spotRate);
      expect(ledger.summary.hasBalance).toBe(6.0); // 10.0 - 4.0 = 6.0 gr Has remaining
      expect(ledger.summary.estimatedTotalTL).toBe(18000); // 6.0 * 3000 = 18,000 TL

      // Cash drawer receives 12,000 TL collection
      const movements: CashMovementInput[] = [
        { type: CASH_MOVEMENT_TYPES.CUSTOMER_COLLECTION, amount: 12000, currency: 'TL' },
      ];
      const session = consolidateCashSession('SESS-COLLECT', '2026-08-17', 5000, movements, 17000);
      expect(session.customerCashCollections).toBe(12000);
      expect(session.expectedClosingCash).toBe(17000);
    });

    test('3.4 Wholesale Supplier Delivery on Credit + Batch Kelebek Label Printing', () => {
      // Supplier delivers 5x 14K Rings (each 3.0 gr = 15.0 gr 14K -> 15 * 0.585 = 8.775 gr Has)
      const ringsDelivered = [
        { barcode: '14YZK101', title: '14K Baget Yüzük', carat: 14, weight: 3.0, priceTL: 10500 },
        { barcode: '14YZK102', title: '14K Baget Yüzük', carat: 14, weight: 3.0, priceTL: 10500 },
        { barcode: '14YZK103', title: '14K Baget Yüzük', carat: 14, weight: 3.0, priceTL: 10500 },
        { barcode: '14YZK104', title: '14K Baget Yüzük', carat: 14, weight: 3.0, priceTL: 10500 },
        { barcode: '14YZK105', title: '14K Baget Yüzük', carat: 14, weight: 3.0, priceTL: 10500 },
      ];

      // Generate batch ZPL labels for thermal printing
      const batchZpl = ringsDelivered.map(r => generateKelebekZPL(r, 203)).join('\n');
      const labelCount = (batchZpl.match(/\^XA/g) || []).length;
      expect(labelCount).toBe(5);
      expect(batchZpl).toContain('14YZK101');
      expect(batchZpl).toContain('14YZK105');

      // Check reorder draft after stock intake
      const updatedInventory = [
        { product: '14YZK', label: '14K Baget Yüzük', amount: 8, minThreshold: 5 }, // Now amount (8) > threshold (5)
      ];
      const draft = generateReorderDraft(updatedInventory);
      expect(draft.length).toBe(0); // Resolved!
    });

    test('3.5 End-of-Day Full Consolidation + Variance Check + Thermal Slip Generation', () => {
      const openingCash = 15000;
      const allDailyMovements: CashMovementInput[] = [
        { type: CASH_MOVEMENT_TYPES.POS_SALE, amount: 35000, currency: 'TL' },
        { type: CASH_MOVEMENT_TYPES.POS_SALE, amount: 45000, currency: 'CARD' },
        { type: CASH_MOVEMENT_TYPES.POS_SALE, amount: 20000, currency: 'BANK' },
        { type: CASH_MOVEMENT_TYPES.CUSTOMER_COLLECTION, amount: 15000, currency: 'TL' },
        { type: CASH_MOVEMENT_TYPES.SUPPLIER_PAYMENT, amount: 25000, currency: 'TL' },
        { type: CASH_MOVEMENT_TYPES.SCRAP_BUY, amount: 12000, currency: 'TL', hasWeight: 4.0 },
        { type: CASH_MOVEMENT_TYPES.MANUAL_OUT, amount: 1000, description: 'Yemek ve Gider' },
      ];

      // Expected Cash = 15,000 + 35,000 + 15,000 - 25,000 - 12,000 - 1,000 = 27,000 TL
      const actualCounted = 27000; // Exact count
      const sessionReport = consolidateCashSession('Z-REPORT-FULL', '2026-08-17 19:30', openingCash, allDailyMovements, actualCounted);

      expect(sessionReport.expectedClosingCash).toBe(27000);
      expect(sessionReport.actualClosingCash).toBe(27000);
      expect(sessionReport.discrepancy).toBe(0);
      expect(sessionReport.discrepancyStatus).toBe('BALANCED');
      expect(sessionReport.totalTurnover).toBe(100000); // 35k + 45k + 20k

      // Thermal Receipt Slip Generation
      const slip = formatThermalZReportSlip(sessionReport, false);
      expect(slip).toContain('GÜN SONU Z-RAPORU');
      expect(slip).toContain('100000.00 TL');
      expect(slip).toContain('27000.00 TL');
    });
  });
}

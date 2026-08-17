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
  CashMovementInput,
  CustomerTransactionInput,
  TURNOVER_SPEEDS,
} from '../helpers/domain-engines';
import { PAYMENT_METHODS, CASH_MOVEMENT_TYPES, SESSION_STATUS } from '../../src/constants/kasa';
import { CUSTOMER_TRANSACTION_TYPES, ASSET_TYPES, calculateHasEquivalent } from '../../src/constants/cari';

export function registerTier4Tests() {
  setTestContext('Tier 4', 20, 'Real-World Retail Day Simulation', 'Tier 4: Complete Chronological Day Simulation');

  describe('Tier 4 - Real-World Retail Day Operational Lifecycle Simulation', () => {
    // Shared State for the day
    const SIM_DATE = '2026-08-17';
    const SPOT_HAS_RATE = 3000; // 3000 TL/gr
    const OPENING_DRAWER_CASH = 20000; // 20,000 TL

    const dailyCashMovements: CashMovementInput[] = [];
    let inventoryState: Record<string, { label: string; amount: number; minThreshold: number; sales30Days: number; supplier: string }> = {
      '14KP_NECKLACE': { label: '14K Baget Kolye', amount: 8, minThreshold: 5, sales30Days: 25, supplier: 'Model Kuyum' },
      '22BLZ_BURMA': { label: '22K Adana Burma Bilezik', amount: 5, minThreshold: 4, sales30Days: 40, supplier: 'Ahlatçı Altın' },
      'ECEYREKTL': { label: 'Eski Çeyrek Altın', amount: 2, minThreshold: 10, sales30Days: 90, supplier: 'Darphane Kapalıçarşı' },
    };

    let customerAhmetHistory: CustomerTransactionInput[] = [];
    let customerFatmaHistory: CustomerTransactionInput[] = [
      {
        customerId: 'cust-fatma',
        type: CUSTOMER_TRANSACTION_TYPES.BORC,
        assetType: ASSET_TYPES.HAS,
        amount: 6.6667, // Previous debt
        createdAt: '2026-08-01T10:00:00Z',
      },
    ];

    test('Step 1 (09:00) — Morning Store Opening & Devir Kasası Initialization', () => {
      expect(OPENING_DRAWER_CASH).toBe(20000);
      const initialReport = consolidateCashSession('SESSION-20260817', SIM_DATE, OPENING_DRAWER_CASH, [], OPENING_DRAWER_CASH);
      expect(initialReport.openingCash).toBe(20000);
      expect(initialReport.expectedClosingCash).toBe(20000);
      expect(initialReport.discrepancy).toBe(0);
    });

    test('Step 2 (10:15) — First Retail Walk-in Customer Sale with Split Cash/Card Payment', () => {
      const sale = {
        saleTotalTL: 15000,
        payments: [
          { method: PAYMENT_METHODS.CASH, amount: 5000 },
          { method: PAYMENT_METHODS.CARD, amount: 10000 },
        ],
        items: [{ barcode: '14KP00101', title: '14K Baget Kolye', quantity: 1, unitPriceTL: 15000 }],
      };

      const res = validateAndProcessPosSale(sale);
      expect(res.isValid).toBe(true);
      expect(res.cashPortion).toBe(5000);
      expect(res.cardPortion).toBe(10000);

      // Record in cash movements
      dailyCashMovements.push({ type: CASH_MOVEMENT_TYPES.POS_SALE, amount: 5000, currency: 'TL' });
      dailyCashMovements.push({ type: CASH_MOVEMENT_TYPES.POS_SALE, amount: 10000, currency: 'CARD' });

      // Update inventory
      inventoryState['14KP_NECKLACE'].amount -= 1;
      inventoryState['14KP_NECKLACE'].sales30Days += 1;
      expect(inventoryState['14KP_NECKLACE'].amount).toBe(7);

      // Generate WhatsApp link
      const waLink = buildWhatsAppSaleReceiptUrl(
        '0532 111 22 33',
        'Ayşe Kaya',
        [{ title: '14K Baget Kolye', carat: 14, weight: 4.20, priceTL: 15000 }],
        15000,
        SIM_DATE
      );
      expect(waLink).toContain('https://wa.me/905321112233');
      expect(decodeURIComponent(waLink)).toContain('15.000 TL');
    });

    test('Step 3 (11:30) — Scrap Gold Exchange (Hurda Alış) with Drawer Cash Outflow', () => {
      const scrapWeight = 12.50; // 22K scrap
      const scrapHasEquivalent = calculateHasEquivalent('22K', scrapWeight); // 12.50 * 0.916 = 11.450 gr Has
      const scrapGramPrice = 2800;
      const payoutTL = scrapWeight * scrapGramPrice; // 35,000 TL

      expect(payoutTL).toBe(35000);
      expect(scrapHasEquivalent).toBeCloseTo(11.450, 3);

      // Drawer pays out 35,000 TL
      dailyCashMovements.push({
        type: CASH_MOVEMENT_TYPES.SCRAP_BUY,
        amount: payoutTL,
        currency: 'TL',
        hasWeight: scrapHasEquivalent,
        description: 'Kemal Bey 22K Hurda Bilezik Alımı',
      });
    });

    test('Step 4 (13:00) — VIP Customer Veresiye Sale with Gram Has Debt Conversion', () => {
      const vipSale = {
        saleTotalTL: 120000,
        customerId: 'cust-ahmet',
        payments: [
          { method: PAYMENT_METHODS.CASH, amount: 40000 },
          { method: PAYMENT_METHODS.BANK, amount: 30000 },
          { method: PAYMENT_METHODS.DEBT, amount: 50000 },
        ],
        items: [{ barcode: '22BLZ001', title: '22K Burma Bilezik', quantity: 2, unitPriceTL: 60000 }],
      };

      const res = validateAndProcessPosSale(vipSale);
      expect(res.isValid).toBe(true);
      expect(res.cashPortion).toBe(40000);
      expect(res.bankPortion).toBe(30000);
      expect(res.debtPortion).toBe(50000);

      dailyCashMovements.push({ type: CASH_MOVEMENT_TYPES.POS_SALE, amount: 40000, currency: 'TL' });
      dailyCashMovements.push({ type: CASH_MOVEMENT_TYPES.POS_SALE, amount: 30000, currency: 'BANK' });

      // Convert 50,000 TL debt to Has equivalent at spot rate (3000 TL/gr)
      const hasDebtAmount = calculateHasEquivalent('TL', 50000, SPOT_HAS_RATE); // 16.6667 gr Has
      customerAhmetHistory.push({
        customerId: 'cust-ahmet',
        type: CUSTOMER_TRANSACTION_TYPES.BORC,
        assetType: ASSET_TYPES.HAS,
        amount: hasDebtAmount,
        unitPrice: SPOT_HAS_RATE,
        description: '2x 22K Burma Bilezik Veresiye Kalanı',
        createdAt: '2026-08-17T13:00:00Z',
      });

      const ahmetStatement = computeCustomerStatement(customerAhmetHistory, SPOT_HAS_RATE);
      expect(ahmetStatement.summary.hasBalance).toBeCloseTo(16.6667, 3);
      expect(ahmetStatement.summary.estimatedTotalTL).toBeCloseTo(50000, 0);

      // Decrement Burma stock
      inventoryState['22BLZ_BURMA'].amount -= 2;
      inventoryState['22BLZ_BURMA'].sales30Days += 2;
      expect(inventoryState['22BLZ_BURMA'].amount).toBe(3); // 3 <= minThreshold (4) -> Alert!
    });

    test('Step 5 (14:45) — Customer Debt Collection in Cash Settling Has Ledger', () => {
      // Fatma Hanım pays 20,000 TL to clear 6.6667 gr Has debt
      dailyCashMovements.push({
        type: CASH_MOVEMENT_TYPES.CUSTOMER_COLLECTION,
        amount: 20000,
        currency: 'TL',
        description: 'Fatma Hanım Veresiye Tahsilatı',
      });

      customerFatmaHistory.push({
        customerId: 'cust-fatma',
        type: CUSTOMER_TRANSACTION_TYPES.TAHSILAT,
        assetType: ASSET_TYPES.HAS,
        amount: 6.6667,
        unitPrice: SPOT_HAS_RATE,
        description: 'Nakit Tahsilat ile Hesap Kapatma',
        createdAt: '2026-08-17T14:45:00Z',
      });

      const fatmaStatement = computeCustomerStatement(customerFatmaHistory, SPOT_HAS_RATE);
      expect(fatmaStatement.summary.hasBalance).toBeCloseTo(0, 4);
      expect(fatmaStatement.summary.estimatedTotalTL).toBe(0);
    });

    test('Step 6 (16:00) — Wholesale Delivery Intake & Batch Kelebek Label Printing', () => {
      const newDeliveries = [
        { barcode: '14YZK201', title: '14K Safir Yüzük', carat: 14, weight: 2.8, priceTL: 9800 },
        { barcode: '14YZK202', title: '14K Zümrüt Yüzük', carat: 14, weight: 3.1, priceTL: 11200 },
      ];

      const zplStream = newDeliveries.map(d => generateKelebekZPL(d, 203)).join('\n');
      expect((zplStream.match(/\^XA/g) || []).length).toBe(2);
      expect(zplStream).toContain('14YZK201');
      expect(zplStream).toContain('14YZK202');
    });

    test('Step 7 (17:30) — Turnover Speed Audit & Automatic Reorder Draft Generation', () => {
      const burmaMetric = calculateTurnoverMetric(
        '22BLZ_BURMA',
        inventoryState['22BLZ_BURMA'].label,
        inventoryState['22BLZ_BURMA'].amount,
        inventoryState['22BLZ_BURMA'].sales30Days,
        30
      );
      // 42 sales in 30 days = 1.4/day -> HIZLI
      expect(burmaMetric.dailyVelocity).toBe(1.4);
      expect(burmaMetric.speed).toBe(TURNOVER_SPEEDS.HIZLI);

      // Reorder draft for all items <= threshold
      const allInventory = Object.entries(inventoryState).map(([k, v]) => ({
        product: k,
        label: v.label,
        amount: v.amount,
        minThreshold: v.minThreshold,
        supplierName: v.supplier,
      }));

      const draft = generateReorderDraft(allInventory);
      const reorderCodes = draft.map(d => d.productCode);

      // 22BLZ_BURMA (amount: 3 <= 4) & ECEYREKTL (amount: 2 <= 10)
      expect(reorderCodes).toContain('22BLZ_BURMA');
      expect(reorderCodes).toContain('ECEYREKTL');
      expect(reorderCodes).not.toContain('14KP_NECKLACE'); // 7 > 5
    });

    test('Step 8 (19:00) — Evening Physical Count, Exact Reconciliation & Thermal Z-Report', () => {
      // Expected Cash = Opening (20,000)
      // + Cash Sales (5,000 + 40,000 = 45,000)
      // + Collections (20,000)
      // - Scrap Payouts (35,000)
      // = 20,000 + 45,000 + 20,000 - 35,000 = 50,000 TL
      const actualDrawerCount = 50000;

      const sessionReport = consolidateCashSession(
        'SESSION-20260817-CLOSE',
        `${SIM_DATE} 19:00`,
        OPENING_DRAWER_CASH,
        dailyCashMovements,
        actualDrawerCount
      );

      expect(sessionReport.openingCash).toBe(20000);
      expect(sessionReport.cashSales).toBe(45000);
      expect(sessionReport.cardSales).toBe(10000);
      expect(sessionReport.bankSales).toBe(30000);
      expect(sessionReport.customerCashCollections).toBe(20000);
      expect(sessionReport.scrapCashPurchases).toBe(35000);
      expect(sessionReport.scrapGoldGramsIn).toBeCloseTo(11.450, 3);
      expect(sessionReport.expectedClosingCash).toBe(50000);
      expect(sessionReport.actualClosingCash).toBe(50000);
      expect(sessionReport.discrepancy).toBe(0);
      expect(sessionReport.discrepancyStatus).toBe('BALANCED');
      expect(sessionReport.status).toBe(SESSION_STATUS.CLOSED);

      // Total retail sales = 15,000 (Ayşe) + 120,000 (Ahmet) = 135,000 TL
      expect(sessionReport.totalTurnover).toBe(85000); // Cash (45k) + Card (10k) + Bank (30k)

      // Format Thermal Z-Report Receipt Slip
      const thermalSlip = formatThermalZReportSlip(sessionReport, false);
      expect(thermalSlip).toContain('GÜN SONU Z-RAPORU');
      expect(thermalSlip).toContain('50000.00 TL');
      expect(thermalSlip).toContain('BALANCED');
    });
  });
}

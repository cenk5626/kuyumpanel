import { describe, it, test, expect, runRegisterededTests } from './helpers/test-utils';
import { formatThermalReceiptText, DailyZReportMetrics } from '../src/lib/z-report';
import { SESSION_STATUS, DISCREPANCY_STATUS } from '../src/constants/kasa';

describe('Milestone M3 - src/lib/z-report.ts Pure Format & Calculation Verification', () => {
  const sampleMetrics: DailyZReportMetrics = {
    sessionId: 'sess-test-123',
    sessionNumber: 'Z-2026-0001',
    status: SESSION_STATUS.CLOSED,
    openedAt: new Date('2026-08-17T09:00:00Z'),
    closedAt: new Date('2026-08-17T19:30:00Z'),
    openedBy: 'Ahmet Kasiyer',
    closedBy: 'Ahmet Kasiyer',
    notes: 'Kasa dengeli kapatıldı.',

    openingCashTL: 10000,
    openingCashUSD: 500,
    openingCashEUR: 400,
    openingHasGram: 50.0,

    cashSales: 25000,
    cardSales: 35000,
    bankSales: 15000,
    hasSalesTL: 10000,
    debtSalesTL: 5000,
    totalTurnover: 85000,
    totalSalesCount: 12,
    totalProfitTL: 4250,
    profitMarginPercent: 5.3,
    profitableTransactionsCount: 10,

    customerCashCollections: 12000,
    customerHasCollectionsGram: 3.5,
    supplierCashPayments: 20000,
    supplierHasPaymentsGram: 10.0,

    scrapCashPurchases: 15000,
    scrapGoldGramsIn: 5.0,
    scrapBuysCount: 3,

    manualCashIn: 5000,
    manualCashOut: 1500,

    systemCashTL: 15500, // 10k + 25k + 12k + 5k - 20k - 15k - 1.5k = 15.5k
    countedCashTL: 15500,
    discrepancyTL: 0,
    discrepancyStatus: DISCREPANCY_STATUS.BALANCED,

    systemCashUSD: 500,
    countedCashUSD: 500,
    diffCashUSD: 0,

    systemCashEUR: 400,
    countedCashEUR: 400,
    diffCashEUR: 0,

    systemHasGram: 48.5, // 50 + 3.5 - 10 + 5.0 = 48.5
    countedHasGram: 48.5,
    diffHasGram: 0,
  };

  test('M3.1 formatThermalReceiptText should generate 80mm slip with all metrics', () => {
    const text80 = formatThermalReceiptText(sampleMetrics, false);
    expect(text80).toContain('GÜN SONU Z-RAPORU');
    expect(text80).toContain('Z-2026-0001');
    expect(text80).toContain('Ahmet Kasiyer');
    expect(text80).toContain('10000.00 TL');
    expect(text80).toContain('85000.00 TL');
    expect(text80).toContain('15500.00 TL');
    expect(text80).toContain('BALANCED');
    expect(text80).toContain('Mali Değeri Yoktur');
  });

  test('M3.2 formatThermalReceiptText should generate 58mm slip within character budget', () => {
    const text58 = formatThermalReceiptText(sampleMetrics, true);
    expect(text58).toContain('GÜN SONU Z-RAPORU');
    expect(text58).toContain('Z-2026-0001');
    const lines = text58.split('\n');
    for (const l of lines) {
      expect(l.length).toBeLessThanOrEqual(36);
    }
  });

  test('M3.3 formatThermalReceiptText should handle cash shortage (kasa eksiği)', () => {
    const shortageMetrics: DailyZReportMetrics = {
      ...sampleMetrics,
      countedCashTL: 15000,
      discrepancyTL: -500,
      discrepancyStatus: DISCREPANCY_STATUS.SHORTAGE,
    };
    const slip = formatThermalReceiptText(shortageMetrics, false);
    expect(slip).toContain('-500.00 TL (SHORTAGE)');
  });

  test('M3.4 formatThermalReceiptText should handle cash overage (kasa fazlası)', () => {
    const overageMetrics: DailyZReportMetrics = {
      ...sampleMetrics,
      countedCashTL: 16000,
      discrepancyTL: 500,
      discrepancyStatus: DISCREPANCY_STATUS.OVERAGE,
    };
    const slip = formatThermalReceiptText(overageMetrics, false);
    expect(slip).toContain('+500.00 TL (OVERAGE)');
  });
});

async function main() {
  const results = await runRegisterededTests();
  let passed = 0;
  for (const r of results) {
    if (r.passed) {
      passed++;
      console.log(`✓ [PASS] ${r.testName}`);
    } else {
      console.error(`✗ [FAIL] ${r.testName}: ${r.error}`);
    }
  }
  console.log(`\nResults: ${passed}/${results.length} passed.`);
}

main();

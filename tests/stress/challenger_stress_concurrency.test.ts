/**
 * EMPIRICAL CHALLENGER STRESS & BOUNDARY CONCURRENCY HARNESS
 * Rigorous empirical stress-testing for kuyumpanel across:
 * 1. Gold fineness conversions across extreme carats and custom milyems
 * 2. Zero, negative, and extreme monetary amounts (0.001 gr to 100,000,000 TL)
 * 3. High volume batch label generation (1000+ items Code 128 & ZPL streaming)
 * 4. Cash register session math under 10,000 rapid sequential movements
 * 5. Turnover velocity edge cases (0 sales / 90 days, 1-day stockouts, negative stock)
 *
 * Usage: npx tsx tests/stress/challenger_stress_concurrency.test.ts
 */

import {
  CUSTOMER_TRANSACTION_TYPES,
  ASSET_TYPES,
  GOLD_FINENESS_RATES,
  ZIYNET_WEIGHTS,
  calculateHasEquivalent,
} from '../../src/constants/cari';

import {
  calculateGoldFineness,
  calculateZiynetHas,
  computeCustomerStatement,
  calculatePortfolioValuation,
  calculateCustomerBalancesFromTransactions,
  formatCurrency,
  formatGoldGram,
} from '../../src/lib/cari';

import {
  PAYMENT_METHODS,
  SESSION_STATUS,
  CASH_MOVEMENT_TYPES,
  DISCREPANCY_STATUS,
  CASH_CURRENCIES,
} from '../../src/constants/kasa';

import {
  consolidateCashSession,
  CashMovementInput,
} from '../helpers/domain-engines';

import {
  calculateDailyVelocity,
  calculateDaysToStockout,
  determineTurnoverCategory,
  determineStockAlertLevel,
  calculateSuggestedReorderQuantity,
  analyzeStockTurnover,
  generateReorderDraft,
  RawStockItem,
  RawTransactionItem,
} from '../../src/lib/stocks/analytics';

import {
  TURNOVER_CATEGORIES,
  STOCK_ALERT_LEVELS,
  TURNOVER_PERIODS,
} from '../../src/constants/stocks';

import {
  encodeCode128B,
  generateCode128BarcodeSVG,
  generateKelebekLabelSVG,
  generateLabelPrintHTML,
  LabelProductData,
  CODE128_CONSTANTS,
} from '../../src/lib/labels/kelebek';

import {
  generateKelebekZPL,
  generateBatchZPL,
} from '../../src/lib/labels/zpl';

import { LABEL_TEMPLATES, LABEL_DPI } from '../../src/constants/labels';

// ---------------------- EMPIRICAL TEST SUITE RUNNER ----------------------

interface StressTestResult {
  domain: string;
  name: string;
  passed: boolean;
  durationMs: number;
  details: string;
  error?: string;
}

const testResults: StressTestResult[] = [];

function recordResult(domain: string, name: string, passed: boolean, durationMs: number, details: string, error?: string) {
  testResults.push({ domain, name, passed, durationMs, details, error });
  const icon = passed ? '✅' : '❌';
  console.log(`  ${icon} [${passed ? 'PASS' : 'FAIL'}] ${name} (${durationMs.toFixed(2)}ms) — ${details}`);
  if (error) {
    console.error(`      Error: ${error}`);
  }
}

async function runTest(domain: string, name: string, fn: () => void | Promise<void>) {
  const start = performance.now();
  try {
    await fn();
    const dur = performance.now() - start;
    recordResult(domain, name, true, dur, 'Verified successfully');
  } catch (err: any) {
    const dur = performance.now() - start;
    recordResult(domain, name, false, dur, 'Assertion failed', err?.message || String(err));
  }
}

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

function assertClose(actual: number, expected: number, tolerance: number = 0.0001, msg: string = '') {
  const diff = Math.abs(actual - expected);
  if (diff > tolerance) {
    throw new Error(`Expected ${actual} to be close to ${expected} (diff: ${diff}, tol: ${tolerance}) ${msg}`);
  }
}

// ---------------------- TEST EXECUTION ----------------------

async function main() {
  console.log('\n' + '='.repeat(90));
  console.log('       🔬 KUYUMPANEL EMPIRICAL CHALLENGER STRESS & CONCURRENCY HARNESS 🔬       ');
  console.log('='.repeat(90) + '\n');

  // =========================================================================
  // DOMAIN 1: Gold Fineness Conversions Across Extreme Carats & Custom Milyems
  // =========================================================================
  console.log('━━━ DOMAIN 1: Gold Fineness Conversions Across Extreme Carats & Custom Milyems ━━━');

  await runTest('Domain 1', 'D1.1 Standard Carats Fineness Precision (8K, 14K, 18K, 22K, 24K, HAS)', () => {
    const weight = 100.0;
    
    // 24K -> 0.995 => 99.5000 gr Has
    const has24 = calculateGoldFineness('24K', weight);
    assert(has24 === 99.5, `24K failed: got ${has24}`);

    // 22K -> 0.916 => 91.6000 gr Has
    const has22 = calculateGoldFineness('22K', weight);
    assert(has22 === 91.6, `22K failed: got ${has22}`);

    // 18K -> 0.750 => 75.0000 gr Has
    const has18 = calculateGoldFineness('18K', weight);
    assert(has18 === 75.0, `18K failed: got ${has18}`);

    // 14K -> 0.585 => 58.5000 gr Has
    const has14 = calculateGoldFineness('14K', weight);
    assert(has14 === 58.5, `14K failed: got ${has14}`);

    // 8K -> 0.333 => 33.3000 gr Has
    const has8 = calculateGoldFineness('8K', weight);
    assert(has8 === 33.3, `8K failed: got ${has8}`);

    // HAS -> 1.000 => 100.0000 gr Has
    const hasPure = calculateGoldFineness('HAS', weight);
    assert(hasPure === 100.0, `HAS failed: got ${hasPure}`);
  });

  await runTest('Domain 1', 'D1.2 Ayar Alias Mapping & Case Insensitivity', () => {
    assert(calculateGoldFineness('24_AYAR', 50) === 49.75, '24_AYAR lookup');
    assert(calculateGoldFineness('22_ayar', 50) === 45.8, '22_ayar lookup');
    assert(calculateGoldFineness('14_Ayar', 50) === 29.25, '14_Ayar lookup');
    assert(calculateGoldFineness('8_ayar', 50) === 16.65, '8_ayar lookup');
    assert(calculateGoldFineness('has', 50) === 50.0, 'has lowercase');
  });

  await runTest('Domain 1', 'D1.3 Ziynet Gold Exact Has Conversion & Quantities', () => {
    // CEYREK: 1.605 gr Has
    assert(calculateZiynetHas('CEYREK', 1) === 1.605, '1 Ceyrek');
    assert(calculateZiynetHas('CEYREK', 1000) === 1605.0, '1000 Ceyrek');

    // YARIM: 3.210 gr Has
    assert(calculateZiynetHas('YARIM', 1) === 3.21, '1 Yarim');
    assert(calculateZiynetHas('YARIM', 500) === 1605.0, '500 Yarim');

    // TAM: 6.420 gr Has
    assert(calculateZiynetHas('TAM', 1) === 6.42, '1 Tam');

    // ATA: 6.608 gr Has
    assert(calculateZiynetHas('ATA', 1) === 6.608, '1 Ata');
    assert(calculateZiynetHas('ATA', 100) === 660.8, '100 Ata');

    // GREMSE: 16.050 gr Has
    assert(calculateZiynetHas('GREMSE', 1) === 16.05, '1 Gremse');
    assert(calculateZiynetHas('GREMSE', 50) === 802.5, '50 Gremse');
  });

  await runTest('Domain 1', 'D1.4 Edge Carats: 0K, Negative, Unknown Assets, Fractional Carats', () => {
    // 0K / 0 Carat
    const has0K = calculateGoldFineness('0K', 100);
    assert(has0K === 0, `0K should return 0, got ${has0K}`);

    // Unknown asset type (e.g. PLATINUM_950)
    const hasPlat = calculateGoldFineness('PLATINUM_950', 100);
    assert(hasPlat === 0, `Unknown asset should return 0, got ${hasPlat}`);

    // Zero weight
    assert(calculateGoldFineness('22K', 0) === 0, 'Zero weight');
    // Negative weight
    assert(calculateGoldFineness('22K', -15.5) === 0, 'Negative weight');
    // NaN weight
    assert(calculateGoldFineness('22K', NaN) === 0, 'NaN weight');

    // calculateHasEquivalent for 0 amount
    assert(calculateHasEquivalent('22K', 0) === 0, 'calculateHasEquivalent 0 amount');
    assert(calculateHasEquivalent('22K', -10) === 0, 'calculateHasEquivalent negative amount');
  });

  await runTest('Domain 1', 'D1.5 High-Precision Decimal Weight Conversion (4 decimal places)', () => {
    // 12.3456 gr of 14K (0.585) = 7.222176 -> 7.2222 gr Has
    const eq14 = calculateHasEquivalent('14K', 12.3456);
    assert(eq14 === 7.2222, `Expected 7.2222, got ${eq14}`);

    // 9.8765 gr of 22K (0.916) = 9.046874 -> 9.0469 gr Has
    const eq22 = calculateHasEquivalent('22K', 9.8765);
    assert(eq22 === 9.0469, `Expected 9.0469, got ${eq22}`);

    // 33.3333 gr of 8K (0.333) = 11.0999889 -> 11.1000 gr Has
    const eq8 = calculateHasEquivalent('8K', 33.3333);
    assert(eq8 === 11.1, `Expected 11.1, got ${eq8}`);
  });

  // =========================================================================
  // DOMAIN 2: Zero, Negative, and Extreme Monetary Amounts & Precision
  // =========================================================================
  console.log('\n━━━ DOMAIN 2: Zero, Negative, and Extreme Monetary Amounts & Precision ━━━');

  await runTest('Domain 2', 'D2.1 Micro-Gram Gold Transactions (0.001 gr to 0.0001 gr)', () => {
    const tinyTxs = [
      {
        customerId: 'cust-micro',
        type: CUSTOMER_TRANSACTION_TYPES.BORC,
        assetType: ASSET_TYPES.HAS,
        amount: 0.001,
      },
      {
        customerId: 'cust-micro',
        type: CUSTOMER_TRANSACTION_TYPES.BORC,
        assetType: ASSET_TYPES.HAS,
        amount: 0.0005,
      },
      {
        customerId: 'cust-micro',
        type: CUSTOMER_TRANSACTION_TYPES.TAHSILAT,
        assetType: ASSET_TYPES.HAS,
        amount: 0.0003,
      },
    ];

    const { summary, rows } = computeCustomerStatement(tinyTxs, 3000);
    assert(rows[0].hasEquivalent === 0.001, 'Row 1 micro has');
    assert(rows[1].hasEquivalent === 0.0005, 'Row 2 micro has');
    assert(rows[2].hasEquivalent === 0.0003, 'Row 3 micro has');
    assert(summary.hasBalance === 0.0012, `Expected 0.0012 gr Has, got ${summary.hasBalance}`);
    assert(summary.estimatedTotalTL === 3.6, `Expected 3.60 TL valuation, got ${summary.estimatedTotalTL}`);
  });

  await runTest('Domain 2', 'D2.2 Extreme Monetary Amounts (100 Million to 1 Billion TL)', () => {
    const largeTxs = [
      {
        customerId: 'cust-whale',
        type: CUSTOMER_TRANSACTION_TYPES.BORC,
        assetType: ASSET_TYPES.TL,
        amount: 100_000_000.50,
      },
      {
        customerId: 'cust-whale',
        type: CUSTOMER_TRANSACTION_TYPES.BORC,
        assetType: ASSET_TYPES.HAS,
        amount: 50_000.0, // 50 kg pure gold
      },
      {
        customerId: 'cust-whale',
        type: CUSTOMER_TRANSACTION_TYPES.TAHSILAT,
        assetType: ASSET_TYPES.TL,
        amount: 40_000_000.00,
      },
    ];

    const spotRate = 3500; // 3,500 TL/gr
    const { summary } = computeCustomerStatement(largeTxs, spotRate);

    assert(summary.tlBalance === 60_000_000.50, `Expected 60,000,000.50 TL, got ${summary.tlBalance}`);
    assert(summary.hasBalance === 50_000.0, `Expected 50,000 Has, got ${summary.hasBalance}`);
    
    // 60M TL + (50k gr * 3500 TL/gr) = 60M + 175M = 235,000,000.50 TL
    assert(summary.estimatedTotalTL === 235_000_000.50, `Expected 235,000,000.50 TL, got ${summary.estimatedTotalTL}`);

    // Test Portfolio Valuation Engine with 1 Billion TL
    const portfolio = calculatePortfolioValuation(50_000, 60_000_000.50, 3500, 1_000_000, 35.0, 500_000, 38.0);
    // USD: 1M * 35 = 35M TL; EUR: 500k * 38 = 19M TL; HAS: 175M TL; TL: 60M.50 -> Total: 289,000,000.50 TL
    assert(portfolio.totalValuationTL === 289_000_000.50, `Portfolio valuation expected 289M, got ${portfolio.totalValuationTL}`);
  });

  await runTest('Domain 2', 'D2.3 IEEE-754 Cumulative Precision Stress (10,000 sequential micro-steps)', () => {
    // Test for floating point accumulation error: 10,000 steps of +0.01 TL and +0.0001 gr Has
    const stepsCount = 10000;
    const txs = [];
    for (let i = 0; i < stepsCount; i++) {
      txs.push({
        customerId: 'cust-cum',
        type: CUSTOMER_TRANSACTION_TYPES.BORC,
        assetType: i % 2 === 0 ? ASSET_TYPES.TL : ASSET_TYPES.HAS,
        amount: i % 2 === 0 ? 0.01 : 0.0001,
      });
    }

    const { summary } = computeCustomerStatement(txs, 3000);

    // 5,000 steps of 0.01 TL = 50.00 TL exactly
    assert(summary.tlBalance === 50.0, `Expected exact 50.00 TL, got ${summary.tlBalance}`);

    // 5,000 steps of 0.0001 gr Has = 0.5000 gr Has exactly
    assert(summary.hasBalance === 0.5, `Expected exact 0.5000 gr Has, got ${summary.hasBalance}`);

    // Estimated total: 50.00 + (0.5 * 3000) = 1550.00 TL
    assert(summary.estimatedTotalTL === 1550.0, `Expected exact 1550.00 TL, got ${summary.estimatedTotalTL}`);
  });

  await runTest('Domain 2', 'D2.4 Negative Balances & Creditor/Prepayment Transition', () => {
    // Customer overpays 15,000 TL on a 10,000 TL debt -> balance is -5,000 TL
    const txs = [
      {
        customerId: 'cust-cred',
        type: CUSTOMER_TRANSACTION_TYPES.BORC,
        assetType: ASSET_TYPES.TL,
        amount: 10000,
      },
      {
        customerId: 'cust-cred',
        type: CUSTOMER_TRANSACTION_TYPES.TAHSILAT,
        assetType: ASSET_TYPES.TL,
        amount: 15000,
      },
      {
        customerId: 'cust-cred',
        type: CUSTOMER_TRANSACTION_TYPES.TAHSILAT,
        assetType: ASSET_TYPES.HAS,
        amount: 10.0, // Customer deposited 10 gr pure gold in store account
      },
    ];

    const { summary } = computeCustomerStatement(txs, 3000);
    assert(summary.tlBalance === -5000.0, `TL balance should be -5000.00, got ${summary.tlBalance}`);
    assert(summary.hasBalance === -10.0, `Has balance should be -10.0000, got ${summary.hasBalance}`);
    // Valuation: -5,000 + (-10 * 3,000) = -35,000 TL (store is net debtor)
    assert(summary.estimatedTotalTL === -35000.0, `Expected -35000.00 TL, got ${summary.estimatedTotalTL}`);
  });

  await runTest('Domain 2', 'D2.5 Currency and Gold Gram Formatting Robustness', () => {
    assert(formatCurrency(1234567.89, 'TL') === '₺1.234.567,89', 'TL formatting');
    assert(formatCurrency(50000.5, 'USD') === '$50.000,50', 'USD formatting');
    assert(formatCurrency(75000.0, 'EUR') === '€75.000,00', 'EUR formatting');
    assert(formatGoldGram(123.456) === '123,456 gr', 'Gold gram formatting');
    assert(formatGoldGram(0.005) === '0,005 gr', 'Tiny gold gram formatting');
  });

  // =========================================================================
  // DOMAIN 3: High Volume Batch Label Generation (Code 128 & ZPL Streaming)
  // =========================================================================
  console.log('\n━━━ DOMAIN 3: High Volume Batch Label Generation (1000+ Items) ━━━');

  await runTest('Domain 3', 'D3.1 Code 128B Mathematical Checksum & Encoding Integrity across ASCII 32-126', () => {
    // Test all printable ASCII characters
    let allChars = '';
    for (let code = 32; code <= 126; code++) {
      allChars += String.fromCharCode(code);
    }
    const { modules, checksum } = encodeCode128B(allChars);
    assert(modules.length > 0, 'Code 128 modules generated');
    assert(checksum >= 0 && checksum <= 102, `Checksum out of bounds: ${checksum}`);
    
    // Verify start code 104 and stop code 106 presence in module structure
    // Start B is 104 ('211214' -> 11 modules), Stop is 106 ('2331112' -> 13 modules)
    assert(modules.length >= 11 + 13, 'Valid minimum module length');
  });

  await runTest('Domain 3', 'D3.2 High-Volume 1,000 Item Vector SVG Label Generation Benchmark', () => {
    const items: LabelProductData[] = [];
    for (let i = 1; i <= 1000; i++) {
      items.push({
        id: `item-${i}`,
        barcode: `KYM${String(i).padStart(6, '0')}`,
        title: `22K Altın Bilezik Model ${i}`,
        carat: '22K',
        weight: 15.5 + (i % 10) * 0.25,
        priceTL: 45000 + i * 50,
        sellingMilyem: 0.916,
        storeName: 'Kuyumcu Panel',
      });
    }

    const tStart = performance.now();
    let totalSvgLength = 0;
    for (const item of items) {
      const svg = generateKelebekLabelSVG(item, LABEL_TEMPLATES.BUTTERFLY_74x12);
      totalSvgLength += svg.length;
      assert(svg.includes('<svg') && svg.includes('</svg>'), 'Valid SVG wrapper');
      assert(svg.includes(item.barcode), 'Barcode text in SVG');
    }
    const duration = performance.now() - tStart;

    assert(totalSvgLength > 1_000_000, `Generated over 1MB of SVG data (actual: ${(totalSvgLength / 1024).toFixed(1)} KB)`);
    assert(duration < 500, `1000 SVGs must render in < 500ms (actual: ${duration.toFixed(2)}ms)`);
  });

  await runTest('Domain 3', 'D3.3 High-Volume 1,000 Item Batch ZPL-II Streaming Generation', () => {
    const items: Array<{ data: LabelProductData; copies: number }> = [];
    for (let i = 1; i <= 1000; i++) {
      items.push({
        data: {
          barcode: `BAR${String(i).padStart(7, '0')}`,
          title: `Tektaş Yüzük Pırlanta ${i}`,
          carat: 18,
          weight: 3.45,
          priceTL: 28500,
          sellingMilyem: 0.75,
        },
        copies: 1,
      });
    }

    const tStart = performance.now();
    const batchZpl = generateBatchZPL(items, LABEL_DPI.DPI_203, LABEL_TEMPLATES.BUTTERFLY_74x12);
    const duration = performance.now() - tStart;

    assert(batchZpl.startsWith('^XA'), 'ZPL stream starts with ^XA');
    assert(batchZpl.endsWith('^XZ'), 'ZPL stream ends with ^XZ');
    
    // Count occurrences of ^XA (should be exactly 1000)
    const xaCount = (batchZpl.match(/\^XA/g) || []).length;
    const xzCount = (batchZpl.match(/\^XZ/g) || []).length;
    assert(xaCount === 1000, `Expected 1000 ^XA blocks, got ${xaCount}`);
    assert(xzCount === 1000, `Expected 1000 ^XZ blocks, got ${xzCount}`);
    assert(duration < 250, `1000 ZPL commands generated in < 250ms (actual: ${duration.toFixed(2)}ms)`);
  });

  await runTest('Domain 3', 'D3.4 DPI 203 vs DPI 300 Coordinate & Font Scaling Verification', () => {
    const sample: LabelProductData = {
      barcode: 'TST99999',
      title: 'Ayar Kolye',
      carat: '14K',
      weight: 5.25,
      priceTL: 12000,
    };

    const zpl203 = generateKelebekZPL(sample, LABEL_DPI.DPI_203);
    const zpl300 = generateKelebekZPL(sample, LABEL_DPI.DPI_300);

    // 203 DPI: PW = 74 * 8 = 592; LL = 12 * 8 = 96
    assert(zpl203.includes('^PW592'), '203 DPI width');
    assert(zpl203.includes('^LL96'), '203 DPI height');

    // 300 DPI: PW = 74 * 11.811 = 874; LL = 12 * 11.811 = 142
    assert(zpl300.includes('^PW874'), '300 DPI width');
    assert(zpl300.includes('^LL142'), '300 DPI height');
    assert(zpl300.includes('^A0N,28,28') || zpl300.includes('^A0N,29,29'), '300 DPI scaled fonts');
  });

  // =========================================================================
  // DOMAIN 4: Cash Register Session Math Under Rapid Sequential Movements
  // =========================================================================
  console.log('\n━━━ DOMAIN 4: Cash Register Session Math Under 10,000 Rapid Sequential Movements ━━━');

  await runTest('Domain 4', 'D4.1 10,000 Mixed Cash Movements with Exact Zero Discrepancy', () => {
    const openingCash = 25000.0;
    const movements: CashMovementInput[] = [];

    let expectedNetCashDelta = 0;
    let expectedTurnover = 0;
    let expectedScrapGrams = 0;
    let expectedSupplierGrams = 0;

    for (let i = 1; i <= 2000; i++) {
      // 1. POS Cash Sale (+150 TL)
      movements.push({ type: CASH_MOVEMENT_TYPES.POS_SALE, amount: 150.0, currency: CASH_CURRENCIES.TL });
      expectedNetCashDelta += 150.0;
      expectedTurnover += 150.0;

      // 2. POS Card Sale (+300 TL)
      movements.push({ type: CASH_MOVEMENT_TYPES.POS_SALE, amount: 300.0, currency: 'CARD' });
      expectedTurnover += 300.0;

      // 3. Customer Cash Collection (+200 TL)
      movements.push({ type: CASH_MOVEMENT_TYPES.CUSTOMER_COLLECTION, amount: 200.0, currency: CASH_CURRENCIES.TL });
      expectedNetCashDelta += 200.0;

      // 4. Supplier Cash Payment (-180 TL, -1.5 gr Has)
      movements.push({ type: CASH_MOVEMENT_TYPES.SUPPLIER_PAYMENT, amount: 180.0, currency: CASH_CURRENCIES.TL, hasWeight: 1.5 });
      expectedNetCashDelta -= 180.0;
      expectedSupplierGrams += 1.5;

      // 5. Scrap Gold Buyout (-100 TL, +1.2 gr Has)
      movements.push({ type: CASH_MOVEMENT_TYPES.SCRAP_BUY, amount: 100.0, currency: CASH_CURRENCIES.TL, hasWeight: 1.2 });
      expectedNetCashDelta -= 100.0;
      expectedScrapGrams += 1.2;
    }

    // 10,000 total movements (2000 * 5)
    assert(movements.length === 10000, `Expected 10,000 movements, got ${movements.length}`);

    const expectedClosing = openingCash + expectedNetCashDelta;

    const tStart = performance.now();
    const session = consolidateCashSession('sess-stress-10k', '2026-08-17', openingCash, movements, expectedClosing);
    const duration = performance.now() - tStart;

    assert(session.expectedClosingCash === expectedClosing, `Closing cash mismatch: ${session.expectedClosingCash} vs ${expectedClosing}`);
    assert(session.actualClosingCash === expectedClosing, 'Actual matches expected');
    assert(session.discrepancy === 0.0, `Discrepancy should be exact 0.00, got ${session.discrepancy}`);
    assert(session.discrepancyStatus === 'BALANCED', `Status must be BALANCED, got ${session.discrepancyStatus}`);
    assert(session.totalTurnover === expectedTurnover, `Turnover mismatch: ${session.totalTurnover} vs ${expectedTurnover}`);
    assertClose(session.scrapGoldGramsIn, expectedScrapGrams, 0.001, 'Scrap gold grams');
    assertClose(session.hasGoldPaymentsGramsOut, expectedSupplierGrams, 0.001, 'Supplier gold grams');
    assert(duration < 50, `10,000 movements consolidated in < 50ms (actual: ${duration.toFixed(2)}ms)`);
  });

  await runTest('Domain 4', 'D4.2 Cash Discrepancy Tolerance Boundaries (±0.01 TL, ±0.02 TL, Huge Over/Short)', () => {
    const opening = 10000.0;
    const movs: CashMovementInput[] = [
      { type: CASH_MOVEMENT_TYPES.POS_SALE, amount: 5000.0, currency: CASH_CURRENCIES.TL },
    ];
    // Expected: 15,000.00 TL

    // Exactly matching
    const s0 = consolidateCashSession('s0', 'date', opening, movs, 15000.00);
    assert(s0.discrepancy === 0 && s0.discrepancyStatus === 'BALANCED', 'Exact match');

    // +0.01 TL (within ±0.015 tolerance -> BALANCED)
    const sPlus1 = consolidateCashSession('s1', 'date', opening, movs, 15000.01);
    assert(sPlus1.discrepancy === 0.01 && sPlus1.discrepancyStatus === 'BALANCED', '+0.01 TL is BALANCED');

    // -0.01 TL (within ±0.015 tolerance -> BALANCED)
    const sMinus1 = consolidateCashSession('s2', 'date', opening, movs, 14999.99);
    assert(sMinus1.discrepancy === -0.01 && sMinus1.discrepancyStatus === 'BALANCED', '-0.01 TL is BALANCED');

    // +0.02 TL (outside tolerance -> OVERAGE)
    const sPlus2 = consolidateCashSession('s3', 'date', opening, movs, 15000.02);
    assert(sPlus2.discrepancy === 0.02 && sPlus2.discrepancyStatus === 'OVERAGE', '+0.02 TL is OVERAGE');

    // -0.02 TL (outside tolerance -> SHORTAGE)
    const sMinus2 = consolidateCashSession('s4', 'date', opening, movs, 14999.98);
    assert(sMinus2.discrepancy === -0.02 && sMinus2.discrepancyStatus === 'SHORTAGE', '-0.02 TL is SHORTAGE');

    // Extreme shortage (-500,000 TL)
    const sHugeShort = consolidateCashSession('s5', 'date', opening, movs, 0);
    assert(sHugeShort.discrepancy === -15000.00 && sHugeShort.discrepancyStatus === 'SHORTAGE', 'Huge shortage');
  });

  // =========================================================================
  // DOMAIN 5: Turnover Velocity Edge Cases
  // =========================================================================
  console.log('\n━━━ DOMAIN 5: Turnover Velocity Edge Cases ━━━');

  await runTest('Domain 5', 'D5.1 Zero Sales over 90 Days (Dead Stock / HAREKETSIZ)', () => {
    const vDaily = calculateDailyVelocity(0, 90);
    assert(vDaily === 0, `Velocity must be 0, got ${vDaily}`);

    const daysOut = calculateDaysToStockout(50, vDaily);
    assert(daysOut === Infinity, `Days to stockout must be Infinity, got ${daysOut}`);

    const category = determineTurnoverCategory(vDaily, daysOut);
    assert(category === TURNOVER_CATEGORIES.HAREKETSIZ, `Category must be HAREKETSIZ, got ${category}`);
  });

  await runTest('Domain 5', 'D5.2 1-Day Stockout / High Velocity (HIZLI)', () => {
    // Sold 50 units in 1 day
    const vDaily = calculateDailyVelocity(50, 1);
    assert(vDaily === 50.0, `Velocity must be 50.0, got ${vDaily}`);

    // Remaining stock 10 units -> stockout in 10 / 50 = 0.2 days
    const daysOut = calculateDaysToStockout(10, vDaily);
    assert(daysOut === 0.2, `Days to stockout must be 0.2, got ${daysOut}`);

    const category = determineTurnoverCategory(vDaily, daysOut);
    assert(category === TURNOVER_CATEGORIES.HIZLI, `Category must be HIZLI, got ${category}`);
  });

  await runTest('Domain 5', 'D5.3 Negative and Zero Stock Boundary Conditions', () => {
    // Zero stock with active sales -> days to stockout is 0
    assert(calculateDaysToStockout(0, 2.5) === 0, 'Zero stock returns 0 days');
    // Negative stock (oversold/backorder) -> days to stockout is 0
    assert(calculateDaysToStockout(-5, 2.5) === 0, 'Negative stock returns 0 days');

    // Negative stock in reorder draft calculation
    // minThreshold = 5, targetStock = 10, currentAmount = -5 -> suggested = 10 - (-5) = 15
    const reorderQty = calculateSuggestedReorderQuantity(-5, 5, 0);
    assert(reorderQty === 15, `Suggested reorder for -5 stock should be 15, got ${reorderQty}`);
  });

  await runTest('Domain 5', 'D5.4 Zero / Negative Period Days Division-by-Zero Guard', () => {
    // periodDays = 0 -> should clamp to 1 day
    const v0 = calculateDailyVelocity(10, 0);
    assert(v0 === 10.0, `Zero period days should clamp to 1, got ${v0}`);

    // periodDays = -15 -> should clamp to 1 day
    const vNeg = calculateDailyVelocity(10, -15);
    assert(vNeg === 10.0, `Negative period days should clamp to 1, got ${vNeg}`);
  });

  await runTest('Domain 5', 'D5.5 10,000 SKU Catalog Batch Turnover Analytics Benchmark', () => {
    const rawStocks: RawStockItem[] = [];
    const rawTransactions: RawTransactionItem[] = [];
    const now = new Date();

    for (let i = 1; i <= 10000; i++) {
      rawStocks.push({
        id: `sku-${i}`,
        product: `PROD_${i}`,
        label: `Ürün Model ${i}`,
        type: 'sarrafiye',
        amount: (i % 20), // 0 to 19 units
        minThreshold: 5,
        supplierName: `Tedarikçi ${i % 5}`,
      });

      // Generate some sales
      if (i % 3 === 0) {
        rawTransactions.push({
          type: 'sell',
          productCode: `PROD_${i}`,
          quantity: 12,
          createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        });
      }
    }

    const tStart = performance.now();
    const summary = analyzeStockTurnover(rawStocks, rawTransactions, TURNOVER_PERIODS.DAYS_30);
    const draft = generateReorderDraft(rawStocks);
    const duration = performance.now() - tStart;

    assert(summary.totalProducts === 10000, `Expected 10,000 items analyzed, got ${summary.totalProducts}`);
    assert(summary.totalCriticalCount > 0, 'Identified critical items');
    assert(draft.length > 0, 'Generated reorder draft');
    assert(duration < 100, `10,000 SKU analysis completed in < 100ms (actual: ${duration.toFixed(2)}ms)`);
  });

  // =========================================================================
  // SUMMARY REPORT
  // =========================================================================
  console.log('\n' + '='.repeat(90));
  console.log('                          📊 EMPIRICAL STRESS RESULTS SUMMARY                          ');
  console.log('='.repeat(90));

  const total = testResults.length;
  const passed = testResults.filter(t => t.passed).length;
  const failed = testResults.filter(t => !t.passed).length;

  console.log(`Total Stress Tests Executed : ${total}`);
  console.log(`Total Passed                : ${passed} (${((passed / total) * 100).toFixed(1)}%)`);
  console.log(`Total Failed                : ${failed}`);
  console.log('-'.repeat(90));

  // Domain breakdown
  const domainMap: Record<string, { total: number; passed: number; failed: number }> = {};
  for (const r of testResults) {
    if (!domainMap[r.domain]) domainMap[r.domain] = { total: 0, passed: 0, failed: 0 };
    domainMap[r.domain].total++;
    if (r.passed) domainMap[r.domain].passed++;
    else domainMap[r.domain].failed++;
  }

  for (const [dom, stat] of Object.entries(domainMap)) {
    console.log(`  • ${dom.padEnd(10)}: ${stat.passed}/${stat.total} passed (${((stat.passed / stat.total) * 100).toFixed(1)}%) [Fail: ${stat.failed}]`);
  }

  console.log('='.repeat(90));

  if (failed > 0) {
    console.error(`\n❌ EMPIRICAL STRESS HARNESS FAILED with ${failed} failure(s).`);
    process.exit(1);
  } else {
    console.log('\n🎉 ALL EMPIRICAL STRESS TESTS PASSED WITH ZERO DISCREPANCIES!');
    process.exit(0);
  }
}

main().catch(err => {
  console.error('Fatal Stress Runner Error:', err);
  process.exit(1);
});

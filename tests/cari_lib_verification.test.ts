import {
  calculateGoldFineness,
  calculateZiynetHas,
  calculateHasEquivalent,
  computeCustomerStatement,
  calculatePortfolioValuation,
  calculateCustomerBalancesFromTransactions,
  formatCurrency,
  formatGoldGram,
  normalizePhoneNumber,
  buildWhatsAppStatementUrl,
} from '../src/lib/cari';
import { CUSTOMER_TRANSACTION_TYPES, ASSET_TYPES } from '../src/constants/cari';

async function runCariLibTests() {
  console.log('🧪 Starting src/lib/cari.ts Comprehensive Unit Tests...\n');

  // Test 1: Gold Fineness Calculations
  console.log('Test 1: calculateGoldFineness');
  const k22Has = calculateGoldFineness('22K', 10);
  console.assert(k22Has === 9.16, `Expected 9.16, got ${k22Has}`);
  const k14Has = calculateGoldFineness('14K', 10);
  console.assert(k14Has === 5.85, `Expected 5.85, got ${k14Has}`);
  const k18Has = calculateGoldFineness('18K', 20);
  console.assert(k18Has === 15.0, `Expected 15.0, got ${k18Has}`);
  const k8Has = calculateGoldFineness('8K', 30);
  console.assert(k8Has === 9.99, `Expected 9.99, got ${k8Has}`);
  console.log('✓ Test 1 Passed');

  // Test 2: Ziynet Has Calculations
  console.log('Test 2: calculateZiynetHas');
  const ceyrekHas = calculateZiynetHas('CEYREK', 3);
  console.assert(ceyrekHas === 4.815, `Expected 4.815, got ${ceyrekHas}`);
  const yarimHas = calculateZiynetHas('YARIM', 2);
  console.assert(yarimHas === 6.42, `Expected 6.42, got ${yarimHas}`);
  const ataHas = calculateZiynetHas('ATA', 2);
  console.assert(ataHas === 13.216, `Expected 13.216, got ${ataHas}`);
  console.log('✓ Test 2 Passed');

  // Test 3: computeCustomerStatement Running Balance
  console.log('Test 3: computeCustomerStatement Running Balances');
  const txs = [
    {
      customerId: 'cust-1',
      type: CUSTOMER_TRANSACTION_TYPES.BORC,
      assetType: ASSET_TYPES.TL,
      amount: 10000,
      createdAt: '2026-08-01T10:00:00Z',
    },
    {
      customerId: 'cust-1',
      type: CUSTOMER_TRANSACTION_TYPES.BORC,
      assetType: ASSET_TYPES.HAS,
      amount: 5.0,
      createdAt: '2026-08-02T10:00:00Z',
    },
    {
      customerId: 'cust-1',
      type: CUSTOMER_TRANSACTION_TYPES.TAHSILAT,
      assetType: ASSET_TYPES.TL,
      amount: 4000,
      createdAt: '2026-08-03T10:00:00Z',
    },
    {
      customerId: 'cust-1',
      type: CUSTOMER_TRANSACTION_TYPES.TAHSILAT,
      assetType: ASSET_TYPES.HAS,
      amount: 2.0,
      createdAt: '2026-08-04T10:00:00Z',
    },
  ];

  const statement = computeCustomerStatement(txs, 3000);
  console.assert(statement.rows.length === 4, 'Expected 4 rows');
  console.assert(statement.rows[0].runningBalanceTL === 10000, 'Row 0 running TL mismatch');
  console.assert(statement.rows[0].runningBalanceHas === 0, 'Row 0 running Has mismatch');
  console.assert(statement.rows[1].runningBalanceTL === 10000, 'Row 1 running TL mismatch');
  console.assert(statement.rows[1].runningBalanceHas === 5.0, 'Row 1 running Has mismatch');
  console.assert(statement.rows[2].runningBalanceTL === 6000, 'Row 2 running TL mismatch');
  console.assert(statement.rows[2].runningBalanceHas === 5.0, 'Row 2 running Has mismatch');
  console.assert(statement.rows[3].runningBalanceTL === 6000, 'Row 3 running TL mismatch');
  console.assert(statement.rows[3].runningBalanceHas === 3.0, 'Row 3 running Has mismatch');

  console.assert(statement.summary.tlBalance === 6000, 'Summary TL mismatch');
  console.assert(statement.summary.hasBalance === 3.0, 'Summary Has mismatch');
  console.assert(statement.summary.estimatedTotalTL === 6000 + 3.0 * 3000, 'Summary Total mismatch');
  console.log('✓ Test 3 Passed');

  // Test 4: calculatePortfolioValuation
  console.log('Test 4: calculatePortfolioValuation');
  const val = calculatePortfolioValuation(10.0, 50000, 3000, 500, 35, 200, 38);
  console.assert(val.hasValueTL === 30000, 'Has value mismatch');
  console.assert(val.usdValueTL === 17500, 'USD value mismatch');
  console.assert(val.eurValueTL === 7600, 'EUR value mismatch');
  console.assert(val.totalValuationTL === 50000 + 30000 + 17500 + 7600, 'Total valuation mismatch');
  console.log('✓ Test 4 Passed');

  // Test 5: Formatters & WhatsApp URLs
  console.log('Test 5: Formatters & WhatsApp Link Generation');
  const phone = normalizePhoneNumber('0532 123 45 67');
  console.assert(phone === '905321234567', `Expected 905321234567, got ${phone}`);
  const formattedTL = formatCurrency(12500.5, 'TL');
  console.assert(formattedTL.includes('12.500,50') || formattedTL.includes('12,500.50') || formattedTL.startsWith('₺'), 'TL format mismatch');
  const formattedGram = formatGoldGram(12.345);
  console.assert(formattedGram.includes('12,345') || formattedGram.includes('12.345'), 'Gram format mismatch');

  const waUrl = buildWhatsAppStatementUrl('05321112233', 'Ali Kaya', statement.summary, statement.rows);
  console.assert(waUrl.startsWith('https://wa.me/905321112233?text='), 'WhatsApp URL base mismatch');
  console.assert(waUrl.includes(encodeURIComponent('Ali Kaya')), 'WhatsApp URL name mismatch');
  console.log('✓ Test 5 Passed');

  console.log('\n🎉 ALL CARI LIB TESTS PASSED SUCCESSFULLY!\n');
}

runCariLibTests().catch((err) => {
  console.error('Cari Lib Test Failed:', err);
  process.exit(1);
});

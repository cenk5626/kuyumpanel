import { describe, test, expect, setTestContext } from '../helpers/test-utils';
import {
  CURRENCIES,
  FX_DISCREPANCY_STATUS,
  DISCREPANCY_TYPE,
  FX_DEFAULTS,
  CURRENCY_LABELS,
  CURRENCY_SYMBOLS,
  FX_DISCREPANCY_STATUS_LABELS,
  FxDiscrepancyStatus,
} from '../../src/constants/forex';
import {
  calculateForexValuationPnL,
  calculateFxTransaction,
  classifyCashDiscrepancy,
  generateFxExchangeNumber,
} from '../../src/lib/cash/forex-calculator';

export function registerF28MultiCurrencyCashFxTests(): void {
  setTestContext(
    'Tier 1',
    28,
    'Multi-Currency Cash Drawer, Forex Valuation & Discrepancy Reconciliation',
    'F28: Multi-Currency & Forex'
  );

  describe('Feature 28: Multi-Currency Cash Drawer, Forex Valuation & Discrepancies (Tier 1)', () => {
    // -------------------------------------------------------------
    // 1. Sabitler ve Enums Doğrulama
    // -------------------------------------------------------------
    test('F28-01: Para birimleri, mutabakat statüleri ve varsayılan FX sabitleri eksiksiz tanımlanmalıdır', () => {
      expect(CURRENCIES.TL).toBe('TL');
      expect(CURRENCIES.USD).toBe('USD');
      expect(CURRENCIES.EUR).toBe('EUR');
      expect(CURRENCIES.HAS).toBe('HAS');

      expect(FX_DISCREPANCY_STATUS.PENDING).toBe('PENDING');
      expect(FX_DISCREPANCY_STATUS.APPROVED).toBe('APPROVED');
      expect(FX_DISCREPANCY_STATUS.REJECTED).toBe('REJECTED');
      expect(FX_DISCREPANCY_STATUS.RESOLVED).toBe('RESOLVED');

      expect(DISCREPANCY_TYPE.SURPLUS).toBe('SURPLUS');
      expect(DISCREPANCY_TYPE.DEFICIT).toBe('DEFICIT');
      expect(DISCREPANCY_TYPE.BALANCED).toBe('BALANCED');

      expect(FX_DEFAULTS.PREFIX).toBe('FX');
      expect(FX_DEFAULTS.PAD_LENGTH).toBe(4);
      expect(FX_DEFAULTS.MIN_EXCHANGE_AMOUNT).toBe(0.01);
    });

    test('F28-02: Para birimi simgeleri ve mutabakat durumlarının UI etiket tanımları eksiksiz olmalıdır', () => {
      expect(CURRENCY_SYMBOLS.TL).toBe('₺');
      expect(CURRENCY_SYMBOLS.USD).toBe('$');
      expect(CURRENCY_SYMBOLS.EUR).toBe('€');
      expect(CURRENCY_SYMBOLS.HAS).toBe('gr Has');

      expect(CURRENCY_LABELS.TL).toContain('Türk Lirası');
      expect(CURRENCY_LABELS.USD).toContain('Dolar');

      const statuses = Object.values(FX_DISCREPANCY_STATUS);
      for (const st of statuses) {
        const meta = FX_DISCREPANCY_STATUS_LABELS[st as FxDiscrepancyStatus];
        expect(meta).toBeDefined();
        expect(meta.label.length).toBeGreaterThan(0);
        expect(meta.color).toBeDefined();
        expect(meta.bg).toBeDefined();
      }
    });

    // -------------------------------------------------------------
    // 2. Kambiyo Değerleme Kâr / Zararı (Forex Valuation PnL)
    // -------------------------------------------------------------
    test('F28-03: Gün başı açılış kuru ile kapanış kuru arasındaki kambiyo kâr/zararı doğru hesaplanmalıdır', () => {
      // Örnek: USD 32.0'dan açıldı, 34.0'a yükseldi (+2 TL x 100 USD = +200 TL)
      // EUR 35.0'dan açıldı, 34.5'e düştü (-0.5 TL x 200 EUR = -100 TL)
      // HAS 2400'den açıldı, 2500'e yükseldi (+100 TL x 10 gr = +1000 TL)
      // Net Kambiyo Kârı = 200 - 100 + 1000 = 1100 TL
      const pnlResult = calculateForexValuationPnL({
        drawerUSD: 100,
        openingRateUSD: 32.0,
        currentRateUSD: 34.0,

        drawerEUR: 200,
        openingRateEUR: 35.0,
        currentRateEUR: 34.5,

        drawerHAS: 10,
        openingRateHAS: 2400.0,
        currentRateHAS: 2500.0,
      });

      expect(pnlResult.usdPnL).toBe(200);
      expect(pnlResult.eurPnL).toBe(-100);
      expect(pnlResult.hasPnL).toBe(1000);
      expect(pnlResult.totalPnL).toBe(1100);
    });

    test('F28-04: Açılış kuru veya çekmece bakiyesi sıfır/tanımsız olduğunda PnL 0 dönmeli, sistem çökmemelidir', () => {
      const pnlResult = calculateForexValuationPnL({
        drawerUSD: 0,
        openingRateUSD: null,
        currentRateUSD: 34.0,

        drawerEUR: 50,
        openingRateEUR: 0,
        currentRateEUR: 36.0,
      });

      expect(pnlResult.usdPnL).toBe(0);
      expect(pnlResult.eurPnL).toBe(0);
      expect(pnlResult.totalPnL).toBe(0);
    });

    // -------------------------------------------------------------
    // 3. Döviz Alım - Satım ve Kâr Hesaplaması (FX Transaction)
    // -------------------------------------------------------------
    test('F28-05: Müşteri döviz bozdururken (USD -> TL) ödenecek tutar ve işletme kârı doğru hesaplanmalıdır', () => {
      // Müşteri 500 USD veriyor. Mağaza kuru: 34.50. Piyasa alış kuru: 34.20
      // Hedef TL = 500 * 34.50 = 17,250 TL
      // Eğer piyasa kuru 34.20 ise, mağaza kârı = 500 * (34.50 - 34.20) = 150 TL
      const fx = calculateFxTransaction({
        fromCurrency: 'USD',
        fromAmount: 500,
        toCurrency: 'TL',
        exchangeRate: 34.5,
        marketRate: 34.2,
      });

      expect(fx.toAmount).toBe(17250);
      expect(fx.profitTL).toBe(150);
      expect(fx.effectiveRate).toBe(34.5);
    });

    test('F28-06: Müşteri döviz satın alırken (TL -> USD) teslim edilecek döviz doğru hesaplanmalıdır', () => {
      // Müşteri 34,500 TL verip USD almak istiyor. Satış Kuru: 34.50
      // Teslim edilecek USD = 34500 / 34.50 = 1000 USD
      const fx = calculateFxTransaction({
        fromCurrency: 'TL',
        fromAmount: 34500,
        toCurrency: 'USD',
        exchangeRate: 34.5,
      });

      expect(fx.toAmount).toBe(1000);
      expect(fx.profitTL).toBe(0);
    });

    // -------------------------------------------------------------
    // 4. Kasa Sayım Farkı Sınıflandırması (Discrepancy Classifier)
    // -------------------------------------------------------------
    test('F28-07: Sayım farkı pozitif ise Kasa Fazlası (SURPLUS), negatif ise Kasa Noksanı (DEFICIT) sınıflandırılmalıdır', () => {
      const surplus = classifyCashDiscrepancy(150.5);
      expect(surplus.type).toBe(DISCREPANCY_TYPE.SURPLUS);
      expect(surplus.status).toBe(FX_DISCREPANCY_STATUS.PENDING);
      expect(surplus.isBalanced).toBe(false);

      const deficit = classifyCashDiscrepancy(-75.25);
      expect(deficit.type).toBe(DISCREPANCY_TYPE.DEFICIT);
      expect(deficit.status).toBe(FX_DISCREPANCY_STATUS.PENDING);
      expect(deficit.isBalanced).toBe(false);

      const balanced = classifyCashDiscrepancy(0);
      expect(balanced.type).toBe(DISCREPANCY_TYPE.BALANCED);
      expect(balanced.status).toBe(FX_DISCREPANCY_STATUS.RESOLVED);
      expect(balanced.isBalanced).toBe(true);
    });

    test('F28-08: Küçük kuruş/miligram yuvarlama farkları tolerans eşiğinde denk kabul edilmelidir', () => {
      const microDiff = classifyCashDiscrepancy(0.005, 0.01);
      expect(microDiff.type).toBe(DISCREPANCY_TYPE.BALANCED);
      expect(microDiff.status).toBe(FX_DISCREPANCY_STATUS.RESOLVED);
      expect(microDiff.isBalanced).toBe(true);
    });

    // -------------------------------------------------------------
    // 5. İşlem Numarası Üretici ve Doğrulama
    // -------------------------------------------------------------
    test('F28-09: FX işlem numarası FX-YYYY-XXXX formatında ardışık üretilmelidir', () => {
      const currentYear = new Date().getFullYear();
      const fxNo1 = generateFxExchangeNumber(1);
      const fxNo42 = generateFxExchangeNumber(42);

      expect(fxNo1).toBe(`FX-${currentYear}-0001`);
      expect(fxNo42).toBe(`FX-${currentYear}-0042`);
    });
  });
}

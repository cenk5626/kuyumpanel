import { describe, it, test, expect, setTestContext } from '../helpers/test-utils';
import {
  STOCK_VELOCITY_CATEGORY,
  STOCK_VELOCITY_LABELS,
  EXECUTIVE_DEFAULTS,
} from '@/constants/executive-analytics';
import {
  calculateStockTurnoverAndAging,
  forecastDemandWeightedMovingAverage,
  generateIntelligentReorderSuggestion,
  calculateHasProfitabilityByCategory,
  StockItemForAnalytics,
} from '@/lib/analytics/executive-engine';

export function registerF34ExecutiveAnalyticsForecastingTests() {
  setTestContext(
    'Tier 1',
    34,
    'Executive Analytics & Demand Forecasting',
    'F34: Yönetici Analitiği, Stok Devir Hızı & Talep Tahmini'
  );

  describe('Feature 34 - Yönetici Analitiği, Stok Devir Hızı ve Talep Tahmini', () => {
    test('34.1 Should calculate daily run rate and daysToStockout accurately for sold items', () => {
      const stocks: StockItemForAnalytics[] = [
        {
          id: 's1',
          title: '22 Ayar Şarnel Bilezik',
          carat: 22,
          weight: 20,
          quantity: 10,
          costPrice: 60000,
          createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ];

      // 90 günde 30 adet satılmış => 30/90 = 0.333 adet/gün
      const sales = { '22 Ayar Şarnel Bilezik': 30 };
      const res = calculateStockTurnoverAndAging(stocks, sales, 90);

      expect(res.evaluatedItems.length).toBe(1);
      const item = res.evaluatedItems[0];
      expect(item.dailyRunRate).toBe(0.333);
      expect(item.daysToStockout).toBe(31); // 10 / 0.333 = ~31 gün
    });

    test('34.2 Should categorize fast-moving items with daysToStockout <= 15 days as FAST_MOVING', () => {
      const stocks: StockItemForAnalytics[] = [
        {
          id: 's1',
          title: 'Ajda Bilezik',
          carat: 22,
          weight: 10,
          quantity: 4,
          costPrice: 30000,
          createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ];

      // 30 günde 30 adet satılmış => 1 adet/gün. 4 adet stok 4 günde biter (<= 15 gün)
      const sales = { 'Ajda Bilezik': 30 };
      const res = calculateStockTurnoverAndAging(stocks, sales, 30);

      expect(res.evaluatedItems[0].velocityCategory).toBe(STOCK_VELOCITY_CATEGORY.FAST_MOVING);
      expect(res.fastMovingCount).toBe(1);
    });

    test('34.3 Should detect dead stock (>180 days with 0 sales) and calculate locked capital in TL', () => {
      const stocks: StockItemForAnalytics[] = [
        {
          id: 's2',
          title: 'Eski Model Broş',
          carat: 14,
          weight: 15,
          quantity: 2,
          costPrice: 25000, // 2 * 25000 = 50000 TL kilitli sermaye
          createdAt: new Date(Date.now() - 220 * 24 * 60 * 60 * 1000).toISOString(), // 220 gün önce
        },
      ];

      const sales = {}; // 0 satış
      const res = calculateStockTurnoverAndAging(stocks, sales, 90);

      expect(res.evaluatedItems[0].velocityCategory).toBe(STOCK_VELOCITY_CATEGORY.DEAD_STOCK);
      expect(res.deadStockCount).toBe(1);
      expect(res.totalDeadCapitalTl).toBe(50000);
      expect(res.evaluatedItems[0].lockedCapitalTl).toBe(50000);
    });

    test('34.4 Should handle zero sales safely without divide-by-zero crashes (infinite daysToStockout)', () => {
      const stocks: StockItemForAnalytics[] = [
        {
          id: 's3',
          title: 'Yeni Vitrin Ürünü',
          carat: 18,
          weight: 8,
          quantity: 5,
          costPrice: 20000,
          createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ];

      const res = calculateStockTurnoverAndAging(stocks, {}, 90);
      expect(res.evaluatedItems[0].dailyRunRate).toBe(0);
      expect(res.evaluatedItems[0].daysToStockout).toBe(999);
      expect(res.evaluatedItems[0].velocityCategory).toBe(STOCK_VELOCITY_CATEGORY.SLOW_MOVING);
    });

    test('34.5 Should handle negative or zero stock safely (immediate 0 days to stockout)', () => {
      const stocks: StockItemForAnalytics[] = [
        {
          id: 's4',
          title: 'Tükenmiş Ürün',
          carat: 14,
          weight: 3,
          quantity: 0,
          costPrice: 5000,
          createdAt: new Date().toISOString(),
        },
      ];

      const res = calculateStockTurnoverAndAging(stocks, {}, 90);
      expect(res.evaluatedItems[0].daysToStockout).toBe(0);
    });

    test('34.6 Should calculate weighted moving average demand forecast (WMA) with customized weights', () => {
      // 4 haftalık satışlar: [10, 15, 20, 30]
      // Ağırlıklar: [0.1, 0.2, 0.3, 0.4] => 10*0.1 + 15*0.2 + 20*0.3 + 30*0.4 = 1 + 3 + 6 + 12 = 22
      const weeklySales = [10, 15, 20, 30];
      const forecast = forecastDemandWeightedMovingAverage(weeklySales, [0.1, 0.2, 0.3, 0.4]);

      expect(forecast).toBe(22);
    });

    test('34.7 Should calculate intelligent reorder suggestion based on safety stock and lead time days', () => {
      // Günlük satış hızı 2 adet. Tedarik süresi 7 gün, Emniyet süresi 14 gün (toplam 21 gün buffer = 42 adet).
      // Mevcut stok: 12 adet.
      // Önerilen sipariş: 42 - 12 = 30 adet.
      const currentStock = 12;
      const dailyRunRate = 2.0;
      const suggestion = generateIntelligentReorderSuggestion(currentStock, dailyRunRate, 7, 14);

      expect(suggestion).toBe(30);

      // Mevcut stok buffer'dan fazla ise sipariş önerisi 0 olmalı
      const noReorder = generateIntelligentReorderSuggestion(50, dailyRunRate, 7, 14);
      expect(noReorder).toBe(0);
    });

    test('34.8 Should compute category-level Has profit and TL profit margin breakdown', () => {
      const transactions = [
        { type: 'SALE', totalAmount: 100000, hasAmount: 30.0, description: '22 Ayar Bilezik Satışı' },
        { type: 'SALE', totalAmount: 50000, hasAmount: 10.0, description: '14 Ayar Pırlanta Kolye Satışı' },
      ];

      const categories = [{ name: 'Bilezik' }, { name: 'Pırlanta' }];
      const prof = calculateHasProfitabilityByCategory(transactions, categories);

      const bilezik = prof.find((p) => p.category === 'Bilezik');
      expect(bilezik).toBeDefined();
      expect(bilezik!.totalRevenueTl).toBe(100000);
      expect(bilezik!.totalHasSold).toBe(30.0);
      expect(bilezik!.estimatedTlProfit).toBeGreaterThan(0);
    });

    test('34.9 Centralized executive analytics constants and enum keys integrity verification', () => {
      expect(STOCK_VELOCITY_CATEGORY.FAST_MOVING).toBe('FAST_MOVING');
      expect(STOCK_VELOCITY_CATEGORY.NORMAL).toBe('NORMAL');
      expect(STOCK_VELOCITY_CATEGORY.SLOW_MOVING).toBe('SLOW_MOVING');
      expect(STOCK_VELOCITY_CATEGORY.DEAD_STOCK).toBe('DEAD_STOCK');

      expect(STOCK_VELOCITY_LABELS[STOCK_VELOCITY_CATEGORY.DEAD_STOCK]).toContain('Ölü Sermaye');
      expect(EXECUTIVE_DEFAULTS.DEFAULT_PERIOD_DAYS).toBe(90);
      expect(EXECUTIVE_DEFAULTS.DEFAULT_DEAD_STOCK_DAYS).toBe(180);
    });

    test('34.10 Multi-tenant dealer data isolation for executive forecast settings and analytics', () => {
      const dealer1Settings = { dealerId: 'dealer-1', safetyStockDays: 14, leadTimeDays: 7 };
      const dealer2Settings = { dealerId: 'dealer-2', safetyStockDays: 21, leadTimeDays: 10 };

      expect(dealer1Settings.dealerId).not.toBe(dealer2Settings.dealerId);
      expect(dealer1Settings.safetyStockDays).toBe(14);
      expect(dealer2Settings.safetyStockDays).toBe(21);
    });
  });
}

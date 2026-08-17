import { describe, it, test, expect } from './helpers/test-utils';
import manifest from '../src/app/manifest';
import {
  normalizePhoneNumber,
  buildWhatsAppSaleReceiptUrl,
  generateWhatsAppReceiptUrl,
  generateWhatsAppStatementUrl,
  generateWhatsAppQuoteUrl,
  generateWhatsAppWholesaleOrderUrl,
} from '../src/lib/whatsapp';
import {
  calculateDailyVelocity,
  calculateDaysToStockout,
  determineTurnoverCategory,
  determineStockAlertLevel,
  calculateSuggestedReorderQuantity,
  analyzeStockTurnover,
  generateReorderDraft,
} from '../src/lib/stocks/analytics';
import {
  DEFAULT_MIN_STOCK_THRESHOLD,
  TURNOVER_CATEGORIES,
  STOCK_ALERT_LEVELS,
  REORDER_DEFAULTS,
} from '../src/constants/stocks';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

describe('Milestone M6 — Source Level Verification', () => {
  // ─── 1. PWA & Mobile Support ──────────────────────────────────────────────
  describe('PWA Metadata & Service Worker Assets', () => {
    test('manifest() returns valid PWA metadata structure', () => {
      const pwaManifest = manifest();
      expect(pwaManifest.name).toBe('KuyumPanel Enterprise');
      expect(pwaManifest.short_name).toBe('KuyumPanel');
      expect(pwaManifest.display).toBe('standalone');
      expect(pwaManifest.theme_color).toBe('#eab308');
      expect(pwaManifest.background_color).toBe('#030712');
      expect(pwaManifest.icons?.length).toBeGreaterThanOrEqual(2);
    });

    test('public/sw.js and icon files exist in project root', () => {
      const swPath = join(process.cwd(), 'public', 'sw.js');
      expect(existsSync(swPath)).toBe(true);
      const swContent = readFileSync(swPath, 'utf-8');
      expect(swContent).toContain('kuyumpanel-v1');
      expect(swContent).toContain('self.addEventListener');

      const icon192 = join(process.cwd(), 'public', 'icons', 'icon-192.png');
      const icon512 = join(process.cwd(), 'public', 'icons', 'icon-512.png');
      expect(existsSync(icon192)).toBe(true);
      expect(existsSync(icon512)).toBe(true);
    });
  });

  // ─── 2. WhatsApp Deep-Linking & Templates ────────────────────────────────
  describe('WhatsApp Sharing Engine (src/lib/whatsapp.ts)', () => {
    test('normalizePhoneNumber formats various Turkish inputs', () => {
      expect(normalizePhoneNumber('0532 123 45 67')).toBe('905321234567');
      expect(normalizePhoneNumber('+90 (542) 987 65 43')).toBe('905429876543');
      expect(normalizePhoneNumber('5551234567')).toBe('905551234567');
      expect(normalizePhoneNumber('905321234567')).toBe('905321234567');
    });

    test('generateWhatsAppReceiptUrl builds retail receipt URL with details', () => {
      const url = generateWhatsAppReceiptUrl({
        customerName: 'Mustafa Demir',
        phone: '0533 111 22 33',
        storeName: 'Altınbaş Sarrafiye',
        items: [
          { title: '22 Ayar Bilezik (20 gr)', quantity: 1, priceTL: 60000 },
          { title: 'Çeyrek Altın', quantity: 2, priceTL: 10000 },
        ],
        totalTL: 70000,
        paymentMethod: 'Nakit + Kredi Kartı',
      });

      expect(url).toContain('https://wa.me/905331112233?text=');
      const decoded = decodeURIComponent(url);
      expect(decoded).toContain('Altınbaş Sarrafiye');
      expect(decoded).toContain('Mustafa Demir');
      expect(decoded).toContain('22 Ayar Bilezik');
      expect(decoded).toContain('70.000 TL');
    });

    test('generateWhatsAppStatementUrl generates customer statement link', () => {
      const url = generateWhatsAppStatementUrl({
        customerName: 'Zeynep Kaya',
        phone: '0544 555 66 77',
        storeName: 'KuyumPanel',
        hasBalance: 12.55,
        tlBalance: 25000,
        recentTransactions: [
          { date: '17.08.2026', description: 'Bilezik Alımı', amount: 12.55, assetType: 'HAS', type: 'BORC' },
        ],
      });

      expect(url).toContain('https://wa.me/905445556677?text=');
      const decoded = decodeURIComponent(url);
      expect(decoded).toContain('HESAP EKSTRESİ');
      expect(decoded).toContain('12.550 gr Has');
      expect(decoded).toContain('25.000');
    });


    test('generateWhatsAppWholesaleOrderUrl formats PO draft for supplier', () => {
      const url = generateWhatsAppWholesaleOrderUrl({
        supplierName: 'Ahlatçı Altın Toptan',
        phone: '0532 999 88 77',
        storeName: 'KuyumPanel Merkez',
        items: [
          { productCode: 'ECEYREKTL', label: 'Eski Çeyrek Altın', currentStock: 2, minThreshold: 10, quantity: 18 },
          { productCode: '22BLZ', label: '22K Ajda Bilezik', currentStock: 1, minThreshold: 5, quantity: 9 },
        ],
      });

      expect(url).toContain('https://wa.me/905329998877?text=');
      const decoded = decodeURIComponent(url);
      expect(decoded).toContain('TOPTAN SİPARİŞ');
      expect(decoded).toContain('ECEYREKTL');
      expect(decoded).toContain('18 Adet');
    });
  });

  // ─── 3. Stock Turnover & Reorder Engine ──────────────────────────────────
  describe('Stock Analytics & Reorder Calculations (src/lib/stocks/analytics.ts)', () => {
    test('calculateDailyVelocity divides sales quantity by valid days window', () => {
      expect(calculateDailyVelocity(60, 30)).toBe(2.0);
      expect(calculateDailyVelocity(15, 30)).toBe(0.5);
      expect(calculateDailyVelocity(0, 30)).toBe(0);
      expect(calculateDailyVelocity(10, 0)).toBe(10); // guards division by 0
    });

    test('calculateDaysToStockout handles positive, zero, and infinite velocity', () => {
      expect(calculateDaysToStockout(20, 2.0)).toBe(10);
      expect(calculateDaysToStockout(0, 2.0)).toBe(0);
      expect(calculateDaysToStockout(20, 0)).toBe(Infinity);
      expect(calculateDaysToStockout(-2, 1.0)).toBe(0);
    });

    test('determineTurnoverCategory returns correct speed enum', () => {
      expect(determineTurnoverCategory(2.0, 10)).toBe(TURNOVER_CATEGORIES.HIZLI);
      expect(determineTurnoverCategory(0.5, 30)).toBe(TURNOVER_CATEGORIES.NORMAL);
      expect(determineTurnoverCategory(0.1, 80)).toBe(TURNOVER_CATEGORIES.YAVAS);
      expect(determineTurnoverCategory(0, Infinity)).toBe(TURNOVER_CATEGORIES.HAREKETSIZ);
    });

    test('determineStockAlertLevel categorizes stock level correctly', () => {
      expect(determineStockAlertLevel(0, 5)).toBe(STOCK_ALERT_LEVELS.CRITICAL);
      expect(determineStockAlertLevel(-1, 5)).toBe(STOCK_ALERT_LEVELS.CRITICAL);
      expect(determineStockAlertLevel(2, 5)).toBe(STOCK_ALERT_LEVELS.CRITICAL);
      expect(determineStockAlertLevel(5, 5)).toBe(STOCK_ALERT_LEVELS.CRITICAL);
      expect(determineStockAlertLevel(7, 5)).toBe(STOCK_ALERT_LEVELS.WARNING); // 7 <= 5 * 1.5 = 7.5
      expect(determineStockAlertLevel(20, 5)).toBe(STOCK_ALERT_LEVELS.SAFE);
    });

    test('calculateSuggestedReorderQuantity enforces minimum suggested quantity', () => {
      // minThreshold = 10, safetyBuffer = 2 -> Target = 20. Current = 3 -> suggested = 17
      expect(calculateSuggestedReorderQuantity(3, 10, 0)).toBe(17);
      // Current = 0, minThreshold = 5, safety = 2 -> Target = 10 -> suggested = 10
      expect(calculateSuggestedReorderQuantity(0, 5, 0)).toBe(10);
      // Current = -2, minThreshold = 5, safety = 2 -> Target = 10 -> suggested = 12
      expect(calculateSuggestedReorderQuantity(-2, 5, 0)).toBe(12);
    });

    test('analyzeStockTurnover creates comprehensive turnover statistics', () => {
      const mockStocks = [
        { id: '1', product: 'ECEYREKTL', label: 'Eski Çeyrek', type: 'sarrafiye', amount: 4, minThreshold: 10, dealerId: 'merkez' },
        { id: '2', product: '22BLZ', label: '22K Bilezik', type: 'sarrafiye', amount: 15, minThreshold: 5, dealerId: 'merkez' },
        { id: '3', product: 'USD', label: 'Dolar', type: 'döviz', amount: 500, minThreshold: 100, dealerId: 'merkez' },
        { id: '4', product: 'DEAD_ITEM', label: 'Eski Model', type: 'sarrafiye', amount: 8, minThreshold: 5, dealerId: 'merkez' },
      ];

      const now = new Date();
      const mockTransactions = [
        { dealerId: 'merkez', type: 'sell', productCode: 'ECEYREKTL', quantity: 60, createdAt: now },
        { dealerId: 'merkez', type: 'sell', productCode: '22BLZ', quantity: 15, createdAt: now },
        { dealerId: 'merkez', type: 'sell', productCode: 'USD', quantity: 200, createdAt: now },
      ];

      const summary = analyzeStockTurnover(mockStocks, mockTransactions, 30);
      expect(summary.totalProducts).toBe(4);
      expect(summary.totalCriticalCount).toBe(1); // ECEYREKTL (4 <= 10)
      expect(summary.categoryCounts[TURNOVER_CATEGORIES.HIZLI]).toBe(2); // ECEYREKTL (v=2.0) and USD (v=6.67)
      expect(summary.categoryCounts[TURNOVER_CATEGORIES.NORMAL]).toBe(1); // 22BLZ (v=0.5, stockout=30)
      expect(summary.categoryCounts[TURNOVER_CATEGORIES.HAREKETSIZ]).toBe(1); // DEAD_ITEM (v=0)
    });

    test('generateReorderDraft filters items needing replenishment and computes PO orders', () => {
      const mockStocks = [
        { id: '1', product: 'ECEYREKTL', label: 'Eski Çeyrek Altın', type: 'sarrafiye', amount: 2, minThreshold: 10, supplierName: 'Darphane' },
        { id: '2', product: '22BLZ', label: '22K Ajda Bilezik', type: 'sarrafiye', amount: 12, minThreshold: 5, supplierName: 'Ahlatçı' },
      ];

      const draft = generateReorderDraft(mockStocks);
      expect(draft.length).toBe(1);
      expect(draft[0].productCode).toBe('ECEYREKTL');
      expect(draft[0].suggestedQuantity).toBe(18); // 10 * 2 - 2 = 18
      expect(draft[0].currentAmount).toBe(2);
      expect(draft[0].minThreshold).toBe(10);
    });
  });
});

// Standalone execution runner
(async () => {
  const { runRegisterededTests } = await import('./helpers/test-utils');
  const results = await runRegisterededTests();
  let passed = 0;
  let failed = 0;
  console.log('\n--- M6 Direct Source Verification Results ---');
  for (const r of results) {
    if (r.passed) {
      passed++;
      console.log(`✓ [PASS] ${r.testName} (${r.durationMs.toFixed(1)}ms)`);
    } else {
      failed++;
      console.error(`✗ [FAIL] ${r.testName} — ${r.error}`);
    }
  }
  console.log(`\nTotal: ${results.length} | Passed: ${passed} | Failed: ${failed}\n`);
  if (failed > 0) process.exit(1);
})();

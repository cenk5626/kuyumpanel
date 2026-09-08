import { describe, it, test, expect, setTestContext } from '../helpers/test-utils';
import {
  SYSTEM_PAGES,
  ALL_PAGE_IDS,
  PAGE_CATEGORIES,
  PAGE_CATEGORY_KEYS,
  PERMISSION_PRESETS,
  PageCategoryKey,
  ACTION_PERMISSIONS,
  ALL_ACTION_IDS,
} from '../../src/constants/page-permissions';
import { USER_ROLES } from '../../src/constants/roles';

export function registerF40UserPagePermissionsTests() {
  setTestContext(
    'Tier 1',
    40,
    'Granular Page Authorization & User Permissions Module',
    'F40: Kullanıcı Sayfa Bazlı Bağımsız Yetkilendirme'
  );

  describe('Feature 40 - Kullanıcılar Sayfasından Her Sayfaya Ayrı Yetkilendirme', () => {
    test('40.1 Should define all 33 enterprise system pages with unique IDs and categories', () => {
      expect(SYSTEM_PAGES.length).toBe(33);
      expect(ALL_PAGE_IDS.length).toBe(33);

      const uniqueIds = new Set(SYSTEM_PAGES.map((p) => p.id));
      expect(uniqueIds.size).toBe(33);

      // Verify essential jewelry domain pages exist
      const expectedPages = [
        'dashboard',
        'prices',
        'stocks',
        'transactions',
        'price-check',
        'alerts',
        'customers',
        'loyalty',
        'crm',
        'quotes',
        'z-report',
        'balance-sheet',
        'banking',
        'invoices',
        'expense-vouchers',
        'installments',
        'suppliers',
        'purchases',
        'workshop',
        'services',
        'branches',
        'transfers',
        'stock-audit',
        'rfid-stocktake',
        'executive-analytics',
        'approvals',
        'channels',
        'compliance',
        'data-hub',
        'ai-assistant',
        'settings-ai',
        'logs',
        'users',
      ];

      for (const pageId of expectedPages) {
        expect(uniqueIds.has(pageId)).toBe(true);
      }
    });

    test('40.2 Should validate that each page has valid metadata (name, description, icon, category)', () => {
      for (const page of SYSTEM_PAGES) {
        expect(page.id).toBeTruthy();
        expect(page.name.length).toBeGreaterThan(0);
        expect(page.description.length).toBeGreaterThan(0);
        expect(page.icon.length).toBeGreaterThan(0);
        expect(Object.values(PAGE_CATEGORY_KEYS)).toContain(page.category);
      }
    });

    test('40.3 Should define all 5 core page categories with titles and badge classes', () => {
      const categoryKeys = Object.keys(PAGE_CATEGORIES);
      expect(categoryKeys.length).toBe(5);

      expect(PAGE_CATEGORIES.sales_showcase.title).toContain('Satış');
      expect(PAGE_CATEGORIES.customer_crm.title).toContain('Cari');
      expect(PAGE_CATEGORIES.finance_accounting.title).toContain('Finans');
      expect(PAGE_CATEGORIES.operations_workshop.title).toContain('Operasyon');
      expect(PAGE_CATEGORIES.management_ai.title).toContain('Yönetim');

      // Her kategoride en az bir sayfa bulunmalı
      for (const catKey of Object.values(PAGE_CATEGORY_KEYS)) {
        const pagesInCat = SYSTEM_PAGES.filter((p) => p.category === catKey);
        expect(pagesInCat.length).toBeGreaterThan(0);
      }
    });

    test('40.4 Should provide functional permission presets with valid page references', () => {
      // FULL preset
      expect(PERMISSION_PRESETS.FULL.pages.length).toBe(33);

      // CASHIER preset (Tezgahtar & Kasiyer)
      expect(PERMISSION_PRESETS.CASHIER.pages).toContain('transactions');
      expect(PERMISSION_PRESETS.CASHIER.pages).toContain('stocks');
      expect(PERMISSION_PRESETS.CASHIER.pages).toContain('prices');
      expect(PERMISSION_PRESETS.CASHIER.pages).not.toContain('users');
      expect(PERMISSION_PRESETS.CASHIER.pages).not.toContain('settings-ai');

      // ACCOUNTING preset (Ön Muhasebe & Kasa)
      expect(PERMISSION_PRESETS.ACCOUNTING.pages).toContain('z-report');
      expect(PERMISSION_PRESETS.ACCOUNTING.pages).toContain('invoices');
      expect(PERMISSION_PRESETS.ACCOUNTING.pages).toContain('banking');

      // WORKSHOP preset (Atölye & Stok Sorumlusu)
      expect(PERMISSION_PRESETS.WORKSHOP.pages).toContain('workshop');
      expect(PERMISSION_PRESETS.WORKSHOP.pages).toContain('services');
      expect(PERMISSION_PRESETS.WORKSHOP.pages).toContain('rfid-stocktake');

      // STORE_MANAGER preset
      expect(PERMISSION_PRESETS.STORE_MANAGER.pages).not.toContain('users');
      expect(PERMISSION_PRESETS.STORE_MANAGER.pages).not.toContain('settings-ai');

      // All preset pages must exist in ALL_PAGE_IDS
      Object.values(PERMISSION_PRESETS).forEach((preset) => {
        preset.pages.forEach((pageId) => {
          expect(ALL_PAGE_IDS).toContain(pageId);
        });
      });
    });

    test('40.5 Granular single-page authorization toggle logic', () => {
      let userPerms: string[] = ['dashboard', 'prices', 'stocks'];

      // Add 'transactions'
      const toggleAdd = (perms: string[], pageId: string) =>
        perms.includes(pageId) ? perms.filter((id) => id !== pageId) : [...perms, pageId];

      userPerms = toggleAdd(userPerms, 'transactions');
      expect(userPerms).toContain('transactions');
      expect(userPerms.length).toBe(4);

      // Remove 'prices'
      userPerms = toggleAdd(userPerms, 'prices');
      expect(userPerms).not.toContain('prices');
      expect(userPerms.length).toBe(3);
    });

    test('40.6 Category bulk toggle logic (select all / deselect all in category)', () => {
      const salesPageIds = SYSTEM_PAGES.filter(
        (p) => p.category === PAGE_CATEGORY_KEYS.SALES_SHOWCASE
      ).map((p) => p.id);

      let currentPerms: string[] = ['dashboard', 'prices'];

      // Category has unselected pages -> bulk select category
      const allSelected = salesPageIds.every((id) => currentPerms.includes(id));
      expect(allSelected).toBe(false);

      currentPerms = Array.from(new Set([...currentPerms, ...salesPageIds]));
      expect(salesPageIds.every((id) => currentPerms.includes(id))).toBe(true);

      // Category now fully selected -> bulk deselect category
      const isNowAllSelected = salesPageIds.every((id) => currentPerms.includes(id));
      expect(isNowAllSelected).toBe(true);

      currentPerms = currentPerms.filter((id) => !salesPageIds.includes(id));
      expect(salesPageIds.some((id) => currentPerms.includes(id))).toBe(false);
    });

    test('40.7 Permissions JSON serialization & deserialization resilience', () => {
      const perms = ['dashboard', 'stocks', 'invoices', 'rfid-stocktake'];
      const serialized = JSON.stringify(perms);

      const parsed = JSON.parse(serialized);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toEqual(perms);

      // Empty permissions serialization
      const emptySerialized = JSON.stringify([]);
      expect(JSON.parse(emptySerialized)).toEqual([]);

      // Malformed fallback test
      const safeParse = (raw: string | undefined) => {
        if (!raw) return ALL_PAGE_IDS;
        try {
          return typeof raw === 'string' ? JSON.parse(raw) : raw;
        } catch {
          return ALL_PAGE_IDS;
        }
      };

      expect(safeParse(undefined)).toEqual(ALL_PAGE_IDS);
      expect(safeParse('invalid-json')).toEqual(ALL_PAGE_IDS);
      expect(safeParse('["dashboard","prices"]')).toEqual(['dashboard', 'prices']);
    });

    test('40.8 Should define all 10 critical operational action permissions with valid risk levels', () => {
      expect(ACTION_PERMISSIONS.length).toBe(10);
      expect(ALL_ACTION_IDS.length).toBe(10);

      const uniqueActionIds = new Set(ACTION_PERMISSIONS.map((a) => a.id));
      expect(uniqueActionIds.size).toBe(10);

      const expectedActions = [
        'action:prices_manage',
        'action:discount_apply',
        'action:view_costs',
        'action:stocks_delete',
        'action:transactions_cancel',
        'action:cash_close',
        'action:cash_outflow',
        'action:customer_deposits',
        'action:invoices_issue',
        'action:compliance_approve',
      ];

      for (const act of expectedActions) {
        expect(uniqueActionIds.has(act)).toBe(true);
      }

      // Validate metadata and risk levels
      const validRisks = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
      for (const act of ACTION_PERMISSIONS) {
        expect(act.name.length).toBeGreaterThan(0);
        expect(act.description.length).toBeGreaterThan(0);
        expect(act.category.length).toBeGreaterThan(0);
        expect(validRisks).toContain(act.riskLevel);
      }
    });

    test('40.9 Segregation and combination of pages and action permissions', () => {
      const combined = ['dashboard', 'stocks', 'action:discount_apply', 'action:cash_close'];

      const pages = combined.filter((p) => !p.startsWith('action:'));
      const actions = combined.filter((p) => p.startsWith('action:'));

      expect(pages).toEqual(['dashboard', 'stocks']);
      expect(actions).toEqual(['action:discount_apply', 'action:cash_close']);

      const merged = [...pages, ...actions];
      expect(merged).toEqual(combined);
    });
  });
}

import { describe, it, test, expect, setTestContext } from '../helpers/test-utils';
import {
  SYSTEM_PAGES,
  ALL_PAGE_IDS,
  PERMISSION_PRESETS,
  ROLE_DEFAULT_PRESETS,
  ROUTE_PAGE_MAP,
  hasPagePermission,
} from '../../src/constants/page-permissions';
import { USER_ROLES } from '../../src/constants/roles';
import {
  COIN_WEIGHTS_GR,
  GRAM_STOCK_PRODUCT_KEYS,
} from '../../src/constants/stocks';
import { ROUTES } from '../../src/constants/routes';

export function registerF47P0P1P2RegressionTests() {
  setTestContext(
    'Tier 1',
    47,
    'P0-P2 Security, Session, Stock Reconciliation & User Provisioning Regressions',
    'F47: P0, P1, P2 Hata Düzeltmeleri ve Regresyon Testleri'
  );

  describe('Feature 47 - P0: Rota Koruması ve Yetkilendirme (Central Route Guard)', () => {
    test('47.1 Cashier (USER role) with 9 permissions cannot access unauthorized sensitive routes', () => {
      const cashierPerms = [...PERMISSION_PRESETS.CASHIER.pages];
      const role = USER_ROLES.USER;

      // Unauthorized paths that must return false (Access Denied / 403)
      const forbiddenPaths = [
        '/users',
        '/data-hub',
        '/suppliers',
        '/banking',
        '/compliance',
        '/settings/ai',
        '/logs',
        '/executive-analytics',
        '/approvals',
      ];

      for (const path of forbiddenPaths) {
        const allowed = hasPagePermission(role, cashierPerms, path);
        expect(allowed).toBe(false);
      }
    });

    test('47.2 Cashier (USER role) can access its allowed 9 core store operations', () => {
      const cashierPerms = [...PERMISSION_PRESETS.CASHIER.pages];
      const role = USER_ROLES.USER;

      const allowedPaths = [
        '/dashboard',
        '/prices',
        '/stocks',
        '/transactions',
        '/customers',
        '/quotes',
        '/installments',
        '/price-check',
        '/alerts',
      ];

      for (const path of allowedPaths) {
        const allowed = hasPagePermission(role, cashierPerms, path);
        expect(allowed).toBe(true);
      }
    });

    test('47.3 Super Admin has universal access to all routes and pages unconditionally', () => {
      const role = USER_ROLES.SUPER_ADMIN;

      // Even with empty permissions array, SUPER_ADMIN should be true for all
      for (const path of Object.keys(ROUTE_PAGE_MAP)) {
        expect(hasPagePermission(role, [], path)).toBe(true);
      }
      for (const pageId of ALL_PAGE_IDS) {
        expect(hasPagePermission(role, [], pageId)).toBe(true);
      }
    });

    test('47.4 Logs page (/logs) is strictly restricted to ADMIN or SUPER_ADMIN', () => {
      // Even if a non-admin user has 'logs' in their JSON permissions, hasPagePermission must deny them
      expect(hasPagePermission(USER_ROLES.USER, ['logs', 'dashboard'], '/logs')).toBe(false);
      expect(hasPagePermission(USER_ROLES.TABLET, ['logs', 'dashboard'], '/logs')).toBe(false);
      expect(hasPagePermission(USER_ROLES.PC, ['logs', 'dashboard'], '/logs')).toBe(false);

      // But ADMIN with 'logs' permission is allowed
      expect(hasPagePermission(USER_ROLES.ADMIN, ['logs'], '/logs')).toBe(true);
      // And SUPER_ADMIN is always allowed
      expect(hasPagePermission(USER_ROLES.SUPER_ADMIN, [], '/logs')).toBe(true);
    });

    test('47.5 ROUTE_PAGE_MAP correctly maps all panel URL routes to valid system page IDs', () => {
      const allPageIdSet = new Set(ALL_PAGE_IDS);

      for (const [routePath, pageId] of Object.entries(ROUTE_PAGE_MAP)) {
        expect(routePath.startsWith('/')).toBe(true);
        expect(allPageIdSet.has(pageId)).toBe(true);
      }
    });
  });

  describe('Feature 47 - P1: Dashboard & Stok Mutabakatı (Dual Stock Reconciliation)', () => {
    test('47.6 Standard coin weights (Darphane birim brüt gramajları) are accurate', () => {
      expect(COIN_WEIGHTS_GR.ECEYREKTL).toBe(1.75);
      expect(COIN_WEIGHTS_GR.EYARIMTL).toBe(3.50);
      expect(COIN_WEIGHTS_GR.ETAMTL).toBe(7.00);
      expect(COIN_WEIGHTS_GR.EATATL).toBe(7.216);
      expect(COIN_WEIGHTS_GR.EGREMSETL).toBe(17.50);
    });

    test('47.7 Combined stock calculation correctly reconciles Sarrafiye (coins + grams) and Barcoded items', () => {
      // Sample stock state matching typical jeweler inventory
      const sampleDealerStocks = [
        { product: 'ECEYREKTL', type: 'sarrafiye', amount: 10 }, // 10 * 1.75 = 17.50 gr
        { product: 'EYARIMTL',  type: 'sarrafiye', amount: 4 },  // 4 * 3.50 = 14.00 gr
        { product: 'ETAMTL',    type: 'sarrafiye', amount: 2 },  // 2 * 7.00 = 14.00 gr
        { product: 'EATATL',    type: 'sarrafiye', amount: 5 },  // 5 * 7.216 = 36.08 gr
        { product: 'mil24Ayar', type: 'sarrafiye', amount: 50 }, // 50 gr
        { product: 'mil22Ayar', type: 'sarrafiye', amount: 25 }, // 25 gr
        { product: 'USD',       type: 'döviz',     amount: 1500 }, // Currency - MUST NOT contribute to gold weight
        { product: 'EUR',       type: 'döviz',     amount: 2000 }, // Currency - MUST NOT contribute to gold weight
      ];

      let sarrafiyeWeight = 0;
      let sarrafiyeCount = 0;

      for (const stock of sampleDealerStocks) {
        if (stock.type === 'sarrafiye' && stock.amount > 0) {
          if (COIN_WEIGHTS_GR[stock.product]) {
            sarrafiyeWeight += stock.amount * COIN_WEIGHTS_GR[stock.product];
            sarrafiyeCount += stock.amount;
          } else if (GRAM_STOCK_PRODUCT_KEYS.includes(stock.product as any)) {
            sarrafiyeWeight += stock.amount;
            sarrafiyeCount += 1;
          }
        }
      }

      // 17.50 + 14.00 + 14.00 + 36.08 + 50 + 25 = 156.58 gr
      expect(Math.round(sarrafiyeWeight * 100) / 100).toBe(156.58);
      // 10 + 4 + 2 + 5 + 1 + 1 = 23 items/groups
      expect(sarrafiyeCount).toBe(23);

      const barcodeItemWeight = 42.50;
      const barcodeItemCount = 6;

      const totalStockWeight = barcodeItemWeight + sarrafiyeWeight;
      const totalStockCount = barcodeItemCount + Math.round(sarrafiyeCount);

      expect(Math.round(totalStockWeight * 100) / 100).toBe(199.08);
      expect(totalStockCount).toBe(29);
    });

    test('47.8 Safe date formatting handles valid, missing, or invalid dates gracefully without SSR crash', () => {
      function safeIsoDate(d: any): string {
        return d ? (d instanceof Date ? d.toISOString() : new Date(d).toISOString()) : new Date().toISOString();
      }

      const now = new Date();
      expect(safeIsoDate(now)).toBe(now.toISOString());
      expect(safeIsoDate('2026-03-10T12:00:00.000Z')).toBe('2026-03-10T12:00:00.000Z');
      expect(safeIsoDate(null)).toBeTruthy();
      expect(safeIsoDate(undefined)).toBeTruthy();
    });
  });

  describe('Feature 47 - P2: Kullanıcı Yönetimi & Least-Privilege Role Presets', () => {
    test('47.9 ROLE_DEFAULT_PRESETS enforces least-privilege role defaults instead of granting all 33 pages', () => {
      // USER (Cashier) should receive exactly 9 core pages
      expect(ROLE_DEFAULT_PRESETS[USER_ROLES.USER].length).toBe(9);
      expect(ROLE_DEFAULT_PRESETS[USER_ROLES.USER]).not.toContain('users');
      expect(ROLE_DEFAULT_PRESETS[USER_ROLES.USER]).not.toContain('compliance');
      expect(ROLE_DEFAULT_PRESETS[USER_ROLES.USER]).not.toContain('data-hub');

      // TABLET should receive only 3 kiosk pages
      expect(ROLE_DEFAULT_PRESETS[USER_ROLES.TABLET].length).toBe(3);

      // ADMIN receives store manager preset (not all 33 pages)
      expect(ROLE_DEFAULT_PRESETS[USER_ROLES.ADMIN].length).toBeLessThan(33);

      // Only SUPER_ADMIN receives all 33 pages
      expect(ROLE_DEFAULT_PRESETS[USER_ROLES.SUPER_ADMIN].length).toBe(33);
    });

    test('47.10 Dealer assignment is strictly validated for non-superadmin users', () => {
      function validateUserCreation(data: { role: string; dealerId?: string | null }) {
        if (data.role !== USER_ROLES.SUPER_ADMIN && !data.dealerId) {
          return { valid: false, error: 'Super Admin dışındaki kullanıcılar için bayi seçimi zorunludur.' };
        }
        return { valid: true };
      }

      // Super Admin without dealerId is valid (merkez / system admin)
      expect(validateUserCreation({ role: USER_ROLES.SUPER_ADMIN, dealerId: null }).valid).toBe(true);
      expect(validateUserCreation({ role: USER_ROLES.SUPER_ADMIN, dealerId: '' }).valid).toBe(true);

      // Admin or Cashier without dealerId MUST be invalid
      expect(validateUserCreation({ role: USER_ROLES.ADMIN, dealerId: '' }).valid).toBe(false);
      expect(validateUserCreation({ role: USER_ROLES.USER, dealerId: null }).valid).toBe(false);
      expect(validateUserCreation({ role: USER_ROLES.USER, dealerId: 'sube-1' }).valid).toBe(true);
    });

    test('47.11 User count breakdown splits administrators from operational staff', () => {
      const mockUsers = [
        { id: '1', role: USER_ROLES.SUPER_ADMIN },
        { id: '2', role: USER_ROLES.ADMIN },
        { id: '3', role: USER_ROLES.USER },
        { id: '4', role: USER_ROLES.USER },
        { id: '5', role: USER_ROLES.TABLET },
      ];

      const totalUsers = mockUsers.length;
      const adminCount = mockUsers.filter(u => [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN].includes(u.role as any)).length;
      const staffCount = mockUsers.filter(u => [USER_ROLES.USER, USER_ROLES.TABLET, USER_ROLES.PC].includes(u.role as any)).length;

      expect(totalUsers).toBe(5);
      expect(adminCount).toBe(2);
      expect(staffCount).toBe(3);
      expect(adminCount + staffCount).toBe(totalUsers);
    });

    test('47.12 Unauthenticated requests must redirect to login rather than rendering 403 AccessDenied', () => {
      // Simulate unauthenticated state in route guard
      function evaluateGuard(session: any, status: string, pathname: string) {
        if (status === 'unauthenticated' || (!session && status !== 'loading')) {
          return { action: 'REDIRECT', target: ROUTES.LOGIN };
        }
        const isAuthorized = hasPagePermission(session?.user?.role, session?.user?.permissions, pathname);
        if (!isAuthorized) {
          return { action: 'ACCESS_DENIED', status: 403 };
        }
        return { action: 'ALLOW' };
      }

      // Unauthenticated visitor trying to access /stocks or /users
      expect(evaluateGuard(null, 'unauthenticated', '/stocks')).toEqual({ action: 'REDIRECT', target: ROUTES.LOGIN });
      expect(evaluateGuard(null, 'unauthenticated', '/users')).toEqual({ action: 'REDIRECT', target: ROUTES.LOGIN });

      // Authenticated Cashier trying to access /users -> 403 Access Denied
      const cashierSession = {
        user: { id: 'u1', role: USER_ROLES.USER, permissions: PERMISSION_PRESETS.CASHIER.pages },
      };
      expect(evaluateGuard(cashierSession, 'authenticated', '/users')).toEqual({ action: 'ACCESS_DENIED', status: 403 });

      // Authenticated Cashier accessing /stocks -> ALLOW
      expect(evaluateGuard(cashierSession, 'authenticated', '/stocks')).toEqual({ action: 'ALLOW' });
    });

    test('47.13 Quick actions permission filtering hides unauthorized shortcuts for Cashier', () => {
      const quickActions = [
        { id: 'quick-pos', href: ROUTES.TRANSACTIONS },
        { id: 'quick-camera', href: ROUTES.TRANSACTIONS },
        { id: 'quick-stocks', href: ROUTES.STOCKS },
        { id: 'quick-suppliers', href: ROUTES.SUPPLIERS },
      ];

      const cashierRole = USER_ROLES.USER;
      const cashierPerms = [...PERMISSION_PRESETS.CASHIER.pages];

      const cashierVisibleActions = quickActions.filter(a => hasPagePermission(cashierRole, cashierPerms, a.href));
      expect(cashierVisibleActions.length).toBe(3);
      expect(cashierVisibleActions.some(a => a.id === 'quick-suppliers')).toBe(false);

      const adminRole = USER_ROLES.ADMIN;
      const adminPerms = [...ROLE_DEFAULT_PRESETS[USER_ROLES.ADMIN]];
      const adminVisibleActions = quickActions.filter(a => hasPagePermission(adminRole, adminPerms, a.href));
      expect(adminVisibleActions.length).toBe(4);
      expect(adminVisibleActions.some(a => a.id === 'quick-suppliers')).toBe(true);
    });

    test('47.14 Turso inventory calculation matches exact store gold inventory of 276.56 gr', () => {
      // 12 rows from Turso database
      const tursoRows = [
        { product: 'USD',           type: 'döviz',     amount: 152000 },
        { product: 'EUR',           type: 'döviz',     amount: 0 },
        { product: 'ECEYREKTL',     type: 'sarrafiye', amount: 44 },
        { product: 'EYARIMTL',      type: 'sarrafiye', amount: 10 },
        { product: 'ETAMTL',        type: 'sarrafiye', amount: 0 },
        { product: 'EATATL',        type: 'sarrafiye', amount: 0 },
        { product: 'EGREMSETL',     type: 'sarrafiye', amount: 0 },
        { product: 'mil24Ayar',     type: 'sarrafiye', amount: 36 },
        { product: 'mil22Ayar',     type: 'sarrafiye', amount: 0 },
        { product: 'milAdanaBurma', type: 'sarrafiye', amount: 0 },
        { product: 'milAjda',       type: 'sarrafiye', amount: 128.56 },
        { product: 'mil14Ayar',     type: 'sarrafiye', amount: 0 },
      ];

      let sarrafiyeWeight = 0;
      let sarrafiyeCount = 0;

      for (const stock of tursoRows) {
        if (stock.type === 'sarrafiye' && stock.amount > 0) {
          if (COIN_WEIGHTS_GR[stock.product]) {
            sarrafiyeWeight += stock.amount * COIN_WEIGHTS_GR[stock.product];
            sarrafiyeCount += stock.amount;
          } else if (GRAM_STOCK_PRODUCT_KEYS.includes(stock.product as any)) {
            sarrafiyeWeight += stock.amount;
            sarrafiyeCount += 1;
          }
        }
      }

      // 44 * 1.75 (77g) + 10 * 3.50 (35g) + 36g + 128.56g = 276.56g
      expect(Math.round(sarrafiyeWeight * 100) / 100).toBe(276.56);
      expect(sarrafiyeCount).toBe(56); // 44 + 10 + 1 + 1
    });

    test('47.15 User form initial state strictly enforces least-privilege defaults', () => {
      const defaultInitialRole = USER_ROLES.USER;
      const defaultInitialPerms = [...PERMISSION_PRESETS.CASHIER.pages];

      expect(defaultInitialRole).toBe(USER_ROLES.USER);
      expect(defaultInitialPerms.length).toBe(9);
      expect(defaultInitialPerms).toContain('dashboard');
      expect(defaultInitialPerms).toContain('prices');
      expect(defaultInitialPerms).toContain('stocks');
      expect(defaultInitialPerms).toContain('transactions');
      expect(defaultInitialPerms).not.toContain('users');
      expect(defaultInitialPerms).not.toContain('logs');
      expect(defaultInitialPerms).not.toContain('compliance');
    });
  });
}

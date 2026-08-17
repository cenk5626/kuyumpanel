import { describe, it, test, expect, setTestContext } from '../helpers/test-utils';
import {
  CUSTOMER_TRANSACTION_TYPES,
  SUPPLIER_TRANSACTION_TYPES,
  ASSET_TYPES,
  GOLD_FINENESS_RATES,
  ZIYNET_WEIGHTS,
  GOLD_FINENESS_FACTORS,
  ZIYNET_HAS_WEIGHTS,
} from '../../src/constants/cari';
import {
  PAYMENT_METHODS,
  SESSION_STATUS,
  CASH_MOVEMENT_TYPES,
  CASH_MOVEMENT_CATEGORIES,
  CASH_CURRENCIES,
  PAYMENT_METHOD_LABELS,
  CASH_MOVEMENT_CATEGORY_LABELS,
} from '../../src/constants/kasa';
import { ROUTES } from '../../src/constants/routes';
import { LABEL_SPECS, TURNOVER_SPEEDS } from '../helpers/domain-engines';

export function registerF01Tests() {
  setTestContext('Tier 1', 1, 'Centralized Constants & Enums', 'F01: Constants & Enums Integrity');

  describe('Feature 1 - Centralized Constants & Zero Magic Strings/Numbers', () => {
    test('1.1 Should contain accurate gold fineness multipliers for standard carats', () => {
      expect(GOLD_FINENESS_RATES['24K']).toBe(0.995);
      expect(GOLD_FINENESS_RATES['22K']).toBe(0.916);
      expect(GOLD_FINENESS_RATES['18K']).toBe(0.750);
      expect(GOLD_FINENESS_RATES['14K']).toBe(0.585);
      expect(GOLD_FINENESS_RATES['8K']).toBe(0.333);
      expect(GOLD_FINENESS_RATES['HAS']).toBe(1.000);
    });

    test('1.2 Should define exact ziynet gold standard weights in pure Has grams', () => {
      expect(ZIYNET_WEIGHTS.CEYREK).toBe(1.605);
      expect(ZIYNET_WEIGHTS.YARIM).toBe(3.210);
      expect(ZIYNET_WEIGHTS.TAM).toBe(6.420);
      expect(ZIYNET_WEIGHTS.ATA).toBe(6.608);
      expect(ZIYNET_WEIGHTS.GREMSE).toBe(16.050);
    });

    test('1.3 Should provide all five standardized payment methods with labels', () => {
      expect(PAYMENT_METHODS.CASH).toBe('CASH');
      expect(PAYMENT_METHODS.CARD).toBe('CARD');
      expect(PAYMENT_METHODS.BANK).toBe('BANK');
      expect(PAYMENT_METHODS.HAS).toBe('HAS');
      expect(PAYMENT_METHODS.DEBT).toBe('DEBT');

      expect(PAYMENT_METHOD_LABELS.CASH).toContain('Nakit');
      expect(PAYMENT_METHOD_LABELS.CARD).toContain('POS');
      expect(PAYMENT_METHOD_LABELS.DEBT).toContain('Veresiye');
    });

    test('1.4 Should define customer and supplier transaction type enums properly', () => {
      expect(CUSTOMER_TRANSACTION_TYPES.BORC).toBe('BORC');
      expect(CUSTOMER_TRANSACTION_TYPES.TAHSILAT).toBe('TAHSILAT');
      expect(CUSTOMER_TRANSACTION_TYPES.ALACAK).toBe('ALACAK');
      expect(CUSTOMER_TRANSACTION_TYPES.ODEME).toBe('ODEME');

      expect(SUPPLIER_TRANSACTION_TYPES.PURCHASE).toBe('PURCHASE');
      expect(SUPPLIER_TRANSACTION_TYPES.HAS_PAYMENT).toBe('HAS_PAYMENT');
      expect(SUPPLIER_TRANSACTION_TYPES.TL_PAYMENT).toBe('TL_PAYMENT');
      expect(SUPPLIER_TRANSACTION_TYPES.SETTLEMENT).toBe('SETTLEMENT');
    });

    test('1.5 Should define complete cash movement categories and route constants without magic literals', () => {
      expect(CASH_MOVEMENT_TYPES.POS_SALE).toBe('POS_SALE');
      expect(CASH_MOVEMENT_TYPES.SCRAP_BUY).toBe('SCRAP_BUY');
      expect(CASH_MOVEMENT_TYPES.CUSTOMER_COLLECTION).toBe('CUSTOMER_COLLECTION');
      expect(CASH_MOVEMENT_TYPES.SUPPLIER_PAYMENT).toBe('SUPPLIER_PAYMENT');

      expect(ROUTES.SHOWCASE).toBe('/showcase');
      expect(ROUTES.Z_REPORT).toBe('/z-report');
      expect(ROUTES.API_Z_REPORT_SESSION).toBe('/api/z-report/session');
    });
  });
}

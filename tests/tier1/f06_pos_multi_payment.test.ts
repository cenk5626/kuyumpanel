import { describe, it, test, expect, setTestContext } from '../helpers/test-utils';
import { validateAndProcessPosSale, PosTransactionPayload } from '../helpers/domain-engines';
import { PAYMENT_METHODS } from '../../src/constants/kasa';

export function registerF06Tests() {
  setTestContext('Tier 1', 6, 'Multi-Payment POS Transaction', 'F06: Multi-Payment Split Validation');

  describe('Feature 6 - Multi-Payment POS Transaction Persistence & Validation', () => {
    test('6.1 Should validate pure Cash payment matching sale total', () => {
      const payload: PosTransactionPayload = {
        saleTotalTL: 25000,
        payments: [{ method: PAYMENT_METHODS.CASH, amount: 25000 }],
        items: [{ barcode: '14KP001', title: '14K Altın Kolye', quantity: 1, unitPriceTL: 25000 }],
      };

      const result = validateAndProcessPosSale(payload);
      expect(result.isValid).toBe(true);
      expect(result.cashPortion).toBe(25000);
      expect(result.cardPortion).toBe(0);
      expect(result.balanceDifference).toBe(0);
    });

    test('6.2 Should validate split payment across Cash and POS Credit Card', () => {
      const payload: PosTransactionPayload = {
        saleTotalTL: 50000,
        payments: [
          { method: PAYMENT_METHODS.CASH, amount: 20000 },
          { method: PAYMENT_METHODS.CARD, amount: 30000 },
        ],
        items: [{ barcode: '22BLZ01', title: '22K Adana Burma Bilezik', quantity: 1, unitPriceTL: 50000 }],
      };

      const result = validateAndProcessPosSale(payload);
      expect(result.isValid).toBe(true);
      expect(result.cashPortion).toBe(20000);
      expect(result.cardPortion).toBe(30000);
      expect(result.debtPortion).toBe(0);
      expect(result.totalPaid).toBe(50000);
    });

    test('6.3 Should reject sale if payment sum does not equal total sale price', () => {
      const payload: PosTransactionPayload = {
        saleTotalTL: 40000,
        payments: [
          { method: PAYMENT_METHODS.CASH, amount: 15000 },
          { method: PAYMENT_METHODS.CARD, amount: 20000 },
        ], // 35,000 TL paid instead of 40,000
        items: [{ barcode: '14YZK01', title: '14K Tektaş Yüzük', quantity: 1, unitPriceTL: 40000 }],
      };

      const result = validateAndProcessPosSale(payload);
      expect(result.isValid).toBe(false);
      expect(result.balanceDifference).toBe(5000);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('6.4 Should require a customerId when Veresiye (DEBT) method is used', () => {
      const invalidPayload: PosTransactionPayload = {
        saleTotalTL: 10000,
        payments: [{ method: PAYMENT_METHODS.DEBT, amount: 10000 }],
        customerId: null, // missing customer
        items: [{ barcode: '14KP002', title: '14K Küpe', quantity: 1, unitPriceTL: 10000 }],
      };

      const result = validateAndProcessPosSale(invalidPayload);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('veresiye') || e.includes('müşteri'))).toBe(true);
    });

    test('6.5 Should accept 4-way multi-split (Cash + Card + Bank + Debt) with valid customer', () => {
      const payload: PosTransactionPayload = {
        saleTotalTL: 100000,
        customerId: 'cust-ahmet',
        payments: [
          { method: PAYMENT_METHODS.CASH, amount: 40000 },
          { method: PAYMENT_METHODS.CARD, amount: 30000 },
          { method: PAYMENT_METHODS.BANK, amount: 15000 },
          { method: PAYMENT_METHODS.DEBT, amount: 15000 },
        ],
        items: [{ barcode: 'SET001', title: '22K Düğün Seti', quantity: 1, unitPriceTL: 100000 }],
      };

      const result = validateAndProcessPosSale(payload);
      expect(result.isValid).toBe(true);
      expect(result.cashPortion).toBe(40000);
      expect(result.cardPortion).toBe(30000);
      expect(result.bankPortion).toBe(15000);
      expect(result.debtPortion).toBe(15000);
      expect(result.totalPaid).toBe(100000);
    });
  });
}

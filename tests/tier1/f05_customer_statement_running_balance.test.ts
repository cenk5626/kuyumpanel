import { describe, it, test, expect, setTestContext } from '../helpers/test-utils';
import { computeCustomerStatement, CustomerTransactionInput } from '../helpers/domain-engines';
import { CUSTOMER_TRANSACTION_TYPES, ASSET_TYPES } from '../../src/constants/cari';

export function registerF05Tests() {
  setTestContext('Tier 1', 5, 'Customer Statement & Running Balance', 'F05: Running Ledger Calculation');

  describe('Feature 5 - Customer Statement with Chronological Running Balance (Yürüyen Bakiye)', () => {
    test('5.1 Should calculate chronological running TL balance step-by-step', () => {
      const txs: CustomerTransactionInput[] = [
        { customerId: 'c1', type: CUSTOMER_TRANSACTION_TYPES.BORC, assetType: ASSET_TYPES.TL, amount: 10000, createdAt: '2026-08-01T10:00:00Z' },
        { customerId: 'c1', type: CUSTOMER_TRANSACTION_TYPES.BORC, assetType: ASSET_TYPES.TL, amount: 5000, createdAt: '2026-08-02T10:00:00Z' },
        { customerId: 'c1', type: CUSTOMER_TRANSACTION_TYPES.TAHSILAT, assetType: ASSET_TYPES.TL, amount: 8000, createdAt: '2026-08-03T10:00:00Z' },
      ];

      const { rows } = computeCustomerStatement(txs);
      expect(rows[0].runningBalanceTL).toBe(10000);
      expect(rows[1].runningBalanceTL).toBe(15000);
      expect(rows[2].runningBalanceTL).toBe(7000);
    });

    test('5.2 Should calculate chronological running Gram Has balance step-by-step', () => {
      const txs: CustomerTransactionInput[] = [
        { customerId: 'c2', type: CUSTOMER_TRANSACTION_TYPES.BORC, assetType: ASSET_TYPES.HAS, amount: 10.0, createdAt: '2026-08-01T10:00:00Z' },
        { customerId: 'c2', type: CUSTOMER_TRANSACTION_TYPES.TAHSILAT, assetType: ASSET_TYPES.HAS, amount: 4.5, createdAt: '2026-08-02T10:00:00Z' },
        { customerId: 'c2', type: CUSTOMER_TRANSACTION_TYPES.BORC, assetType: ASSET_TYPES.HAS, amount: 2.5, createdAt: '2026-08-03T10:00:00Z' },
      ];

      const { rows } = computeCustomerStatement(txs);
      expect(rows[0].runningBalanceHas).toBe(10.0);
      expect(rows[1].runningBalanceHas).toBe(5.5);
      expect(rows[2].runningBalanceHas).toBe(8.0);
    });

    test('5.3 Should handle unordered input transactions and sort them chronologically', () => {
      const txs: CustomerTransactionInput[] = [
        { customerId: 'c3', type: CUSTOMER_TRANSACTION_TYPES.TAHSILAT, assetType: ASSET_TYPES.TL, amount: 3000, createdAt: '2026-08-05T12:00:00Z' },
        { customerId: 'c3', type: CUSTOMER_TRANSACTION_TYPES.BORC, assetType: ASSET_TYPES.TL, amount: 10000, createdAt: '2026-08-01T12:00:00Z' },
      ];

      const { rows } = computeCustomerStatement(txs);
      // After sorting, the BORC comes first, then TAHSILAT
      expect(rows[0].amount).toBe(10000);
      expect(rows[0].runningBalanceTL).toBe(10000);
      expect(rows[1].amount).toBe(3000);
      expect(rows[1].runningBalanceTL).toBe(7000);
    });

    test('5.4 Should maintain separate and independent running balances for TL and Has simultaneously', () => {
      const txs: CustomerTransactionInput[] = [
        { customerId: 'c4', type: CUSTOMER_TRANSACTION_TYPES.BORC, assetType: ASSET_TYPES.TL, amount: 12000, createdAt: '2026-08-01T10:00:00Z' },
        { customerId: 'c4', type: CUSTOMER_TRANSACTION_TYPES.BORC, assetType: ASSET_TYPES.HAS, amount: 15.0, createdAt: '2026-08-02T10:00:00Z' },
        { customerId: 'c4', type: CUSTOMER_TRANSACTION_TYPES.TAHSILAT, assetType: ASSET_TYPES.TL, amount: 4000, createdAt: '2026-08-03T10:00:00Z' },
        { customerId: 'c4', type: CUSTOMER_TRANSACTION_TYPES.TAHSILAT, assetType: ASSET_TYPES.HAS, amount: 5.0, createdAt: '2026-08-04T10:00:00Z' },
      ];

      const { rows, summary } = computeCustomerStatement(txs);
      expect(rows[3].runningBalanceTL).toBe(8000);
      expect(rows[3].runningBalanceHas).toBe(10.0);
      expect(summary.tlBalance).toBe(8000);
      expect(summary.hasBalance).toBe(10.0);
    });

    test('5.5 Should return empty ledger and zero balances for a new customer with zero transactions', () => {
      const txs: CustomerTransactionInput[] = [];
      const { rows, summary } = computeCustomerStatement(txs);
      expect(rows.length).toBe(0);
      expect(summary.tlBalance).toBe(0);
      expect(summary.hasBalance).toBe(0);
      expect(summary.estimatedTotalTL).toBe(0);
    });
  });
}

import { describe, it, test, expect, setTestContext } from '../helpers/test-utils';
import {
  computeCustomerStatement,
  CustomerTransactionInput,
} from '../helpers/domain-engines';
import { CUSTOMER_TRANSACTION_TYPES, ASSET_TYPES } from '../../src/constants/cari';

export function registerF03Tests() {
  setTestContext('Tier 1', 3, 'Gram Has & TL Dual Balance Ledger', 'F03: Dual Has/TL Ledger');

  describe('Feature 3 - Dual Balance Tracking for TL and Gram Has', () => {
    test('3.1 Should record TL debt without altering Gram Has balance', () => {
      const txs: CustomerTransactionInput[] = [
        {
          customerId: 'cust-1',
          type: CUSTOMER_TRANSACTION_TYPES.BORC,
          assetType: ASSET_TYPES.TL,
          amount: 15000,
        },
      ];
      const { summary } = computeCustomerStatement(txs);
      expect(summary.tlBalance).toBe(15000);
      expect(summary.hasBalance).toBe(0);
    });

    test('3.2 Should record pure Has debt without altering TL balance', () => {
      const txs: CustomerTransactionInput[] = [
        {
          customerId: 'cust-1',
          type: CUSTOMER_TRANSACTION_TYPES.BORC,
          assetType: ASSET_TYPES.HAS,
          amount: 25.5,
        },
      ];
      const { summary } = computeCustomerStatement(txs);
      expect(summary.tlBalance).toBe(0);
      expect(summary.hasBalance).toBe(25.5);
    });

    test('3.3 Should correctly compute dual balances with mixed TL and physical gold transactions', () => {
      const txs: CustomerTransactionInput[] = [
        { customerId: 'cust-1', type: CUSTOMER_TRANSACTION_TYPES.BORC, assetType: ASSET_TYPES.TL, amount: 20000 },
        { customerId: 'cust-1', type: CUSTOMER_TRANSACTION_TYPES.BORC, assetType: ASSET_TYPES.HAS, amount: 10.0 },
        { customerId: 'cust-1', type: CUSTOMER_TRANSACTION_TYPES.TAHSILAT, assetType: ASSET_TYPES.TL, amount: 5000 },
        { customerId: 'cust-1', type: CUSTOMER_TRANSACTION_TYPES.TAHSILAT, assetType: ASSET_TYPES.HAS, amount: 4.0 },
      ];
      const { summary } = computeCustomerStatement(txs);
      expect(summary.tlBalance).toBe(15000);
      expect(summary.hasBalance).toBe(6.0);
    });

    test('3.4 Should convert ziynet pieces into Gram Has balance additions', () => {
      const txs: CustomerTransactionInput[] = [
        {
          customerId: 'cust-2',
          type: CUSTOMER_TRANSACTION_TYPES.BORC,
          assetType: ASSET_TYPES.CEYREK,
          amount: 2, // 2 Çeyrek * 1.605 = 3.210 gr Has
        },
      ];
      const { summary } = computeCustomerStatement(txs);
      expect(summary.tlBalance).toBe(0);
      expect(summary.hasBalance).toBe(3.21);
    });

    test('3.5 Should calculate estimated total portfolio valuation in TL at given spot rate', () => {
      const txs: CustomerTransactionInput[] = [
        { customerId: 'cust-3', type: CUSTOMER_TRANSACTION_TYPES.BORC, assetType: ASSET_TYPES.TL, amount: 10000 },
        { customerId: 'cust-3', type: CUSTOMER_TRANSACTION_TYPES.BORC, assetType: ASSET_TYPES.HAS, amount: 5.0 },
      ];
      const spotRate = 3000; // 3000 TL/gr
      const { summary } = computeCustomerStatement(txs, spotRate);
      // 10,000 TL + (5.0 gr * 3000 TL/gr) = 25,000 TL
      expect(summary.estimatedTotalTL).toBe(25000);
    });
  });
}

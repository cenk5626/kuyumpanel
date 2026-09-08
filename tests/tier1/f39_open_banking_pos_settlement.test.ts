import crypto from 'crypto';
import { describe, it, test, expect, setTestContext } from '../helpers/test-utils';
import {
  BANK_ACCOUNT_TYPE,
  BANK_INTEGRATION_TYPE,
  BANK_TX_DIRECTION,
  BANK_TX_TYPE,
  BANK_MATCH_STATUS,
  POS_SETTLEMENT_STATUS,
  BANKING_DEFAULTS,
} from '@/constants/banking';
import {
  calculatePosSettlement,
  verifyOpenBankingWebhookSignature,
  reconcileBankTransactionsWithSales,
} from '@/lib/banking/banking-engine';

export function registerF39OpenBankingPosSettlementTests() {
  setTestContext(
    'Tier 1',
    39,
    'Open Banking & POS Settlement Reconciliation',
    'F39: Açık Bankacılık, POS & Banka Mutabakatı'
  );

  describe('Feature 39 - Açık Bankacılık, POS ve Valör Takas Mutabakatı', () => {
    test('39.1 calculatePosSettlement should calculate commission and net amount with kurus precision', () => {
      // 10.000 TL brüt ciro, %1.90 komisyon => 190.00 TL komisyon, 9.810.00 TL net
      const result = calculatePosSettlement(10000, 1.9, 1);
      expect(result.grossAmount).toBe(10000);
      expect(result.commissionAmount).toBe(190);
      expect(result.netAmount).toBe(9810);
      expect(result.status).toBe(POS_SETTLEMENT_STATUS.BLOCKED);
    });

    test('39.2 calculatePosSettlement should project maturity date correctly based on blocking days', () => {
      const baseDate = new Date('2026-09-08T10:00:00Z');
      const result1Day = calculatePosSettlement(5000, 2.0, 1, baseDate);
      const expected1Day = new Date(baseDate.getTime() + 1 * 24 * 3600 * 1000);
      expect(result1Day.maturityDate.getTime()).toBe(expected1Day.getTime());

      // 0 gün valör (aynı gün nakit hesaba geçiş)
      const resultInstant = calculatePosSettlement(5000, 2.0, 0, baseDate);
      expect(resultInstant.status).toBe(POS_SETTLEMENT_STATUS.SETTLED);
    });

    test('39.3 calculatePosSettlement should handle zero or negative gross amount safely', () => {
      const resultZero = calculatePosSettlement(0, 1.9, 1);
      expect(resultZero.netAmount).toBe(0);
      expect(resultZero.commissionAmount).toBe(0);

      const resultNegative = calculatePosSettlement(-100, 1.9, 1);
      expect(resultNegative.netAmount).toBe(0);
    });

    test('39.4 verifyOpenBankingWebhookSignature should return true for valid HMAC-SHA256 signature', () => {
      const secret = 'super-secret-bank-webhook-key-2026';
      const payload = JSON.stringify({
        accountId: 'acc-1234',
        amount: 25000,
        direction: 'INFLOW',
        timestamp: '2026-09-08T10:00:00Z',
      });

      const validSignature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');

      const isValid = verifyOpenBankingWebhookSignature(payload, validSignature, secret);
      expect(isValid).toBe(true);
    });

    test('39.5 verifyOpenBankingWebhookSignature should reject invalid or tampered signature', () => {
      const secret = 'super-secret-bank-webhook-key-2026';
      const payload = JSON.stringify({ amount: 25000 });
      const fakeSignature = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

      const isValid = verifyOpenBankingWebhookSignature(payload, fakeSignature, secret);
      expect(isValid).toBe(false);

      // Boş parametre koruması
      expect(verifyOpenBankingWebhookSignature('', fakeSignature, secret)).toBe(false);
    });

    test('39.6 reconcileBankTransactionsWithSales should match candidate with exact amount and customer name in description', () => {
      const now = new Date('2026-09-08T12:00:00Z');
      const candidates = [
        {
          id: 'sale-001',
          totalAmount: 15400,
          createdAt: new Date('2026-09-08T11:45:00Z'),
          customerName: 'Fatma Şahin',
        },
      ];

      const bankTx = {
        amount: 15400,
        transactionDate: now,
        description: 'EFT Gelen - Fatma Şahin Bilezik Ödemesi',
      };

      const matchResult = reconcileBankTransactionsWithSales(bankTx, candidates);
      expect(matchResult.isMatch).toBe(true);
      expect(matchResult.matchedId).toBe('sale-001');
      expect(matchResult.confidence).toBe('EXACT');
    });

    test('39.7 reconcileBankTransactionsWithSales should match candidate with exact amount within 48h time tolerance', () => {
      const now = new Date('2026-09-08T12:00:00Z');
      const candidates = [
        {
          id: 'sale-002',
          totalAmount: 8500,
          createdAt: new Date('2026-09-07T14:00:00Z'), // 22 saat önce
        },
      ];

      const bankTx = {
        amount: 8500,
        transactionDate: now,
        description: 'Havale Gelen Referans: 9482910',
      };

      const matchResult = reconcileBankTransactionsWithSales(bankTx, candidates);
      expect(matchResult.isMatch).toBe(true);
      expect(matchResult.matchedId).toBe('sale-002');
      expect(matchResult.confidence).toBe('PROBABLE');
    });

    test('39.8 reconcileBankTransactionsWithSales should not match candidate if amount difference exceeds tolerance', () => {
      const now = new Date('2026-09-08T12:00:00Z');
      const candidates = [
        {
          id: 'sale-003',
          totalAmount: 10000,
          createdAt: now,
        },
      ];

      const bankTx = {
        amount: 12000, // Fark 2000 TL
        transactionDate: now,
        description: 'Havale Gelen',
      };

      const matchResult = reconcileBankTransactionsWithSales(bankTx, candidates);
      expect(matchResult.isMatch).toBe(false);
      expect(matchResult.confidence).toBe('NONE');
    });

    test('39.9 reconcileBankTransactionsWithSales should not match candidate if date difference exceeds 48 hours', () => {
      const now = new Date('2026-09-08T12:00:00Z');
      const candidates = [
        {
          id: 'sale-004',
          totalAmount: 5000,
          createdAt: new Date('2026-09-01T12:00:00Z'), // 7 gün önce
        },
      ];

      const bankTx = {
        amount: 5000,
        transactionDate: now,
        description: 'Havale',
      };

      const matchResult = reconcileBankTransactionsWithSales(bankTx, candidates);
      expect(matchResult.isMatch).toBe(false);
    });

    test('39.10 Verify banking constants, account types and settlement status values', () => {
      expect(BANK_ACCOUNT_TYPE.ALTIN_HESABI).toBe('ALTIN_HESABI');
      expect(BANK_ACCOUNT_TYPE.VADESIZ_TL).toBe('VADESIZ_TL');
      expect(BANK_TX_DIRECTION.INFLOW).toBe('INFLOW');
      expect(BANK_TX_DIRECTION.OUTFLOW).toBe('OUTFLOW');
      expect(POS_SETTLEMENT_STATUS.BLOCKED).toBe('BLOCKED');
      expect(POS_SETTLEMENT_STATUS.SETTLED).toBe('SETTLED');
      expect(BANKING_DEFAULTS.DEFAULT_COMMISSION_RATE).toBe(1.9);
      expect(BANKING_DEFAULTS.DEFAULT_BLOCKING_DAYS).toBe(1);
    });
  });
}

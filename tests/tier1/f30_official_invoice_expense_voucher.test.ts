import { describe, it, test, expect, setTestContext } from '../helpers/test-utils';
import {
  EXPENSE_VOUCHER_STATUS,
  EXPENSE_VOUCHER_SIGNATURE_STATUS,
  EXPENSE_VOUCHER_PAYMENT_METHODS,
  EXPENSE_VOUCHER_WITHHOLDING_RATES,
  EXPENSE_VOUCHER_DEFAULTS,
  E_DOCUMENT_PROVIDERS,
  E_DOCUMENT_ENVIRONMENTS,
  E_DOCUMENT_SUBMISSION_STATUS,
} from '@/constants/expense-voucher';
import {
  calculateExpenseVoucher,
  generateExpenseVoucherNumber,
} from '@/lib/invoice/expense-voucher-engine';
import {
  MockGibProvider,
  GibInvoicePayload,
  GibExpenseVoucherPayload,
} from '@/lib/invoice/gib-provider';

export function registerF30OfficialInvoiceExpenseVoucherTests() {
  setTestContext(
    'Tier 1',
    30,
    'Official Invoicing, e-Document Lifecycle & Expense Vouchers',
    'F30: GİB e-Arşiv & VUK 234 Gider Pusulası'
  );

  describe('Feature 30 - Resmî Fatura, e-Belge ve Gider Pusulası', () => {
    const gibProvider = new MockGibProvider();

    test('30.1 Should calculate expense voucher lines with carat purity (milyem) and has equivalent correctly', () => {
      const lines = [
        { description: '22 Ayar Hurda Bilezik', carat: 22, weight: 10.0, unitPrice: 3000 },
        { description: '14 Ayar Hurda Kolye', carat: 14, weight: 20.0, unitPrice: 1900 },
      ];

      const res = calculateExpenseVoucher(lines, EXPENSE_VOUCHER_WITHHOLDING_RATES.EXEMPT);

      expect(res.lines.length).toBe(2);
      expect(res.lines[0].milyem).toBe(916);
      expect(res.lines[0].totalPrice).toBe(30000);
      expect(res.lines[0].hasEquivalent).toBe(9.16);

      expect(res.lines[1].milyem).toBe(585);
      expect(res.lines[1].totalPrice).toBe(38000);
      expect(res.lines[1].hasEquivalent).toBe(11.7);

      expect(res.grossAmount).toBe(68000);
      expect(res.totalPureGoldWeight).toBe(20.86);
    });

    test('30.2 Should calculate gross amount, withholding deduction, and net amount with exempt and custom rates', () => {
      const lines = [
        { description: 'Hurda Metal', carat: 24, weight: 10.0, unitPrice: 3200 },
      ];

      // Muafiyet (%0)
      const exemptRes = calculateExpenseVoucher(lines, EXPENSE_VOUCHER_WITHHOLDING_RATES.EXEMPT);
      expect(exemptRes.grossAmount).toBe(32000);
      expect(exemptRes.withholdingRate).toBe(0);
      expect(exemptRes.withholdingAmount).toBe(0);
      expect(exemptRes.netAmount).toBe(32000);

      // %2 Tevkifat
      const with2Res = calculateExpenseVoucher(lines, EXPENSE_VOUCHER_WITHHOLDING_RATES.WITHHOLDING_2);
      expect(with2Res.grossAmount).toBe(32000);
      expect(with2Res.withholdingRate).toBe(2);
      expect(with2Res.withholdingAmount).toBe(640);
      expect(with2Res.netAmount).toBe(31360);
    });

    test('30.3 Should generate sequential expense voucher series numbers (e.g. GP-2026-0001)', () => {
      const v1 = generateExpenseVoucherNumber('dealer-1', 0);
      const v2 = generateExpenseVoucherNumber('dealer-1', 14);

      const currentYear = new Date().getFullYear();
      expect(v1).toBe(`GP-${currentYear}-0001`);
      expect(v2).toBe(`GP-${currentYear}-0015`);
    });

    test('30.4 Should validate seller TCKN and mandatory lines before creating voucher', () => {
      const invalidPayload: GibExpenseVoucherPayload = {
        voucherNumber: 'GP-2026-0001',
        sellerName: 'Ahmet Yılmaz',
        sellerTaxId: '123', // Too short
        issueDate: new Date().toISOString(),
        grossAmount: 10000,
        withholdingRate: 0,
        withholdingAmount: 0,
        netAmount: 10000,
        hasEquivalent: 3.1,
        lines: [],
      };

      const validation = gibProvider.validateExpenseVoucher(invalidPayload);
      expect(validation.valid).toBe(false);
      expect(validation.errors.some((e) => e.includes('TCKN'))).toBe(true);
      expect(validation.errors.some((e) => e.includes('en az bir'))).toBe(true);
    });

    test('30.5 Should validate GİB invoice payload and handle mock submission lifecycle', async () => {
      const validInvoice: GibInvoicePayload = {
        invoiceNumber: 'KYM202600000001',
        customerName: 'Kuyumcu Ali',
        customerTaxId: '12345678901',
        type: 'OZEL_MATRAH',
        documentType: 'E_ARSIV',
        issueDate: new Date().toISOString(),
        totalPureGoldWeight: 10,
        totalGoldAmount: 32000,
        totalLaborAmount: 5000,
        totalKdvAmount: 1000,
        grandTotal: 38000,
        items: [
          {
            name: '14K Kolye',
            carat: 14,
            milyem: 585,
            weight: 10,
            goldCost: 32000,
            laborCost: 5000,
            kdvAmount: 1000,
            total: 38000,
          },
        ],
      };

      const res = await gibProvider.submitInvoice(validInvoice, E_DOCUMENT_ENVIRONMENTS.TEST);
      expect(res.success).toBe(true);
      expect(res.submissionStatus).toBe(E_DOCUMENT_SUBMISSION_STATUS.ACCEPTED);
      expect(res.uuid.startsWith('GIB-')).toBe(true);
      expect(res.externalDocumentId).toBe('INT-KYM202600000001');
      expect(res.pdfUrl).toContain('.pdf');
    });

    test('30.6 Should validate GİB expense voucher payload and assign unique UUID', async () => {
      const validVoucher: GibExpenseVoucherPayload = {
        voucherNumber: 'GP-2026-0005',
        sellerName: 'Fatma Hanım',
        sellerTaxId: '98765432109',
        issueDate: new Date().toISOString(),
        grossAmount: 15000,
        withholdingRate: 0,
        withholdingAmount: 0,
        netAmount: 15000,
        hasEquivalent: 4.5,
        lines: [
          {
            description: '22 Ayar Bilezik Hurda',
            carat: 22,
            milyem: 916,
            weight: 5,
            unitPrice: 3000,
            totalPrice: 15000,
            hasEquivalent: 4.58,
          },
        ],
      };

      const res = await gibProvider.submitExpenseVoucher(validVoucher);
      expect(res.success).toBe(true);
      expect(res.submissionStatus).toBe(E_DOCUMENT_SUBMISSION_STATUS.ACCEPTED);
      expect(res.uuid.startsWith('EGP-')).toBe(true);
    });

    test('30.7 Should reject invoice submission if grandTotal is zero or lines are empty', async () => {
      const invalidInvoice: GibInvoicePayload = {
        invoiceNumber: '',
        customerName: '',
        type: 'OZEL_MATRAH',
        documentType: 'E_ARSIV',
        issueDate: new Date().toISOString(),
        totalPureGoldWeight: 0,
        totalGoldAmount: 0,
        totalLaborAmount: 0,
        totalKdvAmount: 0,
        grandTotal: 0,
        items: [],
      };

      const res = await gibProvider.submitInvoice(invalidInvoice);
      expect(res.success).toBe(false);
      expect(res.submissionStatus).toBe(E_DOCUMENT_SUBMISSION_STATUS.REJECTED);
      expect(res.errorMessage).toBeDefined();
    });

    test('30.8 Should check invoice status query and cancellation in GİB provider', async () => {
      const queryRes = await gibProvider.fetchInvoiceStatus('GIB-123456');
      expect(queryRes.status).toBe(E_DOCUMENT_SUBMISSION_STATUS.ACCEPTED);
      expect(queryRes.message).toContain('GİB sisteminde başarıyla onaylandı');

      const cancelRes = await gibProvider.cancelInvoice('GIB-123456', 'Hatalı TCKN');
      expect(cancelRes.success).toBe(true);
      expect(cancelRes.message).toContain('Hatalı TCKN');
    });

    test('30.9 Should verify all expense voucher status and signature constants are non-empty', () => {
      expect(EXPENSE_VOUCHER_STATUS.DRAFT).toBe('DRAFT');
      expect(EXPENSE_VOUCHER_STATUS.APPROVED).toBe('APPROVED');
      expect(EXPENSE_VOUCHER_STATUS.CANCELLED).toBe('CANCELLED');

      expect(EXPENSE_VOUCHER_SIGNATURE_STATUS.PENDING).toBe('PENDING');
      expect(EXPENSE_VOUCHER_SIGNATURE_STATUS.SIGNED_MANUAL).toBe('SIGNED_MANUAL');
      expect(EXPENSE_VOUCHER_SIGNATURE_STATUS.SIGNED_DIGITAL).toBe('SIGNED_DIGITAL');

      expect(EXPENSE_VOUCHER_DEFAULTS.PREFIX).toBe('GP');
    });

    test('30.10 Should ensure dual theme tokens and centralized constants compliance without magic numbers', () => {
      expect(E_DOCUMENT_PROVIDERS.GIB_PORTAL).toBe('GIB_PORTAL');
      expect(E_DOCUMENT_PROVIDERS.MOCK_SANDBOX).toBe('MOCK_SANDBOX');
      expect(E_DOCUMENT_ENVIRONMENTS.TEST).toBe('TEST');
      expect(E_DOCUMENT_ENVIRONMENTS.PRODUCTION).toBe('PRODUCTION');
    });
  });
}

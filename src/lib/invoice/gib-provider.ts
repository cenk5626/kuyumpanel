import {
  EDocumentProvider,
  EDocumentEnvironment,
  EDocumentSubmissionStatus,
  E_DOCUMENT_PROVIDERS,
  E_DOCUMENT_ENVIRONMENTS,
  E_DOCUMENT_SUBMISSION_STATUS,
} from '@/constants/expense-voucher';
import { roundMoney, roundGrams } from '@/lib/security/validation';

export interface GibSubmissionResult {
  success: boolean;
  provider: EDocumentProvider;
  environment: EDocumentEnvironment;
  externalDocumentId: string;
  uuid: string;
  submissionStatus: EDocumentSubmissionStatus;
  pdfUrl: string;
  xmlUrl: string;
  signedAt: string;
  errorMessage?: string;
}

export interface GibInvoicePayload {
  invoiceNumber: string;
  customerName: string;
  customerTaxId?: string | null;
  customerAddress?: string | null;
  type: string;
  documentType: string;
  issueDate: string;
  totalPureGoldWeight: number;
  totalGoldAmount: number;
  totalLaborAmount: number;
  totalKdvAmount: number;
  grandTotal: number;
  items: Array<{
    name: string;
    carat: number;
    milyem: number;
    weight: number;
    goldCost: number;
    laborCost: number;
    kdvAmount: number;
    total: number;
  }>;
}

export interface GibExpenseVoucherPayload {
  voucherNumber: string;
  sellerName: string;
  sellerTaxId: string;
  sellerPhone?: string | null;
  sellerAddress?: string | null;
  issueDate: string;
  grossAmount: number;
  withholdingRate: number;
  withholdingAmount: number;
  netAmount: number;
  hasEquivalent: number;
  lines: Array<{
    description: string;
    carat: number;
    milyem: number;
    weight: number;
    unitPrice: number;
    totalPrice: number;
    hasEquivalent: number;
  }>;
}

export interface GibDocumentProviderInterface {
  validateInvoice(payload: GibInvoicePayload): { valid: boolean; errors: string[] };
  submitInvoice(
    payload: GibInvoicePayload,
    env?: EDocumentEnvironment
  ): Promise<GibSubmissionResult>;
  fetchInvoiceStatus(uuid: string): Promise<{ status: EDocumentSubmissionStatus; message: string }>;
  cancelInvoice(uuid: string, reason: string): Promise<{ success: boolean; message: string }>;
  validateExpenseVoucher(payload: GibExpenseVoucherPayload): { valid: boolean; errors: string[] };
  submitExpenseVoucher(
    payload: GibExpenseVoucherPayload,
    env?: EDocumentEnvironment
  ): Promise<GibSubmissionResult>;
}

/**
 * Mock & Sandbox GİB / Entegratör Sağlayıcısı
 * Gerçek API anahtarı veya canlı entegrasyon olmadan GİB e-Arşiv / e-Fatura / e-Gider Pusulası
 * imza ve onay yaşam döngüsünü %100 simüle eder.
 */
export class MockGibProvider implements GibDocumentProviderInterface {
  validateInvoice(payload: GibInvoicePayload): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!payload.invoiceNumber) errors.push('Fatura numarası boş olamaz.');
    if (!payload.customerName) errors.push('Müşteri adı/unvanı zorunludur.');
    if (payload.grandTotal <= 0) errors.push('Genel toplam sıfırdan büyük olmalıdır.');
    if (!payload.items || payload.items.length === 0) errors.push('En az bir fatura kalemi bulunmalıdır.');
    return { valid: errors.length === 0, errors };
  }

  async submitInvoice(
    payload: GibInvoicePayload,
    env: EDocumentEnvironment = E_DOCUMENT_ENVIRONMENTS.TEST
  ): Promise<GibSubmissionResult> {
    const validation = this.validateInvoice(payload);
    if (!validation.valid) {
      return {
        success: false,
        provider: E_DOCUMENT_PROVIDERS.MOCK_SANDBOX,
        environment: env,
        externalDocumentId: '',
        uuid: '',
        submissionStatus: E_DOCUMENT_SUBMISSION_STATUS.REJECTED,
        pdfUrl: '',
        xmlUrl: '',
        signedAt: new Date().toISOString(),
        errorMessage: validation.errors.join('; '),
      };
    }

    const uuid = `GIB-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
    const externalId = `INT-${payload.invoiceNumber}`;

    return {
      success: true,
      provider: E_DOCUMENT_PROVIDERS.MOCK_SANDBOX,
      environment: env,
      externalDocumentId: externalId,
      uuid,
      submissionStatus: E_DOCUMENT_SUBMISSION_STATUS.ACCEPTED,
      pdfUrl: `/api/invoices/download/${uuid}.pdf`,
      xmlUrl: `/api/invoices/download/${uuid}.xml`,
      signedAt: new Date().toISOString(),
    };
  }

  async fetchInvoiceStatus(
    uuid: string
  ): Promise<{ status: EDocumentSubmissionStatus; message: string }> {
    return {
      status: E_DOCUMENT_SUBMISSION_STATUS.ACCEPTED,
      message: `Belge ${uuid} GİB sisteminde başarıyla onaylandı ve alıcıya iletildi.`,
    };
  }

  async cancelInvoice(uuid: string, reason: string): Promise<{ success: boolean; message: string }> {
    return {
      success: true,
      message: `Belge ${uuid} iptal talebi GİB sistemine başarıyla işlendi. Gerekçe: ${reason}`,
    };
  }

  validateExpenseVoucher(payload: GibExpenseVoucherPayload): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!payload.voucherNumber) errors.push('Gider pusulası numarası zorunludur.');
    if (!payload.sellerName) errors.push('Satıcı adı-soyadı zorunludur.');
    if (!payload.sellerTaxId || payload.sellerTaxId.length < 10) {
      errors.push('Geçerli bir TCKN (11 hane) girilmelidir.');
    }
    if (payload.grossAmount <= 0) errors.push('Brüt tutar sıfırdan büyük olmalıdır.');
    if (!payload.lines || payload.lines.length === 0) {
      errors.push('Gider pusulasına en az bir hurda veya kıymetli maden kalemi eklenmelidir.');
    }
    return { valid: errors.length === 0, errors };
  }

  async submitExpenseVoucher(
    payload: GibExpenseVoucherPayload,
    env: EDocumentEnvironment = E_DOCUMENT_ENVIRONMENTS.TEST
  ): Promise<GibSubmissionResult> {
    const validation = this.validateExpenseVoucher(payload);
    if (!validation.valid) {
      return {
        success: false,
        provider: E_DOCUMENT_PROVIDERS.MOCK_SANDBOX,
        environment: env,
        externalDocumentId: '',
        uuid: '',
        submissionStatus: E_DOCUMENT_SUBMISSION_STATUS.REJECTED,
        pdfUrl: '',
        xmlUrl: '',
        signedAt: new Date().toISOString(),
        errorMessage: validation.errors.join('; '),
      };
    }

    const uuid = `EGP-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
    const externalId = `VOUCHER-${payload.voucherNumber}`;

    return {
      success: true,
      provider: E_DOCUMENT_PROVIDERS.MOCK_SANDBOX,
      environment: env,
      externalDocumentId: externalId,
      uuid,
      submissionStatus: E_DOCUMENT_SUBMISSION_STATUS.ACCEPTED,
      pdfUrl: `/api/expense-vouchers/download/${uuid}.pdf`,
      xmlUrl: `/api/expense-vouchers/download/${uuid}.xml`,
      signedAt: new Date().toISOString(),
    };
  }
}

export const gibProvider = new MockGibProvider();

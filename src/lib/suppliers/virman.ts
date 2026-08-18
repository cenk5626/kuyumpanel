/**
 * Toptancı Virman Motoru (Supplier Balance Transfer Engine)
 * Toptancılar arasında TL ve Has Altın (gr) borç/alacak aktarımı
 * Sıfır Magic Number / String Kuralına Uygun
 */

export interface VirmanInput {
  fromSupplierId: string;
  toSupplierId: string;
  assetType: 'TL' | 'HAS';
  amount: number;
  unitPrice?: number | null; // Has altın transferinde referans TL/gr kuru
  description?: string;
  employeeName?: string;
}

export interface VirmanResult {
  success: boolean;
  fromSupplierName: string;
  toSupplierName: string;
  assetType: 'TL' | 'HAS';
  amount: number;
  hasEquivalent?: number;
  fromTransactionId: string;
  toTransactionId: string;
  timestamp: string;
}

/**
 * Virman parametrelerini doğrular.
 */
export function validateVirmanInput(input: VirmanInput): { valid: boolean; error?: string } {
  if (!input.fromSupplierId || !input.toSupplierId) {
    return { valid: false, error: 'Kaynak ve hedef toptancı seçilmelidir.' };
  }

  if (input.fromSupplierId === input.toSupplierId) {
    return { valid: false, error: 'Kaynak ve hedef toptancı aynı olamaz.' };
  }

  if (!input.amount || input.amount <= 0 || isNaN(input.amount)) {
    return { valid: false, error: 'Geçerli bir transfer tutarı girilmelidir.' };
  }

  if (input.assetType !== 'TL' && input.assetType !== 'HAS') {
    return { valid: false, error: 'Geçersiz varlık türü. Sadece TL veya HAS seçilebilir.' };
  }

  return { valid: true };
}

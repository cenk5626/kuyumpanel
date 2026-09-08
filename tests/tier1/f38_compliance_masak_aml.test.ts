import { describe, it, test, expect, setTestContext } from '../helpers/test-utils';
import {
  AML_RISK_LEVEL,
  COMPLIANCE_CASE_STATUS,
  AML_TRIGGER_TYPE,
  AML_RULE_CODE,
  ID_DOCUMENT_TYPE,
  MASAK_DEFAULTS,
  COMPLIANCE_MESSAGES,
} from '@/constants/compliance';
import {
  assessTransactionCompliance,
  calculateCustomerRiskScore,
  generateSarDraft,
} from '@/lib/compliance/aml-engine';

export function registerF38ComplianceMasakAmlTests() {
  setTestContext(
    'Tier 1',
    38,
    'MASAK & AML Compliance Management',
    'F38: Uyum, Risk ve Şüpheli İşlem Yönetimi (MASAK / AML)'
  );

  describe('Feature 38 - MASAK ve AML Uyum Yönetimi', () => {
    test('38.1 Single transaction KYC threshold (>= 185.000 TL) triggers KYC warning if TC/Passport missing', () => {
      const res = assessTransactionCompliance({
        amountTL: 185000,
        isCash: true,
        customerName: 'Bilinmeyen Alıcı',
        customerTcNo: '',
      });

      expect(res.isFlagged).toBe(true);
      expect(res.kycRequired).toBe(true);
      expect(res.riskLevel).toBe(AML_RISK_LEVEL.HIGH);
      expect(res.triggerType).toBe(AML_TRIGGER_TYPE.KYC_THRESHOLD_EXCEEDED);
      expect(res.messages).toContain(COMPLIANCE_MESSAGES.KYC_REQUIRED);
    });

    test('38.2 Single transaction KYC threshold (>= 185.000 TL) passes without flag if valid TCKN provided', () => {
      const res = assessTransactionCompliance({
        amountTL: 250000,
        isCash: true,
        customerName: 'Ahmet Yılmaz',
        customerTcNo: '12345678901',
      });

      expect(res.kycRequired).toBe(true);
      expect(res.isFlagged).toBe(false); // Valid TCKN provided, no block/flag
      expect(res.riskLevel).toBe(AML_RISK_LEVEL.LOW);
    });

    test('38.3 Smurfing / Structuring: 3 transactions of 70.000 TL within 24h triggers structuring alert and CRITICAL risk', () => {
      const now = Date.now();
      const pastTxs = [
        { amountTL: 70000, createdAt: new Date(now - 3 * 3600 * 1000), isCash: true },
        { amountTL: 70000, createdAt: new Date(now - 1 * 3600 * 1000), isCash: true },
      ];

      const res = assessTransactionCompliance({
        amountTL: 70000,
        isCash: true,
        customerName: 'Mehmet Demir',
        recentTransactions: pastTxs,
      });

      expect(res.isFlagged).toBe(true);
      expect(res.structuringDetected).toBe(true);
      expect(res.riskLevel).toBe(AML_RISK_LEVEL.CRITICAL);
      expect(res.triggerType).toBe(AML_TRIGGER_TYPE.SMURFING_DETECTED);
      expect(res.total24hCashVolume).toBe(210000); // 70k + 70k + 70k
      expect(res.messages).toContain(COMPLIANCE_MESSAGES.SMURFING_ALERT);
    });

    test('38.4 Transactions spread over more than 24h do not trigger structuring alert', () => {
      const now = Date.now();
      const pastTxs = [
        { amountTL: 100000, createdAt: new Date(now - 48 * 3600 * 1000), isCash: true }, // 48 hours ago
      ];

      const res = assessTransactionCompliance({
        amountTL: 90000,
        isCash: true,
        customerName: 'Ayşe Kaya',
        recentTransactions: pastTxs,
      });

      expect(res.structuringDetected).toBe(false);
      expect(res.isFlagged).toBe(false);
      expect(res.total24hCashVolume).toBe(90000);
    });

    test('38.5 Non-cash transaction (bank transfer / card) does not trigger cash KYC threshold limit', () => {
      const res = assessTransactionCompliance({
        amountTL: 500000,
        isCash: false, // Banka havalesi / EFT / Kredi Kartı
        customerName: 'Holding A.Ş.',
      });

      expect(res.kycRequired).toBe(false);
      expect(res.isFlagged).toBe(false);
      expect(res.riskLevel).toBe(AML_RISK_LEVEL.LOW);
    });

    test('38.6 PEP customer with transaction above 50.000 TL triggers PEP alert and sets HIGH risk', () => {
      const res = assessTransactionCompliance({
        amountTL: 65000,
        isCash: true,
        customerName: 'Bürokrat X',
        customerIsPep: true,
      });

      expect(res.isFlagged).toBe(true);
      expect(res.pepAlert).toBe(true);
      expect(res.riskLevel).toBe(AML_RISK_LEVEL.HIGH);
      expect(res.triggerType).toBe(AML_TRIGGER_TYPE.PEP_TRANSACTION);
      expect(res.messages).toContain(COMPLIANCE_MESSAGES.PEP_ALERT);
    });

    test('38.7 PEP customer with small transaction (< 50.000 TL) does not trigger PEP alert', () => {
      const res = assessTransactionCompliance({
        amountTL: 20000,
        isCash: true,
        customerName: 'Bürokrat X',
        customerIsPep: true,
      });

      expect(res.pepAlert).toBe(false);
      expect(res.isFlagged).toBe(false);
    });

    test('38.8 calculateCustomerRiskScore returns correct score and risk level (LOW/MEDIUM/HIGH/CRITICAL)', () => {
      // Normal müşteri, kimlik doğrulanmış
      const lowRisk = calculateCustomerRiskScore({
        isPep: false,
        idVerified: true,
        cashRatio: 0.2,
      });
      expect(lowRisk.score).toBe(10);
      expect(lowRisk.riskLevel).toBe(AML_RISK_LEVEL.LOW);

      // Kimliği doğrulanmamış + yüksek nakit ağırlıklı
      const medRisk = calculateCustomerRiskScore({
        isPep: false,
        idVerified: false, // +20
        cashRatio: 0.8,    // +15
      });
      expect(medRisk.score).toBe(45); // 10 + 20 + 15 = 45
      expect(medRisk.riskLevel).toBe(AML_RISK_LEVEL.MEDIUM);

      // PEP müşteri
      const highRisk = calculateCustomerRiskScore({
        isPep: true,       // +45
        idVerified: false, // +20
      });
      expect(highRisk.score).toBe(75); // 10 + 45 + 20 = 75
      expect(highRisk.riskLevel).toBe(AML_RISK_LEVEL.HIGH);

      // PEP + Kimliksiz + Geçmiş 2 vaka + Yüksek hacim => Kritik
      const criticalRisk = calculateCustomerRiskScore({
        isPep: true,                // +45
        idVerified: false,          // +20
        complianceIncidentCount: 2, // +30
        totalVolumeTL: 2000000,     // +10
      });
      expect(criticalRisk.score).toBe(100); // 10 + 45 + 20 + 30 + 10 = 115 => 100 clamped
      expect(criticalRisk.riskLevel).toBe(AML_RISK_LEVEL.CRITICAL);
    });

    test('38.9 generateSarDraft formats official MASAK report draft with case number, customer info and legal disclaimer', () => {
      const draft = generateSarDraft({
        caseNumber: 'MASAK-2026-0042',
        customerName: 'Ali Veli',
        customerTcNo: '98765432101',
        detectedAmount: 350000,
        triggerType: AML_TRIGGER_TYPE.KYC_THRESHOLD_EXCEEDED,
        description: 'Müşteri 350.000 TL tutarında külçe altın alımı yaparken kimlik belgesi beyanından kaçınmıştır.',
        createdAt: new Date('2026-09-08T10:00:00Z'),
        storeName: 'KuyumPanel Merkez Mağaza',
      });

      expect(draft).toContain('MASAK-2026-0042');
      expect(draft).toContain('Ali Veli');
      expect(draft).toContain('98765432101');
      expect(draft).toContain('350.000,00');
      expect(draft).toContain('5549 Sayılı Kanun');
      expect(draft).toContain('KuyumPanel Merkez Mağaza');
    });

    test('38.10 Verify constants and default threshold values conform to MASAK 5549 requirements', () => {
      expect(MASAK_DEFAULTS.KYC_CASH_THRESHOLD_TL).toBe(185000);
      expect(MASAK_DEFAULTS.STRUCTURING_LOOKBACK_HOURS).toBe(24);
      expect(MASAK_DEFAULTS.STRUCTURING_SPLIT_MIN_COUNT).toBe(2);
      expect(MASAK_DEFAULTS.PEP_MAX_ALLOWABLE_UNAUDITED_TL).toBe(50000);

      expect(AML_RISK_LEVEL.LOW).toBe('LOW');
      expect(AML_RISK_LEVEL.CRITICAL).toBe('CRITICAL');
      expect(COMPLIANCE_CASE_STATUS.REPORTED_TO_MASAK).toBe('REPORTED_TO_MASAK');
      expect(ID_DOCUMENT_TYPE.TCKN).toBe('TCKN');
      expect(ID_DOCUMENT_TYPE.PASSPORT).toBe('PASSPORT');
    });
  });
}

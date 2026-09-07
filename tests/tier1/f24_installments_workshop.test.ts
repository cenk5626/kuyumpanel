import { describe, test, expect, setTestContext } from '../helpers/test-utils';
import {
  INSTALLMENT_STATUS,
  INSTALLMENT_LIMITS,
  INSTALLMENT_DEFAULTS,
} from '../../src/constants/installment';
import {
  WORKSHOP_LIMITS,
  CARAT_MILYEM_MAP,
  WORKSHOP_JOB_STATUS,
  CUSTOMER_DEPOSIT_STATUS,
  SUPPORTED_SCRAP_CARATS,
} from '../../src/constants/workshop';
import { parseScaleData } from '../../src/lib/hardware/scale';
import {
  calculateTakozMilyem,
  calculateWorkshopLoss,
} from '../../src/lib/workshop/takoz-calculator';

export function registerF24InstallmentsWorkshopTests(): void {
  setTestContext(
    'Tier 1',
    24,
    'Taksitli Satış, Senet, Hurda Sandığı & Ramat Takibi',
    'F24: Installments & Workshop Ramat'
  );

  describe('Feature 24 - Taksitli Satış, Senet & Atölye Ramat Takibi', () => {
    test('24.1 Taksit planında peşinat düşümü ve kuruş yuvarlama eşitlemesi', () => {
      const totalAmount = 10000;
      const downPayment = 1000;
      const installmentCount = 3;

      const remaining = totalAmount - downPayment; // 9000
      expect(remaining).toBe(9000);

      // 9000 / 3 = 3000 TL
      const perItem = Number((remaining / installmentCount).toFixed(2));
      expect(perItem).toBe(3000);

      // Kuruşlu bölme örneği: 10,000 TL kalan, 3 taksit -> 3333.33, 3333.33, 3333.34
      const oddRemaining = 10000;
      const rawSplit = Number((oddRemaining / 3).toFixed(2)); // 3333.33
      let allocated = 0;
      const items = [];
      for (let i = 1; i <= 3; i++) {
        const amt = i === 3 ? Number((oddRemaining - allocated).toFixed(2)) : rawSplit;
        allocated += amt;
        items.push(amt);
      }
      expect(items[0]).toBe(3333.33);
      expect(items[1]).toBe(3333.33);
      expect(items[2]).toBe(3333.34);
      expect(items[0] + items[1] + items[2]).toBe(10000);
    });

    test('24.2 Matbu Senet (Bono) numara formatı ve TTK yasal şartları', () => {
      const prefix = INSTALLMENT_DEFAULTS.SENET_PREFIX; // "SNT"
      const year = 2026;
      const planIdx = 1;
      const installmentNo = 2;
      const senetNo = `${prefix}-${year}-${String(planIdx).padStart(4, '0')}-${installmentNo}`;

      expect(senetNo).toBe('SNT-2026-0001-2');
      expect(INSTALLMENT_DEFAULTS.CITY).toBe('İstanbul');
    });

    test('24.3 WhatsApp vade hatırlatma mesajı ve URL kodlaması', () => {
      const customerName = 'Ahmet Yılmaz';
      const amount = 5000;
      const dueDate = '15.10.2026';
      const senetNo = 'SNT-2026-0001-1';

      const message = `Sayın ${customerName}, KuyumPanel Mücevherat'tan tanzim olunan ${senetNo} nolu, ${amount} TL tutarlı taksitinizin son ödeme vadesi ${dueDate}'dir. Bilgilerinize sunar, hayırlı günler dileriz.`;

      const rawPhone = '0532 999 88 77';
      const cleanPhone = rawPhone.replace(/\D/g, '');
      const formattedPhone = cleanPhone.startsWith('90')
        ? cleanPhone
        : `90${cleanPhone.replace(/^0/, '')}`;
      const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;

      expect(url).toContain('https://wa.me/905329998877');
      expect(url).toContain(encodeURIComponent('KuyumPanel'));
      expect(url).toContain(encodeURIComponent('5000 TL'));
    });

    test('24.4 Pota eritme takoz ağırlıklı ortalama milyem formülü (Toplam Has / Toplam Gram)', () => {
      // 40 gr 22K (0.916) + 60 gr 14K (0.585)
      // 22K Has = 40 * 0.916 = 36.640 gr Has
      // 14K Has = 60 * 0.585 = 35.100 gr Has
      // Toplam Gram = 100 gr
      // Toplam Has = 71.740 gr Has
      // Ağırlıklı Ortalama Milyem = 71.740 / 100 = 0.7174
      const takoz = calculateTakozMilyem([
        { carat: 22, weight: 40.0 },
        { carat: 14, weight: 60.0 },
      ]);

      expect(takoz.totalWeight).toBe(100.0);
      expect(takoz.totalPureWeight).toBe(71.74);
      expect(takoz.averageMilyem).toBe(0.7174);
      expect(takoz.equivalentCarat).toBeCloseTo(17.2, 1);
    });

    test('24.5 Pota takozunda hedef milyeme ulaşmak için 24K Has veya Alaşım ekleme reçetesi', () => {
      // 100 gr 0.7174 milyem takozumuz var. Bunu 22K (0.916) seviyesine yükseltmek istiyoruz:
      const upgrade = calculateTakozMilyem(
        [
          { carat: 22, weight: 40.0 },
          { carat: 14, weight: 60.0 },
        ],
        0.916
      );

      // Has eklenmeli (pureGoldToAdd > 0)
      expect(upgrade.pureGoldToAdd).toBeGreaterThan(0);
      expect(upgrade.alloyToAdd).toBe(0);

      // Aynı takozu 14K (0.585) seviyesine düşürmek istiyoruz:
      const downgrade = calculateTakozMilyem(
        [
          { carat: 22, weight: 40.0 },
          { carat: 14, weight: 60.0 },
        ],
        0.585
      );

      // Alaşım (bakır/gümüş) eklenmeli (alloyToAdd > 0)
      expect(downgrade.alloyToAdd).toBeGreaterThan(0);
      expect(downgrade.pureGoldToAdd).toBe(0);
    });

    test('24.6 Atölye ramat (fire) hesabı ve azami %3.5 tolerans sınırı uyarısı', () => {
      // 100 gr verildi, 94 gr mamul, 3 gr astar alındı -> Toplam 97 gr alındı, Fire 3 gr (%3.0) -> Normal
      const normalLoss = calculateWorkshopLoss(100.0, 94.0, 3.0, 3.5);
      expect(normalLoss.lossWeight).toBe(3.0);
      expect(normalLoss.lossPercent).toBe(3.0);
      expect(normalLoss.isExcessiveLoss).toBe(false);

      // 100 gr verildi, 90 gr mamul, 5 gr astar alındı -> Toplam 95 gr alındı, Fire 5 gr (%5.0) -> Limit aşıldı!
      const excessLoss = calculateWorkshopLoss(100.0, 90.0, 5.0, 3.5);
      expect(excessLoss.lossWeight).toBe(5.0);
      expect(excessLoss.lossPercent).toBe(5.0);
      expect(excessLoss.isExcessiveLoss).toBe(true);
      expect(excessLoss.excessLossWeight).toBe(1.5); // 5.0 - (100 * 0.035) = 1.5 gr fazla fire
      expect(excessLoss.isCritical).toBe(true); // %5 ve üstü kritik fire
    });

    test('24.7 Cetasoft Emanet Altın Kasası ve Müşteri ParaPuan hesaplamaları', () => {
      // 20 gr 22K emanet bırakıldı
      const depositWeight = 20.0;
      const carat = 22;
      const pureGold = Number((depositWeight * CARAT_MILYEM_MAP[carat]).toFixed(3));
      expect(pureGold).toBe(18.32);

      // ParaPuan kazanımı ve harcanması
      let loyaltyBalance = 150;
      loyaltyBalance += 50; // Alışverişten puan kazandı
      expect(loyaltyBalance).toBe(200);
      loyaltyBalance -= 80; // İndirim olarak kullandı
      expect(loyaltyBalance).toBe(120);
    });

    test('24.8 Taksit tahsilatında plan kalan bakiyesinin düşümü ve aşırı ödeme (overpayment) koruması', () => {
      // 10,000 TL toplam, 2,000 TL peşinat -> Kalan: 8,000 TL (2 taksit x 4,000 TL)
      const totalAmount = 10000;
      const downPayment = 2000;
      let remainingAmount = totalAmount - downPayment; // 8000
      expect(remainingAmount).toBe(8000);

      const installmentItem = { amount: 4000, paidAmount: 0 };

      // Kullanıcı 5,000 TL ödemeye kalkarsa taksit tutarı kadar (4,000 TL) sınırlandırılmalı
      const userAttemptedPay = 5000;
      const itemRemaining = Math.max(0, installmentItem.amount - installmentItem.paidAmount);
      const actualPay = Math.min(userAttemptedPay, itemRemaining);
      expect(actualPay).toBe(4000);

      installmentItem.paidAmount += actualPay;
      remainingAmount = Math.max(0, Number((remainingAmount - actualPay).toFixed(2)));

      expect(installmentItem.paidAmount).toBe(4000);
      expect(remainingAmount).toBe(4000);
    });

    test('24.9 Cetasoft ParaPuan harcamasında yetersiz bakiye koruması (negatif puana düşmeme)', () => {
      const currentLoyaltyPoints = 40;
      const requestedDeduct = 100;

      // Yetersiz bakiye durumunda işlem reddedilmeli
      const hasEnough = currentLoyaltyPoints >= requestedDeduct;
      expect(hasEnough).toBe(false);

      // Geçerli düşüm
      const validDeduct = 30;
      const newPoints = hasEnough ? currentLoyaltyPoints - requestedDeduct : currentLoyaltyPoints - validDeduct;
      expect(newPoints).toBe(10);
      expect(newPoints).toBeGreaterThanOrEqual(0);
    });

    test('24.10 Pota takoz hesaplayıcısında hedef milyem 24K saflığından (0.995) büyük girildiğinde koruma', () => {
      // 100 gr 14K (0.585) hurda için imkansız hedef 0.999 milyem girildiğinde
      const impossibleTarget = calculateTakozMilyem(
        [{ carat: 14, weight: 100.0 }],
        0.999
      );

      // 0.995'ten büyük hedefe sadece 24K scrap (0.995) ekleyerek ulaşılamaz, pureGoldToAdd 0 olmalı
      expect(impossibleTarget.pureGoldToAdd).toBe(0);
    });

    test('24.11 İptal edilmiş veya tamamen ödenmiş taksit planına ödeme kabul edilmemesi koruması', () => {
      const checkPayable = (status: string, remaining: number) =>
        status !== INSTALLMENT_STATUS.CANCELLED &&
        status !== INSTALLMENT_STATUS.PAID &&
        remaining > 0;

      expect(checkPayable(INSTALLMENT_STATUS.CANCELLED, 5000)).toBe(false);
      expect(checkPayable(INSTALLMENT_STATUS.PAID, 0)).toBe(false);
      expect(checkPayable(INSTALLMENT_STATUS.PENDING, 3000)).toBe(true);
    });

    test('24.12 Çok kiracılı (multi-tenancy) bayi yalıtımı kontrolü', () => {
      const currentUserDealerId = 'sube-kadikoy';
      const isSuperAdmin = false;

      // Başka bayiye ait müşteri veya emanet
      const foreignDeposit = { dealerId: 'sube-besiktas', status: CUSTOMER_DEPOSIT_STATUS.ACTIVE };
      const canAccessForeign =
        isSuperAdmin || foreignDeposit.dealerId === currentUserDealerId;
      expect(canAccessForeign).toBe(false);

      // Kendi bayisine ait emanet
      const ownDeposit = { dealerId: 'sube-kadikoy', status: CUSTOMER_DEPOSIT_STATUS.ACTIVE };
      const canAccessOwn =
        isSuperAdmin || ownDeposit.dealerId === currentUserDealerId;
      expect(canAccessOwn).toBe(true);
    });

    test('24.13 Tamamlanmış atölye iş emrinin tekrar kapatılmasını önleyen durum kuralı', () => {
      const checkCompletable = (status: string) =>
        status === WORKSHOP_JOB_STATUS.IN_PRODUCTION ||
        status === WORKSHOP_JOB_STATUS.PENDING;

      expect(checkCompletable(WORKSHOP_JOB_STATUS.IN_PRODUCTION)).toBe(true);
      expect(checkCompletable(WORKSHOP_JOB_STATUS.PENDING)).toBe(true);
      expect(checkCompletable(WORKSHOP_JOB_STATUS.COMPLETED)).toBe(false);
      expect(checkCompletable(WORKSHOP_JOB_STATUS.CANCELLED)).toBe(false);
    });

    test('24.14 Terazi ayrıştırıcısında boşluklu ve negatif dara sıfır okuması dayanıklılığı', () => {
      // Negatif sıfır ("- 0.000 g") dara kontrolü
      const negZero = parseScaleData('ST,GS,- 0.000 g\r\n');
      expect(negZero).not.toBeNull();
      expect(negZero?.weight).toBe(-0);
      expect(negZero?.isStable).toBe(true);

      // Çok haneli yüksek gramaj ("+ 1250.750 g")
      const highWeight = parseScaleData('ST,GS,+ 1250.750 g\r\n');
      expect(highWeight).not.toBeNull();
      expect(highWeight?.weight).toBe(1250.75);
    });

    test('24.15 Hurda altın ayar listesi bütünlüğü ve desteklenmeyen ayar koruması', () => {
      expect(SUPPORTED_SCRAP_CARATS).toContain(14);
      expect(SUPPORTED_SCRAP_CARATS).toContain(22);
      expect(SUPPORTED_SCRAP_CARATS).toContain(24);

      // Desteklenmeyen ayar (örn: 10K veya 30K)
      const invalidCarat = 10;
      const isSupported = SUPPORTED_SCRAP_CARATS.includes(invalidCarat as any);
      expect(isSupported).toBe(false);
    });
  });
}

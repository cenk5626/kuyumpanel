import { describe, test, expect, setTestContext } from '../helpers/test-utils';
import { SECURITY_CONFIG } from '../../src/constants/security';
import { USER_ROLES } from '../../src/constants/roles';
import { PERMISSIONS } from '../../src/constants/permissions';
import {
  AuthenticationError,
  AuthorizationError,
  assertTenantOwnership,
  requirePermission,
  assertBranchAccess,
  AuthenticatedContext,
} from '../../src/lib/security/auth-context';
import {
  generateTotpSecret,
  verifyTotpToken,
  hashRecoveryCode,
  generateRecoveryCodes,
  verifyAndBurnRecoveryCode,
} from '../../src/lib/security/totp';
import {
  encryptSecret,
  decryptSecret,
} from '../../src/lib/security/encryption';
import {
  maskTckn,
  maskIban,
  maskPhone,
  maskName,
  sanitizeCsvCell,
  redactSensitiveData,
} from '../../src/lib/security/masking';
import {
  sanitizeBody,
  parseSafePositiveNumber,
  roundMoney,
  roundGrams,
  parseSafeDate,
  ValidationError,
} from '../../src/lib/security/validation';
import { checkIdempotency } from '../../src/lib/security/idempotency';
import { isUrlAllowed } from '../../src/lib/security/ssrf';
import {
  evaluateTransactionSuspicion,
  SuspiciousEvaluationInput,
} from '../../src/lib/security/suspicious-detector';
import {
  RISK_LEVELS,
  SUSPICIOUS_REASONS,
} from '../../src/constants/suspicious';

export function registerF25SecurityTests(): void {
  setTestContext(
    'Tier 1',
    25,
    'Enterprise Security Hardening & Zero-Trust Architecture',
    'F25: Security Hardening'
  );

  describe('Feature 25 - Kurumsal Güvenlik Sertleştirmesi (Faz 0)', () => {
    // -------------------------------------------------------------
    // 25.1: 401 / 403 Merkezi Kimlik & Yetkilendirme Koruması
    // -------------------------------------------------------------
    test('25.1.1 AuthenticationError ve AuthorizationError durum kodları ve mesajları', () => {
      const authErr = new AuthenticationError();
      expect(authErr.statusCode).toBe(401);
      expect(authErr.message).toBe('Oturum açmanız gerekiyor.');

      const customAuthErr = new AuthenticationError('Geçersiz token', 401);
      expect(customAuthErr.statusCode).toBe(401);
      expect(customAuthErr.message).toBe('Geçersiz token');

      const authorErr = new AuthorizationError();
      expect(authorErr.statusCode).toBe(403);
      expect(authorErr.message).toBe('Bu işlem için yetkiniz bulunmamaktadır.');
    });

    test('25.1.2 IDOR Önleme: assertTenantOwnership farklı bayi ID erişimini 403 ile engeller', () => {
      const userCtx: AuthenticatedContext = {
        userId: 'usr-1',
        userName: 'Ahmet Usta',
        userEmail: 'ahmet@kuyumcu.com',
        role: USER_ROLES.USER,
        dealerId: 'dealer-alpha',
        permissions: [PERMISSIONS.STOCKS_READ, PERMISSIONS.TRANSACTIONS_READ],
      };

      // Kendi bayisine ait kaynağa erişim: Başarılı
      assertTenantOwnership(userCtx, 'dealer-alpha', 'Stok');

      // Başka bayiye ait kaynağa erişim: 403 AuthorizationError fırlatmalı (IDOR engeli)
      let threw403 = false;
      try {
        assertTenantOwnership(userCtx, 'dealer-beta', 'Stok');
      } catch (err: any) {
        threw403 = true;
        expect(err instanceof AuthorizationError).toBe(true);
        expect(err.statusCode).toBe(403);
        expect(err.message).toContain('başka bir bayiye aittir');
      }
      expect(threw403).toBe(true);
    });

    test('25.1.3 SUPER_ADMIN çoklu bayi IDOR denetiminden muaftır', () => {
      const superAdminCtx: AuthenticatedContext = {
        userId: 'usr-super',
        userName: 'Sistem Yöneticisi',
        userEmail: 'admin@kuyumpanel.com',
        role: USER_ROLES.SUPER_ADMIN,
        dealerId: 'super_admin',
        permissions: Object.values(PERMISSIONS),
      };

      // SUPER_ADMIN herhangi bir bayinin kaynağına erişebilir
      assertTenantOwnership(superAdminCtx, 'dealer-alpha', 'Stok');
      assertTenantOwnership(superAdminCtx, 'dealer-beta', 'Kasa');
      assertTenantOwnership(superAdminCtx, null, 'Genel');
    });

    test('25.1.4 requirePermission yetkisiz kullanıcı eylemini 403 ile engeller', () => {
      const staffCtx: AuthenticatedContext = {
        userId: 'usr-staff',
        userName: 'Tezgahtar',
        userEmail: 'tezgah@kuyumcu.com',
        role: USER_ROLES.USER,
        dealerId: 'dealer-alpha',
        permissions: [PERMISSIONS.TRANSACTIONS_READ, PERMISSIONS.STOCKS_READ],
      };

      // Sahip olduğu izin: sorunsuz geçer
      requirePermission(staffCtx, PERMISSIONS.TRANSACTIONS_READ);

      // Sahip olmadığı izin: 403 fırlatmalı
      let denied = false;
      try {
        requirePermission(staffCtx, PERMISSIONS.USERS_MANAGE);
      } catch (err: any) {
        denied = true;
        expect(err instanceof AuthorizationError).toBe(true);
        expect(err.statusCode).toBe(403);
        expect(err.message).toContain(PERMISSIONS.USERS_MANAGE);
      }
      expect(denied).toBe(true);
    });

    test('25.1.5 assertBranchAccess şubeler arası veri izolasyonunu doğrular', () => {
      const branchUserCtx: AuthenticatedContext = {
        userId: 'usr-branch',
        userName: 'Kadıköy Sorumlusu',
        userEmail: 'kadikoy@kuyumcu.com',
        role: USER_ROLES.USER,
        dealerId: 'dealer-alpha',
        branchId: 'branch-kadikoy',
        permissions: [PERMISSIONS.STOCKS_READ],
      };

      // Kendi şubesine erişim: serbest
      assertBranchAccess(branchUserCtx, 'branch-kadikoy');

      // Başka şubeye erişim: 403
      let branchDenied = false;
      try {
        assertBranchAccess(branchUserCtx, 'branch-nisantasi');
      } catch (err: any) {
        branchDenied = true;
        expect(err instanceof AuthorizationError).toBe(true);
        expect(err.statusCode).toBe(403);
      }
      expect(branchDenied).toBe(true);
    });

    // -------------------------------------------------------------
    // 25.2: Brute Force & Hesap Kilitleme Mekanizması
    // -------------------------------------------------------------
    test('25.2.1 5 hatalı şifre denemesinde 15 dakika hesap kilitleme eşiği', () => {
      expect(SECURITY_CONFIG.MAX_FAILED_LOGIN_ATTEMPTS).toBe(5);
      expect(SECURITY_CONFIG.LOCKOUT_DURATION_MINUTES).toBe(15);
      expect(SECURITY_CONFIG.LOCKOUT_DURATION_MS).toBe(15 * 60 * 1000);

      // 1..4 başarısız denemede kilitlenmemeli
      for (let attempts = 1; attempts < 5; attempts++) {
        const shouldLock = attempts >= SECURITY_CONFIG.MAX_FAILED_LOGIN_ATTEMPTS;
        expect(shouldLock).toBe(false);
      }

      // 5. denemede kilitlenmeli
      const fifthAttempt = 5;
      const shouldLock = fifthAttempt >= SECURITY_CONFIG.MAX_FAILED_LOGIN_ATTEMPTS;
      expect(shouldLock).toBe(true);

      const now = Date.now();
      const lockedUntil = new Date(now + SECURITY_CONFIG.LOCKOUT_DURATION_MS);
      expect(lockedUntil.getTime()).toBeGreaterThan(now);
      expect(lockedUntil.getTime() - now).toBe(15 * 60 * 1000);
    });

    // -------------------------------------------------------------
    // 25.3: TOTP 2FA ve Kurtarma Kodları Motoru
    // -------------------------------------------------------------
    test('25.3.1 TOTP Secret üretimi ve RFC 6238 URI formatı', () => {
      const email = 'kuyumcu@test.com';
      const { secret, uri } = generateTotpSecret(email, 'KuyumPanel Test');

      expect(typeof secret).toBe('string');
      expect(secret.length).toBeGreaterThanOrEqual(16);
      expect(uri.startsWith('otpauth://totp/')).toBe(true);
      expect(uri).toContain(encodeURIComponent(email));
      expect(uri).toContain(`digits=${SECURITY_CONFIG.TOTP_DIGITS}`);
      expect(uri).toContain(`period=${SECURITY_CONFIG.TOTP_PERIOD_SECONDS}`);
    });

    test('25.3.2 Geçersiz TOTP token doğrulama denemeleri anında reddedilir', () => {
      const { secret } = generateTotpSecret('test@kuyumcu.com');

      // Boş token
      expect(verifyTotpToken(secret, '')).toBe(false);
      // Eksik haneli token
      expect(verifyTotpToken(secret, '12345')).toBe(false);
      // Fazla haneli token
      expect(verifyTotpToken(secret, '1234567')).toBe(false);
      // Rastgele geçersiz token
      expect(verifyTotpToken(secret, '999999')).toBe(false);
    });

    test('25.3.3 10 Adet tek kullanımlık kurtarma kodu üretimi ve tek kullanımda yakılma (Burn)', () => {
      const { plainCodes, hashedCodes } = generateRecoveryCodes(10, 8);

      expect(plainCodes.length).toBe(10);
      expect(hashedCodes.length).toBe(10);

      for (let i = 0; i < 10; i++) {
        expect(plainCodes[i].length).toBe(8);
        expect(hashRecoveryCode(plainCodes[i])).toBe(hashedCodes[i]);
      }

      const storedJson = JSON.stringify(hashedCodes);
      const codeToBurn = plainCodes[3];

      // 1. Kullanım: Başarılı olmalı ve kalan kod sayısı 9'a düşmeli
      const firstUse = verifyAndBurnRecoveryCode(storedJson, codeToBurn);
      expect(firstUse.valid).toBe(true);

      const remainingList: string[] = JSON.parse(firstUse.remainingCodesJson);
      expect(remainingList.length).toBe(9);
      expect(remainingList.includes(hashRecoveryCode(codeToBurn))).toBe(false);

      // 2. Kullanım (Replay attack): Aynı kod ikinci kez KULLANILAMAZ!
      const secondUse = verifyAndBurnRecoveryCode(firstUse.remainingCodesJson, codeToBurn);
      expect(secondUse.valid).toBe(false);

      // Yanlış kod denemesi
      const wrongUse = verifyAndBurnRecoveryCode(firstUse.remainingCodesJson, 'WRONG000');
      expect(wrongUse.valid).toBe(false);
    });

    // -------------------------------------------------------------
    // 25.4: AES-256-GCM Şifreleme ve Bütünlük Doğrulaması
    // -------------------------------------------------------------
    test('25.4.1 Hassas API Token AES-256-GCM ile şifrelenir ve çözülür', () => {
      const sensitiveToken = 'turso-jwt-cloud-token-secret-987654321';
      const cipherText = encryptSecret(sensitiveToken);

      expect(cipherText).toContain(':');
      const parts = cipherText.split(':');
      expect(parts.length).toBe(3); // iv : authTag : cipherHex

      const decrypted = decryptSecret(cipherText);
      expect(decrypted).toBe(sensitiveToken);
    });

    test('25.4.2 Tahrif edilmiş şifreli metin (Cipher Tampering) güvenle null döner', () => {
      const sensitive = 'harem-altin-api-secret';
      const cipherText = encryptSecret(sensitive);
      const parts = cipherText.split(':');

      // AuthTag değiştirilmiş (Bütünlük saldırısı)
      const tamperedAuthTag = parts[0] + ':00000000000000000000000000000000:' + parts[2];
      expect(decryptSecret(tamperedAuthTag)).toBe(null);

      // Bozuk format
      expect(decryptSecret('invalid-cipher-format')).toBe(null);
      expect(decryptSecret('')).toBe(null);
    });

    // -------------------------------------------------------------
    // 25.5: Mass-Assignment & Girdi Doğrulama (Sanitization)
    // -------------------------------------------------------------
    test('25.5.1 sanitizeBody saldırgan veya yetkisiz parametreleri süzer', () => {
      const maliciousPayload = {
        name: 'Altın Bilezik 22K',
        price: 35000,
        role: 'SUPER_ADMIN',
        dealerId: 'victim-dealer-999',
        isSuperUser: true,
        __proto__: { polluter: true },
      };

      const allowedKeys = ['name', 'price', 'barcode'] as const;
      const clean = sanitizeBody(maliciousPayload, allowedKeys);

      expect(clean.name).toBe('Altın Bilezik 22K');
      expect(clean.price).toBe(35000);
      expect((clean as any).role).toBe(undefined);
      expect((clean as any).dealerId).toBe(undefined);
      expect((clean as any).isSuperUser).toBe(undefined);
    });

    test('25.5.2 Sayısal ve tarihsel girdilerin doğrulanması (NaN, negatif, sonsuz)', () => {
      expect(parseSafePositiveNumber(150.5, 'Fiyat')).toBe(150.5);
      expect(parseSafePositiveNumber('2500', 'Tutar')).toBe(2500);

      // Negatif sayı engeli
      let negThrew = false;
      try {
        parseSafePositiveNumber(-50, 'Gramaj', false);
      } catch (err: any) {
        negThrew = true;
        expect(err instanceof ValidationError).toBe(true);
      }
      expect(negThrew).toBe(true);

      // NaN engeli
      let nanThrew = false;
      try {
        parseSafePositiveNumber('abc', 'Gramaj');
      } catch (err: any) {
        nanThrew = true;
        expect(err instanceof ValidationError).toBe(true);
      }
      expect(nanThrew).toBe(true);

      // Para ve gram yuvarlama hassasiyetleri
      expect(roundMoney(10.555)).toBe(10.56);
      expect(roundGrams(3.14159)).toBe(3.142);

      // Güvenli tarih
      const validDate = parseSafeDate('2026-09-08T00:00:00.000Z');
      expect(validDate.getFullYear()).toBe(2026);
      const fallbackDate = parseSafeDate('invalid-date');
      expect(fallbackDate instanceof Date).toBe(true);
      expect(!isNaN(fallbackDate.getTime())).toBe(true);
    });

    // -------------------------------------------------------------
    // 25.6: CSV / Excel Formül Enjeksiyonu (DDE Attack) Nötralizasyonu
    // -------------------------------------------------------------
    test('25.6.1 CSV formül enjeksiyonu başlangıç karakterleri temizlenir', () => {
      expect(sanitizeCsvCell("=cmd|' /C calc'!A0")).toBe("'=cmd|' /C calc'!A0");
      expect(sanitizeCsvCell('+SUM(A1:A10)')).toBe("'+SUM(A1:A10)");
      expect(sanitizeCsvCell('-1+1')).toBe("'-1+1");
      expect(sanitizeCsvCell('@IMPORTXML(...)')).toBe("'@IMPORTXML(...)");
      expect(sanitizeCsvCell('\tEvilCommand')).toBe("'\tEvilCommand");

      // Normal metinler ve sayılar değişmeden kalır
      expect(sanitizeCsvCell('Has Altın 24K')).toBe('Has Altın 24K');
      expect(sanitizeCsvCell('12500')).toBe('12500');
      expect(sanitizeCsvCell('')).toBe('');
      expect(sanitizeCsvCell(null)).toBe('');
    });

    // -------------------------------------------------------------
    // 25.7: PII Maskeleme ve Hassas Veri Temizliği (Redaction)
    // -------------------------------------------------------------
    test('25.7.1 TCKN, IBAN, GSM ve İsim maskeleme standartları', () => {
      // TCKN: 12345678901 -> 123******01
      expect(maskTckn('12345678901')).toBe('123******01');

      // GSM: 05321234567 -> 0532 *** **67
      expect(maskPhone('05321234567')).toBe('0532 *** **67');

      // IBAN: TR120006200000012345678901 -> TR** **** **** **** **89 01
      const maskedIban = maskIban('TR120006200000012345678901');
      expect(maskedIban.startsWith('TR**')).toBe(true);
      expect(maskedIban.endsWith('89 01')).toBe(true);

      // İsim: Ahmet Yılmaz -> Ah*** Yı****
      expect(maskName('Ahmet Yılmaz')).toBe('Ah*** Yı****');
    });

    test('25.7.2 redactSensitiveData log ve API yanıtlarındaki parolaları ve anahtarları maskeler', () => {
      const rawLog = {
        action: 'USER_LOGIN',
        user: {
          id: 'u1',
          name: 'Ali Usta',
          password: 'superSecretHash$123',
          twoFactorSecret: 'JBSWY3DPEHPK3PXP',
        },
        payload: {
          apiKey: 'pk_live_12345',
          token: 'jwt_token_sample',
          amount: 5000,
        },
      };

      const cleanLog: any = redactSensitiveData(rawLog);

      expect(cleanLog.action).toBe('USER_LOGIN');
      expect(cleanLog.user.name).toBe('Ali Usta');
      expect(cleanLog.user.password).toBe('[REDACTED]');
      expect(cleanLog.user.twoFactorSecret).toBe('[REDACTED]');
      expect(cleanLog.payload.apiKey).toBe('[REDACTED]');
      expect(cleanLog.payload.token).toBe('[REDACTED]');
      expect(cleanLog.payload.amount).toBe(5000);
    });

    // -------------------------------------------------------------
    // 25.8: Idempotency Anahtarı ile Çift İşlem (Double-Submit) Koruması
    // -------------------------------------------------------------
    test('25.8.1 Aynı idempotency anahtarı ile gelen mükerrer işlem engellenir', () => {
      const key = 'idem-pos-sale-20260908-001';
      const dealerId = 'dealer-test';
      const action = 'CREATE_TRANSACTION';

      // İlk istek: Başarılı başlar
      const req1 = checkIdempotency(key, dealerId, action);
      expect(req1.isDuplicate).toBe(false);

      // Eşzamanlı ikinci istek: Henüz ilk işlem bitmemişken geldi -> Mükerrer olarak reddedilmeli
      const req2 = checkIdempotency(key, dealerId, action);
      expect(req2.isDuplicate).toBe(true);

      // İlk işlem bitti ve yanıtı önbelleğe aldı
      req1.markCompleted({ success: true, transactionId: 'tx-999' });

      // Üçüncü istek: Tamamlanmış işlemi tespit eder ve önbellekten yanıtı döner
      const req3 = checkIdempotency(key, dealerId, action);
      expect(req3.isDuplicate).toBe(true);
      expect(req3.cachedResponse.transactionId).toBe('tx-999');

      // Farklı bir bayi aynı anahtarı kullanırsa çakışmaz (Tenant Isolation)
      const reqOtherDealer = checkIdempotency(key, 'dealer-other', action);
      expect(reqOtherDealer.isDuplicate).toBe(false);
      reqOtherDealer.release();
    });

    // -------------------------------------------------------------
    // 25.9: SSRF Koruması & İzin Verilen Harici Servisler
    // -------------------------------------------------------------
    test('25.9.1 isUrlAllowed harici alan adları ve IP kısıtlamalarını doğrular', () => {
      // İzin verilen servisler (Altis, Harem Altın, WhatsApp API, Turso)
      expect(isUrlAllowed('https://altis.com.tr/api/prices')).toBe(true);
      expect(isUrlAllowed('https://api.altis.com.tr/v1/feed')).toBe(true);
      expect(isUrlAllowed('https://haremaltin.com/canli-fiyat')).toBe(true);
      expect(isUrlAllowed('https://api.whatsapp.com/send')).toBe(true);
      expect(isUrlAllowed('https://turso.io/db')).toBe(true);

      // İzin verilmeyen saldırgan alan adları
      expect(isUrlAllowed('https://evil-hacker.com/steal')).toBe(false);
      expect(isUrlAllowed('https://unknown-api.org')).toBe(false);

      // SSRF Bulut Metadata ve Özel IP aralıkları engellenmeli
      expect(isUrlAllowed('http://169.254.169.254/latest/meta-data/')).toBe(false);
      expect(isUrlAllowed('http://10.0.0.1/admin')).toBe(false);
      expect(isUrlAllowed('http://192.168.1.1/router')).toBe(false);
      expect(isUrlAllowed('http://172.16.0.1/internal')).toBe(false);

      // Şifrelenmemiş HTTP dış alan adları engellenmeli
      expect(isUrlAllowed('http://altis.com.tr/api')).toBe(false);
    });

    // -------------------------------------------------------------
    // 25.10: Şüpheli İşlem Tespit Motoru (Suspicious Activity Detector)
    // -------------------------------------------------------------
    test('25.10.1 Yüksek tutarlı veya anormal zamanlı işlemler şüpheli olarak etiketlenir', () => {
      // Normal satış işlemi: ₺12,000, mesai saatinde (14:00)
      const normalTx: SuspiciousEvaluationInput = {
        type: 'sell',
        productCode: 'BILEZIK22',
        quantity: 1,
        price: 12000,
        total: 12000,
        createdAt: new Date('2026-09-08T14:00:00.000Z'),
      };
      const normalEval = evaluateTransactionSuspicion(normalTx);
      expect(normalEval.isSuspicious).toBe(false);
      expect(normalEval.riskLevel).toBe(RISK_LEVELS.LOW);

      // Yüksek riskli işlem: ₺750,000 tutarında (Eşik: ₺500,000)
      const highAmountTx: SuspiciousEvaluationInput = {
        type: 'sell',
        productCode: 'KULCE24',
        quantity: 200,
        price: 3750,
        total: 750000,
        createdAt: new Date('2026-09-08T14:00:00.000Z'),
      };
      const highEval = evaluateTransactionSuspicion(highAmountTx);
      expect(highEval.isSuspicious).toBe(true);
      expect(highEval.riskLevel).toBe(RISK_LEVELS.HIGH);
      expect(highEval.reasons.some(r => r.includes(SUSPICIOUS_REASONS.HIGH_AMOUNT))).toBe(true);

      // Gece yarısı işlemi: 03:30
      const nightTx: SuspiciousEvaluationInput = {
        type: 'sell',
        productCode: 'CEYREK',
        quantity: 2,
        price: 6000,
        total: 12000,
        createdAt: new Date('2026-09-08T03:30:00.000Z'),
      };
      const nightEval = evaluateTransactionSuspicion(nightTx);
      expect(nightEval.reasons.some(r => r.includes(SUSPICIOUS_REASONS.AFTER_HOURS))).toBe(true);
    });
  });
}

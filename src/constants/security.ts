// Kurumsal Güvenlik ve Tehdit Önleme Sabitleri

export const SECURITY_CONFIG = {
  // Brute Force & Hesap Kilitleme
  MAX_FAILED_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION_MINUTES: 15,
  LOCKOUT_DURATION_MS: 15 * 60 * 1000,

  // TOTP 2FA
  TOTP_WINDOW_STEPS: 1, // +/- 30 saniye tolerans
  TOTP_DIGITS: 6,
  TOTP_PERIOD_SECONDS: 30,
  RECOVERY_CODE_COUNT: 10,
  RECOVERY_CODE_LENGTH: 8,

  // Rate Limiting (Kayan pencere - Sliding Window)
  RATE_LIMITS: {
    AUTH_LOGIN: { max: 5, windowMs: 60 * 1000 },       // 5 istek / dakika
    AUTH_2FA: { max: 5, windowMs: 60 * 1000 },         // 5 istek / dakika
    AI_CHAT: { max: 20, windowMs: 60 * 1000 },          // 20 istek / dakika
    DATA_IMPORT_EXPORT: { max: 10, windowMs: 60 * 1000 },// 10 istek / dakika
    FINANCIAL_MUTATIONS: { max: 60, windowMs: 60 * 1000 },// 60 işlem / dakika
  },

  // Dosya Yükleme Limitleri
  FILES: {
    MAX_IMPORT_SIZE_BYTES: 5 * 1024 * 1024, // 5 MB
    MAX_IMPORT_ROWS: 1000,
    ALLOWED_SPREADSHEET_EXTENSIONS: ['.xlsx', '.csv'],
    ALLOWED_SPREADSHEET_MIME_TYPES: [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
      'application/vnd.ms-excel',
    ],
  },

  // CSV/Excel Formül Enjeksiyonu (Formula Injection / CSV Injection) Tehlikeli Başlangıç Karakterleri
  CSV_INJECTION_CHARS: ['=', '+', '-', '@', '\t', '\r'],

  // SSRF (Server-Side Request Forgery) Dış Servis İzin Listesi (Allow-List)
  ALLOWED_EXTERNAL_DOMAINS: [
    'altis.com.tr',
    'haremaltin.com',
    'graph.facebook.com',
    'api.whatsapp.com',
    'turso.io',
  ],

  // Idempotency
  IDEMPOTENCY_TTL_MS: 5 * 60 * 1000, // 5 dakika

  // Maskeleme
  MASK_CHAR: '*',
} as const;

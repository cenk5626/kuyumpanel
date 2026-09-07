import crypto from 'crypto';

// AES-256-GCM Şifreleme Standardı
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit recommended for GCM
const TAG_LENGTH = 16; // 128-bit auth tag

/**
 * Şifreleme anahtarını ortam değişkeninden güvenle türetir (32 byte).
 */
function getEncryptionKey(): Buffer {
  const secret = process.env.ENCRYPTION_SECRET || process.env.NEXTAUTH_SECRET || 'kuyumpanel-enterprise-master-key-32b-fallback';
  return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Hassas veriyi AES-256-GCM ile şifreler.
 * Format: ivHex:authTagHex:encryptedHex
 */
export function encryptSecret(plainText: string): string {
  if (!plainText) return '';
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = getEncryptionKey();
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * AES-256-GCM ile şifrelenmiş veriyi çözer. Bütünlük bozulmuşsa null döner.
 */
export function decryptSecret(cipherText: string): string | null {
  if (!cipherText || !cipherText.includes(':')) return null;

  try {
    const parts = cipherText.split(':');
    if (parts.length !== 3) return null;

    const [ivHex, authTagHex, encryptedHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const key = getEncryptionKey();

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    // Şifre çözme veya bütünlük doğrulama hatası (Auth tag mismatch)
    return null;
  }
}

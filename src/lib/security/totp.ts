import crypto from 'crypto';
import { SECURITY_CONFIG } from '@/constants/security';

// RFC 4648 Base32 Alfabe
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = '';

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;

    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

function base32Decode(input: string): Buffer {
  const clean = input.toUpperCase().replace(/=+$/, '').replace(/\s+/g, '');
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (let i = 0; i < clean.length; i++) {
    const idx = BASE32_ALPHABET.indexOf(clean[i]);
    if (idx === -1) continue;

    value = (value << 5) | idx;
    bits += 5;

    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

/**
 * TOTP Token Hesaplayıcı (RFC 6238 HMAC-SHA1)
 */
function computeTotp(secretBuffer: Buffer, counter: number): string {
  const buffer = Buffer.alloc(8);
  buffer.writeBigInt64BE(BigInt(counter));

  const hmac = crypto.createHmac('sha1', secretBuffer).update(buffer).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const codeInt =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  const code = (codeInt % 10 ** SECURITY_CONFIG.TOTP_DIGITS)
    .toString()
    .padStart(SECURITY_CONFIG.TOTP_DIGITS, '0');

  return code;
}

/**
 * Yeni bir 2FA TOTP Secret ve QR Kodu URI'ı üretir.
 */
export function generateTotpSecret(
  email: string,
  issuer: string = 'KuyumPanel'
): { secret: string; uri: string } {
  const randomBytes = crypto.randomBytes(20);
  const secret = base32Encode(randomBytes);
  const encodedIssuer = encodeURIComponent(issuer);
  const encodedEmail = encodeURIComponent(email);
  const uri = `otpauth://totp/${encodedIssuer}:${encodedEmail}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=${SECURITY_CONFIG.TOTP_DIGITS}&period=${SECURITY_CONFIG.TOTP_PERIOD_SECONDS}`;

  return { secret, uri };
}

/**
 * İstemciden gelen 6 haneli TOTP kodunu doğrular (+/- 30 sn penceresi ile).
 */
export function verifyTotpToken(
  secret: string,
  token: string,
  windowSteps: number = SECURITY_CONFIG.TOTP_WINDOW_STEPS
): boolean {
  if (!secret || !token) return false;
  const cleanToken = token.trim().replace(/\s+/g, '');
  if (cleanToken.length !== SECURITY_CONFIG.TOTP_DIGITS) return false;

  try {
    const secretBuffer = base32Decode(secret);
    const currentTimeStep = Math.floor(Date.now() / 1000 / SECURITY_CONFIG.TOTP_PERIOD_SECONDS);

    for (let step = -windowSteps; step <= windowSteps; step++) {
      const expectedCode = computeTotp(secretBuffer, currentTimeStep + step);
      if (crypto.timingSafeEqual(Buffer.from(cleanToken), Buffer.from(expectedCode))) {
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Kurtarma kodunu SHA-256 ile hashler.
 */
export function hashRecoveryCode(code: string): string {
  const clean = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  return crypto.createHash('sha256').update(clean).digest('hex');
}

/**
 * 10 adet tek kullanımlık kurtarma kodu üretir.
 */
export function generateRecoveryCodes(
  count: number = SECURITY_CONFIG.RECOVERY_CODE_COUNT,
  length: number = SECURITY_CONFIG.RECOVERY_CODE_LENGTH
): { plainCodes: string[]; hashedCodes: string[] } {
  const plainCodes: string[] = [];
  const hashedCodes: string[] = [];

  for (let i = 0; i < count; i++) {
    const code = crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length).toUpperCase();
    plainCodes.push(code);
    hashedCodes.push(hashRecoveryCode(code));
  }

  return { plainCodes, hashedCodes };
}

/**
 * Kurtarma kodunu doğrular ve kullanılmışsa listeden kalıcı olarak siler (Burn).
 */
export function verifyAndBurnRecoveryCode(
  storedCodesJson: string | null | undefined,
  inputCode: string
): { valid: boolean; remainingCodesJson: string } {
  if (!storedCodesJson || !inputCode) {
    return { valid: false, remainingCodesJson: '[]' };
  }

  try {
    const hashedCodes: string[] = JSON.parse(storedCodesJson);
    const inputHash = hashRecoveryCode(inputCode);
    const index = hashedCodes.indexOf(inputHash);

    if (index === -1) {
      return { valid: false, remainingCodesJson: storedCodesJson };
    }

    // Kodu yak (listeden çıkar)
    hashedCodes.splice(index, 1);
    return { valid: true, remainingCodesJson: JSON.stringify(hashedCodes) };
  } catch {
    return { valid: false, remainingCodesJson: storedCodesJson };
  }
}

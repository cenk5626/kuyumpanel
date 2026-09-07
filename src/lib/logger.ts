import { prisma } from '@/lib/prisma';
import { redactSensitiveData } from '@/lib/security/masking';

export interface LogOptions {
  dealerId: string;
  action: string;
  details: string;
  userId?: string | null;
  userEmail?: string | null;
  userName?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  oldValues?: any;
  newValues?: any;
  reason?: string | null;
}

/**
 * Sistemdeki kritik işlemleri kurumsal standartlarda AuditLog tablosuna (Append-Only) kaydeder.
 * Şifre, token ve hassas sırları otomatik olarak maskeler/temizler.
 */
export async function logActivity({
  dealerId,
  action,
  details,
  userId,
  userEmail,
  userName,
  ipAddress,
  userAgent,
  oldValues,
  newValues,
  reason,
}: LogOptions): Promise<void> {
  try {
    if (!dealerId) return;

    // Hassas alanları loglardan temizle
    const cleanDetails = typeof details === 'string' ? details : JSON.stringify(redactSensitiveData(details));
    const cleanOld = oldValues ? JSON.stringify(redactSensitiveData(oldValues)) : null;
    const cleanNew = newValues ? JSON.stringify(redactSensitiveData(newValues)) : null;

    await prisma.auditLog.create({
      data: {
        dealerId,
        action,
        details: cleanDetails,
        userId: userId || null,
        userEmail: userEmail || null,
        userName: userName || null,
        ipAddress: ipAddress || null,
        userAgent: userAgent ? userAgent.substring(0, 255) : null,
        oldValues: cleanOld,
        newValues: cleanNew,
        reason: reason || null,
      },
    });
  } catch (error) {
    // Audit log hatası ana finansal işlemi düşürmemeli, ancak konsola basılmalı
    console.error('[AuditLogger] Failed to write audit log entry:', error);
  }
}

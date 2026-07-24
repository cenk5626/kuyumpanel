import { prisma } from '@/lib/prisma';

interface LogOptions {
  dealerId: string;
  action: string;
  details: string;
  userEmail?: string | null;
  userName?: string | null;
}

/**
 * Sistemdeki kritik işlemleri AuditLog tablosuna kaydeder.
 */
export async function logActivity({ dealerId, action, details, userEmail, userName }: LogOptions) {
  try {
    if (!dealerId) return;
    await prisma.auditLog.create({
      data: {
        dealerId,
        action,
        details,
        userEmail: userEmail || null,
        userName: userName || null,
      },
    });
  } catch (error) {
    console.error('[AuditLogger] Failed to log activity:', error);
  }
}

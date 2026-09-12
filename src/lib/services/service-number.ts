import prisma from '@/lib/prisma';
import { SERVICE_DEFAULTS } from '@/constants/service';

export function formatServiceOrderNumber(sequence: number, year: number = new Date().getFullYear()): string {
  const padded = String(sequence).padStart(4, '0');
  return `${SERVICE_DEFAULTS.PREFIX}-${year}-${padded}`;
}

/**
 * Bayi bazında yılın sıralı Servis & Tamirat Takip Numarasını üretir (Örn: SRV-2026-0001).
 */
export async function generateServiceOrderNumber(dealerId: string): Promise<string> {
  const currentYear = new Date().getFullYear();
  const prefix = `${SERVICE_DEFAULTS.PREFIX}-${currentYear}-`;

  const count = await prisma.serviceOrder.count({
    where: {
      dealerId,
      serviceNumber: {
        startsWith: prefix,
      },
    },
  });

  return formatServiceOrderNumber(count + 1, currentYear);
}

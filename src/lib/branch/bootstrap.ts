import { prisma } from '@/lib/prisma';
import { BRANCH_DEFAULTS } from '@/constants/branch';

/**
 * Bir bayinin varsayılan Merkez şubesini doğrular veya yoksa otomatik oluşturur.
 * Mevcut sahipsiz (branchId: null) kayıtları bu varsayılan şubeye bağlar.
 */
export async function ensureDefaultBranch(dealerId: string): Promise<string> {
  if (!dealerId) return '';

  let defaultBranch = await prisma.branch.findFirst({
    where: { dealerId, isDefault: true },
  });

  if (!defaultBranch) {
    // İsme veya koda göre var mı bak
    defaultBranch = await prisma.branch.findFirst({
      where: { dealerId, code: BRANCH_DEFAULTS.CODE },
    });
  }

  if (!defaultBranch) {
    defaultBranch = await prisma.branch.create({
      data: {
        dealerId,
        name: BRANCH_DEFAULTS.NAME,
        code: BRANCH_DEFAULTS.CODE,
        isDefault: true,
        isActive: true,
      },
    });
  }

  const branchId = defaultBranch.id;

  // Geriye dönük veri bağlama (Mevcut tek şube verilerini Merkez'e bağla)
  await Promise.all([
    prisma.stock.updateMany({
      where: { dealerId, branchId: null },
      data: { branchId },
    }).catch(() => {}),
    prisma.productItem.updateMany({
      where: { dealerId, branchId: null },
      data: { branchId },
    }).catch(() => {}),
    prisma.transaction.updateMany({
      where: { dealerId, branchId: null },
      data: { branchId },
    }).catch(() => {}),
    prisma.cashRegisterSession.updateMany({
      where: { dealerId, branchId: null },
      data: { branchId },
    }).catch(() => {}),
    prisma.employee.updateMany({
      where: { dealerId, branchId: null },
      data: { branchId },
    }).catch(() => {}),
  ]);

  return branchId;
}

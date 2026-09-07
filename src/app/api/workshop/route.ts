import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedContext } from '@/lib/security/auth-context';
import { logActivity } from '@/lib/logger';
import {
  WORKSHOP_JOB_STATUS,
  WORKSHOP_ACTIONS,
  WORKSHOP_DEFAULTS,
  CARAT_MILYEM_MAP,
  getMilyemForCarat,
  SUPPORTED_SCRAP_CARATS,
  WORKSHOP_LIMITS,
} from '@/constants/workshop';
import { ASSET_TYPES } from '@/constants/cari';
import { calculateTakozMilyem, calculateWorkshopLoss } from '@/lib/workshop/takoz-calculator';

export const dynamic = 'force-dynamic';

/**
 * GET /api/workshop — Atölye iş emirleri, ramat raporları ve hurda sandığı envanterini döner.
 */
export async function GET(request: NextRequest) {
  try {
    const ctx = await getAuthenticatedContext();
    const currentUserRole = ctx.role;
    const currentUserDealerId = ctx.dealerId;

    let whereClause: any = {};
    if (currentUserRole !== 'SUPER_ADMIN') {
      whereClause.dealerId = currentUserDealerId;
    }

    // 1. Atölye İş Emirleri
    const jobs = await prisma.workshopJob.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    // 2. Hurda Sandığı Envanteri
    let scrapInventories = await prisma.scrapInventory.findMany({
      where: whereClause,
      orderBy: { carat: 'asc' },
    });

    // Desteklenen ayarlar eksikse varsayılan 0 olarak oluştur
    if (scrapInventories.length === 0) {
      for (const carat of SUPPORTED_SCRAP_CARATS) {
        await prisma.scrapInventory.upsert({
          where: {
            dealerId_carat: {
              dealerId: currentUserDealerId,
              carat,
            },
          },
          update: {},
          create: {
            dealerId: currentUserDealerId,
            carat,
            weight: 0,
            pureWeight: 0,
          },
        });
      }
      scrapInventories = await prisma.scrapInventory.findMany({
        where: whereClause,
        orderBy: { carat: 'asc' },
      });
    }

    // Toplam hurda ve has özeti
    let totalScrapWeight = 0;
    let totalScrapPureWeight = 0;
    for (const item of scrapInventories) {
      totalScrapWeight += item.weight;
      totalScrapPureWeight += item.pureWeight;
    }

    const safeJobs = jobs.map((j) => ({
      ...j,
      createdAt: j.createdAt
        ? j.createdAt instanceof Date
          ? j.createdAt.toISOString()
          : new Date(j.createdAt).toISOString()
        : new Date().toISOString(),
      updatedAt: j.updatedAt
        ? j.updatedAt instanceof Date
          ? j.updatedAt.toISOString()
          : new Date(j.updatedAt).toISOString()
        : new Date().toISOString(),
      deliveryDate: j.deliveryDate
        ? j.deliveryDate instanceof Date
          ? j.deliveryDate.toISOString()
          : new Date(j.deliveryDate).toISOString()
        : null,
      completedDate: j.completedDate
        ? j.completedDate instanceof Date
          ? j.completedDate.toISOString()
          : new Date(j.completedDate).toISOString()
        : null,
    }));

    return NextResponse.json({
      jobs: safeJobs,
      scrapInventories,
      summary: {
        totalScrapWeight: Number(totalScrapWeight.toFixed(4)),
        totalScrapPureWeight: Number(totalScrapPureWeight.toFixed(4)),
        activeJobsCount: jobs.filter((j) => j.status === WORKSHOP_JOB_STATUS.IN_PRODUCTION).length,
        totalJobsCount: jobs.length,
      },
    });
  } catch (error) {
    console.error('[API Workshop] GET Error:', error);
    return NextResponse.json({
      jobs: [],
      scrapInventories: [],
      summary: { totalScrapWeight: 0, totalScrapPureWeight: 0, activeJobsCount: 0, totalJobsCount: 0 },
    });
  }
}

/**
 * POST /api/workshop — Hurda sandığı güncelleme, pota eritme ve iş emri yönetimi.
 */
export async function POST(request: NextRequest) {
  try {
    const ctx = await getAuthenticatedContext();
    const currentUserRole = ctx.role;
    const currentUserDealerId = ctx.dealerId;
    const userEmail = ctx.userEmail;
    const userName = ctx.userName;

    const body = await request.json();
    const { action } = body;

    // 1. Yeni Atölye İş Emri Açma
    if (action === WORKSHOP_ACTIONS.CREATE_JOB) {
      const {
        workshopName,
        description,
        givenWeight,
        givenPureWeight,
        givenCaratBreakdown,
        givenTargetMilyem,
        targetLossPercent = WORKSHOP_LIMITS.DEFAULT_MAX_FIRE_PERCENT,
        laborCost = 0,
        laborPaymentMethod = ASSET_TYPES.TL,
        deliveryDate,
        notes,
      } = body;

      if (!workshopName || !description) {
        return NextResponse.json(
          { error: 'Atölye adı ve iş emri açıklaması zorunludur.' },
          { status: 400 }
        );
      }

      if (!givenWeight || Number(givenWeight) <= 0) {
        return NextResponse.json(
          { error: 'Atölyeye verilen altın gramajı sıfırdan büyük olmalıdır.' },
          { status: 400 }
        );
      }

      const count = await prisma.workshopJob.count({
        where: { dealerId: currentUserDealerId },
      });
      const year = new Date().getFullYear();
      const jobNo = `${WORKSHOP_DEFAULTS.JOB_PREFIX}-${year}-${String(count + 1).padStart(4, '0')}`;

      // Güvenli Tarih Ayrıştırma
      const parsedDeliveryDate = deliveryDate
        ? isNaN(new Date(deliveryDate).getTime())
          ? null
          : new Date(deliveryDate)
        : null;

      const created = await prisma.workshopJob.create({
        data: {
          jobNo,
          dealerId: currentUserDealerId,
          workshopName: workshopName.trim(),
          description: description.trim(),
          status: WORKSHOP_JOB_STATUS.IN_PRODUCTION,
          givenWeight: Number(givenWeight) || 0,
          givenPureWeight: Number(givenPureWeight) || 0,
          givenCaratBreakdown: typeof givenCaratBreakdown === 'string' ? givenCaratBreakdown : JSON.stringify(givenCaratBreakdown || []),
          givenTargetMilyem: Number(givenTargetMilyem) || null,
          targetLossPercent: Number(targetLossPercent) || WORKSHOP_LIMITS.DEFAULT_MAX_FIRE_PERCENT,
          laborCost: Number(laborCost) || 0,
          laborPaymentMethod,
          deliveryDate: parsedDeliveryDate,
          notes: notes?.trim() || null,
        },
      });

      await logActivity({
        dealerId: currentUserDealerId,
        action: 'WORKSHOP_JOB_CREATE',
        details: `${jobNo} numaralı atölye iş emri açıldı (${workshopName} - ${givenWeight || 0} gr).`,
        userEmail,
        userName,
      });

      const safeCreated = {
        ...created,
        deliveryDate: created.deliveryDate ? created.deliveryDate.toISOString() : null,
        completedDate: created.completedDate ? created.completedDate.toISOString() : null,
        createdAt: created.createdAt instanceof Date ? created.createdAt.toISOString() : new Date().toISOString(),
        updatedAt: created.updatedAt instanceof Date ? created.updatedAt.toISOString() : new Date().toISOString(),
      };

      return NextResponse.json(safeCreated);
    }

    // 2. Atölye İş Emrini Tamamlama / Ramat Kapatma
    if (action === WORKSHOP_ACTIONS.COMPLETE_JOB) {
      const {
        jobId,
        receivedFinishedWeight = 0,
        receivedScrapWeight = 0,
        scrapCarat = 14,
        completedDate,
        notes,
      } = body;

      const job = await prisma.workshopJob.findUnique({
        where: { id: jobId },
      });

      if (!job) {
        return NextResponse.json({ error: 'İş emri bulunamadı.' }, { status: 404 });
      }

      // Çok kiracılı bayi yalıtımı kontrolü
      if (currentUserRole !== 'SUPER_ADMIN' && job.dealerId !== currentUserDealerId) {
        return NextResponse.json({ error: 'Bu işlem için yetkiniz yok.' }, { status: 403 });
      }

      // Kapalı veya iptal edilmiş iş emri tekrar kapatılamaz
      if (
        job.status !== WORKSHOP_JOB_STATUS.IN_PRODUCTION &&
        job.status !== WORKSHOP_JOB_STATUS.PENDING
      ) {
        return NextResponse.json(
          { error: 'Bu iş emri zaten kapatılmış veya iptal edilmiş.' },
          { status: 400 }
        );
      }

      const numFinished = Number(receivedFinishedWeight) || 0;
      const numScrap = Number(receivedScrapWeight) || 0;
      if (numFinished < 0 || numScrap < 0) {
        return NextResponse.json(
          { error: 'Teslim alınan gramajlar negatif olamaz.' },
          { status: 400 }
        );
      }

      const lossResult = calculateWorkshopLoss(
        job.givenWeight,
        numFinished,
        numScrap,
        job.targetLossPercent
      );

      const parsedCompletedDate = completedDate
        ? isNaN(new Date(completedDate).getTime())
          ? new Date()
          : new Date(completedDate)
        : new Date();

      // Atomik İşlem: İş emrini kapat ve dönüş hurdasını (astar) sandığa ekle
      const updated = await prisma.$transaction(async (tx) => {
        const upJob = await tx.workshopJob.update({
          where: { id: jobId },
          data: {
            status: WORKSHOP_JOB_STATUS.COMPLETED,
            receivedFinishedWeight: lossResult.receivedFinishedWeight,
            receivedScrapWeight: lossResult.receivedScrapWeight,
            receivedTotalWeight: lossResult.receivedTotalWeight,
            lossWeight: lossResult.lossWeight,
            lossPercent: lossResult.lossPercent,
            isExcessiveLoss: lossResult.isExcessiveLoss,
            completedDate: parsedCompletedDate,
            notes: notes ? `${job.notes ? job.notes + ' | ' : ''}${notes}` : job.notes,
          },
        });

        // Eğer astar/hurda altın teslim alındıysa hurda sandığına otomatik ekle
        if (numScrap > 0) {
          const targetScrapCarat = Number(scrapCarat) || 14;
          const scrapMilyem = getMilyemForCarat(targetScrapCarat);
          const scrapPure = Number((numScrap * scrapMilyem).toFixed(4));

          const currentScrap = await tx.scrapInventory.findUnique({
            where: {
              dealerId_carat: {
                dealerId: currentUserDealerId,
                carat: targetScrapCarat,
              },
            },
          });

          const newWeight = Number(((currentScrap?.weight || 0) + numScrap).toFixed(4));
          const newPureWeight = Number(((currentScrap?.pureWeight || 0) + scrapPure).toFixed(4));

          await tx.scrapInventory.upsert({
            where: {
              dealerId_carat: {
                dealerId: currentUserDealerId,
                carat: targetScrapCarat,
              },
            },
            update: {
              weight: newWeight,
              pureWeight: newPureWeight,
            },
            create: {
              dealerId: currentUserDealerId,
              carat: targetScrapCarat,
              weight: newWeight,
              pureWeight: newPureWeight,
            },
          });
        }

        return upJob;
      });

      await logActivity({
        dealerId: currentUserDealerId,
        action: 'WORKSHOP_JOB_COMPLETE',
        details: `${job.jobNo} atölye iş emri kapatıldı. Fire: ${lossResult.lossWeight} gr (%${lossResult.lossPercent})${lossResult.isExcessiveLoss ? ' - DİKKAT: AZAMİ FİRE AŞILDI!' : ''}.`,
        userEmail,
        userName,
      });

      const safeUpdated = {
        ...updated,
        deliveryDate: updated.deliveryDate ? updated.deliveryDate.toISOString() : null,
        completedDate: updated.completedDate ? updated.completedDate.toISOString() : null,
        createdAt: updated.createdAt instanceof Date ? updated.createdAt.toISOString() : new Date().toISOString(),
        updatedAt: updated.updatedAt instanceof Date ? updated.updatedAt.toISOString() : new Date().toISOString(),
      };

      return NextResponse.json(safeUpdated);
    }

    // 3. Hurda Sandığı Gramaj Güncelleme (Giriş / Çıkış)
    if (action === WORKSHOP_ACTIONS.UPDATE_SCRAP) {
      const { carat, weightChange, newWeight, notes } = body;
      const targetCarat = Number(carat);

      if (!SUPPORTED_SCRAP_CARATS.includes(targetCarat as any)) {
        return NextResponse.json(
          { error: 'Desteklenmeyen hurda altın ayarı.' },
          { status: 400 }
        );
      }

      const milyem = CARAT_MILYEM_MAP[targetCarat] || 0.995;

      const currentItem = await prisma.scrapInventory.findUnique({
        where: {
          dealerId_carat: {
            dealerId: currentUserDealerId,
            carat: targetCarat,
          },
        },
      });

      let updatedWeight = 0;
      if (newWeight !== undefined) {
        updatedWeight = Math.max(0, Number(newWeight));
      } else if (weightChange !== undefined) {
        updatedWeight = Math.max(0, (currentItem?.weight || 0) + Number(weightChange));
      }

      const pureWeight = Number((updatedWeight * milyem).toFixed(4));

      const updated = await prisma.scrapInventory.upsert({
        where: {
          dealerId_carat: {
            dealerId: currentUserDealerId,
            carat: targetCarat,
          },
        },
        update: {
          weight: updatedWeight,
          pureWeight,
          notes: notes?.trim() || currentItem?.notes,
        },
        create: {
          dealerId: currentUserDealerId,
          carat: targetCarat,
          weight: updatedWeight,
          pureWeight,
          notes: notes?.trim() || null,
        },
      });

      await logActivity({
        dealerId: currentUserDealerId,
        action: 'SCRAP_INVENTORY_UPDATE',
        details: `${targetCarat}K hurda sandığı güncellendi: ${updatedWeight} gr (Has: ${pureWeight} gr).`,
        userEmail,
        userName,
      });

      return NextResponse.json(updated);
    }

    // 4. Pota Eritme Takoz Simülatörü & Hesaplayıcı
    if (action === WORKSHOP_ACTIONS.CALCULATE_TAKOZ) {
      const { items = [], targetMilyem } = body;
      const result = calculateTakozMilyem(items, Number(targetMilyem) || undefined);
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: 'Geçersiz işlem tipi.' }, { status: 400 });
  } catch (error: any) {
    console.error('[API Workshop] POST Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Atölye işlemi yürütülürken hata oluştu.' },
      { status: 500 }
    );
  }
}

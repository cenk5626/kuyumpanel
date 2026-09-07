import {
  CARAT_MILYEM_MAP,
  getMilyemForCarat,
  WORKSHOP_LIMITS,
  WorkshopJobStatus,
  WORKSHOP_JOB_STATUS,
} from '@/constants/workshop';

export interface ScrapBatchItem {
  carat: number;       // 8, 14, 18, 21, 22, 24
  weight: number;      // Gramaj (gr)
  milyem?: number;     // Özel milyem (opsiyonel, yoksa CARAT_MILYEM_MAP'ten alınır)
}

export interface TakozCalculationResult {
  items: Array<{
    carat: number;
    weight: number;
    milyem: number;
    pureWeight: number; // Has karşılığı (gr)
  }>;
  totalWeight: number;      // Toplam brüt hurda gramajı (gr)
  totalPureWeight: number;  // Toplam Has Altın karşılığı (gr)
  averageMilyem: number;    // Ağırlıklı ortalama pota milyemi (0 - 1 arası)
  equivalentCarat: number;  // Yaklaşık ayar karşılığı (örn: 14.2 Karat)
  // Hedef milyeme ulaştırma önerisi (opsiyonel)
  targetMilyem?: number;
  pureGoldToAdd?: number;   // Hedefe yükseltmek için gereken 24K Has (gr)
  alloyToAdd?: number;      // Hedefe düşürmek için gereken bakır/gümüş alaşım (gr)
  finalWeight?: number;     // Katkı eklendikten sonraki toplam gram
}

export interface WorkshopLossResult {
  givenWeight: number;            // Atölyeye verilen toplam gram
  receivedFinishedWeight: number; // Teslim alınan mamul takı (gr)
  receivedScrapWeight: number;    // Teslim alınan astar / hurda (gr)
  receivedTotalWeight: number;    // Teslim alınan toplam (gr)
  lossWeight: number;             // Ramat / Fire gramajı (gr)
  lossPercent: number;            // Fire yüzdesi (%)
  targetLossPercent: number;      // Azami fire toleransı (%)
  isExcessiveLoss: boolean;       // Fire toleransı aşıldı mı?
  excessLossWeight: number;       // Tolerans üstü kayıp gramaj (gr)
  isCritical: boolean;            // %5 üstü şüpheli / kritik fire mi?
}

/**
 * Farklı ayarlardaki hurda altınları potada eritirken ağırlıklı ortalama milyem ve has miktarını hesaplar.
 */
export function calculateTakozMilyem(
  items: ScrapBatchItem[],
  targetMilyem?: number
): TakozCalculationResult {
  let totalWeight = 0;
  let totalPureWeight = 0;

  const processedItems = items
    .filter((item) => item.weight > 0)
    .map((item) => {
      const milyem = getMilyemForCarat(item.carat, item.milyem);
      const pureWeight = Number((item.weight * milyem).toFixed(4));
      totalWeight += item.weight;
      totalPureWeight += pureWeight;
      return {
        carat: item.carat,
        weight: item.weight,
        milyem,
        pureWeight,
      };
    });

  const averageMilyem =
    totalWeight > 0 ? Number((totalPureWeight / totalWeight).toFixed(4)) : 0;
  const equivalentCarat = Number(((averageMilyem / 1.0) * 24).toFixed(1));

  let pureGoldToAdd = 0;
  let alloyToAdd = 0;
  let finalWeight = totalWeight;

  if (targetMilyem && targetMilyem > 0 && totalWeight > 0) {
    const has24Milyem = CARAT_MILYEM_MAP[24] || 0.995;

    if (averageMilyem < targetMilyem) {
      // Milyemi yükseltmek için Has Altın eklenmeli:
      // (totalPure + addedHas * 0.995) / (totalWeight + addedHas) = targetMilyem
      // addedHas * (0.995 - targetMilyem) = targetMilyem * totalWeight - totalPure
      const denominator = has24Milyem - targetMilyem;
      if (denominator > 0) {
        pureGoldToAdd = Number(
          (
            (targetMilyem * totalWeight - totalPureWeight) /
            denominator
          ).toFixed(4)
        );
        finalWeight = Number((totalWeight + pureGoldToAdd).toFixed(4));
      }
    } else if (averageMilyem > targetMilyem) {
      // Milyemi düşürmek için Alaşım (Bakır/Gümüş 0 milyem) eklenmeli:
      // totalPure / (totalWeight + alloy) = targetMilyem
      // alloy = (totalPure / targetMilyem) - totalWeight
      alloyToAdd = Number(
        (totalPureWeight / targetMilyem - totalWeight).toFixed(4)
      );
      finalWeight = Number((totalWeight + alloyToAdd).toFixed(4));
    }
  }

  return {
    items: processedItems,
    totalWeight: Number(totalWeight.toFixed(4)),
    totalPureWeight: Number(totalPureWeight.toFixed(4)),
    averageMilyem,
    equivalentCarat,
    targetMilyem,
    pureGoldToAdd: pureGoldToAdd > 0 ? pureGoldToAdd : 0,
    alloyToAdd: alloyToAdd > 0 ? alloyToAdd : 0,
    finalWeight: Number(finalWeight.toFixed(4)),
  };
}

/**
 * Atölye üretim iş emrindeki mamul, astar ve fire (ramat) hesaplamasını yapar.
 */
export function calculateWorkshopLoss(
  givenWeight: number,
  receivedFinishedWeight: number,
  receivedScrapWeight: number,
  targetLossPercent: number = WORKSHOP_LIMITS.DEFAULT_MAX_FIRE_PERCENT
): WorkshopLossResult {
  const gWeight = Math.max(0, givenWeight);
  const finWeight = Math.max(0, receivedFinishedWeight);
  const scWeight = Math.max(0, receivedScrapWeight);
  const receivedTotal = Number((finWeight + scWeight).toFixed(4));

  const lossWeight = Number(Math.max(0, gWeight - receivedTotal).toFixed(4));
  const lossPercent =
    gWeight > 0 ? Number(((lossWeight / gWeight) * 100).toFixed(2)) : 0;

  const isExcessiveLoss = lossPercent > targetLossPercent;
  const maxAllowedLoss = Number((gWeight * (targetLossPercent / 100)).toFixed(4));
  const excessLossWeight = isExcessiveLoss
    ? Number(Math.max(0, lossWeight - maxAllowedLoss).toFixed(4))
    : 0;

  const isCritical = lossPercent >= WORKSHOP_LIMITS.CRITICAL_FIRE_PERCENT;

  return {
    givenWeight: gWeight,
    receivedFinishedWeight: finWeight,
    receivedScrapWeight: scWeight,
    receivedTotalWeight: receivedTotal,
    lossWeight,
    lossPercent,
    targetLossPercent,
    isExcessiveLoss,
    excessLossWeight,
    isCritical,
  };
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { logActivity } from '@/lib/logger';
import {
  PAYMENT_METHODS,
  SESSION_STATUS,
  CASH_MOVEMENT_TYPES,
  CASH_MOVEMENT_CATEGORIES,
  CASH_CURRENCIES,
  PaymentMethod,
} from '@/constants/kasa';
import { calculateTransactionProfitLoss } from '@/lib/financial/profit-loss';
import { evaluateTransactionSuspicion } from '@/lib/security/suspicious-detector';

// API log başlığı
const LOG_PREFIX = '[API Transactions]';

// Desteklenen işlem tipleri sabitleri
const TX_TYPE_BUY = 'buy';
const TX_TYPE_SELL = 'sell';

/**
 * GET /api/transactions — Giriş yapan kullanıcının bayisine ait aktif (silinmemiş) işlemleri listeler
 */
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dealerId = (session.user as any).dealerId || 'merkez';
    const { searchParams } = new URL(req.url);
    const includeDeleted = searchParams.get('includeDeleted') === 'true';
    const onlySuspicious = searchParams.get('suspicious') === 'true';

    const whereClause: any = { dealerId };
    if (!includeDeleted) {
      whereClause.isDeleted = false;
    }
    if (onlySuspicious) {
      whereClause.isSuspicious = true;
    }

    const list = await prisma.transaction.findMany({
      where: whereClause,
      include: {
        revisions: {
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    const mapped = list.map((tx) => ({
      ...tx,
      createdAt: tx.createdAt ? new Date(tx.createdAt).toISOString() : new Date().toISOString(),
    }));

    return NextResponse.json(mapped);
  } catch (error) {
    console.error(`${LOG_PREFIX} GET Error:`, error);
    return NextResponse.json({ error: 'İşlemler listelenemedi.' }, { status: 500 });
  }
}

export interface TxItem {
  type: typeof TX_TYPE_BUY | typeof TX_TYPE_SELL;
  productType: string;
  productCode: string;
  quantity: number;
  price: number;
  total: number;
  costPrice?: number | null;
  paymentMethod?: string;
  cardFeePercent?: number | null;
  hasEquivalent?: number | null;
  orderNote?: string | null;
  customerId?: string | null;
  sessionId?: string | null;
  employeeName?: string | null;
}

/**
 * POST /api/transactions — Yeni alış/satış işlemlerini kaydeder, kâr/zarar ve şüpheli durumları hesaplar,
 * bağlı bayinin stoklarını günceller ve kasa hareketlerini oluşturur.
 */
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dealerId = (session.user as any).dealerId || 'merkez';
    const userEmail = session.user?.email;
    const userName = session.user?.name;

    await prisma.dealer.upsert({
      where: { id: dealerId },
      create: { id: dealerId, name: dealerId === 'merkez' ? 'Merkez Mağaza' : dealerId },
      update: {},
    });

    const body = await req.json();
    const items: TxItem[] = Array.isArray(body) ? body : [body];

    if (items.length === 0) {
      return NextResponse.json({ error: 'İşlem listesi boş olamaz.' }, { status: 400 });
    }

    // Girdi doğrulama
    for (const item of items) {
      const { type, productCode, quantity, price, total } = item;
      if (!type || !productCode || quantity == null || price == null || total == null) {
        return NextResponse.json({ error: 'Eksik veya geçersiz parametreler.' }, { status: 400 });
      }

      if (quantity <= 0 || price <= 0 || total <= 0) {
        return NextResponse.json({ error: 'Miktar ve fiyat sıfırdan büyük olmalıdır.' }, { status: 400 });
      }

      if (type !== TX_TYPE_BUY && type !== TX_TYPE_SELL) {
        return NextResponse.json({ error: 'Geçersiz işlem türü.' }, { status: 400 });
      }
    }

    // Piyasa fiyatlarını ve son işlemleri risk & kâr/zarar analizi için getir
    const [livePricesList, recentTxList, activeSession] = await Promise.all([
      prisma.livePrice.findMany(),
      prisma.transaction.findMany({
        where: { dealerId, isDeleted: false },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      prisma.cashRegisterSession.findFirst({
        where: { dealerId, status: SESSION_STATUS.OPEN },
        orderBy: { openedAt: 'desc' },
      }),
    ]);

    const livePriceMap = new Map(livePricesList.map((p) => [p.id, p]));

    // Atomik işlem
    const results = await prisma.$transaction(async (tx) => {
      const createdTransactions = [];

      for (const item of items) {
        const {
          type,
          productType,
          productCode,
          quantity,
          price,
          total,
          cardFeePercent,
          hasEquivalent,
          orderNote,
          customerId,
          employeeName,
        } = item;

        // Ödeme Yöntemi Normalizasyonu
        let paymentMethod: PaymentMethod = PAYMENT_METHODS.CASH;
        if (item.paymentMethod) {
          const upper = item.paymentMethod.toUpperCase();
          if (upper in PAYMENT_METHODS) {
            paymentMethod = upper as PaymentMethod;
          }
        }

        const effectiveSessionId = item.sessionId || activeSession?.id || null;

        // Piyasa referans fiyatı bul (Maliyet & Şüphe tespiti için)
        const marketPriceRef = livePriceMap.get(productCode) || livePriceMap.get(`${productCode}TRY`);
        const marketBidPrice = marketPriceRef ? marketPriceRef.bid : price * 0.98; // Fallback ~%2 marj

        // Müşteri bilgisi (Borç limiti kontrolü için)
        let customerData = null;
        if (customerId) {
          customerData = await tx.customer.findUnique({ where: { id: customerId } });
        }

        // Kâr / Zarar Hesaplaması
        const pnl = calculateTransactionProfitLoss(
          type,
          quantity,
          price,
          marketBidPrice,
          item.costPrice
        );

        // Şüpheli İşlem Değerlendirmesi
        const suspicion = evaluateTransactionSuspicion({
          type,
          productCode,
          quantity,
          price,
          total,
          paymentMethod,
          marketPrice: marketPriceRef ? { bid: marketPriceRef.bid, ask: marketPriceRef.ask } : null,
          customer: customerData
            ? {
                id: customerData.id,
                name: customerData.name,
                currentDebtTL: customerData.tlBalance,
                creditLimitTL: customerData.creditLimitTL,
              }
            : null,
          recentDealerTransactions: recentTxList.map((t) => ({
            productCode: t.productCode,
            quantity: t.quantity,
            price: t.price,
            createdAt: t.createdAt,
          })),
        });

        // 1. İşlemi kaydet
        const transaction = await tx.transaction.create({
          data: {
            type,
            productType,
            productCode,
            quantity,
            price,
            total,
            costPrice: pnl.costPrice,
            profitAmount: pnl.profitAmount,
            profitMargin: pnl.profitMargin,
            isSuspicious: suspicion.isSuspicious,
            suspiciousReason: suspicion.reasons.length > 0 ? suspicion.reasons.join(' | ') : null,
            paymentMethod,
            cardFeePercent: cardFeePercent != null ? Number(cardFeePercent) : null,
            hasEquivalent: hasEquivalent != null ? Number(hasEquivalent) : null,
            orderNote: orderNote || null,
            customerId: customerId || null,
            sessionId: effectiveSessionId,
            employeeName: employeeName || null,
            dealerId,
          },
        });

        // 2. Açık kasa oturumu varsa CashMovement oluştur
        if (effectiveSessionId) {
          const isSale = type === TX_TYPE_SELL;
          const movementType = isSale ? CASH_MOVEMENT_TYPES.POS_SALE : CASH_MOVEMENT_TYPES.SCRAP_BUY;
          const movementCategory = isSale ? CASH_MOVEMENT_CATEGORIES.SALES : CASH_MOVEMENT_CATEGORIES.SCRAP;
          const movementDesc = isSale
            ? `POS Satış - ${productCode} (${quantity} Adet) [${paymentMethod}]`
            : `Hurda/Alış - ${productCode} (${quantity} Adet) [${paymentMethod}]`;

          await tx.cashMovement.create({
            data: {
              sessionId: effectiveSessionId,
              dealerId,
              type: movementType,
              category: movementCategory,
              paymentMethod,
              amount: total,
              currency: CASH_CURRENCIES.TL,
              hasEquivalent: hasEquivalent || 0,
              description: movementDesc,
              referenceId: transaction.id,
              employeeName: employeeName || null,
            },
          });
        }

        // 3. Stok Yönetimi (Otomatik Düşüm / Artırım)
        const dbProduct = await tx.productItem.findUnique({
          where: { barcode: productCode },
        });

        if (dbProduct) {
          await tx.productItem.update({
            where: { barcode: productCode },
            data: { status: type === TX_TYPE_BUY ? 'IN_STOCK' : 'SOLD' },
          });
        } else {
          const stockItem = await tx.stock.findUnique({
            where: {
              product_dealerId: {
                product: productCode,
                dealerId,
              },
            },
          });

          const adjustment = type === TX_TYPE_BUY ? quantity : -quantity;

          if (stockItem) {
            const newAmount = stockItem.amount + adjustment;
            await tx.stock.update({
              where: {
                product_dealerId: {
                  product: productCode,
                  dealerId,
                },
              },
              data: { amount: newAmount },
            });
          } else {
            await tx.stock.create({
              data: {
                product: productCode,
                label: productCode,
                type: productType,
                amount: adjustment,
                dealerId,
              },
            });
          }
        }

        createdTransactions.push(transaction);
      }

      return createdTransactions;
    });

    // Audit Logging
    for (const item of items) {
      const isBuy = item.type === TX_TYPE_BUY;
      await logActivity({
        dealerId,
        action: isBuy ? 'POS Alış İşlemi' : 'POS Satış İşlemi',
        details: `${isBuy ? 'Biz Alıyoruz' : 'Biz Satıyoruz'}: ${item.quantity} Adet ${item.productCode} - Toplam: ₺${item.total.toLocaleString('tr-TR')} (Kâr: ₺${item.total * 0.05 || 0}, Ödeme: ${item.paymentMethod || 'CASH'})`,
        userEmail,
        userName,
      });
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error(`${LOG_PREFIX} POST Error:`, error);
    return NextResponse.json(
      {
        error: 'İşlem gerçekleştirilemedi.',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/transactions — Varolan işlemi düzenler, stok farkını otomatik uygular ve revizyon günlüğü tutar
 */
export async function PUT(req: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dealerId = (session.user as any).dealerId || 'merkez';
    const userEmail = session.user?.email;
    const userName = session.user?.name;

    const body = await req.json();
    const { id, quantity, price, total, orderNote, reason, paymentMethod } = body;

    if (!id) {
      return NextResponse.json({ error: 'İşlem ID gereklidir.' }, { status: 400 });
    }

    if (!reason || !reason.trim()) {
      return NextResponse.json({ error: 'İşlem düzenleme gerekçesi belirtilmelidir.' }, { status: 400 });
    }

    const existingTx = await prisma.transaction.findUnique({
      where: { id },
    });

    if (!existingTx || existingTx.dealerId !== dealerId) {
      return NextResponse.json({ error: 'İşlem bulunamadı.' }, { status: 404 });
    }

    const newQuantity = quantity !== undefined ? Number(quantity) : existingTx.quantity;
    const newPrice = price !== undefined ? Number(price) : existingTx.price;
    const newTotal = total !== undefined ? Number(total) : newQuantity * newPrice;

    // Stok Farkını Hesapla
    // Eğer Satış idiyse (önceki: -prevQty, yeni: -newQty, fark: -(newQty - prevQty))
    // Eğer Alış idiyse (önceki: +prevQty, yeni: +newQty, fark: +(newQty - prevQty))
    const qtyDiff = newQuantity - existingTx.quantity;
    const isBuy = existingTx.type === TX_TYPE_BUY;
    const stockDelta = isBuy ? qtyDiff : -qtyDiff;

    const updated = await prisma.$transaction(async (tx) => {
      // 1. Yeni Kâr/Zarar Hesapla
      const costPrice = existingTx.costPrice || newPrice * 0.95;
      const profitAmount = isBuy
        ? 0
        : Number(((newPrice - costPrice) * newQuantity).toFixed(2));
      const profitMargin = isBuy
        ? 0
        : (costPrice > 0 ? Number(((profitAmount / (costPrice * newQuantity)) * 100).toFixed(2)) : 0);

      // 2. İşlemi güncelle
      const modTx = await tx.transaction.update({
        where: { id },
        data: {
          quantity: newQuantity,
          price: newPrice,
          total: newTotal,
          profitAmount,
          profitMargin,
          orderNote: orderNote !== undefined ? orderNote : existingTx.orderNote,
          paymentMethod: paymentMethod || existingTx.paymentMethod,
        },
      });

      // 3. Revizyon günlüğüne kaydet
      await tx.transactionRevisionLog.create({
        data: {
          transactionId: id,
          dealerId,
          actionType: 'EDIT',
          previousData: JSON.stringify(existingTx),
          newData: JSON.stringify(modTx),
          reason: reason.trim(),
          userEmail,
          userName,
        },
      });

      // 4. Stok düzeltmesi
      if (stockDelta !== 0) {
        const stockItem = await tx.stock.findUnique({
          where: {
            product_dealerId: {
              product: existingTx.productCode,
              dealerId,
            },
          },
        });

        if (stockItem) {
          await tx.stock.update({
            where: {
              product_dealerId: {
                product: existingTx.productCode,
                dealerId,
              },
            },
            data: {
              amount: stockItem.amount + stockDelta,
            },
          });
        }
      }

      return modTx;
    });

    await logActivity({
      dealerId,
      action: 'İşlem Düzenleme',
      details: `#${id.slice(-6)} no'lu işlem güncellendi. Neden: ${reason} (Eski Miktar: ${existingTx.quantity}, Yeni: ${newQuantity})`,
      userEmail,
      userName,
    }).catch(() => {});

    return NextResponse.json(updated);
  } catch (error) {
    console.error(`${LOG_PREFIX} PUT Error:`, error);
    return NextResponse.json({ error: 'İşlem düzenlenemedi.' }, { status: 500 });
  }
}

/**
 * DELETE /api/transactions — İşlemi mantıksal olarak iptal eder/siler, stok etkisini geri alır ve revizyon kaydı atar
 */
export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dealerId = (session.user as any).dealerId || 'merkez';
    const userEmail = session.user?.email;
    const userName = session.user?.name;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const reason = searchParams.get('reason') || 'Kullanıcı tarafından iptal/silindi';

    if (!id) {
      return NextResponse.json({ error: 'İşlem ID gereklidir.' }, { status: 400 });
    }

    const existingTx = await prisma.transaction.findUnique({
      where: { id },
    });

    if (!existingTx || existingTx.dealerId !== dealerId) {
      return NextResponse.json({ error: 'İşlem bulunamadı.' }, { status: 404 });
    }

    // Stok geri alma miktarı:
    // Satış siliniyorsa -> satılan miktar stoğa GERİ EKLENİR (+quantity)
    // Alış siliniyorsa -> alınan miktar stoktan DÜŞÜLÜR (-quantity)
    const isBuy = existingTx.type === TX_TYPE_BUY;
    const stockReversal = isBuy ? -existingTx.quantity : existingTx.quantity;

    await prisma.$transaction(async (tx) => {
      // 1. İşlemi isDeleted olarak işaretle
      await tx.transaction.update({
        where: { id },
        data: { isDeleted: true },
      });

      // 2. Revizyon günlüğü kaydet
      await tx.transactionRevisionLog.create({
        data: {
          transactionId: id,
          dealerId,
          actionType: 'DELETE',
          previousData: JSON.stringify(existingTx),
          newData: null,
          reason,
          userEmail,
          userName,
        },
      });

      // 3. Stok geri alma
      const stockItem = await tx.stock.findUnique({
        where: {
          product_dealerId: {
            product: existingTx.productCode,
            dealerId,
          },
        },
      });

      if (stockItem) {
        await tx.stock.update({
          where: {
            product_dealerId: {
              product: existingTx.productCode,
              dealerId,
            },
          },
          data: {
            amount: stockItem.amount + stockReversal,
          },
        });
      }

      // 4. Eğer barkodlu takı ürünü ise durumunu eski haline getir
      const productItem = await tx.productItem.findUnique({
        where: { barcode: existingTx.productCode },
      });
      if (productItem) {
        await tx.productItem.update({
          where: { barcode: existingTx.productCode },
          data: { status: isBuy ? 'SOLD' : 'IN_STOCK' },
        });
      }
    });

    await logActivity({
      dealerId,
      action: 'İşlem İptali / Silme',
      details: `#${id.slice(-6)} no'lu işlem iptal edildi. Neden: ${reason} (Stok iadesi: ${stockReversal > 0 ? `+${stockReversal}` : stockReversal})`,
      userEmail,
      userName,
    }).catch(() => {});

    return NextResponse.json({ success: true, message: 'İşlem iptal edildi ve stok iadesi yapıldı.' });
  } catch (error) {
    console.error(`${LOG_PREFIX} DELETE Error:`, error);
    return NextResponse.json({ error: 'İşlem silinemedi.' }, { status: 500 });
  }
}

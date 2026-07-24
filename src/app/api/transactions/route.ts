import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { logActivity } from '@/lib/logger';

// API log başlığı
const LOG_PREFIX = '[API Transactions]';

// Desteklenen işlem tipleri sabitleri
const TX_TYPE_BUY = 'buy';
const TX_TYPE_SELL = 'sell';

/**
 * GET /api/transactions — Giriş yapan kullanıcının bayisine ait işlemleri listeler
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dealerId = (session.user as any).dealerId || 'merkez';

    const list = await prisma.transaction.findMany({
      where: { dealerId },
      orderBy: { createdAt: 'desc' },
      take: 100, // Performans için son 100 işlemle sınırla
    });
    return NextResponse.json(list);
  } catch (error) {
    console.error(`${LOG_PREFIX} GET Error:`, error);
    return NextResponse.json({ error: 'İşlemler listelenemedi.' }, { status: 500 });
  }
}

interface TxItem {
  type: typeof TX_TYPE_BUY | typeof TX_TYPE_SELL;
  productType: string;
  productCode: string;
  quantity: number;
  price: number;
  total: number;
  employeeName?: string;
}

/**
 * POST /api/transactions — Yeni alış/satış işlemlerini kaydeder ve bağlı bayinin stoklarını günceller.
 * Hem tek bir işlem nesnesi hem de dizi halinde çoklu işlem listesi kabul eder.
 */
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dealerId = (session.user as any).dealerId || 'merkez';
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

    // Atomik işlem: Tüm işlemleri kaydet ve stok seviyelerini güncelle
    const results = await prisma.$transaction(async (tx) => {
      const createdTransactions = [];

      for (const item of items) {
        const { type, productType, productCode, quantity, price, total } = item;

        // 1. İşlemi kaydet
        const transaction = await tx.transaction.create({
          data: {
            type,
            productType,
            productCode,
            quantity,
            price,
            total,
            employeeName: item.employeeName || null,
            dealerId,
          },
        });

        // 2. Eğer bu barkodlu bir takı ürünü ise durumunu güncelle, standart stoka dokunma
        const dbProduct = await tx.productItem.findUnique({
          where: { barcode: productCode }
        });

        if (dbProduct) {
          await tx.productItem.update({
            where: { barcode: productCode },
            data: { status: type === TX_TYPE_BUY ? 'IN_STOCK' : 'SOLD' }
          });
        } else {
          // Normal Sarrafiye veya Döviz ise standart stok güncelini yap
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
        details: `${isBuy ? 'Biz Alıyoruz' : 'Biz Satıyoruz'}: ${item.quantity} Adet ${item.productCode} - Toplam: ₺${item.total.toLocaleString('tr-TR')} (Personel: ${item.employeeName || 'Genel'})`,
        userEmail: session.user?.email,
        userName: session.user?.name,
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

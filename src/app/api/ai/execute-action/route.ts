import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  SESSION_STATUS,
  CASH_MOVEMENT_TYPES,
  CASH_MOVEMENT_CATEGORIES,
  CASH_CURRENCIES,
  SUPPLIER_TRANSACTION_TYPES,
  AI_ACTION_TYPES,
  PaymentMethod,
} from '@/constants';
import { calculateTransactionProfitLoss } from '@/lib/financial/profit-loss';
import { calculateSessionMetrics, formatThermalReceiptText } from '@/lib/z-report';
import { generateWhatsAppReceiptUrl, generateWhatsAppShareUrl } from '@/lib/whatsapp';
import { sendWhatsAppNotification } from '@/lib/whatsapp-sender';

export const dynamic = 'force-dynamic';

function resolveStockProduct(input: string): { id: string; label: string; type: string } {
  const norm = (input || '').toLocaleLowerCase('tr-TR').replace(/[\s\-_]/g, '');
  if (norm.includes('ceyrek') || norm.includes('çeyrek')) return { id: 'ECEYREKTL', label: 'Çeyrek Altın', type: 'sarrafiye' };
  if (norm.includes('yarim') || norm.includes('yarım')) return { id: 'EYARIMTL', label: 'Yarım Altın', type: 'sarrafiye' };
  if (norm.includes('gremse')) return { id: 'EGREMSETL', label: 'Gremse Altın', type: 'sarrafiye' };
  if (norm.includes('ata') || norm.includes('cumhuriyet')) return { id: 'EATATL', label: 'Ata Altın', type: 'sarrafiye' };
  if (norm.includes('tam')) return { id: 'ETAMTL', label: 'Tam Altın', type: 'sarrafiye' };
  if (norm.includes('24') || norm.includes('has')) return { id: 'mil24Ayar', label: '24 Ayar Gram', type: 'sarrafiye' };
  if (norm.includes('adanaburma') || norm.includes('burma')) return { id: 'milAdanaBurma', label: 'Adana-Burma Bilezik', type: 'sarrafiye' };
  if (norm.includes('ajda')) return { id: 'milAjda', label: 'Ajda Bilezik', type: 'sarrafiye' };
  if (norm.includes('22') || norm.includes('bilezik')) return { id: 'mil22Ayar', label: '22 Ayar Gram', type: 'sarrafiye' };
  if (norm.includes('14')) return { id: 'mil14Ayar', label: '14 Ayar Gram', type: 'sarrafiye' };
  if (norm.includes('dolar') || norm.includes('usd')) return { id: 'USD', label: 'Amerikan Doları (USD)', type: 'döviz' };
  if (norm.includes('euro') || norm.includes('eur')) return { id: 'EUR', label: 'Euro (EUR)', type: 'döviz' };
  return { id: input || 'ECEYREKTL', label: input || 'Çeyrek Altın', type: 'sarrafiye' };
}

export async function POST(req: Request) {
  try {
    const session = await auth().catch(() => null);
    const dealerId = (session?.user as any)?.dealerId || 'merkez';
    const userName = session?.user?.name || 'Patron';
    const userEmail = session?.user?.email || undefined;

    const body = await req.json();
    const { actionType, payload } = body;

    if (!actionType || !payload) {
      return NextResponse.json({ error: 'Geçersiz eylem veya eksik parametre.' }, { status: 400 });
    }

    let executionResult: any = null;
    let successMessage = '';

    // 0.1 ALIŞ & SATIŞ İŞLEMLERİ (POS & SARRAFİYE İŞLEMİ)
    if (actionType === AI_ACTION_TYPES.CREATE_TRANSACTION || actionType === 'POS_TRANSACTION') {
      const type = (payload.type || 'sell').toLowerCase() === 'buy' ? 'buy' : 'sell';
      const isSale = type === 'sell';
      const rawProductKey = String(payload.barcode || payload.productCode || payload.product || payload.label || 'ECEYREKTL').trim();
      const quantity = Math.max(1, Number(payload.quantity) || 1);

      // 1. Önce barkodlu ProductItem var mı kontrol et (Örn: "22BLZ00001", vitrin ürünü)
      let dbProductItem = await prisma.productItem.findFirst({
        where: {
          dealerId,
          barcode: rawProductKey,
        },
      });

      if (!dbProductItem && payload.barcode) {
        dbProductItem = await prisma.productItem.findFirst({
          where: {
            dealerId,
            barcode: String(payload.barcode).trim(),
          },
        });
      }

      let resolved: { id: string; label: string; type: string };
      if (dbProductItem) {
        resolved = {
          id: dbProductItem.barcode,
          label: `${dbProductItem.carat ? `${dbProductItem.carat} Ayar ` : ''}${dbProductItem.title || dbProductItem.category || 'Ürün'}${dbProductItem.weight ? ` (${dbProductItem.weight.toFixed(2)} gr)` : ''}`,
          type: dbProductItem.category || 'takı',
        };
      } else {
        resolved = resolveStockProduct(rawProductKey);
      }

      // Fiyat ve Tutar belirleme
      let unitPrice = Number(payload.price);
      if (isNaN(unitPrice) || unitPrice <= 0) {
        if (payload.total && Number(payload.total) > 0) {
          unitPrice = Number(payload.total) / quantity;
        } else {
          // Canlı piyasa fiyatından bul
          let livePriceItem = await prisma.livePrice.findUnique({ where: { id: resolved.id } });
          if (!livePriceItem && (resolved.id === 'mil24Ayar' || resolved.id === 'HAS')) {
            livePriceItem = await prisma.livePrice.findUnique({ where: { id: 'GAUTRY' } });
          }
          unitPrice = livePriceItem ? (isSale ? livePriceItem.ask : livePriceItem.bid) : 0;
        }
      }

      const total = Number(payload.total) || Number((quantity * unitPrice).toFixed(2));

      // Ödeme yöntemi çözümleme (Nakit, Kart, IBAN/Havale, Has, Veresiye)
      let paymentMethod: PaymentMethod = PAYMENT_METHODS.CASH;
      const rawPm = String(payload.paymentMethod || '').toUpperCase();
      if (rawPm.includes('IBAN') || rawPm.includes('HAVALE') || rawPm.includes('EFT') || rawPm.includes('BANK')) {
        paymentMethod = PAYMENT_METHODS.BANK;
      } else if (rawPm.includes('KART') || rawPm.includes('CARD') || rawPm.includes('POS')) {
        paymentMethod = PAYMENT_METHODS.CARD;
      } else if (rawPm.includes('HAS')) {
        paymentMethod = PAYMENT_METHODS.HAS;
      } else if (rawPm.includes('VERESIYE') || rawPm.includes('BORC') || rawPm.includes('DEBT')) {
        paymentMethod = PAYMENT_METHODS.DEBT;
      }

      // Açık kasa oturumu var mı kontrol et, yoksa güvenli şekilde otomatik başlat
      let activeSession = await prisma.cashRegisterSession.findFirst({
        where: { dealerId, status: SESSION_STATUS.OPEN },
        orderBy: { openedAt: 'desc' },
      });

      if (!activeSession) {
        const currentYear = new Date().getFullYear();
        const countThisYear = await prisma.cashRegisterSession.count({
          where: {
            dealerId,
            openedAt: {
              gte: new Date(currentYear, 0, 1),
            },
          },
        });
        const sessionNumber = `Z-${currentYear}-${String(countThisYear + 1).padStart(4, '0')}`;
        activeSession = await prisma.cashRegisterSession.create({
          data: {
            sessionNumber,
            dealerId,
            status: SESSION_STATUS.OPEN,
            openedBy: `AI (${userName})`,
            openingCash: 0,
            openingCashTL: 0,
            systemCash: 0,
            systemCashTL: 0,
            notes: 'AI Asistan işlemi ile otomatik açılan kasa oturumu',
          },
        });
      }

      // Maliyet & Kâr Zarar Analizi
      const marketPriceRef = await prisma.livePrice.findUnique({ where: { id: resolved.id } })
        || (resolved.id === 'mil24Ayar' ? await prisma.livePrice.findUnique({ where: { id: 'GAUTRY' } }) : null);
      const marketBidPrice = marketPriceRef ? marketPriceRef.bid : unitPrice * 0.98;
      const pnl = calculateTransactionProfitLoss(type, quantity, unitPrice, marketBidPrice, payload.costPrice);

      // Müşteri bilgisi (varsa)
      let customer = null;
      if (payload.customerName) {
        const cName = String(payload.customerName).trim();
        customer = await prisma.customer.findFirst({
          where: { dealerId, name: cName },
        });
        if (!customer && payload.customerPhone) {
          customer = await prisma.customer.create({
            data: {
              dealerId,
              name: cName,
              phone: payload.customerPhone || null,
              note: 'AI Asistan satışı ile otomatik oluşturuldu',
            },
          });
        }
      }

      // Veritabanı işlemi (Transaction + CashMovement + Stock)
      const [newTransaction, updatedStock] = await prisma.$transaction(async (tx) => {
        // 1. Transaction tablosuna yaz
        const createdTx = await tx.transaction.create({
          data: {
            dealerId,
            type,
            productType: resolved.type || payload.productType || 'sarrafiye',
            productCode: resolved.id,
            quantity,
            price: unitPrice,
            total,
            costPrice: pnl.costPrice,
            profitAmount: pnl.profitAmount,
            profitMargin: pnl.profitMargin,
            paymentMethod,
            orderNote: payload.orderNote || 'AI Asistan aracılığıyla kaydedildi',
            customerId: customer?.id || null,
            sessionId: activeSession?.id || null,
            employeeName: `AI (${userName})`,
          },
        });

        // 2. Kasa açık ise CashMovement yaz
        if (activeSession) {
          await tx.cashMovement.create({
            data: {
              sessionId: activeSession.id,
              dealerId,
              type: isSale ? CASH_MOVEMENT_TYPES.POS_SALE : CASH_MOVEMENT_TYPES.SCRAP_BUY,
              category: isSale ? CASH_MOVEMENT_CATEGORIES.SALES : CASH_MOVEMENT_CATEGORIES.SCRAP,
              paymentMethod,
              amount: total,
              currency: CASH_CURRENCIES.TL,
              description: isSale
                ? `AI Satış - ${resolved.label} (${quantity} Adet) [${PAYMENT_METHOD_LABELS[paymentMethod] || paymentMethod}]`
                : `AI Alış - ${resolved.label} (${quantity} Adet) [${PAYMENT_METHOD_LABELS[paymentMethod] || paymentMethod}]`,
              referenceId: createdTx.id,
              employeeName: `AI (${userName})`,
            },
          });
        }

        // 3. Stok güncelle (Eğer barkodlu ProductItem varsa durumunu güncelle, yoksa Stock tablosu)
        let stockRecord = null;
        const dbProductItem = await tx.productItem.findUnique({
          where: { barcode: resolved.id },
        });

        if (dbProductItem) {
          await tx.productItem.update({
            where: { barcode: resolved.id },
            data: { status: isSale ? 'SOLD' : 'IN_STOCK' },
          });
          stockRecord = dbProductItem;
        } else {
          const currentStock = await tx.stock.findUnique({
            where: {
              product_dealerId: {
                product: resolved.id,
                dealerId,
              },
            },
          });

          const adjustment = isSale ? -quantity : quantity;
          const currentAmount = currentStock?.amount || 0;
          const newAmount = Math.max(0, currentAmount + adjustment);

          stockRecord = await tx.stock.upsert({
            where: {
              product_dealerId: {
                product: resolved.id,
                dealerId,
              },
            },
            update: {
              amount: newAmount,
              label: resolved.label,
              type: resolved.type,
            },
            create: {
              dealerId,
              product: resolved.id,
              label: resolved.label,
              type: resolved.type,
              amount: newAmount,
              minThreshold: 5,
            },
          });
        }

        return [createdTx, stockRecord];
      });

      // Fiş formatlama (Termal fiş)
      const printReceipt = Boolean(payload.printReceipt);
      const sendWhatsAppReceipt = Boolean(payload.sendWhatsAppReceipt);
      const receiptSlip = [
        `================================`,
        `     SATIŞ BİLGİ FİŞİ           `,
        `   Kuyumcu Panel Mücevherat     `,
        `================================`,
        `Tarih: ${new Date().toLocaleString('tr-TR')}`,
        `İşlem No: #${newTransaction.id.slice(-6).toUpperCase()}`,
        `Tür: ${isSale ? 'SATIŞ' : 'ALIŞ'}`,
        `Müşteri: ${customer?.name || payload.customerName || 'Perakende Müşteri'}`,
        `--------------------------------`,
        `${resolved.label} x ${quantity}`,
        `Birim Fiyat: ₺${unitPrice.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`,
        `TOPLAM: ₺${total.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`,
        `Ödeme Türü: ${PAYMENT_METHOD_LABELS[paymentMethod] || paymentMethod}`,
        `--------------------------------`,
        `Kasiyer: AI Asistan (${userName})`,
        `Mali değeri yoktur - Bilgi Fişidir`,
        `================================`,
      ].join('\n');

      // WhatsApp URL
      const customerPhone = payload.customerPhone || customer?.phone || null;
      const whatsAppUrl = generateWhatsAppReceiptUrl({
        phone: customerPhone,
        customerName: customer?.name || payload.customerName || 'Değerli Müşterimiz',
        items: [{
          title: resolved.label,
          quantity,
          priceTL: total,
        }],
        totalTL: total,
        paymentMethod: PAYMENT_METHOD_LABELS[paymentMethod] || paymentMethod,
        employeeName: `AI (${userName})`,
      });

      // WhatsApp doğrudan bildirim denemesi (Eğer GSM numarası varsa)
      if (sendWhatsAppReceipt && customerPhone) {
        sendWhatsAppNotification(dealerId, customerPhone, receiptSlip).catch((err) => {
          console.warn('[AI WhatsApp Receipt Notify Warning]:', err.message);
        });
      }

      executionResult = {
        transaction: newTransaction,
        stock: updatedStock,
        receiptSlip,
        whatsAppUrl,
        printReceipt,
        sendWhatsAppReceipt,
      };

      const receiptNotice = printReceipt ? ' 🖨️ Fiş hazırlandı.' : '';
      const waNotice = sendWhatsAppReceipt ? ' 📲 WhatsApp fişi oluşturuldu.' : '';
      successMessage = `🛒 ${quantity} adet ${resolved.label} ${isSale ? 'satışı' : 'alımı'} ₺${total.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} (${PAYMENT_METHOD_LABELS[paymentMethod] || paymentMethod}) başarıyla veritabanına işlendi!${receiptNotice}${waNotice}`;
    }

    // 0.2 TOPTANCI MUTABAKATI & BAKİYE GÜNCELLEME
    else if (actionType === AI_ACTION_TYPES.RECONCILE_SUPPLIER || actionType === 'SETTLE_SUPPLIER_BALANCE' || actionType === 'UPDATE_SUPPLIER_RECONCILIATION') {
      const supplierName = (payload.supplierName || 'Toptancı').trim();
      const allSuppliers = await prisma.supplier.findMany({ where: { dealerId } });
      const normInput = supplierName.toLocaleLowerCase('tr-TR');

      const cleanSupplierName = (name: string) =>
        name
          .toLocaleLowerCase('tr-TR')
          .replace(/toptanc[ıi]s?[ıi]?/g, '')
          .replace(/[^a-z0-9çğıöşü]/gi, '')
          .trim();

      const cleanedInput = cleanSupplierName(normInput);

      let supplier = allSuppliers.find(s => s.name.toLocaleLowerCase('tr-TR') === normInput)
        || (cleanedInput.length > 0 ? allSuppliers.find(s => cleanSupplierName(s.name) === cleanedInput) : undefined)
        || (normInput.length >= 3 ? allSuppliers.find(s => s.name.toLocaleLowerCase('tr-TR').includes(normInput)) : undefined)
        || (cleanedInput.length >= 3 ? allSuppliers.find(s => cleanSupplierName(s.name).length >= 3 && cleanedInput.includes(cleanSupplierName(s.name))) : undefined);

      const statedInitialHas = Number(payload.previousHasBalance ?? payload.currentHasBalance ?? payload.initialHasBalance ?? 0);
      const statedInitialTl = Number(payload.previousTlBalance ?? payload.currentTlBalance ?? payload.initialTlBalance ?? 0);

      if (!supplier) {
        supplier = await prisma.supplier.create({
          data: {
            dealerId,
            name: supplierName,
            hasBalance: statedInitialHas,
            tlBalance: statedInitialTl,
            note: 'AI Asistan mutabakat işlemi ile oluşturuldu',
          },
        });
      }

      const prevHas = supplier.hasBalance;
      const prevTl = supplier.tlBalance;

      let newHas = prevHas;
      if (payload.targetHasBalance !== undefined) {
        newHas = Number(payload.targetHasBalance);
      } else if (payload.newHasBalance !== undefined) {
        newHas = Number(payload.newHasBalance);
      } else if (payload.hasAmount !== undefined) {
        newHas = Number(payload.hasAmount);
      } else if (payload.deltaHas !== undefined) {
        newHas = prevHas + Number(payload.deltaHas);
      }

      let newTl = prevTl;
      if (payload.targetTlBalance !== undefined) {
        newTl = Number(payload.targetTlBalance);
      } else if (payload.newTlBalance !== undefined) {
        newTl = Number(payload.newTlBalance);
      } else if (payload.tlAmount !== undefined) {
        newTl = Number(payload.tlAmount);
      } else if (payload.deltaTl !== undefined) {
        newTl = prevTl + Number(payload.deltaTl);
      }

      const diffHas = Number((newHas - prevHas).toFixed(3));
      const diffTl = Number((newTl - prevTl).toFixed(2));

      const desc = payload.description || `AI Mutabakat Düzeltmesi: Has: ${prevHas.toFixed(2)} gr -> ${newHas.toFixed(2)} gr (${diffHas >= 0 ? '+' : ''}${diffHas.toFixed(2)} gr), TL: ₺${prevTl.toFixed(2)} -> ₺${newTl.toFixed(2)} (${diffTl >= 0 ? '+' : ''}₺${diffTl.toFixed(2)})`;

      const [updatedSupplier, stx] = await prisma.$transaction([
        prisma.supplier.update({
          where: { id: supplier.id },
          data: {
            hasBalance: newHas,
            tlBalance: newTl,
          },
        }),
        prisma.supplierTransaction.create({
          data: {
            dealerId,
            supplierId: supplier.id,
            type: SUPPLIER_TRANSACTION_TYPES.SETTLEMENT,
            hasAmount: newHas,
            tlAmount: newTl,
            description: desc,
            employeeName: `AI (${userName})`,
          },
        }),
      ]);

      executionResult = {
        supplier: updatedSupplier,
        transaction: stx,
        previousHasBalance: prevHas,
        newHasBalance: newHas,
        diffHas,
        previousTlBalance: prevTl,
        newTlBalance: newTl,
        diffTl,
      };

      successMessage = `🤝 "${supplier.name}" toptancısı mutabakatı başarıyla güncellendi: Has borcu ${prevHas.toFixed(2)} gr'dan ${newHas.toFixed(2)} gr Has'a (${diffHas >= 0 ? '+' : ''}${diffHas.toFixed(2)} gr)${diffTl !== 0 ? `, TL borcu ₺${prevTl.toFixed(2)}'den ₺${newTl.toFixed(2)}'ye` : ''} ayarlandı!`;
    }

    // 0.3 GÜN SONU ALMA & KASA KAPATMA (Z-RAPORU)
    else if (actionType === AI_ACTION_TYPES.CLOSE_CASH_REGISTER || actionType === 'GENERATE_Z_REPORT') {
      let activeSession = await prisma.cashRegisterSession.findFirst({
        where: { dealerId, status: SESSION_STATUS.OPEN },
        orderBy: { openedAt: 'desc' },
      });

      if (!activeSession) {
        // Zaten kapalı ise son oturumun Z-Raporunu göster
        const lastSession = await prisma.cashRegisterSession.findFirst({
          where: { dealerId },
          orderBy: { openedAt: 'desc' },
        });

        if (lastSession) {
          const metrics = await calculateSessionMetrics(lastSession, dealerId);
          const receiptSlip = formatThermalReceiptText(metrics, false);
          executionResult = {
            session: metrics,
            receiptSlip,
            isAlreadyClosed: true,
          };
          successMessage = `ℹ️ Kasa zaten kapalı durumda (${metrics.sessionNumber}). Gün sonu Z-Raporu özeti getirildi. Toplam Günlük Ciro: ₺${metrics.totalTurnover.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`;
        } else {
          // Hiç oturum yoksa, bugün için sıfır devirli oturum açıp kapatarak Z-Raporu üret
          const currentYear = new Date().getFullYear();
          const sessionNumber = `Z-${currentYear}-0001`;
          const countedCashTL = payload.countedCashTL !== undefined ? parseFloat(payload.countedCashTL) : 0;
          const freshSession = await prisma.cashRegisterSession.create({
            data: {
              sessionNumber,
              dealerId,
              status: SESSION_STATUS.CLOSED,
              openedBy: `AI (${userName})`,
              closedBy: `AI (${userName})`,
              closedAt: new Date(),
              openingCash: 0,
              openingCashTL: 0,
              systemCash: 0,
              systemCashTL: 0,
              countedCash: countedCashTL,
              countedCashTL,
              closingCash: countedCashTL,
              discrepancy: countedCashTL,
              diffCashTL: countedCashTL,
              notes: payload.notes || 'AI Asistan aracılığıyla oluşturulan ilk gün sonu Z-Raporu',
            },
          });
          const metrics = await calculateSessionMetrics(freshSession, dealerId);
          const receiptSlip = formatThermalReceiptText(metrics, false);
          executionResult = {
            session: metrics,
            receiptSlip,
            isAlreadyClosed: true,
            totalTurnover: 0,
          };
          successMessage = `🏁 Gün sonu alındı ve kasa (${sessionNumber}) kapatıldı. Toplam Günlük Ciro: ₺0,00`;
        }
      } else {
        const metrics = await calculateSessionMetrics(activeSession, dealerId);
        const countedCashTL = payload.countedCashTL !== undefined ? parseFloat(payload.countedCashTL) : metrics.systemCashTL;
        const discrepancyTL = Number((countedCashTL - metrics.systemCashTL).toFixed(2));

        const closedSession = await prisma.$transaction(async (tx) => {
          const updated = await tx.cashRegisterSession.update({
            where: { id: activeSession.id },
            data: {
              status: SESSION_STATUS.CLOSED,
              closedAt: new Date(),
              closedBy: `AI (${userName})`,
              systemCash: metrics.systemCashTL,
              systemCashTL: metrics.systemCashTL,
              systemCashUSD: metrics.systemCashUSD,
              systemCashEUR: metrics.systemCashEUR,
              systemHasGram: metrics.systemHasGram,
              systemCardTL: metrics.cardSales,
              countedCash: countedCashTL,
              countedCashTL,
              closingCash: countedCashTL,
              discrepancy: discrepancyTL,
              diffCashTL: discrepancyTL,
              notes: payload.notes || 'AI Asistan aracılığıyla gün sonu kasa kapatıldı',
            },
          });

          if (Math.abs(discrepancyTL) > 0.01) {
            await tx.cashMovement.create({
              data: {
                sessionId: updated.id,
                dealerId,
                type: discrepancyTL > 0 ? CASH_MOVEMENT_TYPES.INFLOW : CASH_MOVEMENT_TYPES.OUTFLOW,
                category: CASH_MOVEMENT_CATEGORIES.CORRECTION,
                paymentMethod: PAYMENT_METHODS.CASH,
                amount: Math.abs(discrepancyTL),
                currency: CASH_CURRENCIES.TL,
                description: `AI Kasa Kapanış Mutabakat Farkı (${discrepancyTL > 0 ? '+' : ''}${discrepancyTL} TL) - ${discrepancyTL > 0 ? 'Kasa Fazlası' : 'Kasa Eksiği'}`,
                employeeName: `AI (${userName})`,
              },
            });
          }

          return updated;
        });

        const updatedMetrics = await calculateSessionMetrics(closedSession, dealerId);
        const receiptSlip = formatThermalReceiptText(updatedMetrics, false);

        // Dealer info for WhatsApp
        const dealer = await prisma.dealer.findUnique({
          where: { id: dealerId },
          select: { name: true, whatsappPhone: true },
        });

        const whatsAppUrl = generateWhatsAppShareUrl(
          dealer?.whatsappPhone || null,
          `📊 *GÜN SONU Z-RAPORU (${updatedMetrics.sessionNumber})*\n` +
          `🏢 Mağaza: ${dealer?.name || 'Kuyumcu Mağazası'}\n` +
          `📅 Tarih: ${new Date().toLocaleDateString('tr-TR')}\n` +
          `💰 Toplam Ciro: ₺${updatedMetrics.totalTurnover.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}\n` +
          `💵 Kasa Nakdi: ₺${updatedMetrics.systemCashTL.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}\n` +
          `💳 Kartlı Satış: ₺${updatedMetrics.cardSales.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}\n` +
          `⚖️ Mutabakat: ${discrepancyTL === 0 ? 'Kasa Tam Dengeli' : `Fark: ${discrepancyTL > 0 ? '+' : ''}${discrepancyTL} TL`}\n` +
          `✨ Kasa başarıyla kapatıldı.`
        );

        executionResult = {
          session: updatedMetrics,
          receiptSlip,
          whatsAppUrl,
          discrepancyTL,
          totalTurnover: updatedMetrics.totalTurnover,
        };

        const diffText = discrepancyTL === 0 ? 'Kasa Tam Dengeli' : `Mutabakat Farkı: ${discrepancyTL > 0 ? '+' : ''}${discrepancyTL} TL`;
        successMessage = `🏁 Gün sonu alındı ve kasa (${closedSession.sessionNumber}) başarıyla kapatıldı! Toplam Günlük Ciro: ₺${updatedMetrics.totalTurnover.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}, Kapanış Kasası: ₺${countedCashTL.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} (${diffText}).`;
      }
    }

    // 1. FİYAT ALARMI KURULUMU
    else if (actionType === 'CREATE_PRICE_ALERT') {
      const alert = await prisma.priceAlert.create({
        data: {
          dealerId,
          productCode: payload.productCode || 'HAS',
          productLabel: payload.productLabel || 'Has Altın',
          targetPrice: Number(payload.targetPrice),
          priceType: payload.priceType || 'bid',
          condition: payload.condition || 'GTE',
          phone: payload.phone || null,
          isActive: true,
          isTriggered: false,
          notes: payload.notes || 'Yapay Zeka Asistanı tarafından kuruldu',
        },
      });

      executionResult = alert;
      successMessage = `👑 ${alert.productLabel} için ₺${alert.targetPrice.toLocaleString('tr-TR')} seviyesine ${alert.condition === 'GTE' ? '≥ (Eşit veya Üstü)' : '≤ (Eşit veya Altı)'} fiyat alarmı başarıyla kuruldu!`;
    }

    // 2. STOK ADEDİ GÜNCELLEME (Sarrafiye / Döviz / Genel Stok Miktarı)
    else if (actionType === 'UPDATE_STOCK_QUANTITY' || actionType === 'UPDATE_STOCK') {
      const targetProductRaw = payload.product || payload.productCode || payload.label || 'ECEYREKTL';
      const resolved = resolveStockProduct(targetProductRaw);

      const currentStock = await prisma.stock.findUnique({
        where: {
          product_dealerId: {
            product: resolved.id,
            dealerId,
          },
        },
      });

      let newAmount = Number(payload.amount);
      if (payload.operation === 'ADD' || payload.delta !== undefined) {
        const delta = Number(payload.delta || payload.amount || 0);
        newAmount = (currentStock?.amount || 0) + delta;
      } else if (payload.operation === 'SUBTRACT') {
        const delta = Number(payload.delta || payload.amount || 0);
        newAmount = Math.max(0, (currentStock?.amount || 0) - delta);
      }

      if (isNaN(newAmount) || newAmount < 0) {
        newAmount = 0;
      }

      const updatedStock = await prisma.stock.upsert({
        where: {
          product_dealerId: {
            product: resolved.id,
            dealerId,
          },
        },
        update: {
          amount: newAmount,
          label: resolved.label,
          type: resolved.type,
          minThreshold: payload.minThreshold !== undefined ? Number(payload.minThreshold) : currentStock?.minThreshold ?? 5,
        },
        create: {
          dealerId,
          product: resolved.id,
          label: resolved.label,
          type: resolved.type,
          amount: newAmount,
          minThreshold: payload.minThreshold !== undefined ? Number(payload.minThreshold) : 5,
        },
      });

      executionResult = updatedStock;
      successMessage = `📦 ${updatedStock.label} stoğu başarıyla güncellendi: Mevcut miktar ${newAmount} adet yapıldı!`;
    }

    // 3. VİTRİNE YENİ BARKODLU TAKI / PIRLANTA ÜRÜNÜ EKLEME
    else if (actionType === 'CREATE_PRODUCT_ITEM' || actionType === 'ADD_PRODUCT_ITEM') {
      const caratNum = parseInt(payload.carat || '22', 10);
      const categoryName = (payload.category || payload.title || 'Bilezik').trim();
      const weightNum = parseFloat(payload.weight || payload.weightGr || '10.0');
      const qtyNum = parseInt(payload.quantity || '1', 10);

      // Kategori kodu belirle
      let catCode = 'BLZ';
      const catNorm = categoryName.toLowerCase();
      if (catNorm.includes('yüzük') || catNorm.includes('yuzuk')) catCode = 'YZK';
      else if (catNorm.includes('küpe') || catNorm.includes('kupe')) catCode = 'KPE';
      else if (catNorm.includes('kolye')) catCode = 'KLY';
      else if (catNorm.includes('bileklik')) catCode = 'BLK';
      else if (catNorm.includes('zincir')) catCode = 'ZNC';
      else if (catNorm.includes('set') || catNorm.includes('takım')) catCode = 'SET';
      else if (catNorm.includes('tektaş') || catNorm.includes('pırlanta')) catCode = 'PRL';

      let finalBarcode = payload.customBarcode || payload.barcode;
      if (!finalBarcode) {
        const prefix = `${caratNum}${catCode}`;
        const lastItem = await prisma.productItem.findFirst({
          where: { barcode: { startsWith: prefix }, dealerId },
          orderBy: { barcode: 'desc' },
        });

        let nextNum = 1;
        if (lastItem) {
          const numPart = lastItem.barcode.substring(prefix.length);
          const parsed = parseInt(numPart, 10);
          if (!isNaN(parsed)) nextNum = parsed + 1;
        }
        finalBarcode = `${prefix}${String(nextNum).padStart(5, '0')}`;
      }

      const isDiamond = Boolean(payload.isDiamond || catNorm.includes('pırlanta') || payload.diamondCarat);

      const newItem = await prisma.productItem.create({
        data: {
          dealerId,
          barcode: finalBarcode,
          title: categoryName,
          category: categoryName,
          carat: caratNum,
          weight: weightNum,
          quantity: qtyNum,
          description: payload.description || 'AI Asistan tarafından vitrine eklendi',
          status: 'IN_STOCK',
          isDiamond,
          diamondCarat: isDiamond ? parseFloat(payload.diamondCarat || '0.30') : null,
          diamondColor: payload.diamondColor || (isDiamond ? 'G' : null),
          diamondClarity: payload.diamondClarity || (isDiamond ? 'VS1' : null),
          diamondCut: payload.diamondCut || (isDiamond ? 'Excellent' : null),
          certificateNo: payload.certificateNo || payload.diamondCertificate || null,
          costMilyem: parseFloat(payload.costMilyem || '0'),
          laborMilyem: parseFloat(payload.laborMilyem || '0'),
          profitMargin: parseFloat(payload.profitMargin || '15'),
        },
      });

      executionResult = newItem;
      successMessage = `💎 Yeni ${newItem.carat} Ayar ${newItem.title} (${newItem.weight.toFixed(2)} gr) vitrin stoğuna başarıyla eklendi! (Barkod: ${newItem.barcode})`;
    }

    // 4. MEVCUT BARKODLU ÜRÜN GÜNCELLEME
    else if (actionType === 'UPDATE_PRODUCT_ITEM') {
      const barcode = (payload.barcode || '').trim();
      const existing = await prisma.productItem.findUnique({
        where: { barcode },
      });

      if (!existing) {
        return NextResponse.json({ error: `"${barcode}" barkodlu ürün veritabanında bulunamadı.` }, { status: 404 });
      }

      const updateData: any = {};
      if (payload.weight !== undefined) updateData.weight = parseFloat(payload.weight);
      if (payload.status) updateData.status = payload.status;
      if (payload.title) updateData.title = payload.title;
      if (payload.description) updateData.description = payload.description;
      if (payload.laborMilyem !== undefined) updateData.laborMilyem = parseFloat(payload.laborMilyem);

      const updated = await prisma.productItem.update({
        where: { barcode },
        data: updateData,
      });

      executionResult = updated;
      successMessage = `✅ ${updated.barcode} barkodlu ürünün bilgileri başarıyla güncellendi!`;
    }

    // 5. MÜŞTERİ VERESİYE / BORÇ EKLEME
    else if (actionType === 'ADD_CUSTOMER_DEBT') {
      const customerName = (payload.customerName || 'Müşteri').trim();
      let customer = await prisma.customer.findFirst({
        where: { dealerId, name: customerName },
      });

      if (!customer) {
        customer = await prisma.customer.create({
          data: {
            dealerId,
            name: customerName,
            phone: payload.phone || null,
          },
        });
      }

      const amount = Number(payload.amount) || 0;
      const assetType = (payload.assetType || 'HAS').toUpperCase();
      const hasEquivalent = Number(payload.hasEquivalent) || (assetType === 'HAS' ? amount : 0);

      const updateData: any = {};
      if (assetType === 'HAS') {
        updateData.hasBalance = { increment: amount };
      } else if (assetType === 'TL') {
        updateData.tlBalance = { increment: amount };
      } else {
        updateData.hasBalance = { increment: hasEquivalent };
      }

      const [updatedCustomer, tx] = await prisma.$transaction([
        prisma.customer.update({
          where: { id: customer.id },
          data: updateData,
        }),
        prisma.customerTransaction.create({
          data: {
            dealerId,
            customerId: customer.id,
            type: 'BORC',
            assetType,
            amount,
            hasEquivalent,
            unitPrice: payload.unitPrice ? Number(payload.unitPrice) : null,
            description: payload.description || 'AI Asistan aracılığıyla veresiye borç kaydedildi',
            employeeName: `AI (${userName})`,
          },
        }),
      ]);

      executionResult = { customer: updatedCustomer, transaction: tx };
      successMessage = `✅ ${customer.name} adlı müşteriye ${amount} ${assetType} veresiye borcu başarıyla kaydedildi!`;
    }

    // 6. MÜŞTERİDEN TAHSİLAT ALMA
    else if (actionType === 'COLLECT_CUSTOMER_PAYMENT') {
      const customerName = (payload.customerName || '').trim();
      const customer = await prisma.customer.findFirst({
        where: { dealerId, name: customerName },
      });

      if (!customer) {
        return NextResponse.json({ error: `"${customerName}" adlı müşteri rehberde bulunamadı.` }, { status: 404 });
      }

      const amount = Number(payload.amount) || 0;
      const assetType = (payload.assetType || 'HAS').toUpperCase();
      const hasEquivalent = Number(payload.hasEquivalent) || (assetType === 'HAS' ? amount : 0);

      const updateData: any = {};
      if (assetType === 'HAS') {
        updateData.hasBalance = { decrement: amount };
      } else if (assetType === 'TL') {
        updateData.tlBalance = { decrement: amount };
      } else {
        updateData.hasBalance = { decrement: hasEquivalent };
      }

      const [updatedCustomer, tx] = await prisma.$transaction([
        prisma.customer.update({
          where: { id: customer.id },
          data: updateData,
        }),
        prisma.customerTransaction.create({
          data: {
            dealerId,
            customerId: customer.id,
            type: 'TAHSILAT',
            assetType,
            amount,
            hasEquivalent,
            description: payload.description || 'AI Asistan aracılığıyla tahsilat yapıldı',
            employeeName: `AI (${userName})`,
          },
        }),
      ]);

      executionResult = { customer: updatedCustomer, transaction: tx };
      successMessage = `✅ ${customer.name} adlı müşteriden ${amount} ${assetType} tahsilat başarıyla alındı ve borcundan düşüldü!`;
    }

    // 7. TOPTANCI BORÇ / MAL ALIŞ KAYDI
    else if (actionType === 'ADD_SUPPLIER_DEBT') {
      const supplierName = (payload.supplierName || 'Toptancı').trim();
      let supplier = await prisma.supplier.findFirst({
        where: { dealerId, name: supplierName },
      });

      if (!supplier) {
        supplier = await prisma.supplier.create({
          data: { dealerId, name: supplierName },
        });
      }

      const hasAmount = Number(payload.hasAmount) || 0;
      const tlAmount = Number(payload.tlAmount) || 0;

      const [updatedSupplier, tx] = await prisma.$transaction([
        prisma.supplier.update({
          where: { id: supplier.id },
          data: {
            hasBalance: { increment: hasAmount },
            tlBalance: { increment: tlAmount },
          },
        }),
        prisma.supplierTransaction.create({
          data: {
            dealerId,
            supplierId: supplier.id,
            type: 'PURCHASE',
            hasAmount,
            tlAmount,
            description: payload.description || 'AI Asistan ile toptancı mal alışı borcu eklendi',
            employeeName: `AI (${userName})`,
          },
        }),
      ]);

      executionResult = { supplier: updatedSupplier, transaction: tx };
      successMessage = `✅ ${supplier.name} toptancısına ${hasAmount} gr Has / ₺${tlAmount} borç hareketi başarıyla işlendi!`;
    }

    // 8. TOPTANCIYA ÖDEME YAPMA
    else if (actionType === 'PAY_SUPPLIER') {
      const supplierName = (payload.supplierName || '').trim();
      const supplier = await prisma.supplier.findFirst({
        where: { dealerId, name: supplierName },
      });

      if (!supplier) {
        return NextResponse.json({ error: `"${supplierName}" toptancısı bulunamadı.` }, { status: 404 });
      }

      const hasAmount = Number(payload.hasAmount) || 0;
      const tlAmount = Number(payload.tlAmount) || 0;

      const [updatedSupplier, tx] = await prisma.$transaction([
        prisma.supplier.update({
          where: { id: supplier.id },
          data: {
            hasBalance: { decrement: hasAmount },
            tlBalance: { decrement: tlAmount },
          },
        }),
        prisma.supplierTransaction.create({
          data: {
            dealerId,
            supplierId: supplier.id,
            type: hasAmount > 0 ? 'HAS_PAYMENT' : 'TL_PAYMENT',
            hasAmount,
            tlAmount,
            description: payload.description || 'AI Asistan ile toptancıya ödeme yapıldı',
            employeeName: `AI (${userName})`,
          },
        }),
      ]);

      executionResult = { supplier: updatedSupplier, transaction: tx };
      successMessage = `✅ ${supplier.name} toptancısına ${hasAmount ? hasAmount + ' gr Has' : ''} ${tlAmount ? '₺' + tlAmount : ''} ödeme başarıyla düşüldü!`;
    }

    // 9. YENİ MÜŞTERİ KARTI OLUŞTURMA
    else if (actionType === 'CREATE_CUSTOMER') {
      const customer = await prisma.customer.create({
        data: {
          dealerId,
          name: payload.name.trim(),
          phone: payload.phone || null,
          note: payload.note || 'AI Asistan tarafından oluşturuldu',
        },
      });

      executionResult = customer;
      successMessage = `✅ "${customer.name}" adlı yeni müşteri rehbere başarıyla eklendi!`;
    }

    // 10. KRİTİK STOK EŞİĞİ GÜNCELLEME
    else if (actionType === 'UPDATE_STOCK_THRESHOLD') {
      const targetProductRaw = payload.product || payload.productCode || payload.label || 'ECEYREKTL';
      const resolved = resolveStockProduct(targetProductRaw);
      const minThreshold = Number(payload.minThreshold) || 5;

      const stock = await prisma.stock.upsert({
        where: {
          product_dealerId: {
            product: resolved.id,
            dealerId,
          },
        },
        update: { minThreshold, label: resolved.label, type: resolved.type },
        create: {
          dealerId,
          product: resolved.id,
          label: resolved.label,
          type: resolved.type,
          amount: 0,
          minThreshold,
        },
      });

      executionResult = stock;
      successMessage = `✅ ${stock.label || stock.product} ürününün kritik stok uyarı eşiği ${minThreshold} adet olarak güncellendi!`;
    }

    // 11. KASAYA MANUEL HAREKET (Giriş/Çıkış)
    else if (actionType === 'ADD_CASH_MOVEMENT') {
      const openSession = await prisma.cashRegisterSession.findFirst({
        where: { dealerId, status: 'OPEN' },
      });

      const amount = Number(payload.amount) || 0;
      const type = (payload.type || 'INFLOW').toUpperCase();
      const currency = (payload.currency || 'TL').toUpperCase();

      const movement = await prisma.cashMovement.create({
        data: {
          dealerId,
          sessionId: openSession?.id || 'manual',
          type,
          category: payload.category || 'CAPITAL',
          paymentMethod: 'CASH',
          amount,
          currency,
          description: payload.description || 'AI Asistan ile kasa hareketi işlendi',
          employeeName: `AI (${userName})`,
        },
      });

      executionResult = movement;
      successMessage = `✅ Kasaya ₺${amount.toLocaleString('tr-TR')} ${type === 'INFLOW' ? 'giriş' : 'çıkış'} hareketi başarıyla işlendi!`;
    } else {
      return NextResponse.json({ error: `Desteklenmeyen eylem türü: ${actionType}` }, { status: 400 });
    }

    // Audit Log Kaydı
    await prisma.auditLog.create({
      data: {
        dealerId,
        action: `AI_ACTION: ${actionType}`,
        details: `${userName} teyidi ile yapay zeka işlemi tamamlandı: ${successMessage}`,
        userEmail,
        userName,
      },
    });

    return NextResponse.json({
      success: true,
      message: successMessage,
      actionType,
      result: executionResult,
    });
  } catch (error: any) {
    console.error('[AI Execute Action Error]:', error);
    return NextResponse.json(
      { error: error.message || 'Eylem gerçekleştirilirken bir hata oluştu.' },
      { status: 500 }
    );
  }
}

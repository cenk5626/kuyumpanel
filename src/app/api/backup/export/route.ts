import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUserRole = (session.user as any)?.role;
    const currentUserDealerId = (session.user as any)?.dealerId || 'merkez';

    let whereDealer: any = {};
    if (currentUserRole !== 'SUPER_ADMIN') {
      whereDealer.dealerId = currentUserDealerId;
    }

    const { searchParams } = new URL(req.url);
    const exportType = searchParams.get('type') || 'stocks';
    const format = searchParams.get('format') || 'xlsx';

    // 1. TAM VERİTABANI YEDEĞİ (FULL JSON)
    if (exportType === 'full_backup') {
      const [
        productItems,
        stocks,
        customers,
        customerTransactions,
        suppliers,
        supplierTransactions,
        transactions,
        zSessions,
        alerts,
        categories,
      ] = await Promise.all([
        prisma.productItem.findMany({ where: whereDealer }),
        prisma.stock.findMany({ where: whereDealer }),
        prisma.customer.findMany({ where: whereDealer }),
        prisma.customerTransaction.findMany({ where: whereDealer }),
        prisma.supplier.findMany({ where: whereDealer }),
        prisma.supplierTransaction.findMany({ where: whereDealer }),
        prisma.transaction.findMany({ where: whereDealer }),
        prisma.cashRegisterSession.findMany({ where: whereDealer }),
        prisma.priceAlert.findMany({ where: whereDealer }),
        prisma.category.findMany({ where: whereDealer }),
      ]);

      const backupData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        dealerId: currentUserDealerId,
        data: {
          productItems,
          stocks,
          customers,
          customerTransactions,
          suppliers,
          supplierTransactions,
          transactions,
          zSessions,
          alerts,
          categories,
        },
      };

      const jsonStr = JSON.stringify(backupData, null, 2);
      return new NextResponse(jsonStr, {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="kuyumpanel_backup_${new Date().toISOString().slice(0, 10)}.json"`,
        },
      });
    }

    // 2. EXCEL / CSV VERİ TABLOSU OLUŞTURMA
    const workbook = XLSX.utils.book_new();

    if (exportType === 'stocks') {
      const products = await prisma.productItem.findMany({
        where: whereDealer,
        orderBy: { barcode: 'asc' },
      });

      const rows = products.map((p) => ({
        'Barkod': p.barcode,
        'Ürün Başlığı': p.title || '',
        'Kategori': p.category || '',
        'Alt Tür': p.subType || '',
        'Ayar': `${p.carat}K`,
        'Ağırlık (gr)': p.weight,
        'Geliş Milyemi': p.costMilyem,
        'İşçilik Milyemi': p.laborMilyem,
        'Satış Milyemi': p.sellingMilyem ?? '',
        'Kâr Marjı (%)': p.profitMargin,
        'Maliyet (TL)': p.costPrice ?? '',
        'Durum': p.status === 'IN_STOCK' ? 'Stokta' : p.status === 'SOLD' ? 'Satıldı' : 'İade',
        'Pırlanta mı?': p.isDiamond ? 'Evet' : 'Hayır',
        'Pırlanta Karat': p.diamondCarat ?? '',
        'Pırlanta Renk': p.diamondColor ?? '',
        'Pırlanta Berraklık': p.diamondClarity ?? '',
        'Pırlanta Kesim': p.diamondCut ?? '',
        'Sertifika No': p.certificateNo ?? '',
        'Sertifika Kurumu': p.certificateOrg ?? '',
        'Toptancı': p.supplierName ?? '',
        'Kayıt Tarihi': p.createdAt ? new Date(p.createdAt).toLocaleDateString('tr-TR') : '',
      }));

      const worksheet = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Stoklar');
    } else if (exportType === 'customers') {
      const customers = await prisma.customer.findMany({
        where: whereDealer,
        orderBy: { name: 'asc' },
      });

      const rows = customers.map((c) => ({
        'Müşteri Adı': c.name,
        'Telefon': c.phone ?? '',
        'TC Kimlik No': c.tcNo ?? '',
        'E-posta': c.email ?? '',
        'Has Bakiye (gr)': c.hasBalance,
        'TL Bakiye (₺)': c.tlBalance,
        'TL Borç Limiti': c.creditLimitTL ?? 0,
        'Has Borç Limiti': c.creditLimitHas ?? 0,
        'Adres': c.address ?? '',
        'Not': c.note ?? '',
        'Kayıt Tarihi': c.createdAt ? new Date(c.createdAt).toLocaleDateString('tr-TR') : '',
      }));

      const worksheet = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Müşteriler');
    } else if (exportType === 'suppliers') {
      const suppliers = await prisma.supplier.findMany({
        where: whereDealer,
        orderBy: { name: 'asc' },
      });

      const rows = suppliers.map((s) => ({
        'Toptancı / Atölye Adı': s.name,
        'Telefon': s.phone ?? '',
        'Has Altın Borcumuz (gr)': s.hasBalance,
        'TL Borcumuz (₺)': s.tlBalance,
        'Adres': s.address ?? '',
        'Not': s.note ?? '',
        'Kayıt Tarihi': s.createdAt ? new Date(s.createdAt).toLocaleDateString('tr-TR') : '',
      }));

      const worksheet = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Toptancılar');
    } else if (exportType === 'transactions') {
      const transactions = await prisma.transaction.findMany({
        where: whereDealer,
        orderBy: { createdAt: 'desc' },
        take: 1000,
      });

      const rows = transactions.map((t) => ({
        'İşlem ID': t.id,
        'Tarih': t.createdAt ? new Date(t.createdAt).toLocaleString('tr-TR') : '',
        'İşlem Tipi': t.type === 'sell' ? 'Satış' : 'Alış',
        'Ürün Grubu': t.productType,
        'Ürün Kodu': t.productCode,
        'Miktar': t.quantity,
        'Birim Fiyat (TL)': t.price,
        'Toplam Tutar (TL)': t.total,
        'Kâr Tutarı (TL)': t.profitAmount ?? '',
        'Kâr Marjı (%)': t.profitMargin ?? '',
        'Ödeme Yöntemi': t.paymentMethod,
        'Şüpheli İşlem mi?': t.isSuspicious ? 'Evet' : 'Hayır',
        'Şüphe Nedeni': t.suspiciousReason ?? '',
        'Personel': t.employeeName ?? '',
      }));

      const worksheet = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'İşlemler');
    }

    if (format === 'csv') {
      const firstSheetName = workbook.SheetNames[0];
      const csvOutput = XLSX.utils.sheet_to_csv(workbook.Sheets[firstSheetName]);
      return new NextResponse(csvOutput, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${exportType}_${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      });
    }

    // Default: XLSX
    const xlsxBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    return new NextResponse(xlsxBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${exportType}_${new Date().toISOString().slice(0, 10)}.xlsx"`,
      },
    });
  } catch (error) {
    console.error('[API Backup Export] Error:', error);
    return NextResponse.json({ error: 'Dışa aktarma gerçekleştirilemedi.' }, { status: 500 });
  }
}

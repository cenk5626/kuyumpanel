import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { logActivity } from '@/lib/logger';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUserRole = (session.user as any)?.role;
    const currentUserDealerId = (session.user as any)?.dealerId || 'merkez';
    const currentUserName = session.user?.name || 'Yetkili';

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const importType = formData.get('type') as string || 'stocks';

    if (!file) {
      return NextResponse.json({ error: 'Lütfen bir dosya seçiniz.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // 1. TAM YEDEK GERİ YÜKLEME (JSON RESTORE)
    if (importType === 'full_backup' || file.name.endsWith('.json')) {
      if (currentUserRole !== 'SUPER_ADMIN' && currentUserRole !== 'ADMIN') {
        return NextResponse.json({ error: 'Yedekten geri yükleme için yetkiniz bulunmuyor.' }, { status: 403 });
      }

      try {
        const jsonContent = JSON.parse(buffer.toString('utf-8'));
        const backupData = jsonContent.data;

        if (!backupData) {
          return NextResponse.json({ error: 'Geçersiz yedek dosyası formatı.' }, { status: 400 });
        }

        // Müşterileri ve Ürünleri güvenli ekle/güncelle
        let restoredCount = 0;
        if (Array.isArray(backupData.customers)) {
          for (const c of backupData.customers) {
            await prisma.customer.upsert({
              where: { id: c.id },
              update: {
                name: c.name,
                phone: c.phone,
                email: c.email,
                tcNo: c.tcNo,
                address: c.address,
                hasBalance: c.hasBalance || 0,
                tlBalance: c.tlBalance || 0,
              },
              create: {
                id: c.id,
                name: c.name,
                phone: c.phone,
                email: c.email,
                tcNo: c.tcNo,
                address: c.address,
                dealerId: currentUserDealerId,
                hasBalance: c.hasBalance || 0,
                tlBalance: c.tlBalance || 0,
              },
            });
            restoredCount++;
          }
        }

        if (Array.isArray(backupData.productItems)) {
          for (const p of backupData.productItems) {
            await prisma.productItem.upsert({
              where: { barcode: p.barcode },
              update: {
                title: p.title || '',
                category: p.category,
                carat: p.carat || 14,
                weight: p.weight || 0,
                costMilyem: p.costMilyem || 0.585,
                laborMilyem: p.laborMilyem || 0.1,
                profitMargin: p.profitMargin || 10,
                status: p.status || 'IN_STOCK',
              },
              create: {
                barcode: p.barcode,
                title: p.title || '',
                category: p.category,
                subType: p.subType,
                carat: p.carat || 14,
                weight: p.weight || 0,
                costMilyem: p.costMilyem || 0.585,
                laborMilyem: p.laborMilyem || 0.1,
                profitMargin: p.profitMargin || 10,
                status: p.status || 'IN_STOCK',
                dealerId: currentUserDealerId,
              },
            });
            restoredCount++;
          }
        }

        await logActivity({
          dealerId: currentUserDealerId,
          action: 'Sistem Yedeği Geri Yüklendi',
          details: `${file.name} dosyasından ${restoredCount} kayıt sisteme aktarıldı.`,
          userEmail: session.user?.email || '',
          userName: currentUserName,
        });

        return NextResponse.json({
          success: true,
          message: `Yedekleme başarıyla tamamlandı. (${restoredCount} kayıt güncellendi)`,
        });
      } catch (e: any) {
        return NextResponse.json({ error: 'Yedek dosyası işlenirken hata: ' + e.message }, { status: 400 });
      }
    }

    // 2. EXCEL / CSV OKUMA (SheetJS)
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const firstSheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[firstSheetName];
    const jsonData: any[] = XLSX.utils.sheet_to_json(sheet);

    if (!jsonData || jsonData.length === 0) {
      return NextResponse.json({ error: 'Dosya içerisinde veri bulunamadı.' }, { status: 400 });
    }

    let successCount = 0;
    let skippedCount = 0;

    if (importType === 'stocks') {
      for (const row of jsonData) {
        const barcode = String(row['Barkod'] || row['barcode'] || '').trim();
        if (!barcode) {
          skippedCount++;
          continue;
        }

        const title = String(row['Ürün Başlığı'] || row['title'] || row['Kategori'] || 'Takı Ürünü').trim();
        const category = String(row['Kategori'] || row['category'] || 'Genel').trim();
        const caratStr = String(row['Ayar'] || row['carat'] || '14').replace(/[^0-9]/g, '');
        const carat = parseInt(caratStr, 10) || 14;
        const weight = parseFloat(String(row['Ağırlık (gr)'] || row['weight'] || '0').replace(',', '.')) || 0;
        const costMilyem = parseFloat(String(row['Geliş Milyemi'] || row['costMilyem'] || '0.585').replace(',', '.')) || 0.585;
        const laborMilyem = parseFloat(String(row['İşçilik Milyemi'] || row['laborMilyem'] || '0.1').replace(',', '.')) || 0.1;
        const profitMargin = parseFloat(String(row['Kâr Marjı (%)'] || row['profitMargin'] || '10').replace(',', '.')) || 10;
        const supplierName = String(row['Toptancı'] || row['supplierName'] || '').trim() || null;

        const isDiamond = String(row['Pırlanta mı?'] || row['isDiamond'] || '').toLowerCase().includes('evet') || false;
        const diamondCarat = parseFloat(String(row['Pırlanta Karat'] || row['diamondCarat'] || '0').replace(',', '.')) || null;
        const diamondColor = String(row['Pırlanta Renk'] || row['diamondColor'] || '').trim() || null;
        const diamondClarity = String(row['Pırlanta Berraklık'] || row['diamondClarity'] || '').trim() || null;
        const diamondCut = String(row['Pırlanta Kesim'] || row['diamondCut'] || '').trim() || null;
        const certificateNo = String(row['Sertifika No'] || row['certificateNo'] || '').trim() || null;

        await prisma.productItem.upsert({
          where: { barcode },
          update: {
            title,
            category,
            carat,
            weight,
            costMilyem,
            laborMilyem,
            profitMargin,
            supplierName,
            isDiamond,
            diamondCarat,
            diamondColor,
            diamondClarity,
            diamondCut,
            certificateNo,
          },
          create: {
            barcode,
            title,
            category,
            carat,
            weight,
            costMilyem,
            laborMilyem,
            profitMargin,
            supplierName,
            isDiamond,
            diamondCarat,
            diamondColor,
            diamondClarity,
            diamondCut,
            certificateNo,
            dealerId: currentUserDealerId,
            status: 'IN_STOCK',
          },
        });
        successCount++;
      }
    } else if (importType === 'customers') {
      for (const row of jsonData) {
        const name = String(row['Müşteri Adı'] || row['name'] || '').trim();
        if (!name) {
          skippedCount++;
          continue;
        }

        const phone = String(row['Telefon'] || row['phone'] || '').trim() || null;
        const tcNo = String(row['TC Kimlik No'] || row['tcNo'] || '').trim() || null;
        const email = String(row['E-posta'] || row['email'] || '').trim() || null;
        const hasBalance = parseFloat(String(row['Has Bakiye (gr)'] || row['hasBalance'] || '0').replace(',', '.')) || 0;
        const tlBalance = parseFloat(String(row['TL Bakiye (₺)'] || row['tlBalance'] || '0').replace(',', '.')) || 0;
        const address = String(row['Adres'] || row['address'] || '').trim() || null;
        const note = String(row['Not'] || row['note'] || '').trim() || null;

        await prisma.customer.create({
          data: {
            name,
            phone,
            tcNo,
            email,
            hasBalance,
            tlBalance,
            address,
            note,
            dealerId: currentUserDealerId,
          },
        });
        successCount++;
      }
    }

    await logActivity({
      dealerId: currentUserDealerId,
      action: 'Toplu Veri İçe Aktarıldı',
      details: `${file.name} dosyasından ${successCount} adet ${importType === 'stocks' ? 'ürün' : 'müşteri'} sisteme başarıyla yüklendi.`,
      userEmail: session.user?.email || '',
      userName: currentUserName,
    });

    return NextResponse.json({
      success: true,
      successCount,
      skippedCount,
      message: `${successCount} kayıt başarıyla yüklendi.${skippedCount > 0 ? ` (${skippedCount} satır atlandı)` : ''}`,
    });
  } catch (error: any) {
    console.error('[API Backup Import] Error:', error);
    return NextResponse.json({ error: 'Dosya içe aktarılırken hata: ' + error.message }, { status: 500 });
  }
}

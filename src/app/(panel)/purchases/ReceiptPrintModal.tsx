'use client';

import React from 'react';
import { X, Printer, ShieldCheck, Truck, Scale } from 'lucide-react';

interface ReceiptPrintProps {
  receipt: any;
  onClose: () => void;
}

export default function ReceiptPrintModal({ receipt, onClose }: ReceiptPrintProps) {
  const handlePrint = () => {
    window.print();
  };

  const totalLines = receipt.lines?.length || 0;
  const totalQuantity = receipt.lines?.reduce((acc: number, l: any) => acc + (l.quantity || 1), 0) || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-md print:p-0 print:bg-white print:fixed">
      <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-white text-slate-900 rounded-2xl shadow-2xl border border-slate-200 print:border-none print:shadow-none print:max-w-none print:w-full print:h-auto print:rounded-none">
        {/* Ekran Araç Çubuğu */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 print:hidden bg-slate-50/80 rounded-t-2xl">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-amber-600" />
            <span className="font-extrabold text-sm text-slate-800">Mal Kabul & Mutabakat Makbuzu</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-slate-950 text-xs font-black rounded-xl shadow-md transition-all min-h-[44px]"
            >
              <Printer className="w-4 h-4" />
              Yazdır / PDF Kaydet
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Kapat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Belge Gövdesi (A4 Düzeni) */}
        <div className="p-8 font-sans space-y-6 print:p-6 print:space-y-4">
          {/* Başlık */}
          <div className="flex items-start justify-between border-b border-slate-200 pb-6">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-950 uppercase">
                MAL KABUL & MUTABAKAT MAKBUZU
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                KuyumPanel Hassas Tartım ve Toptancı Has Mutabakat Belgesi
              </p>
            </div>
            <div className="text-right">
              <div className="text-xs font-mono font-black text-amber-800 bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/20 inline-block">
                MAKBUZ NO: {receipt.receiptNumber}
              </div>
              <p className="text-xs text-slate-500 mt-2 font-mono">
                Tarih: {new Date(receipt.receiptDate).toLocaleString('tr-TR')}
              </p>
              {receipt.invoiceNumber && (
                <p className="text-xs font-medium text-slate-700 mt-1">
                  Toptancı İrsaliye/Fatura: {receipt.invoiceNumber}
                </p>
              )}
            </div>
          </div>

          {/* Tedarikçi ve Şube Bilgileri */}
          <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Toptancı / Tedarikçi Bilgileri
              </span>
              <p className="text-base font-bold text-slate-900 mt-1">{receipt.supplier?.name}</p>
              {receipt.supplier?.phone && (
                <p className="text-xs text-slate-600 mt-0.5 font-mono">Tel: {receipt.supplier.phone}</p>
              )}
              {receipt.purchaseOrder && (
                <p className="text-xs text-amber-700 font-mono mt-1 font-bold">
                  Bağlı Sipariş No: {receipt.purchaseOrder.orderNumber}
                </p>
              )}
            </div>
            <div className="border-l border-slate-200 pl-4">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Mal Kabul Şubesi & Yetkili
              </span>
              <p className="text-base font-bold text-slate-900 mt-1">
                {receipt.branch?.name || 'Merkez Şube'}
              </p>
              <p className="text-xs text-slate-600 mt-0.5">
                Kabul Eden Personel: {receipt.receivedBy}
              </p>
            </div>
          </div>

          {receipt.notes && (
            <div className="p-3 bg-amber-50/60 border border-amber-200/60 rounded-lg text-xs text-slate-700">
              <span className="font-bold">Mal Kabul Notu:</span> {receipt.notes}
            </div>
          )}

          {/* Kalemler Tablosu */}
          <div>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-800 text-[11px] uppercase tracking-wider text-slate-700 bg-slate-100/90">
                  <th className="py-2.5 px-3 font-bold">#</th>
                  <th className="py-2.5 px-3 font-bold">Ürün / Kalem Tanımı</th>
                  <th className="py-2.5 px-3 font-bold text-center">Ayar / Milyem</th>
                  <th className="py-2.5 px-3 font-bold text-right">Fiili Gramaj</th>
                  <th className="py-2.5 px-3 font-bold text-center">Adet</th>
                  <th className="py-2.5 px-3 font-bold text-right">Has Karşılığı</th>
                  <th className="py-2.5 px-3 font-bold text-right">İşçilik Tutarı</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {receipt.lines?.map((line: any, idx: number) => (
                  <tr key={line.id || idx}>
                    <td className="py-2.5 px-3 font-mono text-slate-400">{idx + 1}</td>
                    <td className="py-2.5 px-3 font-medium text-slate-900">
                      {line.description}
                      {line.barcode && (
                        <span className="block font-mono text-[10px] text-slate-500">
                          Barkod: {line.barcode}
                        </span>
                      )}
                      {line.costVarianceNote && (
                        <span className="block text-[10px] text-amber-700 font-medium">
                          Fark: {line.costVarianceNote}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center text-slate-700 font-mono font-bold">
                      {line.carat}K ({line.milyem})
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                      {Number(line.actualWeight || 0).toFixed(2)} gr
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-slate-900">
                      {line.quantity} Adet
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-black text-amber-600">
                      {Number(line.hasEquivalent || 0).toFixed(3)} Has
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-900">
                      {line.laborCostTl > 0 ? `${Number(line.laborCostTl).toLocaleString('tr-TR')} ₺` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-800 bg-slate-50 font-black text-xs text-slate-900">
                  <td colSpan={3} className="py-3 px-3">
                    GENEL TOPLAM ({totalLines} Kalem / {totalQuantity} Adet)
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-sm font-black">
                    {Number(receipt.totalActualWeight || 0).toFixed(2)} gr
                  </td>
                  <td></td>
                  <td className="py-3 px-3 text-right font-mono text-sm text-amber-700 font-black">
                    {Number(receipt.totalHasEquivalent || 0).toFixed(3)} Has
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-sm font-black">
                    {Number(receipt.totalLaborCostTl || 0).toLocaleString('tr-TR')} ₺
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* İmzalar */}
          <div className="grid grid-cols-2 gap-8 pt-8 border-t border-slate-300">
            <div className="border border-slate-200 p-4 rounded-xl text-center">
              <span className="text-xs font-bold text-slate-700 uppercase block mb-1">
                TESLİM EDEN (TOPTANCI / KURYE)
              </span>
              <p className="text-xs text-slate-500 mb-8">
                Yetkili: .......................................
              </p>
              <div className="border-b border-slate-300 w-3/4 mx-auto mb-2"></div>
              <span className="text-[10px] text-slate-400 uppercase">İmza / Kaşe</span>
            </div>

            <div className="border border-slate-200 p-4 rounded-xl text-center">
              <span className="text-xs font-bold text-slate-700 uppercase block mb-1">
                TESLİM ALAN (MAĞAZA KABUL)
              </span>
              <p className="text-xs text-slate-500 mb-8">
                Personel: {receipt.receivedBy}
              </p>
              <div className="border-b border-slate-300 w-3/4 mx-auto mb-2"></div>
              <span className="text-[10px] text-slate-400 uppercase">İmza / Kaşe</span>
            </div>
          </div>

          {/* Dipnot */}
          <div className="flex items-center justify-between text-[10px] text-slate-400 pt-4 border-t border-slate-200">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Toptancı Has Borç Bakiyesi Otomatik Güncellenmiştir.
            </span>
            <span>Sayfa 1 / 1</span>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import React from 'react';
import { X, Printer, ShieldCheck } from 'lucide-react';
import { TRANSFER_STATUS_LABELS, TransferStatus } from '@/constants/branch';

interface TransferPrintProps {
  transfer: any;
  onClose: () => void;
}

export default function TransferPrintModal({ transfer, onClose }: TransferPrintProps) {
  const handlePrint = () => {
    window.print();
  };

  const totalLines = transfer.lines?.length || 0;
  const totalQuantity = transfer.lines?.reduce((acc: number, l: any) => acc + (l.quantity || 1), 0) || 0;
  const totalWeight = transfer.lines?.reduce((acc: number, l: any) => acc + (l.weight || 0), 0) || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm print:p-0 print:bg-white print:fixed">
      {/* Yazdırma Esnasında Yalnızca Bu Belge Görünür */}
      <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-white text-slate-900 rounded-2xl shadow-2xl print:shadow-none print:max-w-none print:w-full print:h-auto print:rounded-none">
        {/* Ekran Araç Çubuğu (Yazdırmada Gizlenir) */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 print:hidden bg-slate-50 rounded-t-2xl">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-amber-600" />
            <span className="font-bold text-sm text-slate-800">Şubeler Arası Transfer Sevk İrsaliyesi</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 text-xs font-bold rounded-xl shadow-md transition-colors"
            >
              <Printer className="w-4 h-4" />
              Yazdır / PDF Kaydet
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Belge Gövdesi (A4 Baskı Düzeni) */}
        <div className="p-8 font-sans space-y-6 print:p-6 print:space-y-4">
          {/* Başlık ve İrsaliye Bilgileri */}
          <div className="flex items-start justify-between border-b border-slate-200 pb-6">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-950 uppercase">
                ŞUBELER ARASI TRANSFER SEVK FİŞİ
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                KuyumPanel Güvenli Kıymetli Maden & Mücevher Transfer Belgesi
              </p>
            </div>
            <div className="text-right">
              <div className="text-xs font-mono font-bold text-amber-700 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200 inline-block">
                İRSALİYE NO: {transfer.transferNumber}
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Tarih: {new Date(transfer.createdAt).toLocaleString('tr-TR')}
              </p>
              <div className="mt-1 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-800">
                Durum: {TRANSFER_STATUS_LABELS[transfer.status as TransferStatus]?.label || transfer.status}
              </div>
            </div>
          </div>

          {/* Şube Rotaları */}
          <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Çıkış Şubesi (Gönderen)
              </span>
              <p className="text-base font-bold text-slate-900 mt-1">{transfer.fromBranch?.name}</p>
              <p className="text-xs font-mono text-slate-600">Kod: {transfer.fromBranch?.code}</p>
              {transfer.fromBranch?.phone && (
                <p className="text-xs text-slate-500 mt-0.5">Tel: {transfer.fromBranch.phone}</p>
              )}
            </div>
            <div className="border-l border-slate-200 pl-4">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Varış Şubesi (Alıcı)
              </span>
              <p className="text-base font-bold text-slate-900 mt-1">{transfer.toBranch?.name}</p>
              <p className="text-xs font-mono text-slate-600">Kod: {transfer.toBranch?.code}</p>
              {transfer.toBranch?.phone && (
                <p className="text-xs text-slate-500 mt-0.5">Tel: {transfer.toBranch.phone}</p>
              )}
            </div>
          </div>

          {/* Transfer Notları */}
          {transfer.notes && (
            <div className="p-3 bg-amber-50/60 border border-amber-200/60 rounded-lg text-xs text-slate-700">
              <span className="font-bold">Açıklama / Sevk Notu:</span> {transfer.notes}
            </div>
          )}

          {/* Transfer Kalemleri Tablosu */}
          <div>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-800 text-[11px] uppercase tracking-wider text-slate-600 bg-slate-100/70">
                  <th className="py-2.5 px-3 font-bold">#</th>
                  <th className="py-2.5 px-3 font-bold">Barkod</th>
                  <th className="py-2.5 px-3 font-bold">Ürün / Takı Tanımı</th>
                  <th className="py-2.5 px-3 font-bold text-center">Ayar</th>
                  <th className="py-2.5 px-3 font-bold text-right">Gramaj</th>
                  <th className="py-2.5 px-3 font-bold text-center">Miktar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {transfer.lines?.map((line: any, idx: number) => (
                  <tr key={line.id || idx}>
                    <td className="py-2 px-3 font-mono text-slate-400">{idx + 1}</td>
                    <td className="py-2 px-3 font-mono font-bold text-slate-900">{line.barcode}</td>
                    <td className="py-2 px-3 text-slate-800 font-medium">{line.productTitle}</td>
                    <td className="py-2 px-3 text-center text-slate-600">{line.carat ? `${line.carat}K` : '-'}</td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                      {Number(line.weight || 0).toFixed(2)} gr
                    </td>
                    <td className="py-2 px-3 text-center font-bold text-slate-900">{line.quantity} Adet</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-800 bg-slate-50 font-bold text-xs text-slate-900">
                  <td colSpan={3} className="py-3 px-3">
                    GENEL TOPLAM ({totalLines} Çeşit Ürün)
                  </td>
                  <td></td>
                  <td className="py-3 px-3 text-right font-mono text-sm">{totalWeight.toFixed(2)} gr</td>
                  <td className="py-3 px-3 text-center text-sm">{totalQuantity} Adet</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* İmzalar ve Teslimat Onayı */}
          <div className="grid grid-cols-2 gap-8 pt-8 border-t border-slate-300">
            <div className="border border-slate-200 p-4 rounded-xl text-center">
              <span className="text-xs font-bold text-slate-700 uppercase block mb-1">
                SEVK EDEN (ÇIKIŞ ŞUBESİ)
              </span>
              <p className="text-xs text-slate-500 mb-8">
                Personel: {transfer.requestedBy || 'Yetkili'}
              </p>
              <div className="border-b border-slate-300 w-3/4 mx-auto mb-2"></div>
              <span className="text-[10px] text-slate-400 uppercase">İmza / Kaşe</span>
            </div>

            <div className="border border-slate-200 p-4 rounded-xl text-center">
              <span className="text-xs font-bold text-slate-700 uppercase block mb-1">
                TESLİM ALAN (VARIŞ ŞUBESİ)
              </span>
              <p className="text-xs text-slate-500 mb-8">
                Personel: .......................................
              </p>
              <div className="border-b border-slate-300 w-3/4 mx-auto mb-2"></div>
              <span className="text-[10px] text-slate-400 uppercase">İmza / Kaşe</span>
            </div>
          </div>

          {/* Yasal / Güvenlik Dipnotu */}
          <div className="flex items-center justify-between text-[10px] text-slate-400 pt-4 border-t border-slate-200">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              KuyumPanel Şubeler Arası Güvenli İrsaliye Doğrulama
            </span>
            <span>Sayfa 1 / 1</span>
          </div>
        </div>
      </div>
    </div>
  );
}

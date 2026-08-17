'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Printer, Copy, Check, FileText, Smartphone } from 'lucide-react';
import { DailyZReportMetrics, formatThermalReceiptText } from '@/lib/z-report';
import { DISCREPANCY_STATUS, SESSION_STATUS } from '@/constants/kasa';

interface ZReportSlipModalProps {
  isOpen: boolean;
  onClose: () => void;
  metrics: DailyZReportMetrics | null;
  storeName?: string;
}

export default function ZReportSlipModal({
  isOpen,
  onClose,
  metrics,
  storeName = 'Kuyumcu Panel Mücevherat',
}: ZReportSlipModalProps) {
  const [is58mm, setIs58mm] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen || !metrics) return null;

  const receiptText = formatThermalReceiptText(metrics, is58mm);

  const handleCopy = () => {
    navigator.clipboard.writeText(receiptText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const formattedOpenedDate = new Date(metrics.openedAt).toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const formattedClosedDate = metrics.closedAt
    ? new Date(metrics.closedAt).toLocaleString('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Devam Ediyor (Açık)';

  const discrepancy = metrics.discrepancyTL ?? 0;
  const isShortage = metrics.discrepancyStatus === DISCREPANCY_STATUS.SHORTAGE;
  const isOverage = metrics.discrepancyStatus === DISCREPANCY_STATUS.OVERAGE;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm print:p-0 print:bg-white">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-2xl flex flex-col max-h-[92vh] overflow-hidden shadow-2xl print:border-none print:shadow-none print:w-full print:max-w-none print:max-h-none print:bg-white text-white print:text-black"
        >
          {/* Modal Header (Ekranda görünür, yazdırmada gizlenir) */}
          <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-gray-950/60 print:hidden">
            <div className="flex items-center gap-2">
              <FileText className="text-yellow-500" size={20} />
              <h2 className="text-sm font-bold text-white">Gün Sonu Z-Raporu Termal Fiş Önizleme</h2>
            </div>
            <div className="flex items-center gap-2">
              {/* 80mm / 58mm Geçiş Butonları */}
              <div className="bg-gray-800 p-0.5 rounded-lg flex items-center text-xs">
                <button
                  onClick={() => setIs58mm(false)}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                    !is58mm ? 'bg-yellow-500 text-black shadow' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  80mm Standart
                </button>
                <button
                  onClick={() => setIs58mm(true)}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                    is58mm ? 'bg-yellow-500 text-black shadow' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  58mm Dar Fiş
                </button>
              </div>

              <button
                onClick={onClose}
                className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Fiş İçeriği (Termal Kağıt Görünümü) */}
          <div className="flex-1 overflow-y-auto p-6 flex justify-center bg-gray-950/40 print:p-0 print:bg-white">
            <div
              id="printable-z-report-slip"
              className={`bg-white text-black p-6 rounded-lg shadow-xl font-mono text-xs transition-all duration-300 print:shadow-none print:p-2 ${
                is58mm ? 'w-[58mm] max-w-[280px] text-[11px]' : 'w-[80mm] max-w-[360px] text-xs'
              }`}
              style={{
                fontFamily: "'Courier New', Courier, monospace",
                lineHeight: 1.35,
              }}
            >
              {/* Başlık */}
              <div className="text-center pb-2 border-b border-dashed border-gray-400 mb-2">
                <p className="font-bold text-sm uppercase tracking-wider">{storeName}</p>
                <p className="font-black text-xs mt-1">*** GÜN SONU Z-RAPORU ***</p>
                <p className="text-[10px] text-gray-600 mt-0.5">{metrics.sessionNumber}</p>
              </div>

              {/* Oturum Bilgileri */}
              <div className="space-y-0.5 pb-2 border-b border-dashed border-gray-400 mb-2 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-gray-600">Açılış:</span>
                  <span className="font-semibold">{formattedOpenedDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Kapanış:</span>
                  <span className="font-semibold">{formattedClosedDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Kasiyer:</span>
                  <span className="font-semibold">{metrics.closedBy || metrics.openedBy || 'Genel'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Kasa Durumu:</span>
                  <span className="font-bold">{metrics.status === SESSION_STATUS.OPEN ? 'AÇIK' : 'KAPALI'}</span>
                </div>
              </div>

              {/* NAKİT KASA HAREKETLERİ */}
              <div className="pb-2 border-b border-dashed border-gray-400 mb-2">
                <p className="text-center font-bold text-[11px] mb-1.5 uppercase tracking-wide bg-gray-100 py-0.5">
                  --- NAKİT KASA AKIŞI ---
                </p>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span>Devir Açılış Kasası:</span>
                    <span className="font-bold">₺{metrics.openingCashTL.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-emerald-800 font-semibold">
                    <span>(+) Nakit Satışlar:</span>
                    <span>₺{metrics.cashSales.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-emerald-800 font-semibold">
                    <span>(+) Cari Tahsilatlar:</span>
                    <span>₺{metrics.customerCashCollections.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  {metrics.manualCashIn > 0 && (
                    <div className="flex justify-between text-emerald-800 font-semibold">
                      <span>(+) Manuel Girişler:</span>
                      <span>₺{metrics.manualCashIn.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-red-800 font-semibold">
                    <span>(-) Toptancı Ödemeleri:</span>
                    <span>₺{metrics.supplierCashPayments.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-red-800 font-semibold">
                    <span>(-) Hurda Alış Ödemeleri:</span>
                    <span>₺{metrics.scrapCashPurchases.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  {metrics.manualCashOut > 0 && (
                    <div className="flex justify-between text-red-800 font-semibold">
                      <span>(-) Manuel Masraf/Çıkış:</span>
                      <span>₺{metrics.manualCashOut.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* MUTABAKAT VE FİİLİ SAYIM */}
              <div className="pb-2 border-b border-dashed border-gray-400 mb-2">
                <div className="space-y-1">
                  <div className="flex justify-between font-bold">
                    <span>Beklenen Kasa Nakdi:</span>
                    <span>₺{metrics.systemCashTL.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>Sayılan Fiili Nakit:</span>
                    <span>₺{(metrics.countedCashTL ?? metrics.systemCashTL).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className={`flex justify-between font-black py-0.5 px-1 rounded ${
                    isShortage ? 'bg-red-100 text-red-800' : isOverage ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                  }`}>
                    <span>KASA FARKI:</span>
                    <span>
                      {discrepancy >= 0 ? '+' : ''}₺{discrepancy.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ({metrics.discrepancyStatus})
                    </span>
                  </div>
                </div>
              </div>

              {/* DİĞER KANALLAR & ALTIN HAREKETLERİ */}
              <div className="pb-2 border-b border-dashed border-gray-400 mb-2">
                <p className="text-center font-bold text-[11px] mb-1.5 uppercase tracking-wide bg-gray-100 py-0.5">
                  --- DİĞER HASILAT & ALTIN ---
                </p>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span>POS / Kredi Kartı:</span>
                    <span className="font-semibold">₺{metrics.cardSales.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Banka Havale / FAST:</span>
                    <span className="font-semibold">₺{metrics.bankSales.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Giren Hurda Altın:</span>
                    <span className="font-semibold">{metrics.scrapGoldGramsIn.toFixed(3)} gr</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Çıkan Has Altın:</span>
                    <span className="font-semibold">{metrics.supplierHasPaymentsGram.toFixed(3)} gr</span>
                  </div>
                </div>
              </div>

              {/* GÜNLÜK TOPLAM CİRO */}
              <div className="py-2 border-b-2 border-black mb-3">
                <div className="flex justify-between text-sm font-black">
                  <span>TOPLAM GÜNLÜK CİRO:</span>
                  <span>₺{metrics.totalTurnover.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              {/* İmza Alanı */}
              <div className="pt-2 pb-3 text-[10px]">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <p className="text-gray-600">Kasiyer İmza</p>
                    <p className="mt-5 border-b border-gray-400"></p>
                    <p className="text-[9px] mt-1 font-semibold">{metrics.closedBy || metrics.openedBy || 'Kasiyer'}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Mağaza Yetkilisi</p>
                    <p className="mt-5 border-b border-gray-400"></p>
                    <p className="text-[9px] mt-1 font-semibold">İmza / Onay</p>
                  </div>
                </div>
              </div>

              {/* Alt Bilgi */}
              <div className="text-center text-[9px] text-gray-500 pt-1 border-t border-dashed border-gray-300">
                <p>Mali Değeri Yoktur - Bilgi Fişidir</p>
                <p className="mt-0.5">kuyumpanel ERP Z-Raporu Sistemi</p>
              </div>
            </div>
          </div>

          {/* Modal Butonları (Yazdırmada gizlenir) */}
          <div className="p-4 border-t border-gray-800 flex items-center justify-between bg-gray-950/80 print:hidden">
            <button
              onClick={handleCopy}
              className="px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors"
            >
              {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              {copied ? 'Kopyalandı!' : 'Metni Kopyala'}
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-xs font-bold transition-colors"
              >
                Kapat
              </button>
              <button
                onClick={handlePrint}
                className="px-5 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-black rounded-xl text-xs font-black flex items-center gap-2 transition-all shadow-lg shadow-yellow-500/20"
              >
                <Printer size={16} />
                Termal Yazdır
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Yazdırma CSS Stilleri */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-z-report-slip,
          #printable-z-report-slip * {
            visibility: visible;
          }
          #printable-z-report-slip {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            max-width: none !important;
            padding: 0 !important;
            margin: 0 !important;
          }
        }
      `}</style>
    </AnimatePresence>
  );
}

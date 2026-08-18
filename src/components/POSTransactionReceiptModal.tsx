'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Printer, Copy, Check, FileText, Send, QrCode } from 'lucide-react';

export interface ReceiptItem {
  code: string;
  title: string;
  quantity: number;
  price: number;
  total: number;
  carat?: number;
  weight?: number;
  hasEquivalent?: number;
  type?: 'buy' | 'sell';
}

export interface ReceiptData {
  receiptNo: string;
  date: string | Date;
  customerName?: string;
  employeeName: string;
  paymentMethod: string;
  items: ReceiptItem[];
  subTotal: number;
  feeAmount?: number;
  total: number;
  totalHas?: number;
  paidAmount?: number;
  changeAmount?: number;
  isInfoOnly?: boolean;
}

interface POSTransactionReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  receiptData: ReceiptData | null;
  storeName?: string;
  storePhone?: string;
  storeAddress?: string;
  onConfirmAndSave?: () => Promise<void> | void;
}

export default function POSTransactionReceiptModal({
  isOpen,
  onClose,
  receiptData,
  storeName = 'KUYUMPANEL MÜCEVHERAT & SARRAFİYE',
  storePhone = '0 (212) 555 00 00',
  storeAddress = 'Kapalıçarşı No: 42 Fatih / İstanbul',
  onConfirmAndSave,
}: POSTransactionReceiptModalProps) {
  const [is58mm, setIs58mm] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!isOpen || !receiptData) return null;

  const dateStr = receiptData.date instanceof Date
    ? receiptData.date.toLocaleString('tr-TR')
    : new Date(receiptData.date).toLocaleString('tr-TR');

  const handlePrint = async () => {
    if (onConfirmAndSave) {
      setSaving(true);
      try {
        await onConfirmAndSave();
      } finally {
        setSaving(false);
      }
    }
    window.print();
  };

  const generatePlainText = () => {
    const width = is58mm ? 32 : 44;
    const sep = '='.repeat(width);
    const dash = '-'.repeat(width);

    let text = `${storeName}\n`;
    text += `${storeAddress}\nTel: ${storePhone}\n`;
    text += `${sep}\n`;
    text += `${receiptData.isInfoOnly ? 'BİLGİ FİŞİ' : 'SATIŞ İŞLEM FİŞİ'}\n`;
    text += `Fiş No : ${receiptData.receiptNo}\n`;
    text += `Tarih  : ${dateStr}\n`;
    text += `Kasiyer: ${receiptData.employeeName}\n`;
    if (receiptData.customerName) text += `Müşteri: ${receiptData.customerName}\n`;
    text += `${dash}\n`;
    text += `ÜRÜN                ADET     TUTAR\n`;
    text += `${dash}\n`;

    receiptData.items.forEach(item => {
      const name = (item.title || item.code).substring(0, 18).padEnd(18, ' ');
      const qty = `${item.quantity}`.padStart(4, ' ');
      const tot = `₺${Math.round(item.total).toLocaleString('tr-TR')}`.padStart(10, ' ');
      text += `${name} ${qty} ${tot}\n`;
      if (item.carat && item.weight) {
        text += `  (${item.carat}K • ${item.weight} gr)\n`;
      }
    });

    text += `${dash}\n`;
    text += `Ödeme Yöntemi: ${receiptData.paymentMethod}\n`;
    if (receiptData.totalHas) {
      text += `Has Karşılığı: ${receiptData.totalHas.toFixed(3)} gr Has\n`;
    }
    text += `GENEL TOPLAM : ₺${receiptData.total.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}\n`;
    text += `${sep}\n`;
    text += `Mali Değeri Yoktur - Bilgi Amaçlıdır\n`;
    text += `İyi Günlerde Kullanınız\n`;
    return text;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatePlainText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm print:p-0 print:bg-white">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-slate-900 border border-amber-500/30 rounded-2xl w-full max-w-xl flex flex-col max-h-[92vh] overflow-hidden shadow-2xl print:border-none print:shadow-none print:w-full print:max-w-none print:max-h-none print:bg-white text-slate-100 print:text-black"
        >
          {/* Modal Başlık (Ekranda görünür, yazdırmada gizlenir) */}
          <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80 print:hidden">
            <div className="flex items-center gap-2">
              <FileText className="text-amber-400" size={20} />
              <h2 className="text-sm font-bold text-white">
                {receiptData.isInfoOnly ? 'Bilgi Fişi Önizleme' : 'Satış Fişi / Termal Çıktı'}
              </h2>
            </div>

            <div className="flex items-center gap-2">
              {/* 80mm / 58mm Seçici */}
              <div className="bg-slate-800 p-0.5 rounded-lg flex items-center text-xs">
                <button
                  type="button"
                  onClick={() => setIs58mm(false)}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                    !is58mm ? 'bg-amber-500 text-black shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  80mm Termal
                </button>
                <button
                  type="button"
                  onClick={() => setIs58mm(true)}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                    is58mm ? 'bg-amber-500 text-black shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  58mm Dar Fiş
                </button>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* FİŞ GÖVDESİ (Hem ekran simülatörü hem de print şablonu) */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex justify-center bg-slate-950/60 print:bg-white print:p-0">
            <div
              id="printable-pos-receipt"
              className={`bg-white text-black p-4 sm:p-6 shadow-xl border border-gray-200 font-mono text-xs leading-tight print:shadow-none print:border-none print:p-2 ${
                is58mm ? 'w-[280px] text-[11px]' : 'w-[360px]'
              }`}
            >
              {/* Mağaza Başlığı */}
              <div className="text-center pb-3 border-b-2 border-dashed border-gray-400">
                <h1 className="font-extrabold text-sm sm:text-base tracking-tight uppercase">{storeName}</h1>
                <p className="text-[10px] text-gray-700 mt-1 font-sans">{storeAddress}</p>
                <p className="text-[10px] text-gray-700 font-sans">Tel: {storePhone}</p>
                <div className="mt-2 inline-block px-3 py-0.5 bg-black text-white font-sans font-bold text-[11px] rounded uppercase">
                  {receiptData.isInfoOnly ? 'BİLGİ FİŞİ' : 'SATIŞ İŞLEM FİŞİ'}
                </div>
              </div>

              {/* Fiş Üst Bilgileri */}
              <div className="py-2.5 border-b border-dashed border-gray-300 text-[11px] space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-600">Fiş No:</span>
                  <span className="font-bold font-mono">{receiptData.receiptNo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tarih / Saat:</span>
                  <span className="font-mono">{dateStr}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Kasiyer:</span>
                  <span className="font-bold">{receiptData.employeeName}</span>
                </div>
                {receiptData.customerName && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Müşteri / Not:</span>
                    <span className="font-bold">{receiptData.customerName}</span>
                  </div>
                )}
              </div>

              {/* Ürün Listesi Tablosu */}
              <div className="py-2 border-b-2 border-dashed border-gray-400">
                <div className="grid grid-cols-12 font-bold text-[10px] text-gray-600 pb-1 border-b border-gray-300">
                  <span className="col-span-6">ÜRÜN</span>
                  <span className="col-span-2 text-center">ADET</span>
                  <span className="col-span-4 text-right">TUTAR</span>
                </div>

                <div className="divide-y divide-gray-200 mt-1">
                  {receiptData.items.map((item, idx) => (
                    <div key={idx} className="py-1.5">
                      <div className="grid grid-cols-12 items-center font-bold">
                        <span className="col-span-6 truncate">{item.title || item.code}</span>
                        <span className="col-span-2 text-center font-mono">{item.quantity}</span>
                        <span className="col-span-4 text-right font-mono">
                          ₺{Math.round(item.total).toLocaleString('tr-TR')}
                        </span>
                      </div>
                      {(item.carat || item.weight) && (
                        <div className="text-[10px] text-gray-500 font-sans">
                          {item.carat ? `${item.carat} Ayar` : ''} {item.weight ? `• ${item.weight} gr` : ''}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Finansal Toplamlar */}
              <div className="py-2.5 border-b-2 border-dashed border-gray-400 space-y-1 text-[11px]">
                <div className="flex justify-between text-gray-600">
                  <span>Ara Toplam:</span>
                  <span className="font-mono">₺{receiptData.subTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
                </div>

                {receiptData.feeAmount ? (
                  <div className="flex justify-between text-gray-600">
                    <span>Kart Komisyonu:</span>
                    <span className="font-mono">₺{receiptData.feeAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
                  </div>
                ) : null}

                <div className="flex justify-between text-gray-600">
                  <span>Ödeme Türü:</span>
                  <span className="font-bold">{receiptData.paymentMethod}</span>
                </div>

                {receiptData.totalHas ? (
                  <div className="flex justify-between text-amber-800 font-bold">
                    <span>Has Altın Değeri:</span>
                    <span className="font-mono">{receiptData.totalHas.toFixed(3)} gr Has</span>
                  </div>
                ) : null}

                <div className="flex justify-between font-extrabold text-sm sm:text-base pt-1 border-t border-gray-300">
                  <span>GENEL TOPLAM:</span>
                  <span className="font-mono">₺{receiptData.total.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              {/* Barkod / QR ve Dipnot */}
              <div className="pt-3 text-center space-y-1">
                <p className="text-[9px] text-gray-500">Mali Değeri Yoktur - Bilgi Fişidir</p>
                <p className="text-[10px] font-bold">Bizi Tercih Ettiğiniz İçin Teşekkür Ederiz!</p>
                <div className="pt-1 flex justify-center text-gray-400">
                  <span className="font-mono text-[9px]">*{receiptData.receiptNo}*</span>
                </div>
              </div>
            </div>
          </div>

          {/* Modal Alt Aksiyon Butonları (Yazdırmada gizlenir) */}
          <div className="p-4 border-t border-slate-800 flex items-center justify-between bg-slate-950/90 print:hidden">
            <button
              type="button"
              onClick={handleCopy}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors"
            >
              {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              {copied ? 'Kopyalandı!' : 'Fiş Metnini Kopyala'}
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-colors"
              >
                Kapat
              </button>
              <button
                type="button"
                onClick={handlePrint}
                disabled={saving}
                className="px-5 py-2.5 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-black rounded-xl text-xs font-black flex items-center gap-2 transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50"
              >
                <Printer size={16} />
                {saving ? 'İşleniyor...' : 'Termal Yazdır'}
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Yazdırma CSS'i */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-pos-receipt,
          #printable-pos-receipt * {
            visibility: visible;
          }
          #printable-pos-receipt {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            max-width: none !important;
            padding: 4px !important;
            margin: 0 !important;
          }
        }
      `}</style>
    </AnimatePresence>
  );
}

'use client';

import React, { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Printer, Share2, Sparkles, Gem, ShieldCheck, Award } from 'lucide-react';
import { THEME } from '@/constants/theme';
import { generateWhatsAppShareUrl } from '@/lib/whatsapp';

export interface DiamondProductData {
  id: string;
  barcode: string;
  title: string;
  category?: string | null;
  carat: number; // Altın ayarı (örn: 14K, 18K)
  weight: number; // Toplam gramaj
  diamondCarat?: number | null; // ct
  diamondColor?: string | null;
  diamondClarity?: string | null;
  diamondCut?: string | null;
  certificateNo?: string | null;
  certificateOrg?: string | null;
  diamondStoneCount?: number | null;
  customerName?: string | null;
  customerPhone?: string | null;
  createdAt?: string | null;
}

interface DiamondCertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: DiamondProductData | null;
  storeName?: string;
}

export default function DiamondCertificateModal({
  isOpen,
  onClose,
  product,
  storeName = 'KuyumPanel Mücevherat',
}: DiamondCertificateModalProps) {
  const certRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !product) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleWhatsApp = () => {
    const certText = `💎 *${storeName.toUpperCase()} - MÜCEVHER GARANTİ SERTİFİKASI*\n\n` +
      `📌 *Ürün:* ${product.title || 'Pırlanta Mücevher'}\n` +
      `🏷️ *Barkod / Seri No:* ${product.barcode}\n` +
      `✨ *Pırlanta Karat:* ${product.diamondCarat ? `${product.diamondCarat} ct` : '-'}\n` +
      `🎨 *Renk (Color):* ${product.diamondColor || '-'}\n` +
      `🔍 *Berraklık (Clarity):* ${product.diamondClarity || '-'}\n` +
      `✂️ *Kesim (Cut):* ${product.diamondCut || 'Excellent'}\n` +
      `📜 *Sertifika No:* ${product.certificateNo || 'KP-' + product.barcode}\n` +
      `🏅 *Altın Ayarı & Gramaj:* ${product.carat} Ayar / ${product.weight} gr\n\n` +
      `✅ Bu mücevher ${storeName} tarafından ömür boyu bakım ve orijinallik garantisi altındadır.`;

    const url = generateWhatsAppShareUrl(product.customerPhone || '', certText);
    window.open(url, '_blank');
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-2xl bg-gray-950 border border-yellow-500/40 rounded-3xl shadow-2xl overflow-hidden my-8"
        >
          {/* Modal Üst Kontroller */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800/80 bg-gray-900/60">
            <div className="flex items-center gap-2">
              <Gem className="text-yellow-400 animate-pulse" size={20} />
              <span className="text-sm font-black text-white uppercase tracking-wider">
                Mücevher & Pırlanta Garanti Belgesi
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                className="px-3.5 py-1.5 bg-yellow-500 hover:bg-yellow-400 text-gray-950 font-extrabold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-yellow-500/20"
              >
                <Printer size={14} /> Yazdır
              </button>
              <button
                onClick={handleWhatsApp}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-emerald-600/20"
              >
                <Share2 size={14} /> WhatsApp
              </button>
              <button
                onClick={onClose}
                className="p-1.5 text-gray-400 hover:text-white rounded-xl bg-gray-800/60 hover:bg-gray-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* ─── SERTİFİKA BASKI ALANI ─── */}
          <div
            ref={certRef}
            id="diamond-certificate-print"
            className="p-8 sm:p-10 bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 border-8 border-double border-yellow-500/30 m-4 rounded-2xl relative overflow-hidden"
          >
            {/* Arka Plan Filigranı */}
            <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
              <Gem size={280} className="text-yellow-400" />
            </div>

            {/* Başlık ve Mağaza */}
            <div className="text-center relative z-10 mb-8 border-b border-yellow-500/30 pb-6">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 mb-3 shadow-inner">
                <Award size={24} />
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-yellow-400 to-amber-500 tracking-wider uppercase">
                {storeName}
              </h2>
              <p className="text-[11px] font-bold tracking-[0.25em] text-gray-400 uppercase mt-1">
                Certificate of Authenticity & Diamond Guarantee
              </p>
            </div>

            {/* Ürün & Barkod Başlığı */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6 relative z-10 bg-yellow-500/5 p-4 rounded-2xl border border-yellow-500/20">
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Ürün Tanımı</span>
                <span className="text-base sm:text-lg font-black text-white">{product.title || 'Özel Tasarım Pırlanta Mücevher'}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Sertifika & Barkod No</span>
                <span className="text-sm font-mono font-black text-yellow-400">{product.certificateNo || product.barcode}</span>
              </div>
            </div>

            {/* 4C PIRLANTA ÖZELLİKLERİ TABLOSU */}
            <div className="relative z-10 mb-8">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={16} className="text-yellow-400" />
                <h4 className="text-xs font-black text-white uppercase tracking-wider">Pırlanta 4C Değerlendirme Raporu</h4>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-gray-900/80 border border-yellow-500/20 p-3.5 rounded-xl text-center">
                  <span className="text-[10px] font-extrabold text-gray-400 uppercase block mb-1">Karat (Carat)</span>
                  <span className="text-base sm:text-lg font-black text-yellow-400 font-mono">
                    {product.diamondCarat ? `${product.diamondCarat} ct` : '-'}
                  </span>
                </div>
                <div className="bg-gray-900/80 border border-yellow-500/20 p-3.5 rounded-xl text-center">
                  <span className="text-[10px] font-extrabold text-gray-400 uppercase block mb-1">Renk (Color)</span>
                  <span className="text-base sm:text-lg font-black text-white font-mono">
                    {product.diamondColor || 'F-G'}
                  </span>
                </div>
                <div className="bg-gray-900/80 border border-yellow-500/20 p-3.5 rounded-xl text-center">
                  <span className="text-[10px] font-extrabold text-gray-400 uppercase block mb-1">Berraklık (Clarity)</span>
                  <span className="text-base sm:text-lg font-black text-white font-mono">
                    {product.diamondClarity || 'VS-SI'}
                  </span>
                </div>
                <div className="bg-gray-900/80 border border-yellow-500/20 p-3.5 rounded-xl text-center">
                  <span className="text-[10px] font-extrabold text-gray-400 uppercase block mb-1">Kesim (Cut)</span>
                  <span className="text-base sm:text-lg font-black text-emerald-400 font-mono">
                    {product.diamondCut || 'Excellent'}
                  </span>
                </div>
              </div>
            </div>

            {/* MADEN VE METAL DETAYLARI */}
            <div className="relative z-10 grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8 text-xs bg-gray-900/40 p-4 rounded-xl border border-gray-800">
              <div>
                <span className="text-gray-500 block text-[10px] uppercase font-bold">Maden & Ayar:</span>
                <span className="text-white font-black">{product.carat} Ayar Altın</span>
              </div>
              <div>
                <span className="text-gray-500 block text-[10px] uppercase font-bold">Toplam Ağırlık:</span>
                <span className="text-white font-black font-mono">{product.weight} gr</span>
              </div>
              <div>
                <span className="text-gray-500 block text-[10px] uppercase font-bold">Taş Adedi:</span>
                <span className="text-white font-black">{product.diamondStoneCount || 1} Adet</span>
              </div>
            </div>

            {/* Mühür & Güvence İmzası */}
            <div className="relative z-10 flex items-end justify-between pt-6 border-t border-yellow-500/30 text-xs">
              <div className="flex items-center gap-3">
                <ShieldCheck size={32} className="text-emerald-400 shrink-0" />
                <div>
                  <span className="font-bold text-white block">Orijinallik & Garanti Güvencesi</span>
                  <span className="text-gray-400 text-[10px]">
                    Tarih: {new Date().toLocaleDateString('tr-TR')}
                  </span>
                </div>
              </div>

              <div className="text-right">
                <div className="w-32 h-10 border-b border-gray-600 mb-1 flex items-end justify-center text-[10px] text-gray-500 italic">
                  Yetkili Kaşe & İmza
                </div>
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{storeName}</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

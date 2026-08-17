'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Truck,
  X,
  Send,
  Printer,
  AlertTriangle,
  PackageCheck,
  Building,
  Phone,
  Layers,
  ChevronRight,
  Plus,
  Minus,
  RefreshCw,
  FileText
} from 'lucide-react';
import { THEME, ANIM } from '@/constants/theme';
import { MESSAGES } from '@/constants/messages';
import { ROUTES } from '@/constants/routes';
import { generateWhatsAppWholesaleOrderUrl, type WhatsAppWholesaleOrderItem } from '@/lib/whatsapp';
import type { ReorderDraftItem } from '@/lib/stocks/analytics';
import CriticalStockBadge from './CriticalStockBadge';

// ─── Tipler ───────────────────────────────────────────────────────────────────

interface ReorderDraftModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialItems?: ReorderDraftItem[];
  hasGoldPrice?: number;
}

export default function ReorderDraftModal({
  isOpen,
  onClose,
  initialItems,
  hasGoldPrice = 3000,
}: ReorderDraftModalProps) {
  const [items, setItems] = useState<ReorderDraftItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [supplierName, setSupplierName] = useState('Kapalıçarşı Darphane / Toptancı');
  const [supplierPhone, setSupplierPhone] = useState('');
  const [orderNote, setOrderNote] = useState('');
  const [isCopied, setIsCopied] = useState(false);

  // Verileri API'den veya initialItems'dan çek
  const fetchReorderDraft = async () => {
    setLoading(true);
    try {
      const res = await fetch(ROUTES.API_STOCKS_REORDER);
      if (res.ok) {
        const data = await res.json();
        if (data.items) {
          setItems(data.items);
        }
      }
    } catch (e) {
      console.error('Reorder fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      if (initialItems && initialItems.length > 0) {
        setItems(initialItems);
      } else {
        fetchReorderDraft();
      }
    }
  }, [isOpen, initialItems]);

  // Miktar güncelleme
  const handleUpdateQuantity = (productCode: string, delta: number) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.productCode === productCode) {
          const newQty = Math.max(1, item.suggestedQuantity + delta);
          return { ...item, suggestedQuantity: newQty };
        }
        return item;
      })
    );
  };

  // Kalem silme
  const handleRemoveItem = (productCode: string) => {
    setItems((prev) => prev.filter((item) => item.productCode !== productCode));
  };

  // WhatsApp Sipariş Linki Üret & Aç
  const handleSendWhatsAppOrder = () => {
    if (items.length === 0) return;

    const wholesaleItems: WhatsAppWholesaleOrderItem[] = items.map((i) => ({
      productCode: i.productCode,
      label: i.label,
      quantity: i.suggestedQuantity,
      unit: i.unit,
      currentStock: i.currentAmount,
      minThreshold: i.minThreshold,
      estimatedHasWeight: i.productCode.includes('24Ayar')
        ? i.suggestedQuantity * 1.0
        : i.productCode.includes('22Ayar') || i.productCode.includes('Burma')
        ? i.suggestedQuantity * 0.916
        : i.productCode.includes('14Ayar')
        ? i.suggestedQuantity * 0.585
        : i.productCode.includes('CEYREK')
        ? i.suggestedQuantity * 1.605
        : undefined,
    }));

    const url = generateWhatsAppWholesaleOrderUrl({
      phone: supplierPhone.trim() || undefined,
      supplierName: supplierName.trim() || 'Tedarikçi Firma',
      items: wholesaleItems,
      orderNote: orderNote.trim() || undefined,
    });

    window.open(url, '_blank');
  };

  // Yazdır / PDF Görünümü
  const handlePrintReorderList = () => {
    window.print();
  };

  if (!isOpen) return null;

  const totalQuantity = items.reduce((sum, item) => sum + item.suggestedQuantity, 0);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          {...ANIM.SCALE_UP}
          className="w-full max-w-3xl bg-gray-900 border border-yellow-500/30 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
        >
          {/* MODAL BAŞLIĞI */}
          <div className="px-6 py-4 bg-gray-950 border-b border-gray-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-yellow-500/10 border border-yellow-500/30 rounded-xl text-yellow-400">
                <Truck size={22} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  {MESSAGES.REORDER_TITLE}
                  <span className="text-xs font-mono px-2 py-0.5 bg-red-500/20 text-red-400 border border-red-500/30 rounded-full">
                    {items.length} Kritik Kalem
                  </span>
                </h3>
                <p className="text-xs text-gray-400">
                  Minimum eşik altına düşen sarrafiye ve ziynet stokları için otomatik ikmal siparişi
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={fetchReorderDraft}
                disabled={loading}
                title="Yenile"
                className="p-2 bg-gray-800 hover:bg-gray-700 rounded-xl text-gray-300 transition-colors disabled:opacity-50"
              >
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              </button>
              <button
                onClick={onClose}
                className="p-2 bg-gray-800 hover:bg-gray-700 rounded-xl text-gray-300 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* MODAL GÖVDESİ */}
          <div className="p-6 overflow-y-auto space-y-6 flex-1">
            {/* TEDARİKÇİ BİLGİ FORMU */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-950/60 rounded-2xl border border-gray-800/80">
              <div>
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                  <Building size={13} className="text-yellow-500" /> Tedarikçi / Atölye Adı
                </label>
                <input
                  type="text"
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  placeholder="Örn: Kapalıçarşı Darphane, Ahlatçı..."
                  className="w-full px-3.5 py-2.5 bg-gray-900 border border-gray-800 rounded-xl text-xs text-white focus:outline-none focus:border-yellow-500/50"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                  <Phone size={13} className="text-emerald-400" /> WhatsApp Telefon Numarası
                </label>
                <input
                  type="text"
                  value={supplierPhone}
                  onChange={(e) => setSupplierPhone(e.target.value)}
                  placeholder="0532 123 45 67 (İsteğe bağlı)"
                  className="w-full px-3.5 py-2.5 bg-gray-900 border border-gray-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-yellow-500/50"
                />
              </div>
            </div>

            {/* SİPARİŞ KALEMLERİ TABLOSU */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-gray-400 px-2 uppercase tracking-wider">
                <span>Ürün & Mevcut Durum</span>
                <span>Önerilen Sipariş Miktarı</span>
              </div>

              {loading ? (
                <div className="p-8 text-center text-gray-400 text-xs">
                  Kritik stok verileri taranıyor...
                </div>
              ) : items.length === 0 ? (
                <div className="p-8 text-center bg-emerald-500/5 border border-emerald-500/20 rounded-2xl text-emerald-400 text-xs font-bold">
                  ✓ Tüm stok seviyeleri güvenli eşik değerlerinin üzerinde. İkmal gerektiren ürün bulunmuyor.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {items.map((item) => (
                    <div
                      key={item.productCode}
                      className="p-4 bg-gray-950/70 hover:bg-gray-950 border border-gray-800/80 rounded-2xl flex items-center justify-between gap-4 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h4 className="text-sm font-bold text-white truncate">{item.label}</h4>
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-gray-800 text-gray-300">
                            {item.productCode}
                          </span>
                          <CriticalStockBadge amount={item.currentAmount} minThreshold={item.minThreshold} size="sm" />
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-400 font-mono">
                          <span>Mevcut: <strong className="text-white">{item.currentAmount}</strong> {item.unit}</span>
                          <span>•</span>
                          <span>Kritik Eşik: <strong className="text-amber-400">{item.minThreshold}</strong></span>
                          {item.dailyVelocity > 0 && (
                            <>
                              <span>•</span>
                              <span>Hız: {item.dailyVelocity.toFixed(1)}/gün</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* MİKTAR AYARLAMA KONTROLÜ */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleUpdateQuantity(item.productCode, -1)}
                          className="w-8 h-8 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white flex items-center justify-center transition-colors"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="w-12 text-center text-sm font-bold font-mono text-yellow-400">
                          {item.suggestedQuantity}
                        </span>
                        <button
                          onClick={() => handleUpdateQuantity(item.productCode, 1)}
                          className="w-8 h-8 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white flex items-center justify-center transition-colors"
                        >
                          <Plus size={14} />
                        </button>

                        <button
                          onClick={() => handleRemoveItem(item.productCode)}
                          title="Listeden Çıkar"
                          className="p-2 text-gray-500 hover:text-red-400 rounded-xl transition-colors ml-1"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* SİPARİŞ NOTU */}
            <div>
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">
                Sipariş Ek Notu (Opsiyonel)
              </label>
              <textarea
                rows={2}
                value={orderNote}
                onChange={(e) => setOrderNote(e.target.value)}
                placeholder="Örn: Acil teslimat rica olunur, yeni tarihli çeyrekler tercih edilir..."
                className="w-full px-3.5 py-2.5 bg-gray-950/60 border border-gray-800 rounded-xl text-xs text-white focus:outline-none focus:border-yellow-500/50"
              />
            </div>
          </div>

          {/* MODAL ALTI AKSİYONLAR */}
          <div className="px-6 py-4 bg-gray-950 border-t border-gray-800 flex items-center justify-between gap-4 flex-wrap">
            <div className="text-xs text-gray-400">
              Toplam: <strong className="text-white text-sm">{items.length}</strong> kalem /{' '}
              <strong className="text-yellow-400 text-sm">{totalQuantity}</strong> adet
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handlePrintReorderList}
                disabled={items.length === 0}
                className="px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-200 hover:text-white font-bold text-xs rounded-xl flex items-center gap-2 transition-colors disabled:opacity-40"
              >
                <Printer size={15} /> Yazdır / PDF
              </button>

              <button
                onClick={handleSendWhatsAppOrder}
                disabled={items.length === 0}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Send size={15} /> {MESSAGES.WA_SEND_ORDER}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

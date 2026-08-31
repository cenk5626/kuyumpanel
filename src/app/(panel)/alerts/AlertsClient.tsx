'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BellRing,
  Plus,
  Trash2,
  Share2,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Zap,
  Clock,
  Phone,
  Volume2,
  X,
} from 'lucide-react';
import { THEME } from '@/constants/theme';
import { MESSAGES } from '@/constants/messages';
import HeaderActions from '@/components/HeaderActions';
import { generateWhatsAppShareUrl } from '@/lib/whatsapp';

interface PriceAlertItem {
  id: string;
  productCode: string;
  productLabel: string;
  targetPrice: number;
  priceType: 'bid' | 'ask';
  condition: 'GTE' | 'LTE';
  phone?: string | null;
  isActive: boolean;
  isTriggered: boolean;
  triggeredAt?: string | null;
  lastCheckedPrice?: number | null;
  notes?: string | null;
  createdAt: string;
}

const AVAILABLE_PRODUCTS = [
  { code: 'HAS', label: 'Has Altın (24K / 0.995)' },
  { code: 'ECEYREKTL', label: 'Eski Çeyrek Altın' },
  { code: 'YCEYREKTL', label: 'Yeni Çeyrek Altın' },
  { code: 'mil22Ayar', label: '22 Ayar Bilezik (gr)' },
  { code: 'USDTRY', label: 'Amerikan Doları (USD/TRY)' },
  { code: 'EURTRY', label: 'Euro (EUR/TRY)' },
  { code: 'EYARIMTL', label: 'Eski Yarım Altın' },
  { code: 'ETAMTL', label: 'Eski Tam Altın' },
  { code: 'EATATL', label: 'Ata Lira (Cumhuriyet)' },
];

export default function AlertsClient() {
  const [alerts, setAlerts] = useState<PriceAlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [selectedProduct, setSelectedProduct] = useState('HAS');
  const [priceType, setPriceType] = useState<'bid' | 'ask'>('bid');
  const [condition, setCondition] = useState<'GTE' | 'LTE'>('GTE');
  const [targetPrice, setTargetPrice] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/alerts');
      if (res.ok) {
        const data = await res.json();
        setAlerts(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 15000); // 15 saniyede bir kontrol
    return () => clearInterval(interval);
  }, []);

  const handleCreateAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetPrice || Number(targetPrice) <= 0) return;

    try {
      setSubmitting(true);
      const productObj = AVAILABLE_PRODUCTS.find((p) => p.code === selectedProduct);
      const productLabel = `${productObj?.label || selectedProduct} (${priceType === 'bid' ? 'Bozma/Alış' : 'Satış'})`;

      const res = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productCode: selectedProduct,
          productLabel,
          targetPrice: Number(targetPrice),
          priceType,
          condition,
          phone,
          notes,
        }),
      });

      if (res.ok) {
        setIsModalOpen(false);
        setTargetPrice('');
        setNotes('');
        await fetchAlerts();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (alert: PriceAlertItem) => {
    try {
      await fetch('/api/alerts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: alert.id,
          isActive: !alert.isActive,
          isTriggered: false,
        }),
      });
      fetchAlerts();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu fiyat alarmını silmek istediğinize emin misiniz?')) return;
    try {
      await fetch(`/api/alerts?id=${id}`, { method: 'DELETE' });
      fetchAlerts();
    } catch (e) {
      console.error(e);
    }
  };

  const handleSendWhatsAppNotification = (alert: PriceAlertItem) => {
    const text = `🔔 *KUYUMPANEL FİYAT ALARMI TETİKLENDİ!*\n\n` +
      `📌 *Ürün:* ${alert.productLabel}\n` +
      `🎯 *Hedeflenen Eşik:* ₺${alert.targetPrice.toLocaleString('tr-TR')} (${alert.condition === 'GTE' ? '≥ Eşit veya Üstü' : '≤ Eşit veya Altı'})\n` +
      `⚡ *Güncel Fiyat:* ₺${(alert.lastCheckedPrice || alert.targetPrice).toLocaleString('tr-TR')}\n` +
      `⏰ *Tarih:* ${new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}\n\n` +
      `KuyumPanel Canlı Takip Sistemi`;

    const url = generateWhatsAppShareUrl(alert.phone || '', text);
    window.open(url, '_blank');
  };

  const playTestChime = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch (e) {
      console.error(e);
    }
  };

  const triggeredCount = alerts.filter((a) => a.isTriggered && a.isActive).length;

  return (
    <>
      <header className={THEME.HEADER}>
        <div className="flex justify-between items-center w-full flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 rounded-2xl">
              <BellRing size={22} className={triggeredCount > 0 ? 'animate-bounce' : ''} />
            </div>
            <div>
              <h1 className={THEME.HEADER_TITLE}>{MESSAGES.ALERTS_TITLE}</h1>
              <p className="text-gray-400 text-xs mt-0.5">{MESSAGES.ALERTS_SUBTITLE}</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsModalOpen(true)}
              className={THEME.BTN_PRIMARY}
            >
              <Plus size={16} /> {MESSAGES.ALERTS_ADD_BUTTON}
            </button>
            <HeaderActions />
          </div>
        </div>
      </header>

      <div className={`${THEME.PAGE_WRAPPER} space-y-6`}>
        {/* Tetiklenen Alarmlar Uyarı Bandı */}
        {triggeredCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-gradient-to-r from-red-500/20 via-yellow-500/10 to-transparent border border-red-500/40 rounded-2xl flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3">
              <Zap size={24} className="text-red-400 animate-pulse" />
              <div>
                <h3 className="text-sm font-black text-white">
                  {triggeredCount} Adet Fiyat Alarmı Tetiklendi!
                </h3>
                <p className="text-xs text-gray-300">
                  Piyasa hedeflediğiniz eşik seviyelerine ulaştı. WhatsApp ile bildirim gönderebilirsiniz.
                </p>
              </div>
            </div>
            <button
              onClick={playTestChime}
              className="px-3 py-1.5 bg-red-500 hover:bg-red-400 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors shrink-0"
            >
              <Volume2 size={14} /> Ses Çal
            </button>
          </motion.div>
        )}

        {/* Alarm Kartları Izgarası */}
        {loading && alerts.length === 0 ? (
          <div className="text-center py-16 text-gray-500 text-sm">
            <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-yellow-400" />
            Alarmlar yükleniyor...
          </div>
        ) : alerts.length === 0 ? (
          <div className={`${THEME.GLASS_CARD} p-12 text-center text-gray-400`}>
            <BellRing size={48} className="mx-auto mb-3 text-yellow-500/40" />
            <h3 className="text-base font-bold text-white mb-1">Henüz Kurulu Fiyat Alarmınız Yok</h3>
            <p className="text-xs text-gray-500 max-w-md mx-auto mb-4">
              Has Altın, Çeyrek veya Döviz kurları belirlediğiniz seviyeye geldiğinde haberdar olmak için yeni bir alarm tanımlayın.
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className={THEME.BTN_PRIMARY}
            >
              <Plus size={16} /> İlk Alarmı Kur
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {alerts.map((alert) => (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`${THEME.GLASS_CARD} p-5 relative overflow-hidden border ${
                  alert.isTriggered && alert.isActive
                    ? 'border-red-500/60 bg-red-500/[0.04] shadow-lg shadow-red-500/10'
                    : alert.isActive
                    ? 'border-yellow-500/30'
                    : 'border-gray-800 opacity-60'
                }`}
              >
                {/* Durum Rozeti */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1.5">
                    {alert.isTriggered && alert.isActive ? (
                      <span className="px-2.5 py-0.5 bg-red-500/20 text-red-400 border border-red-500/40 text-[10px] font-black rounded-full flex items-center gap-1 animate-pulse">
                        <Zap size={11} /> TETİKLENDİ
                      </span>
                    ) : alert.isActive ? (
                      <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-black rounded-full flex items-center gap-1">
                        <CheckCircle2 size={11} /> AKTİF İZLENİYOR
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 bg-gray-800 text-gray-400 text-[10px] font-bold rounded-full">
                        DURAKLATILDI
                      </span>
                    )}
                  </div>

                  <span className="text-[10px] font-mono text-gray-500 flex items-center gap-1">
                    <Clock size={11} />
                    {new Date(alert.createdAt).toLocaleDateString('tr-TR')}
                  </span>
                </div>

                {/* Ürün & Hedef */}
                <h3 className="text-base font-black text-white mb-2">{alert.productLabel}</h3>

                <div className="bg-gray-950/60 p-3.5 rounded-2xl border border-gray-800/80 mb-4 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-400">Hedef Eşik:</span>
                    <span className="font-mono font-black text-base text-yellow-400 flex items-center gap-1">
                      {alert.condition === 'GTE' ? (
                        <ArrowUpRight size={14} className="text-emerald-400" />
                      ) : (
                        <ArrowDownRight size={14} className="text-red-400" />
                      )}
                      ₺{alert.targetPrice.toLocaleString('tr-TR')}
                    </span>
                  </div>

                  {alert.lastCheckedPrice && (
                    <div className="flex justify-between items-center text-xs border-t border-gray-800/60 pt-2">
                      <span className="text-gray-500">Son Okunan Kur:</span>
                      <span className="font-mono font-bold text-white">
                        ₺{alert.lastCheckedPrice.toLocaleString('tr-TR')}
                      </span>
                    </div>
                  )}
                </div>

                {alert.notes && (
                  <p className="text-xs text-gray-400 italic mb-4">"{alert.notes}"</p>
                )}

                {/* Butonlar */}
                <div className="flex items-center justify-between gap-2 pt-3 border-t border-gray-800/80">
                  <button
                    onClick={() => handleToggleActive(alert)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                      alert.isActive
                        ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    }`}
                  >
                    {alert.isActive ? 'Duraklat' : 'Aktif Et'}
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleSendWhatsAppNotification(alert)}
                      title="WhatsApp ile Bildir"
                      className="p-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl transition-all"
                    >
                      <Share2 size={15} />
                    </button>
                    <button
                      onClick={() => handleDelete(alert.id)}
                      title="Sil"
                      className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl transition-all"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* YENİ ALARM MODALI */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-gray-950 border border-yellow-500/30 rounded-3xl p-6 shadow-2xl relative"
            >
              <div className="flex items-center justify-between mb-6 pb-3 border-b border-gray-800">
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <BellRing className="text-yellow-400" size={18} /> Yeni Fiyat Alarmı Kur
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 text-gray-400 hover:text-white rounded-lg"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreateAlert} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Ürün / Varlık</label>
                  <select
                    value={selectedProduct}
                    onChange={(e) => setSelectedProduct(e.target.value)}
                    className={THEME.INPUT}
                  >
                    {AVAILABLE_PRODUCTS.map((p) => (
                      <option key={p.code} value={p.code} className="bg-gray-900 text-white">
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">İşlem Yönü</label>
                    <select
                      value={priceType}
                      onChange={(e) => setPriceType(e.target.value as any)}
                      className={THEME.INPUT}
                    >
                      <option value="bid" className="bg-gray-900 text-white">Alış / Bozma</option>
                      <option value="ask" className="bg-gray-900 text-white">Satış</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Koşul</label>
                    <select
                      value={condition}
                      onChange={(e) => setCondition(e.target.value as any)}
                      className={THEME.INPUT}
                    >
                      <option value="GTE" className="bg-gray-900 text-white">≥ Eşit veya Üstü</option>
                      <option value="LTE" className="bg-gray-900 text-white">≤ Eşit veya Altı</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-yellow-400 uppercase mb-1">Hedef Eşik Fiyatı (TL)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="Örn: 6600"
                    value={targetPrice}
                    onChange={(e) => setTargetPrice(e.target.value)}
                    className={`${THEME.INPUT} font-mono font-bold text-base`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">WhatsApp Bildirim Numarası</label>
                  <input
                    type="tel"
                    placeholder="05xxxxxxxxx (Mağaza Yetkilisi)"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className={THEME.INPUT}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Hatırlatma Notu</label>
                  <input
                    type="text"
                    placeholder="Örn: Bozma için toptancıyla iletişime geç"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className={THEME.INPUT}
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-800">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className={THEME.BTN_SECONDARY}
                  >
                    İptal
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className={THEME.BTN_PRIMARY}
                  >
                    {submitting ? 'Kaydediliyor...' : 'Alarmı Oluştur'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ScanBarcode, Camera, Sparkles, Shield, Clock,
  DollarSign, Euro, Gem, Weight, Hash, Tag, CircleDot
} from 'lucide-react';
import { ROUTES } from '@/constants/routes';
import { THEME } from '@/constants/theme';
import CameraScannerModal from '@/components/CameraScannerModal';

/* ── Sabitler ── */
const PRICE_REFRESH_INTERVAL_MS = 10_000;

/** LivePrice tablosundaki kayıt ID'leri */
const LIVE_PRICE_IDS = {
  HAS_ALTIN: 'GAUTRY',
  USD_TRY: 'USDTRY',
  EUR_TRY: 'EURTRY',
} as const;

const CARAT_LABELS: Record<number, string> = {
  24: '24 Ayar (Has)',
  22: '22 Ayar',
  18: '18 Ayar',
  14: '14 Ayar',
  8: '8 Ayar',
};

interface ProductData {
  barcode: string;
  title: string;
  category: string | null;
  subType: string | null;
  subSubType: string | null;
  carat: number;
  weight: number;
  sellingMilyem: number | null;
  costMilyem: number;
  laborMilyem: number;
  size: string | null;
  status: string;
}

interface LivePrice {
  id: string;
  label: string;
  bid: number;
  ask: number;
}

export default function PriceCheckClient() {
  /* ── State ── */
  const [product, setProduct] = useState<ProductData | null>(null);
  const [livePrices, setLivePrices] = useState<LivePrice[]>([]);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const barcodeRef = useRef<HTMLInputElement>(null);

  /* ── Fiyat verilerini çek ── */
  const fetchPrices = useCallback(async () => {
    try {
      const res = await fetch(ROUTES.API_PRICES_LIVE);
      if (res.ok) {
        const data: LivePrice[] = await res.json();
        setLivePrices(data);
      }
    } catch { /* sessiz hata */ }
  }, []);

  useEffect(() => {
    fetchPrices();
    const interval = setInterval(fetchPrices, PRICE_REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchPrices]);

  /* ── Sürekli Odak — Mouse olmadan çalışabilmesi için ── */
  useEffect(() => {
    const keepFocus = () => {
      if (!showCamera && barcodeRef.current && document.activeElement !== barcodeRef.current) {
        barcodeRef.current.focus();
      }
    };
    keepFocus();
    const interval = setInterval(keepFocus, 500);
    return () => clearInterval(interval);
  }, [showCamera]);

  /* ── Hesaplamalar ── */
  const getPrice = (id: string): number => {
    const item = livePrices.find(p => p.id === id);
    return item?.ask || 0;
  };

  const hasPrice = getPrice(LIVE_PRICE_IDS.HAS_ALTIN);
  const usdTry = getPrice(LIVE_PRICE_IDS.USD_TRY);
  const eurTry = getPrice(LIVE_PRICE_IDS.EUR_TRY);

  const calcSellingPrice = (prod: ProductData): number => {
    const milyem = prod.sellingMilyem ?? (prod.costMilyem + prod.laborMilyem);
    const gramPrice = hasPrice * milyem;
    return gramPrice * prod.weight;
  };

  /* ── Barkod Sorgulama ── */
  const handleBarcodeSearch = async (barcode: string) => {
    if (!barcode.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/products?barcode=${encodeURIComponent(barcode.trim())}`);
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Ürün bulunamadı.');
        setProduct(null);
        return;
      }
      const item: ProductData = await res.json();
      if (item.status !== 'IN_STOCK') {
        setError('Bu ürün stokta mevcut değil.');
        setProduct(null);
        return;
      }
      setProduct(item);
      setError(null);
    } catch {
      setError('Bağlantı hatası. Lütfen tekrar deneyin.');
      setProduct(null);
    } finally {
      setLoading(false);
      setBarcodeInput('');
      // Barkod alanını hemen temizle ve odakla — yeni okutma için hazır
      setTimeout(() => barcodeRef.current?.focus(), 50);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleBarcodeSearch(barcodeInput);
    }
  };

  const handleCameraScan = (barcode: string) => {
    setShowCamera(false);
    handleBarcodeSearch(barcode);
  };

  /* ── Format Helpers ── */
  const formatCurrency = (val: number) =>
    val.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="min-h-[calc(100vh-64px)] flex flex-col">

      {/* ── ÜST CANLI FİYAT TICKER ── */}
      <div className="bg-gray-900/90 backdrop-blur-xl border-b border-yellow-900/20 px-4 py-3">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-6">
            {/* Has Altın */}
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
              <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Has Altın</span>
              <span className="text-sm font-bold text-yellow-400">
                {hasPrice > 0 ? `₺${formatCurrency(hasPrice)}/gr` : 'Bağlanıyor...'}
              </span>
            </div>
            {/* USD */}
            <div className="flex items-center gap-2">
              <DollarSign size={14} className="text-green-400" />
              <span className="text-xs text-gray-500 font-semibold">USD/TRY</span>
              <span className="text-sm font-bold text-green-400">
                {usdTry > 0 ? `₺${formatCurrency(usdTry)}` : '—'}
              </span>
            </div>
            {/* EUR */}
            <div className="flex items-center gap-2">
              <Euro size={14} className="text-blue-400" />
              <span className="text-xs text-gray-500 font-semibold">EUR/TRY</span>
              <span className="text-sm font-bold text-blue-400">
                {eurTry > 0 ? `₺${formatCurrency(eurTry)}` : '—'}
              </span>
            </div>
          </div>
          <div className="text-xs text-gray-600">
            <Clock size={12} className="inline mr-1" />
            {new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>

      {/* ── SABİT BARKOD OKUTMA ÜST ALANI ── */}
      <div className="bg-gray-900/70 backdrop-blur-md border-b border-gray-800/60 px-4 py-4">
        <div className="max-w-2xl mx-auto">
          <div className="relative">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-yellow-500/10 via-amber-500/10 to-yellow-500/10 blur-lg" />
            <div className="relative flex items-center gap-3">
              <div className="flex-1 relative">
                <ScanBarcode size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-yellow-500/60" />
                <input
                  ref={barcodeRef}
                  type="text"
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value.toUpperCase())}
                  onKeyDown={handleKeyDown}
                  placeholder="Barkod okutun veya yazın..."
                  className="w-full pl-12 pr-4 py-4 bg-gray-950/80 border-2 border-yellow-500/20 rounded-2xl text-white text-lg font-mono placeholder-gray-600 focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-500/20 transition-all"
                  autoFocus
                  autoComplete="off"
                />
                {loading && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <span className="w-5 h-5 border-2 border-yellow-500/30 border-t-yellow-500 rounded-full animate-spin block" />
                  </div>
                )}
              </div>
              <button
                onClick={() => setShowCamera(true)}
                className={`${THEME.BTN_SECONDARY} px-4 py-4 rounded-2xl`}
                title="Kamera ile Barkod Okut"
              >
                <Camera size={20} />
              </button>
            </div>
          </div>
          {/* Hata Mesajı */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm text-center"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── ANA İÇERİK ── */}
      <div className="flex-1 flex items-center justify-center p-6">
        <AnimatePresence mode="wait">
          {!product ? (
            /* ─── KARŞILAMA EKRANI ─── */
            <motion.div
              key="welcome"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3 }}
              className="text-center"
            >
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                className="mx-auto mb-6"
              >
                <div className="w-32 h-32 mx-auto rounded-3xl bg-gradient-to-br from-yellow-500/15 to-amber-600/5 border border-yellow-500/20 flex items-center justify-center">
                  <ScanBarcode size={64} className="text-yellow-500/40" />
                </div>
              </motion.div>
              <h1 className="text-3xl font-bold text-white/80 mb-2">Fiyat Sorgulama</h1>
              <p className="text-gray-500 text-lg">Ürün barkodunu okutun</p>
            </motion.div>
          ) : (
            /* ─── ÜRÜN FİYAT KARTI ─── */
            <motion.div
              key={`product-${product.barcode}`}
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="w-full max-w-2xl"
            >
              {/* Ana Kart */}
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-900 via-gray-900/95 to-gray-950 border border-yellow-500/20 shadow-2xl shadow-black/40">
                {/* Altın Üst Çizgi */}
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-600" />
                <div className="absolute -top-20 -right-20 w-40 h-40 bg-yellow-500/5 rounded-full blur-3xl" />
                <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-amber-500/5 rounded-full blur-3xl" />

                <div className="relative p-8">
                  {/* Ürün Bilgileri */}
                  <div className="mb-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Tag size={14} className="text-yellow-500" />
                          <span className="text-xs text-gray-500 font-mono uppercase tracking-widest">Barkod</span>
                        </div>
                        <p className="text-lg font-mono font-bold text-yellow-400 tracking-wider">{product.barcode}</p>
                      </div>
                      <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                        <span className="text-emerald-400 text-xs font-bold">STOKTA</span>
                      </div>
                    </div>

                    {/* Ürün Detay Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <DetailCard
                        icon={<Gem size={16} className="text-yellow-400" />}
                        label="Kategori"
                        value={[product.category, product.subType, product.subSubType].filter(Boolean).join(' / ') || 'Genel'}
                      />
                      <DetailCard
                        icon={<CircleDot size={16} className="text-amber-400" />}
                        label="Ayar"
                        value={CARAT_LABELS[product.carat] || `${product.carat} Ayar`}
                      />
                      <DetailCard
                        icon={<Weight size={16} className="text-cyan-400" />}
                        label="Ağırlık"
                        value={`${product.weight.toFixed(2)} gr`}
                      />
                      <DetailCard
                        icon={<Hash size={16} className="text-purple-400" />}
                        label="Has Çarpanı"
                        value={(product.sellingMilyem ?? (product.costMilyem + product.laborMilyem)).toFixed(3)}
                      />
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="h-px bg-gradient-to-r from-transparent via-yellow-500/30 to-transparent my-6" />

                  {/* ── ANA FİYAT ── */}
                  <div className="text-center mb-6">
                    <p className="text-xs text-gray-500 font-semibold uppercase tracking-widest mb-2">
                      Satış Fiyatı
                    </p>
                    <motion.div
                      initial={{ scale: 0.8 }}
                      animate={{ scale: 1 }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                    >
                      <p className="text-5xl sm:text-6xl font-black bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500 bg-clip-text text-transparent tracking-tight leading-none">
                        ₺{formatCurrency(calcSellingPrice(product))}
                      </p>
                    </motion.div>
                    <p className="text-xs text-gray-600 mt-2">
                      Has Fiyat: ₺{formatCurrency(hasPrice)}/gr × {(product.sellingMilyem ?? (product.costMilyem + product.laborMilyem)).toFixed(3)} × {product.weight.toFixed(2)} gr
                    </p>
                  </div>

                  {/* ── DÖVİZ KARŞILIKLARI ── */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* USD */}
                    <div className="bg-gray-950/60 rounded-2xl border border-gray-800/80 p-4 text-center">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <div className="w-6 h-6 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center">
                          <DollarSign size={13} className="text-green-400" />
                        </div>
                        <span className="text-xs text-gray-500 font-semibold uppercase">Dolar Karşılığı</span>
                      </div>
                      <p className="text-2xl font-bold text-green-400">
                        {usdTry > 0 ? `$${formatCurrency(calcSellingPrice(product) / usdTry)}` : '—'}
                      </p>
                      <p className="text-[10px] text-gray-600 mt-1">1 USD = ₺{formatCurrency(usdTry)}</p>
                    </div>
                    {/* EUR */}
                    <div className="bg-gray-950/60 rounded-2xl border border-gray-800/80 p-4 text-center">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <div className="w-6 h-6 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center">
                          <Euro size={13} className="text-blue-400" />
                        </div>
                        <span className="text-xs text-gray-500 font-semibold uppercase">Euro Karşılığı</span>
                      </div>
                      <p className="text-2xl font-bold text-blue-400">
                        {eurTry > 0 ? `€${formatCurrency(calcSellingPrice(product) / eurTry)}` : '—'}
                      </p>
                      <p className="text-[10px] text-gray-600 mt-1">1 EUR = ₺{formatCurrency(eurTry)}</p>
                    </div>
                  </div>

                  {/* Güven Notu */}
                  <div className="mt-6 flex items-center justify-center gap-2 text-[11px] text-gray-600">
                    <Shield size={12} className="text-yellow-600" />
                    <span>Fiyatlar canlı altın piyasası verilerine göre anlık hesaplanmaktadır.</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Kamera Modal ── */}
      <CameraScannerModal
        isOpen={showCamera}
        onClose={() => { setShowCamera(false); setTimeout(() => barcodeRef.current?.focus(), 100); }}
        onScan={handleCameraScan}
      />
    </div>
  );
}

/* ── Yardımcı Detay Kartı Bileşeni ── */
function DetailCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-gray-950/50 rounded-xl border border-gray-800/60 p-3">
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-sm font-bold text-white truncate" title={value}>{value}</p>
    </div>
  );
}

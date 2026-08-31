'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClipboardCheck,
  ScanBarcode,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Scale,
  RefreshCw,
  Printer,
  History,
  Sparkles,
  Search,
  Volume2,
  Trash2,
  FileSpreadsheet,
} from 'lucide-react';
import { THEME } from '@/constants/theme';
import { MESSAGES } from '@/constants/messages';
import HeaderActions from '@/components/HeaderActions';

interface InventoryProduct {
  id: string;
  barcode: string;
  title: string;
  category?: string;
  subType?: string;
  carat: number;
  weight: number;
  costPrice?: number;
}

export default function StockAuditClient() {
  const [scope, setScope] = useState<'ALL' | 'CATEGORY'>('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [categories, setCategories] = useState<string[]>([]);
  const [expectedInventory, setExpectedInventory] = useState<InventoryProduct[]>([]);
  const [scannedBarcodes, setScannedBarcodes] = useState<string[]>([]);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pastSessions, setPastSessions] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'counting' | 'missing' | 'counted' | 'history'>('counting');

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Sesli Geribildirim Çalma (Beep)
  const playBeep = (isSuccess = true) => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = isSuccess ? 'sine' : 'sawtooth';
      osc.frequency.setValueAtTime(isSuccess ? 1200 : 300, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch (e) {
      console.error(e);
    }
  };

  // Envanteri ve Geçmiş Sayımları Çek
  const fetchInventory = async (cat = selectedCategory) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/stocks/audit?fetchInventory=true&category=${cat}`);
      if (res.ok) {
        const data = await res.json();
        setExpectedInventory(data.products || []);

        // Kategorileri ayıkla
        const cats = Array.from(
          new Set((data.products || []).map((p: any) => p.category).filter(Boolean))
        ) as string[];
        setCategories(cats);
      }

      const histRes = await fetch('/api/stocks/audit');
      if (histRes.ok) {
        setPastSessions(await histRes.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const handleCategoryChange = (cat: string) => {
    setSelectedCategory(cat);
    fetchInventory(cat);
    setScannedBarcodes([]); // Yeni kategori sayımı için listeyi temizle
  };

  // Barkod Okutma Tetikleyicisi
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = barcodeInput.trim().toUpperCase();
    if (!code) return;

    if (scannedBarcodes.includes(code)) {
      playBeep(false); // Zaten taranmış uyarısı
    } else {
      setScannedBarcodes((prev) => [code, ...prev]);
      playBeep(true);
    }

    setBarcodeInput('');
    barcodeInputRef.current?.focus();
  };

  // Mutabakat Hesaplamaları
  const expectedMap = new Map(expectedInventory.map((p) => [p.barcode, p]));
  const scannedSet = new Set(scannedBarcodes);

  let countedWeight = 0;
  let surplusCount = 0;
  const countedList: InventoryProduct[] = [];
  const missingList: InventoryProduct[] = [];

  scannedBarcodes.forEach((code) => {
    const item = expectedMap.get(code);
    if (item) {
      countedWeight += item.weight || 0;
      countedList.push(item);
    } else {
      surplusCount++;
    }
  });

  expectedInventory.forEach((p) => {
    if (!scannedSet.has(p.barcode)) {
      missingList.push(p);
    }
  });

  const expectedWeight = expectedInventory.reduce((acc, p) => acc + (p.weight || 0), 0);
  const weightDiff = Number((countedWeight - expectedWeight).toFixed(3));

  // Sayımı Kaydet
  const handleSaveAudit = async () => {
    if (scannedBarcodes.length === 0) {
      alert('Lütfen en az bir ürün okutunuz.');
      return;
    }

    if (missingList.length > 0) {
      if (!confirm(`Dikkat: Vitrinde ${missingList.length} adet eksik ürün tespit edildi. Sayımı tamamlayıp kaydetmek istiyor musunuz?`)) {
        return;
      }
    }

    try {
      setSaving(true);
      const res = await fetch('/api/stocks/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scope: selectedCategory === 'ALL' ? 'ALL' : 'CATEGORY',
          categoryFilter: selectedCategory === 'ALL' ? null : selectedCategory,
          scannedBarcodes,
          notes: `${selectedCategory === 'ALL' ? 'Tüm Vitrin' : selectedCategory} sayımı tamamlandı.`,
        }),
      });

      if (res.ok) {
        alert('Sayım raporu başarıyla kaydedildi.');
        fetchInventory();
        setActiveTab('history');
      }
    } catch (e) {
      console.error(e);
      alert('Sayım kaydedilirken bir hata oluştu.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <header className={THEME.HEADER}>
        <div className="flex justify-between items-center w-full flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 rounded-2xl">
              <ClipboardCheck size={22} />
            </div>
            <div>
              <h1 className={THEME.HEADER_TITLE}>{MESSAGES.AUDIT_TITLE}</h1>
              <p className="text-gray-400 text-xs mt-0.5">{MESSAGES.AUDIT_SUBTITLE}</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => window.print()}
              className={`${THEME.BTN_SECONDARY} gap-2 text-xs`}
            >
              <Printer size={14} /> Yazdır
            </button>
            <HeaderActions />
          </div>
        </div>
      </header>

      <div className={`${THEME.PAGE_WRAPPER} space-y-6`}>
        {/* ─── KAPSAM VE KATEGORİ SEÇİMİ ─── */}
        <div className={`${THEME.GLASS_CARD} p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4`}>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mr-2">Sayım Kapsamı:</span>
            <button
              onClick={() => handleCategoryChange('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                selectedCategory === 'ALL'
                  ? 'bg-yellow-500 text-gray-950 shadow-md shadow-yellow-500/20'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              Tüm Vitrin ({expectedInventory.length})
            </button>

            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => handleCategoryChange(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  selectedCategory === cat
                    ? 'bg-yellow-500 text-gray-950 shadow-md shadow-yellow-500/20'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveAudit}
              disabled={saving || scannedBarcodes.length === 0}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-gray-950 font-black text-xs rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/20"
            >
              <CheckCircle2 size={16} />
              {saving ? 'Kaydediliyor...' : 'Sayımı Onayla & Kaydet'}
            </button>
          </div>
        </div>

        {/* ─── CANLI SAYIM & BARKOD TARAYICI GİRİŞİ ─── */}
        <div className={`${THEME.GLASS_CARD} p-6 border-2 border-yellow-500/30 bg-gradient-to-r from-gray-950 via-gray-900 to-yellow-950/10`}>
          <form onSubmit={handleBarcodeSubmit} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <ScanBarcode size={22} className="absolute left-4 top-1/2 -translate-y-1/2 text-yellow-400" />
              <input
                ref={barcodeInputRef}
                type="text"
                autoFocus
                placeholder="Barkod okutunuz veya yazıp Enter'a basınız..."
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 bg-gray-950 border border-yellow-500/40 rounded-2xl text-white font-mono font-bold text-base sm:text-lg focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 shadow-inner"
              />
            </div>
            <button
              type="submit"
              className="px-6 py-3.5 bg-yellow-500 hover:bg-yellow-400 text-gray-950 font-black text-sm rounded-2xl flex items-center justify-center gap-2 transition-all shadow-md shadow-yellow-500/20 shrink-0"
            >
              <ScanBarcode size={18} /> Okut
            </button>
          </form>
        </div>

        {/* ─── ANLIK MUTABAKAT ÖZET KARTLARI ─── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Beklenen Adet */}
          <div className={`${THEME.STAT_CARD} border-l-4 border-l-blue-500`}>
            <span className={THEME.STAT_LABEL}>Vitrinde Olması Gereken</span>
            <h3 className={THEME.STAT_VALUE}>{expectedInventory.length} Adet</h3>
            <p className="text-xs text-gray-500 font-mono mt-1">{expectedWeight.toFixed(2)} gr Toplam</p>
          </div>

          {/* Fiilen Sayılan */}
          <div className={`${THEME.STAT_CARD} border-l-4 border-l-emerald-500`}>
            <span className={THEME.STAT_LABEL}>Fiilen Sayılan</span>
            <h3 className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">
              {scannedBarcodes.length} Adet
            </h3>
            <p className="text-xs text-emerald-400 font-mono mt-1">{countedWeight.toFixed(2)} gr Sayıldı</p>
          </div>

          {/* Eksik / Kayıp Şüphesi */}
          <div className={`${THEME.STAT_CARD} border-l-4 border-l-red-500 bg-red-500/[0.02]`}>
            <span className={THEME.STAT_LABEL}>Eksik / Kayıp Şüphesi</span>
            <h3 className={`text-2xl sm:text-3xl font-black font-mono ${missingList.length > 0 ? 'text-red-400 animate-pulse' : 'text-gray-400'}`}>
              {missingList.length} Adet
            </h3>
            <p className="text-xs text-red-400 font-mono mt-1">
              {missingList.length > 0 ? '🚨 Vitrinde bulunamadı!' : 'Tüm ürünler tam'}
            </p>
          </div>

          {/* Gram Farkı */}
          <div className={`${THEME.STAT_CARD} border-l-4 border-l-amber-500`}>
            <span className={THEME.STAT_LABEL}>Gramaj Mutabakat Farkı</span>
            <h3 className="text-2xl sm:text-3xl font-black text-white font-mono">
              {weightDiff > 0 ? `+${weightDiff}` : weightDiff} gr
            </h3>
            <p className="text-xs text-gray-500 font-mono mt-1">
              {weightDiff === 0 ? 'Tam mutabakat' : weightDiff < 0 ? 'Gramaj eksiği var' : 'Fazla gramaj'}
            </p>
          </div>
        </div>

        {/* ─── SEKMELİ DETAY TABLOSU ─── */}
        <div className="flex gap-2 border-b border-gray-800 pb-2">
          <button
            onClick={() => setActiveTab('counting')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'counting'
                ? 'bg-yellow-500 text-gray-950'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Aktif Sayım Akışı ({scannedBarcodes.length})
          </button>
          <button
            onClick={() => setActiveTab('missing')}
            className={`px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all ${
              activeTab === 'missing'
                ? 'bg-red-500 text-white shadow-md shadow-red-500/20'
                : 'text-red-400 hover:text-red-300'
            }`}
          >
            <AlertTriangle size={14} /> Eksik Ürünler ({missingList.length})
          </button>
          <button
            onClick={() => setActiveTab('counted')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'counted'
                ? 'bg-emerald-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Eşleşen Ürünler ({countedList.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'history'
                ? 'bg-purple-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <History size={14} className="inline mr-1" /> Geçmiş Sayım Raporları ({pastSessions.length})
          </button>
        </div>

        {/* TAB 1: AKTİF BARKOD AKIŞI */}
        {activeTab === 'counting' && (
          <div className={`${THEME.GLASS_CARD} overflow-hidden`}>
            <div className="p-4 border-b border-gray-800 flex justify-between items-center">
              <span className="text-xs font-bold text-gray-400">Son Okutulan Barkodlar</span>
              {scannedBarcodes.length > 0 && (
                <button
                  onClick={() => setScannedBarcodes([])}
                  className="text-xs text-red-400 hover:underline flex items-center gap-1"
                >
                  <Trash2 size={12} /> Listeyi Temizle
                </button>
              )}
            </div>

            {scannedBarcodes.length === 0 ? (
              <div className="p-12 text-center text-gray-500 text-xs">
                Barkod tabancası ile ürünleri peş peşe okutmaya başlayınız.
              </div>
            ) : (
              <div className="p-4 flex flex-wrap gap-2 max-h-96 overflow-y-auto">
                {scannedBarcodes.map((code, idx) => {
                  const match = expectedMap.get(code);
                  return (
                    <span
                      key={idx}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono text-xs font-bold border ${
                        match
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'
                      }`}
                    >
                      <CheckCircle2 size={13} />
                      {code} {match ? `(${match.weight} gr)` : '(Kayıt Dışı)'}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: EKSİK ÜRÜNLER (KAYIP RİSKİ) */}
        {activeTab === 'missing' && (
          <div className={`${THEME.GLASS_CARD} overflow-hidden border-2 border-red-500/30`}>
            <div className="p-4 bg-red-500/10 border-b border-red-500/20 flex items-center justify-between">
              <span className="text-xs font-black text-red-400 uppercase flex items-center gap-2">
                <AlertTriangle size={16} /> Vitrinde Bulunamayan / Kayıp Riski Olan Ürünler
              </span>
              <span className="text-xs font-mono font-bold text-red-300">
                Toplam {missingList.length} adet eksik
              </span>
            </div>

            {missingList.length === 0 ? (
              <div className="p-12 text-center text-emerald-400 text-sm font-bold flex flex-col items-center gap-2">
                <CheckCircle2 size={36} />
                Harika! Vitrinde hiçbir eksik ürün bulunmuyor, tüm takılar eksiksiz sayıldı.
              </div>
            ) : (
              <div className={THEME.TABLE.WRAPPER}>
                <table className={THEME.TABLE.MAIN}>
                  <thead className={THEME.TABLE.THEAD}>
                    <tr>
                      <th className={THEME.TABLE.TH}>Barkod</th>
                      <th className={THEME.TABLE.TH}>Ürün Başlığı</th>
                      <th className={THEME.TABLE.TH}>Kategori</th>
                      <th className={THEME.TABLE.TH}>Ayar</th>
                      <th className={THEME.TABLE.TH}>Gramaj</th>
                      <th className={THEME.TABLE.TH}>Maliyet</th>
                    </tr>
                  </thead>
                  <tbody>
                    {missingList.map((p) => (
                      <tr key={p.id} className="border-b border-gray-800/40 bg-red-500/[0.02] hover:bg-red-500/[0.06]">
                        <td className="px-4 py-3 font-mono font-black text-red-400">{p.barcode}</td>
                        <td className="px-4 py-3 font-bold text-white">{p.title || p.category}</td>
                        <td className="px-4 py-3 text-gray-400">{p.category} / {p.subType || '-'}</td>
                        <td className="px-4 py-3 font-mono text-yellow-500">{p.carat}K</td>
                        <td className="px-4 py-3 font-mono font-bold text-white">{p.weight} gr</td>
                        <td className="px-4 py-3 font-mono text-gray-400">₺{(p.costPrice || 0).toLocaleString('tr-TR')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: EŞLEŞEN VE SAYILAN ÜRÜNLER */}
        {activeTab === 'counted' && (
          <div className={`${THEME.GLASS_CARD} overflow-hidden`}>
            <div className={THEME.TABLE.WRAPPER}>
              <table className={THEME.TABLE.MAIN}>
                <thead className={THEME.TABLE.THEAD}>
                  <tr>
                    <th className={THEME.TABLE.TH}>Barkod</th>
                    <th className={THEME.TABLE.TH}>Ürün Başlığı</th>
                    <th className={THEME.TABLE.TH}>Kategori</th>
                    <th className={THEME.TABLE.TH}>Ayar</th>
                    <th className={THEME.TABLE.TH}>Gramaj</th>
                  </tr>
                </thead>
                <tbody>
                  {countedList.map((p) => (
                    <tr key={p.id} className="border-b border-gray-800/40 hover:bg-yellow-500/5">
                      <td className="px-4 py-3 font-mono font-black text-emerald-400">{p.barcode}</td>
                      <td className="px-4 py-3 font-bold text-white">{p.title || p.category}</td>
                      <td className="px-4 py-3 text-gray-400">{p.category}</td>
                      <td className="px-4 py-3 font-mono text-yellow-500">{p.carat}K</td>
                      <td className="px-4 py-3 font-mono font-bold text-white">{p.weight} gr</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: GEÇMİŞ SAYIM RAPORLARI */}
        {activeTab === 'history' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {pastSessions.map((session) => (
              <div key={session.id} className={`${THEME.GLASS_CARD} p-5 space-y-3`}>
                <div className="flex justify-between items-center">
                  <span className="font-mono font-black text-yellow-400 text-sm">{session.sessionNumber}</span>
                  <span className="text-[10px] text-gray-500 font-mono">
                    {new Date(session.createdAt).toLocaleString('tr-TR')}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs bg-gray-950/60 p-3 rounded-xl border border-gray-800">
                  <div>
                    <span className="text-gray-500 block text-[10px]">Beklenen:</span>
                    <span className="font-bold text-white">{session.totalExpected} adet</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[10px]">Sayılan:</span>
                    <span className="font-bold text-emerald-400">{session.totalCounted} adet</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[10px]">Eksik:</span>
                    <span className={`font-bold ${session.totalMissing > 0 ? 'text-red-400' : 'text-gray-400'}`}>
                      {session.totalMissing} adet
                    </span>
                  </div>
                </div>

                <p className="text-xs text-gray-400">{session.notes}</p>
                <div className="text-[10px] text-gray-500">Sayımı Yapan: {session.auditedBy}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

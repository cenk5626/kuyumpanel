'use client';

import React, { useState, useMemo } from 'react';
import {
  History,
  TrendingUp,
  Download,
  RefreshCw,
  Calendar,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Sparkles,
  Layers,
} from 'lucide-react';
import { TRACKED_RATE_PRODUCTS } from '@/constants/history-rates';
import { sanitizeCsvCell } from '@/lib/security/masking';

interface SnapshotItem {
  id: string;
  productCode: string;
  label: string;
  bid: number;
  ask: number;
  currency: string;
  source?: string | null;
}

interface PriceSnapshot {
  id: string;
  capturedAt: string;
  captureSlotKey: string;
  source: string;
  status: string;
  items: SnapshotItem[];
}

interface MilyemItem {
  id: string;
  code: string;
  label: string;
  value: number;
  unit: string;
}

interface MilyemSnapshot {
  id: string;
  capturedAt: string;
  captureSlotKey: string;
  source: string;
  items: MilyemItem[];
}

interface Props {
  initialSnapshots: PriceSnapshot[];
  initialMilyemSnapshots: MilyemSnapshot[];
}

export default function HistoryRatesClient({
  initialSnapshots,
  initialMilyemSnapshots,
}: Props) {
  const [activeTab, setActiveTab] = useState<'RATES' | 'MILYEM'>('RATES');
  const [snapshots, setSnapshots] = useState<PriceSnapshot[]>(initialSnapshots);
  const [milyemSnapshots, setMilyemSnapshots] = useState<MilyemSnapshot[]>(initialMilyemSnapshots);
  const [selectedProduct, setSelectedProduct] = useState<string>('HAS_ALTIN');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Filtrelenmiş fiyat satırları
  const filteredRows = useMemo(() => {
    const rows: Array<{
      snapshotId: string;
      capturedAt: string;
      slotKey: string;
      source: string;
      item: SnapshotItem;
    }> = [];

    snapshots.forEach((snap) => {
      const snapDate = new Date(snap.capturedAt);
      if (startDate && snapDate < new Date(startDate)) return;
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (snapDate > end) return;
      }

      snap.items.forEach((item) => {
        if (selectedProduct === 'ALL' || item.productCode === selectedProduct) {
          rows.push({
            snapshotId: snap.id,
            capturedAt: snap.capturedAt,
            slotKey: snap.captureSlotKey,
            source: snap.source,
            item,
          });
        }
      });
    });

    return rows;
  }, [snapshots, selectedProduct, startDate, endDate]);

  // Zaman serisi grafik verisi (Seçili ürünün alış fiyatı)
  const chartData = useMemo(() => {
    const productRows = filteredRows
      .filter((r) => r.item.productCode === selectedProduct)
      .slice(0, 30)
      .reverse();

    if (productRows.length === 0) return null;

    const bids = productRows.map((r) => r.item.bid);
    const minBid = Math.min(...bids);
    const maxBid = Math.max(...bids);
    const range = maxBid - minBid || 1;

    const points = productRows.map((r, idx) => {
      const x = (idx / Math.max(1, productRows.length - 1)) * 100;
      const y = 100 - ((r.item.bid - minBid) / range) * 80 - 10;
      return {
        x,
        y,
        bid: r.item.bid,
        ask: r.item.ask,
        dateStr: new Date(r.capturedAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
      };
    });

    return { points, minBid, maxBid, count: productRows.length };
  }, [filteredRows, selectedProduct]);

  // Manuel anlık snapshot alma
  const handleCaptureSnapshot = async () => {
    setIsCapturing(true);
    setMessage(null);
    try {
      const res = await fetch('/api/prices/snapshots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Snapshot alınamadı.');

      if (data.isNew) {
        setSnapshots((prev) => [data.snapshot, ...prev]);
        setMessage({ text: `Yeni 30 dk snapshot alındı (Slot: ${data.slotKey})`, type: 'success' });
      } else {
        setMessage({ text: `Mevcut slot (${data.slotKey}) zaten kayıtlı, mükerrer oluşturulmadı.`, type: 'success' });
      }
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setIsCapturing(false);
    }
  };

  // Güvenli CSV dışa aktarımı
  const handleExportCsv = () => {
    const headers = ['Zaman', 'Slot_Anahtari', 'Urun_Kodu', 'Urun_Adi', 'Alis_Fiyati', 'Satis_Fiyati', 'Kaynak'];
    const lines = filteredRows.map((r) => [
      sanitizeCsvCell(new Date(r.capturedAt).toLocaleString('tr-TR')),
      sanitizeCsvCell(r.slotKey),
      sanitizeCsvCell(r.item.productCode),
      sanitizeCsvCell(r.item.label),
      sanitizeCsvCell(r.item.bid),
      sanitizeCsvCell(r.item.ask),
      sanitizeCsvCell(r.source),
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...lines.map((l) => l.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `kuyumpanel_gecmis_kurlar_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Üst Başlık & Eylemler */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900/80 p-5 rounded-2xl border border-slate-200 dark:border-amber-500/20 shadow-sm backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <History className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              Geçmiş Kurlar & Milyem Geçmişi
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Her 30 dakikada bir otomatik snapshot ile kur ve milyem zaman serisi analizi
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCaptureSnapshot}
            disabled={isCapturing}
            className="flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold text-sm transition-all shadow-md active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isCapturing ? 'animate-spin' : ''}`} />
            <span>{isCapturing ? 'Alınıyor...' : 'Anlık Snapshot Al'}</span>
          </button>

          <button
            onClick={handleExportCsv}
            className="flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-750 dark:text-slate-200 font-medium text-sm transition-all border border-slate-200 dark:border-slate-700 active:scale-95"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Dışa Aktar (CSV)</span>
          </button>
        </div>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl text-sm font-medium border flex items-center justify-between ${
            message.type === 'success'
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
              : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
          }`}
        >
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="text-xs opacity-75 hover:opacity-100">✕</button>
        </div>
      )}

      {/* Sekmeler */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-4">
        <button
          onClick={() => setActiveTab('RATES')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'RATES'
              ? 'border-amber-500 text-amber-600 dark:text-amber-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Altın & Döviz Kurları</span>
        </button>
        <button
          onClick={() => setActiveTab('MILYEM')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'MILYEM'
              ? 'border-amber-500 text-amber-600 dark:text-amber-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Milyem Değerleri</span>
        </button>
      </div>

      {activeTab === 'RATES' ? (
        <div className="space-y-6">
          {/* Filtre Barı */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Ürün Seçimi</label>
              <select
                value={selectedProduct}
                onChange={(e) => setSelectedProduct(e.target.value)}
                className="w-full h-11 px-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              >
                <option value="ALL">Tüm Ürünler</option>
                {TRACKED_RATE_PRODUCTS.map((p) => (
                  <option key={p.code} value={p.code}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Başlangıç Tarihi</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full h-11 px-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Bitiş Tarihi</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full h-11 px-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />
            </div>
          </div>

          {/* Çizgi Grafik (SVG Time Series) */}
          {chartData && (
            <div className="bg-white dark:bg-slate-900/80 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {TRACKED_RATE_PRODUCTS.find((p) => p.code === selectedProduct)?.label || selectedProduct} Alış Trendi
                  </h3>
                  <p className="text-xs text-slate-400">Son {chartData.count} kayıtlık zaman serisi</p>
                </div>
                <div className="flex items-center gap-3 text-xs font-medium">
                  <span className="text-emerald-500 flex items-center">
                    En Yüksek: ₺{chartData.maxBid.toLocaleString('tr-TR')}
                  </span>
                  <span className="text-rose-500 flex items-center">
                    En Düşük: ₺{chartData.minBid.toLocaleString('tr-TR')}
                  </span>
                </div>
              </div>

              <div className="h-44 w-full relative">
                <svg className="w-full h-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <polyline
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    className="text-amber-500"
                    points={chartData.points.map((p) => `${p.x},${p.y}`).join(' ')}
                  />
                  {chartData.points.map((p, idx) => (
                    <circle
                      key={idx}
                      cx={p.x}
                      cy={p.y}
                      r="1.5"
                      className="fill-amber-500 stroke-white dark:stroke-slate-900 stroke-[0.8]"
                    />
                  ))}
                </svg>
              </div>
            </div>
          )}

          {/* Geçmiş Veri Tablosu */}
          <div className="bg-white dark:bg-slate-900/80 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 text-xs uppercase font-semibold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-5 py-3.5">Zaman (Slot)</th>
                    <th className="px-5 py-3.5">Ürün</th>
                    <th className="px-5 py-3.5 text-right">Alış (TL)</th>
                    <th className="px-5 py-3.5 text-right">Satış (TL)</th>
                    <th className="px-5 py-3.5 text-right">Makas</th>
                    <th className="px-5 py-3.5 text-center">Kaynak</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-8 text-center text-slate-400">
                        Kriterlere uygun geçmiş fiyat kaydı bulunamadı.
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((row, idx) => {
                      const spread = row.item.ask - row.item.bid;
                      return (
                        <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="px-5 py-3 text-xs font-mono text-slate-600 dark:text-slate-300">
                            <div>{new Date(row.capturedAt).toLocaleString('tr-TR')}</div>
                            <div className="text-[10px] text-slate-400 font-normal">{row.slotKey}</div>
                          </td>
                          <td className="px-5 py-3 font-medium text-slate-900 dark:text-slate-100">
                            {row.item.label}
                          </td>
                          <td className="px-5 py-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                            ₺{row.item.bid.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-5 py-3 text-right font-bold text-slate-900 dark:text-slate-100">
                            ₺{row.item.ask.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-5 py-3 text-right text-xs text-slate-500">
                            ₺{spread.toFixed(2)}
                          </td>
                          <td className="px-5 py-3 text-center">
                            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                              {row.source}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Milyem Geçmişi Görünümü */
        <div className="bg-white dark:bg-slate-900/80 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 text-xs uppercase font-semibold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-5 py-3.5">Zaman (Slot)</th>
                  <th className="px-5 py-3.5">Ayar / Kalem</th>
                  <th className="px-5 py-3.5 text-right">Milyem Değeri</th>
                  <th className="px-5 py-3.5 text-center">Kaynak</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {milyemSnapshots.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-center text-slate-400">
                      Kayıtlı milyem geçmişi bulunamadı.
                    </td>
                  </tr>
                ) : (
                  milyemSnapshots.flatMap((ms) =>
                    ms.items.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-5 py-3 text-xs font-mono text-slate-600 dark:text-slate-300">
                          {new Date(ms.capturedAt).toLocaleString('tr-TR')}
                        </td>
                        <td className="px-5 py-3 font-medium text-slate-900 dark:text-slate-100">
                          {item.label}
                        </td>
                        <td className="px-5 py-3 text-right font-bold text-amber-600 dark:text-amber-400">
                          {item.value} {item.unit}
                        </td>
                        <td className="px-5 py-3 text-center">
                          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {ms.source}
                          </span>
                        </td>
                      </tr>
                    ))
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

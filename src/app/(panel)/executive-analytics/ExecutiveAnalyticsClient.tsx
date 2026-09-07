'use client';

import React, { useState } from 'react';
import {
  TrendingUp,
  LineChart,
  Boxes,
  AlertTriangle,
  Clock,
  CheckCircle2,
  DollarSign,
  Package,
  Layers,
  Settings,
  ArrowRight,
  Sparkles,
  ShoppingBag,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import {
  STOCK_VELOCITY_CATEGORY,
  STOCK_VELOCITY_LABELS,
  ANALYTICS_PERIOD_OPTIONS,
  StockVelocityCategory,
} from '@/constants/executive-analytics';

interface ExecutiveAnalyticsClientProps {
  initialData: {
    stats: {
      totalSalesRevenueTl: number;
      totalSalesHasGr: number;
      deadStockCount: number;
      fastMovingCount: number;
      slowMovingCount: number;
      normalCount: number;
      totalDeadCapitalTl: number;
    };
    profitability: Array<{
      category: string;
      totalRevenueTl: number;
      totalHasSold: number;
      estimatedHasProfit: number;
      estimatedTlProfit: number;
      marginPercent: number;
    }>;
    evaluatedItems: any[];
    settings: {
      safetyStockDays: number;
      leadTimeDays: number;
      analysisPeriodDays: number;
      deadStockThresholdDays: number;
      targetMarginPercent: number;
    };
  };
}

export default function ExecutiveAnalyticsClient({ initialData }: ExecutiveAnalyticsClientProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'aging' | 'forecast'>('overview');
  const [data, setData] = useState(initialData);
  const [velocityFilter, setVelocityFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Ayarlar Modalı
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [safetyDays, setSafetyDays] = useState(data.settings?.safetyStockDays || 14);
  const [leadDays, setLeadDays] = useState(data.settings?.leadTimeDays || 7);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Ayarları Güncelle
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    try {
      const res = await fetch('/api/analytics/demand-forecast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          safetyStockDays: safetyDays,
          leadTimeDays: leadDays,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);

      setData((prev) => ({
        ...prev,
        settings: result.settings,
      }));
      setShowSettingsModal(false);
      alert('Tahmin parametreleri başarıyla güncellendi!');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Tükenme riski ve sipariş önerisi olan ürünler
  const itemsNeedingReorder = data.evaluatedItems.filter(
    (i) => i.suggestedReorderQuantity > 0 || i.velocityCategory === STOCK_VELOCITY_CATEGORY.FAST_MOVING
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Üst Başlık & Eylemler */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <LineChart className="w-6 h-6 text-amber-500" />
            Yönetici Analitiği & Talep Tahmini
          </h1>
          <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
            Kategori bazlı Has kârlılığı, stok yaşlandırma analizi ve tükenme riskine karşı akıllı sipariş önerileri.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSettingsModal(true)}
            className="px-3.5 py-2 text-sm font-medium rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-750 transition flex items-center gap-1.5"
          >
            <Settings className="w-4 h-4 text-stone-500" />
            Emniyet Stoğu Ayarları
          </button>
        </div>
      </div>

      {/* 4 KPI Kartı */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-stone-800/90 p-4 rounded-xl border border-stone-200 dark:border-stone-700 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-stone-500 dark:text-stone-400">90 Günlük Ciro</div>
            <div className="text-xl font-bold text-stone-900 dark:text-stone-100">
              ₺{data.stats.totalSalesRevenueTl.toLocaleString('tr-TR')}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-stone-800/90 p-4 rounded-xl border border-stone-200 dark:border-stone-700 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-stone-500 dark:text-stone-400">Toplam Has Satış</div>
            <div className="text-xl font-bold text-stone-900 dark:text-stone-100 font-mono">
              {data.stats.totalSalesHasGr} gr Has
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-stone-800/90 p-4 rounded-xl border border-stone-200 dark:border-stone-700 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-stone-500 dark:text-stone-400">Ölü Sermaye (&gt;180 Gün)</div>
            <div className="text-xl font-bold text-red-600 dark:text-red-400">
              ₺{data.stats.totalDeadCapitalTl.toLocaleString('tr-TR')}
            </div>
            <div className="text-[11px] text-stone-400">{data.stats.deadStockCount} Hareketsiz Ürün</div>
          </div>
        </div>

        <div className="bg-white dark:bg-stone-800/90 p-4 rounded-xl border border-stone-200 dark:border-stone-700 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-stone-500 dark:text-stone-400">Tükenme Riski (Sipariş Gerekli)</div>
            <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
              {itemsNeedingReorder.length} Kalem
            </div>
          </div>
        </div>
      </div>

      {/* Tab Başlıkları */}
      <div className="border-b border-stone-200 dark:border-stone-700 flex gap-6">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 text-sm font-semibold transition border-b-2 flex items-center gap-2 ${
            activeTab === 'overview'
              ? 'border-amber-500 text-amber-600 dark:text-amber-400'
              : 'border-transparent text-stone-500 hover:text-stone-700 dark:text-stone-400'
          }`}
        >
          <Layers className="w-4 h-4" />
          Kategori & Has Kârlılık Matrisi
        </button>

        <button
          onClick={() => setActiveTab('aging')}
          className={`pb-3 text-sm font-semibold transition border-b-2 flex items-center gap-2 ${
            activeTab === 'aging'
              ? 'border-amber-500 text-amber-600 dark:text-amber-400'
              : 'border-transparent text-stone-500 hover:text-stone-700 dark:text-stone-400'
          }`}
        >
          <Clock className="w-4 h-4" />
          Stok Yaşlandırma & Devir Hızı ({data.evaluatedItems.length})
        </button>

        <button
          onClick={() => setActiveTab('forecast')}
          className={`pb-3 text-sm font-semibold transition border-b-2 flex items-center gap-2 ${
            activeTab === 'forecast'
              ? 'border-amber-500 text-amber-600 dark:text-amber-400'
              : 'border-transparent text-stone-500 hover:text-stone-700 dark:text-stone-400'
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-500" />
          Akıllı Sipariş Önerileri ({itemsNeedingReorder.length})
        </button>
      </div>

      {/* 1. GENEL BAKIŞ & KÂRLILIK MATRİSİ */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.profitability.map((prof) => (
              <div
                key={prof.category}
                className="bg-white dark:bg-stone-800/90 rounded-xl border border-stone-200 dark:border-stone-700 p-5 shadow-sm"
              >
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-bold text-base text-stone-900 dark:text-stone-100">
                    {prof.category}
                  </h4>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300">
                    %{prof.marginPercent} Kâr Marjı
                  </span>
                </div>

                <div className="space-y-2 text-xs text-stone-600 dark:text-stone-300">
                  <div className="flex justify-between">
                    <span>Toplam Ciro:</span>
                    <strong className="text-stone-900 dark:text-stone-100">
                      ₺{prof.totalRevenueTl.toLocaleString('tr-TR')}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Has Hacmi:</span>
                    <strong className="font-mono">{prof.totalHasSold} gr Has</strong>
                  </div>
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                    <span>Tahmini Has Kârı:</span>
                    <strong className="font-mono">+{prof.estimatedHasProfit} gr Has</strong>
                  </div>
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                    <span>Tahmini TL Kârı:</span>
                    <strong>+₺{prof.estimatedTlProfit.toLocaleString('tr-TR')}</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Devir Hızı Dağılımı Özeti */}
          <div className="bg-stone-50 dark:bg-stone-900/40 p-5 rounded-2xl border border-stone-200 dark:border-stone-700">
            <h4 className="font-bold text-sm text-stone-900 dark:text-stone-100 mb-3">
              Envanter Devir Dağılım Özeti
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-3 bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700">
                <div className="text-xs text-stone-500">Hızlı Dönen</div>
                <div className="text-lg font-bold text-blue-600 mt-0.5">{data.stats.fastMovingCount}</div>
              </div>
              <div className="p-3 bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700">
                <div className="text-xs text-stone-500">Dengeli Devir</div>
                <div className="text-lg font-bold text-emerald-600 mt-0.5">{data.stats.normalCount}</div>
              </div>
              <div className="p-3 bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700">
                <div className="text-xs text-stone-500">Yavaş Dönen</div>
                <div className="text-lg font-bold text-stone-600 dark:text-stone-300 mt-0.5">
                  {data.stats.slowMovingCount}
                </div>
              </div>
              <div className="p-3 bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700">
                <div className="text-xs text-stone-500">Ölü Sermaye</div>
                <div className="text-lg font-bold text-red-600 mt-0.5">{data.stats.deadStockCount}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. STOK YAŞLANDIRMA & DEVİR HIZI TABLOSU */}
      {activeTab === 'aging' && (
        <div className="bg-white dark:bg-stone-800/90 rounded-xl border border-stone-200 dark:border-stone-700 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-stone-200 dark:border-stone-700 flex flex-col sm:flex-row items-center justify-between gap-3">
            <input
              type="text"
              placeholder="Ürün adı veya barkod ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-72 px-3 py-1.5 text-sm rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 text-stone-900 dark:text-stone-100"
            />

            <select
              value={velocityFilter}
              onChange={(e) => setVelocityFilter(e.target.value)}
              className="text-sm px-3 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-200"
            >
              <option value="">Tüm Devir Durumları</option>
              {Object.entries(STOCK_VELOCITY_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-stone-50 dark:bg-stone-900/60 text-stone-500 border-b border-stone-200 dark:border-stone-700">
                  <th className="py-3 px-4">Ürün</th>
                  <th className="py-3 px-4">Ayar</th>
                  <th className="py-3 px-4">Mevcut Stok</th>
                  <th className="py-3 px-4">Stok Yaşı</th>
                  <th className="py-3 px-4">Satış Hızı</th>
                  <th className="py-3 px-4">Kalan Gün (Tükenme)</th>
                  <th className="py-3 px-4">Devir Durumu</th>
                  <th className="py-3 px-4 text-right">Kilitli Sermaye</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 dark:divide-stone-700">
                {data.evaluatedItems
                  .filter((i) => {
                    const matchesSearch =
                      !searchQuery ||
                      i.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      (i.barcode && i.barcode.includes(searchQuery));
                    const matchesVelocity = !velocityFilter || i.velocityCategory === velocityFilter;
                    return matchesSearch && matchesVelocity;
                  })
                  .map((i) => (
                    <tr key={i.id} className="hover:bg-stone-50/50 dark:hover:bg-stone-750/30">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-stone-900 dark:text-stone-100">{i.title}</div>
                        <div className="font-mono text-[11px] text-stone-400">{i.barcode || 'Barkodsuz'}</div>
                      </td>
                      <td className="py-3 px-4">{i.carat}K</td>
                      <td className="py-3 px-4 font-bold">{i.quantity} adet</td>
                      <td className="py-3 px-4 font-mono">{i.ageInDays} gün</td>
                      <td className="py-3 px-4 font-mono">{i.dailyRunRate} adet/gün</td>
                      <td className="py-3 px-4 font-mono">
                        {i.daysToStockout >= 999 ? '∞' : `${i.daysToStockout} gün`}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full font-semibold ${
                            i.velocityCategory === 'FAST_MOVING'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                              : i.velocityCategory === 'NORMAL'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : i.velocityCategory === 'DEAD_STOCK'
                              ? 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300'
                              : 'bg-stone-100 text-stone-600 dark:bg-stone-700 dark:text-stone-300'
                          }`}
                        >
                          {STOCK_VELOCITY_LABELS[i.velocityCategory as StockVelocityCategory] || i.velocityCategory}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold">
                        ₺{i.lockedCapitalTl.toLocaleString('tr-TR')}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. YAPAY ZEKÂ TALEP TAHMİNİ & SİPARİŞ ÖNERİLERİ */}
      {activeTab === 'forecast' && (
        <div className="space-y-4">
          <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-amber-800 dark:text-amber-300">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>
                Talep tahmini motoru, <strong>{data.settings.analysisPeriodDays || 90} günlük</strong> satış ivmesini{' '}
                <strong>{data.settings.leadTimeDays || 7} gün tedarik</strong> ve{' '}
                <strong>{data.settings.safetyStockDays || 14} gün emniyet stoğu</strong> toleransıyla modellemiştir.
              </span>
            </div>
          </div>

          <div className="bg-white dark:bg-stone-800/90 rounded-xl border border-stone-200 dark:border-stone-700 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-stone-200 dark:border-stone-700">
              <h3 className="font-bold text-base text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <Boxes className="w-5 h-5 text-amber-500" />
                Önerilen Tedarik Sipariş Listesi
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-stone-50 dark:bg-stone-900/60 text-stone-500 border-b border-stone-200 dark:border-stone-700">
                    <th className="py-3 px-4">Ürün Adı</th>
                    <th className="py-3 px-4">Mevcut Stok</th>
                    <th className="py-3 px-4">Günlük Satış Hızı</th>
                    <th className="py-3 px-4">Tahmini Tükenme</th>
                    <th className="py-3 px-4 font-bold text-amber-600 dark:text-amber-400">
                      Önerilen Sipariş Miktarı
                    </th>
                    <th className="py-3 px-4 text-right">Tahmini Tedarik Maliyeti</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200 dark:divide-stone-700">
                  {itemsNeedingReorder.map((item) => (
                    <tr key={item.id} className="hover:bg-stone-50/50 dark:hover:bg-stone-750/30">
                      <td className="py-3 px-4 font-semibold text-stone-900 dark:text-stone-100">
                        {item.title}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-red-600">
                        {item.quantity} adet
                      </td>
                      <td className="py-3 px-4 font-mono">{item.dailyRunRate} adet/gün</td>
                      <td className="py-3 px-4 font-mono text-amber-600 font-bold">
                        {item.daysToStockout} gün içinde
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400">
                        +{Math.max(1, item.suggestedReorderQuantity)} adet
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold">
                        ₺{Math.round(Math.max(1, item.suggestedReorderQuantity) * (item.costPrice || 0)).toLocaleString('tr-TR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* PARAMETRE AYARLARI MODALI */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-stone-800 rounded-2xl max-w-md w-full border border-stone-200 dark:border-stone-700 shadow-2xl p-6">
            <h3 className="font-bold text-lg text-stone-900 dark:text-stone-100 mb-4 flex items-center gap-2">
              <Settings className="w-5 h-5 text-amber-500" />
              Talep Tahmin & Emniyet Parametreleri
            </h3>

            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Emniyet Stoğu Hedefi (Gün)
                </label>
                <input
                  type="number"
                  required
                  value={safetyDays}
                  onChange={(e) => setSafetyDays(parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100"
                />
                <span className="text-[11px] text-stone-400">
                  Beklenmedik talep artışlarına karşı rafta tutulması istenen tampon gün sayısı (Varsayılan: 14).
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Tedarikçi Teslimat Süresi (Lead Time - Gün)
                </label>
                <input
                  type="number"
                  required
                  value={leadDays}
                  onChange={(e) => setLeadDays(parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100"
                />
                <span className="text-[11px] text-stone-400">
                  Sipariş verildikten sonra toptancıdan mağazaya ulaşana kadar geçen ortalama gün (Varsayılan: 7).
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(false)}
                  className="px-4 py-2 text-sm rounded-lg border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={isSavingSettings}
                  className="px-5 py-2 text-sm font-semibold rounded-lg bg-amber-500 hover:bg-amber-600 text-white shadow-sm disabled:opacity-50"
                >
                  {isSavingSettings ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

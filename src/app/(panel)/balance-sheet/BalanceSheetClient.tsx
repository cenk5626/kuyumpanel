'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  Coins,
  Scale,
  Package,
  Users,
  Truck,
  DollarSign,
  Wallet,
  RefreshCw,
  Sparkles,
  ArrowUpRight,
  ShieldCheck,
  Percent,
  Gem,
} from 'lucide-react';
import { THEME } from '@/constants/theme';
import { MESSAGES } from '@/constants/messages';
import HeaderActions from '@/components/HeaderActions';

export default function BalanceSheetClient() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [simulatedGoldPrice, setSimulatedGoldPrice] = useState<number | null>(null);

  const fetchBalanceSheet = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/analytics/balance-sheet');
      if (res.ok) {
        const json = await res.json();
        setData(json);
        if (!simulatedGoldPrice) {
          setSimulatedGoldPrice(json.spotPrices?.hasBid || 3000);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalanceSheet();
  }, []);

  if (loading && !data) {
    return (
      <div className="p-12 text-center text-gray-500 text-sm">
        <RefreshCw size={28} className="animate-spin mx-auto mb-3 text-yellow-400" />
        Bilanço ve anlık özkaynak hesaplanıyor...
      </div>
    );
  }

  const currentSpot = data?.spotPrices?.hasBid || 3000;
  const activeSpot = simulatedGoldPrice || currentSpot;
  const netWealthHas = data?.netWealth?.netWealthHas || 0;
  const simulatedNetWealthTL = Math.round(netWealthHas * activeSpot);

  const assets = data?.assetsBreakdown || {};
  const liabilities = data?.liabilitiesBreakdown || {};
  const today = data?.todayPerformance || {};

  return (
    <>
      <header className={THEME.HEADER}>
        <div className="flex justify-between items-center w-full flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 rounded-2xl">
              <TrendingUp size={22} />
            </div>
            <div>
              <h1 className={THEME.HEADER_TITLE}>{MESSAGES.BALANCE_SHEET_TITLE}</h1>
              <p className="text-gray-400 text-xs mt-0.5">{MESSAGES.BALANCE_SHEET_SUBTITLE}</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={fetchBalanceSheet}
              disabled={loading}
              className={`${THEME.BTN_SECONDARY} gap-2 text-xs`}
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Yenile
            </button>
            <HeaderActions />
          </div>
        </div>
      </header>

      <div className={`${THEME.PAGE_WRAPPER} space-y-6 sm:space-y-8`}>
        {/* ─── DEV NET ÖZKAYNAK & SERVET BANNER'I ─── */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className={`${THEME.GLASS_CARD} p-6 sm:p-8 bg-gradient-to-br from-gray-950 via-gray-900 to-yellow-950/20 border-2 border-yellow-500/30 relative overflow-hidden shadow-2xl`}
        >
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-yellow-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* Sol: Has ve TL Net Özkaynak */}
            <div className="lg:col-span-7 space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-yellow-500/10 border border-yellow-500/30 rounded-full text-yellow-400 text-xs font-black">
                <Sparkles size={14} /> Anlık Net Mağaza Özkaynağı (Bilanço)
              </div>

              <div>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-1">
                  Toplam Net Servet (Has Altın Cinsinden)
                </span>
                <h2 className="text-3xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-yellow-400 to-amber-500 font-mono">
                  {netWealthHas.toLocaleString('tr-TR', { minimumFractionDigits: 3 })} gr Has
                </h2>
              </div>

              <div className="pt-1 flex items-baseline gap-3">
                <span className="text-xs font-bold text-gray-400 uppercase">Güncel TL Değeri:</span>
                <span className="text-2xl sm:text-3xl font-black text-white font-mono">
                  ₺{simulatedNetWealthTL.toLocaleString('tr-TR')}
                </span>
              </div>
            </div>

            {/* Sağ: Spot Kur ve Canlı Simülatör */}
            <div className="lg:col-span-5 bg-gray-950/80 p-5 rounded-2xl border border-gray-800/80 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-400 uppercase flex items-center gap-1.5">
                  <Coins size={15} className="text-yellow-400" /> Spot Has Altın Kuru
                </span>
                <span className="font-mono font-black text-white text-base">
                  ₺{activeSpot.toLocaleString('tr-TR')} / gr
                </span>
              </div>

              {/* Altın Fiyat Simülatörü Slider */}
              <div>
                <div className="flex justify-between text-[11px] text-gray-400 font-bold mb-1.5">
                  <span>Kur Simülatörü:</span>
                  <span className="text-yellow-400 font-mono">
                    {activeSpot > currentSpot ? `+₺${Math.round(activeSpot - currentSpot)}` : activeSpot < currentSpot ? `-₺${Math.round(currentSpot - activeSpot)}` : 'Piyasa Kuru'}
                  </span>
                </div>
                <input
                  type="range"
                  min={Math.round(currentSpot * 0.7)}
                  max={Math.round(currentSpot * 1.5)}
                  step="10"
                  value={activeSpot}
                  onChange={(e) => setSimulatedGoldPrice(Number(e.target.value))}
                  className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-yellow-400"
                />
                <div className="flex justify-between text-[10px] text-gray-500 mt-1 font-mono">
                  <span>₺{Math.round(currentSpot * 0.7)}</span>
                  <button
                    onClick={() => setSimulatedGoldPrice(currentSpot)}
                    className="text-yellow-500 font-bold hover:underline"
                  >
                    Sıfırla
                  </button>
                  <span>₺{Math.round(currentSpot * 1.5)}</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ─── AKTİF / PASİF (VARLIKLAR vs BORÇLAR) İKİLİ IZGARASI ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* SOL: TOPLAM VARLIKLAR (AKTİFLER) */}
          <motion.div
            initial={{ opacity: 0, x: -15 }}
            animate={{ opacity: 1, x: 0 }}
            className={`${THEME.GLASS_CARD} p-6 border-l-4 border-l-emerald-500 space-y-4`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-gray-800">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <ShieldCheck className="text-emerald-400" size={20} />
                {MESSAGES.BALANCE_ASSETS} (Aktifler)
              </h3>
              <span className="font-mono font-black text-emerald-400 text-base">
                ₺{data?.netWealth?.totalAssetsTL?.toLocaleString('tr-TR')}
              </span>
            </div>

            <div className="space-y-3">
              {/* Vitrin Altın Takıları */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-gray-950/40 border border-gray-800/80">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-yellow-500/10 text-yellow-400">
                    <Package size={16} />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">Vitrindeki Barkodlu Takılar</span>
                    <span className="text-[10px] text-gray-500 font-mono">
                      {assets.jewelry?.itemCount || 0} adet takı ({assets.jewelry?.totalWeight || 0} gr)
                    </span>
                  </div>
                </div>
                <div className="text-right font-mono">
                  <span className="text-xs font-bold text-white block">
                    ~{assets.jewelry?.estimatedHas || 0} gr Has
                  </span>
                  <span className="text-[10px] text-gray-500">
                    Maliyet: ₺{(assets.jewelry?.totalCost || 0).toLocaleString('tr-TR')}
                  </span>
                </div>
              </div>

              {/* Pırlanta Değerleri */}
              {assets.jewelry?.diamondCount > 0 && (
                <div className="flex items-center justify-between p-3 rounded-xl bg-gray-950/40 border border-gray-800/80">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                      <Gem size={16} />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white block">Pırlanta & Değerli Taş Envanteri</span>
                      <span className="text-[10px] text-gray-500 font-mono">
                        {assets.jewelry.diamondCount} adet pırlantalı ürün
                      </span>
                    </div>
                  </div>
                  <span className="font-mono text-xs font-bold text-blue-400">
                    {assets.jewelry.diamondCarat} ct Toplam Karat
                  </span>
                </div>
              )}

              {/* Sarrafiye & Ziynet */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-gray-950/40 border border-gray-800/80">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                    <Coins size={16} />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">Sarrafiye & Ziynet Stokları</span>
                    <span className="text-[10px] text-gray-500 font-mono">
                      Çeyrek, Yarım, Tam, Ata vb.
                    </span>
                  </div>
                </div>
                <span className="font-mono text-xs font-bold text-white">
                  ₺{(assets.sarrafiye?.tlValue || 0).toLocaleString('tr-TR')} ({assets.sarrafiye?.hasEquivalent || 0} gr Has)
                </span>
              </div>

              {/* Kasa Nakitleri & Döviz */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-gray-950/40 border border-gray-800/80">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                    <Wallet size={16} />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">Kasa Nakit & Döviz Varlığı</span>
                    <span className="text-[10px] text-gray-500 font-mono">
                      Nakit TL + USD/EUR karşılığı
                    </span>
                  </div>
                </div>
                <span className="font-mono text-xs font-bold text-white">
                  ₺{((assets.cashDrawer?.cashTL || 0) + (assets.doviz?.tlValue || 0)).toLocaleString('tr-TR')}
                </span>
              </div>

              {/* Müşteri Alacakları (Veresiye) */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-gray-950/40 border border-gray-800/80">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                    <Users size={16} />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">Müşteri Cari Alacakları</span>
                    <span className="text-[10px] text-gray-500 font-mono">
                      Veresiye defteri alacak bakiyesi
                    </span>
                  </div>
                </div>
                <div className="text-right font-mono text-xs font-bold">
                  <span className="text-white block">
                    {assets.customerReceivables?.hasBalance || 0} gr Has
                  </span>
                  <span className="text-[10px] text-gray-500">
                    + ₺{(assets.customerReceivables?.tlBalance || 0).toLocaleString('tr-TR')} TL
                  </span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* SAĞ: TOPLAM BORÇLAR & YÜKÜMLÜLÜKLER (PASİFLER) */}
          <motion.div
            initial={{ opacity: 0, x: 15 }}
            animate={{ opacity: 1, x: 0 }}
            className={`${THEME.GLASS_CARD} p-6 border-l-4 border-l-rose-500 space-y-4`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-gray-800">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Scale className="text-rose-400" size={20} />
                {MESSAGES.BALANCE_LIABILITIES} (Pasifler)
              </h3>
              <span className="font-mono font-black text-rose-400 text-base">
                ₺{data?.netWealth?.totalLiabilitiesTL?.toLocaleString('tr-TR')}
              </span>
            </div>

            <div className="space-y-3">
              {/* Toptancı Has Borçları */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-gray-950/40 border border-gray-800/80">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                    <Truck size={16} />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">Toptancı / Atölye Has Borcu</span>
                    <span className="text-[10px] text-gray-500">
                      Toptancılara olan saf altın borcumuz
                    </span>
                  </div>
                </div>
                <span className="font-mono text-sm font-black text-amber-400">
                  {liabilities.supplierDebt?.hasBalance || 0} gr Has
                </span>
              </div>

              {/* Toptancı TL Borçları */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-gray-950/40 border border-gray-800/80">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400">
                    <DollarSign size={16} />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">Toptancı / Atölye TL Borcu</span>
                    <span className="text-[10px] text-gray-500">
                      Toptancılara olan nakit TL borcumuz
                    </span>
                  </div>
                </div>
                <span className="font-mono text-sm font-black text-rose-400">
                  ₺{(liabilities.supplierDebt?.tlBalance || 0).toLocaleString('tr-TR')}
                </span>
              </div>
            </div>

            {/* Bugünün Ticari Satış Performansı */}
            <div className="mt-6 p-4 rounded-2xl bg-gradient-to-r from-gray-900 via-gray-900 to-yellow-950/10 border border-yellow-500/20">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-black text-white uppercase flex items-center gap-1.5">
                  <Percent size={15} className="text-yellow-400" /> Bugünün Ticari Satış Hacmi
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-yellow-500/10 text-yellow-400 rounded-full border border-yellow-500/20">
                  {today.transactionCount || 0} İşlem
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[10px] text-gray-500 font-bold block">Toplam Satış Cirosu:</span>
                  <span className="font-mono text-base font-black text-white">
                    ₺{(today.salesVolume || 0).toLocaleString('tr-TR')}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 font-bold block">Net İşçilik Kârı:</span>
                  <span className="font-mono text-base font-black text-emerald-400">
                    ₺{(today.netProfit || 0).toLocaleString('tr-TR')}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
}

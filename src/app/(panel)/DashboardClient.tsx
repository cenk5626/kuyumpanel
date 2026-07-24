'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  Users, 
  Shield, 
  Activity, 
  Wifi, 
  ArrowLeftRight, 
  Package, 
  Truck, 
  Camera, 
  Plus, 
  Coins, 
  ArrowUpRight, 
  ArrowDownLeft, 
  ChevronRight, 
  Building2, 
  Clock, 
  TrendingUp, 
  Scale, 
  CreditCard,
  Layers,
  Sparkles
} from 'lucide-react';
import { MESSAGES } from '@/constants/messages';
import { ROUTES } from '@/constants/routes';
import { THEME, ANIM } from '@/constants/theme';
import HeaderActions from '@/components/HeaderActions';

interface SupplierItem {
  id: string;
  name: string;
  phone?: string | null;
  hasBalance: number;
  tlBalance: number;
}

interface RecentTransactionItem {
  id: string;
  type: string;
  productCode: string;
  quantity: number;
  price: number;
  total: number;
  employeeName?: string | null;
  createdAt: string;
}

interface DashboardProps {
  userName: string;
  totalUsers: number;
  adminCount: number;
  totalStockCount: number;
  totalStockWeight: number;
  suppliers: SupplierItem[];
  totalSupplierHasBalance: number;
  totalSupplierTlBalance: number;
  recentTransactions: RecentTransactionItem[];
  hasPrice: { bid: number; ask: number } | null;
}

export default function DashboardClient({
  userName,
  totalUsers,
  adminCount,
  totalStockCount,
  totalStockWeight,
  suppliers,
  totalSupplierHasBalance,
  totalSupplierTlBalance,
  recentTransactions,
  hasPrice,
}: DashboardProps) {
  // Hızlı Erişim Butonları
  const quickActions = [
    {
      id: 'quick-pos',
      title: 'Hızlı Alış / Satış',
      desc: 'Perakende & Sarrafiye İşlemi Yap',
      icon: ArrowLeftRight,
      href: ROUTES.TRANSACTIONS,
      color: 'bg-yellow-500 hover:bg-yellow-400 text-black shadow-yellow-500/20',
    },
    {
      id: 'quick-camera',
      title: 'Kamera İle Barkod Okut',
      desc: 'Cihaz Kamerasıyla Ürün Taraması',
      icon: Camera,
      href: ROUTES.TRANSACTIONS,
      color: 'bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20',
    },
    {
      id: 'quick-stocks',
      title: 'Stok & Barkod Girişi',
      desc: 'Yeni Takı Ürünü Tanımla',
      icon: Package,
      href: ROUTES.STOCKS,
      color: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20',
    },
    {
      id: 'quick-suppliers',
      title: 'Toptancı & Mutabakat',
      desc: 'Mal Alımı ve Has/TL Borç Takibi',
      icon: Truck,
      href: ROUTES.SUPPLIERS,
      color: 'bg-purple-500/10 text-purple-400 border border-purple-500/30 hover:bg-purple-500/20',
    },
  ];

  return (
    <>
      {/* HEADER BAR */}
      <header className={THEME.HEADER}>
        <div className="flex justify-between items-center w-full">
          <motion.div {...ANIM.FADE_UP} transition={{ duration: ANIM.DURATION.NORMAL }}>
            <h1 className={THEME.HEADER_TITLE}>{MESSAGES.DASHBOARD_TITLE}</h1>
          </motion.div>
          <HeaderActions />
        </div>
      </header>

      {/* ANA İÇERİK ALANI */}
      <div className={`${THEME.PAGE_WRAPPER} space-y-8`}>
        {/* HOŞ GELDİNİZ KARTI */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: ANIM.DURATION.NORMAL }}
          className={`${THEME.GLASS_CARD} p-6 sm:p-8 relative overflow-hidden group`}
        >
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-72 h-72 bg-yellow-500/10 rounded-full blur-3xl group-hover:bg-yellow-500/15 transition-all duration-700 pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-yellow-500/10 border border-yellow-500/20 rounded-full text-yellow-400 text-xs font-bold mb-3">
                <Sparkles size={14} /> KuyumPanel Yönetim Sistemi v1.0
              </div>
              <h2 className="text-2xl sm:text-3xl font-light text-white">
                {MESSAGES.DASHBOARD_WELCOME},{' '}
                <span className="bg-gradient-to-r from-yellow-300 to-amber-500 bg-clip-text text-transparent font-bold">
                  {userName}
                </span>
              </h2>
              <p className="text-gray-400 text-xs sm:text-sm mt-1">
                Güncel piyasa fiyatları, stok durumu, toptancı cari bakiyeleri ve kasa takibi genel özeti.
              </p>
            </div>

            {/* ANLIK HAS ALTIN FİYAT TİCKER */}
            {hasPrice && (
              <div className="bg-gray-950/70 border border-yellow-500/30 p-4 rounded-2xl flex items-center gap-4 shrink-0 shadow-lg">
                <div className="w-12 h-12 rounded-xl bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center text-yellow-400">
                  <Coins size={24} className="animate-pulse" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Canlı Has Altın (TL/gr)</span>
                  <div className="flex items-center gap-3 font-mono mt-0.5">
                    <span className="text-xs text-gray-400">Alış: <strong className="text-white">₺{hasPrice.bid.toFixed(2)}</strong></span>
                    <span className="text-xs text-yellow-400 font-bold">Satış: ₺{hasPrice.ask.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* HIZLI ERİŞİM KISAYOLLARI */}
        <div>
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Activity size={16} className="text-yellow-500" /> Hızlı Erişim Kısayolları
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action, i) => (
              <motion.div
                key={action.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.3 }}
              >
                <Link
                  href={action.href}
                  className={`p-4 rounded-2xl flex items-center justify-between transition-all duration-200 shadow-md group ${action.color}`}
                >
                  <div className="flex items-center gap-3.5">
                    <div className="p-2.5 bg-black/20 rounded-xl">
                      <action.icon size={22} />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm leading-tight">{action.title}</h4>
                      <p className="text-[11px] opacity-80 mt-0.5">{action.desc}</p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="opacity-60 group-hover:translate-x-1 transition-transform" />
                </Link>
              </motion.div>
            ))}
          </div>
        </div>

        {/* METRİK VE ÖZET KARTLARI */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Stok Takip Kartı */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className={THEME.STAT_CARD}
          >
            <div className="flex justify-between items-start mb-4">
              <div className={`${THEME.STAT_ICON_WRAPPER} text-yellow-400`}>
                <Package size={24} />
              </div>
              <span className="text-[10px] font-bold bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-2 py-0.5 rounded-full">
                Stokta Var
              </span>
            </div>
            <p className={THEME.STAT_LABEL}>Stok Altın Miktarı</p>
            <h3 className={THEME.STAT_VALUE}>{totalStockWeight.toFixed(2)} gr</h3>
            <p className="text-xs text-gray-500 font-mono mt-1">{totalStockCount} adet barkodlu takı ürünü</p>
          </motion.div>

          {/* Toptancı Has Borcu Kartı */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.4 }}
            className={THEME.STAT_CARD}
          >
            <div className="flex justify-between items-start mb-4">
              <div className={`${THEME.STAT_ICON_WRAPPER} text-amber-400`}>
                <Scale size={24} />
              </div>
              <span className="text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full">
                Atölye / Toptan
              </span>
            </div>
            <p className={THEME.STAT_LABEL}>Toptancı Has Borcu</p>
            <h3 className={THEME.STAT_VALUE}>{totalSupplierHasBalance.toFixed(3)} gr</h3>
            <p className="text-xs text-emerald-400 font-mono mt-1">TL Borcu: ₺{Math.round(totalSupplierTlBalance).toLocaleString('tr-TR')}</p>
          </motion.div>

          {/* Toplam Kullanıcı Kartı */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className={THEME.STAT_CARD}
          >
            <div className="flex justify-between items-start mb-4">
              <div className={`${THEME.STAT_ICON_WRAPPER} text-blue-400`}>
                <Users size={24} />
              </div>
            </div>
            <p className={THEME.STAT_LABEL}>Kullanıcı Sayısı</p>
            <h3 className={THEME.STAT_VALUE}>{totalUsers}</h3>
            <p className="text-xs text-gray-500 font-mono mt-1">{adminCount} yetkili yönetici hesabı</p>
          </motion.div>

          {/* Sistem Durumu Kartı */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.4 }}
            className={THEME.STAT_CARD}
          >
            <div className="flex justify-between items-start mb-4">
              <div className={`${THEME.STAT_ICON_WRAPPER} text-purple-400`}>
                <Wifi size={24} />
              </div>
            </div>
            <p className={THEME.STAT_LABEL}>Sistem Durumu</p>
            <h3 className={THEME.STAT_VALUE}>Çevrimiçi</h3>
            <p className="text-xs text-emerald-400 font-mono mt-1">Canlı soket & veritabanı aktif</p>
          </motion.div>
        </div>

        {/* İKİLİ ANA İÇERİK BLOĞU */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* SOL PANEL (7 COL): SON ALIŞ / SATIŞ İŞLEMLERİ AKIŞI */}
          <motion.div
            {...ANIM.FADE_UP}
            className={`${THEME.GLASS_CARD} p-6 lg:col-span-7 space-y-4`}
          >
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Clock className="text-yellow-400" size={18} /> Son Alış / Satış İşlemleri
              </h3>
              <Link
                href={ROUTES.TRANSACTIONS}
                className="text-xs font-bold text-yellow-400 hover:text-yellow-300 flex items-center gap-1 transition-colors"
              >
                Tümünü Gör <ChevronRight size={14} />
              </Link>
            </div>

            {recentTransactions.length === 0 ? (
              <div className="text-center py-10 text-gray-500 text-xs">
                Henüz alış/satış işlemi gerçekleştirilmedi.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-800 text-gray-500 uppercase text-[10px] font-bold">
                      <th className="px-3 py-2 text-left">Tarih</th>
                      <th className="px-3 py-2 text-left">İşlem</th>
                      <th className="px-3 py-2 text-left">Ürün Kodu</th>
                      <th className="px-3 py-2 text-right">Miktar</th>
                      <th className="px-3 py-2 text-right">Tutar (TL)</th>
                      <th className="px-3 py-2 text-right">Personel</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentTransactions.map(tx => {
                      const isSell = tx.type === 'sell';
                      return (
                        <tr key={tx.id} className="border-b border-gray-800/40 hover:bg-yellow-500/5 transition-colors">
                          <td className="px-3 py-2.5 text-gray-400 font-mono">
                            {new Date(tx.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="px-3 py-2.5 font-bold">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] ${
                              isSell 
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            }`}>
                              {isSell ? <ArrowUpRight size={12} /> : <ArrowDownLeft size={12} />}
                              {isSell ? 'Satış' : 'Alış'}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 font-mono font-bold text-yellow-500">
                            {tx.productCode}
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono font-semibold text-white">
                            {tx.quantity}
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono font-extrabold text-white">
                            ₺{Math.round(tx.total).toLocaleString('tr-TR')}
                          </td>
                          <td className="px-3 py-2.5 text-right text-gray-400">
                            {tx.employeeName || '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>

          {/* SAĞ PANEL (5 COL): ATÖLYE VE TOPTANCI CARİ ÖZETİ */}
          <motion.div
            {...ANIM.FADE_UP}
            className={`${THEME.GLASS_CARD} p-6 lg:col-span-5 space-y-4 flex flex-col justify-between`}
          >
            <div>
              <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Building2 className="text-yellow-400" size={18} /> Atölye & Toptancı Bakiyeleri Özeti
                </h3>
                <Link
                  href={ROUTES.SUPPLIERS}
                  className="text-xs font-bold text-yellow-400 hover:text-yellow-300 flex items-center gap-1 transition-colors"
                >
                  Mutabakata Git <ChevronRight size={14} />
                </Link>
              </div>

              {suppliers.length === 0 ? (
                <div className="text-center py-10 text-gray-500 text-xs">
                  Henüz kayıtlı toptancı veya atölye bulunmuyor.
                </div>
              ) : (
                <div className="space-y-2.5 mt-3">
                  {suppliers.map(s => (
                    <div
                      key={s.id}
                      className="p-3 bg-gray-950/60 border border-gray-800/80 rounded-xl flex items-center justify-between"
                    >
                      <div>
                        <span className="font-bold text-xs text-white block">{s.name}</span>
                        <span className="text-[10px] text-gray-400">{s.phone || 'Telefon yok'}</span>
                      </div>

                      <div className="text-right font-mono">
                        <span className="text-xs font-bold text-amber-400 block">
                          {s.hasBalance.toFixed(3)} gr Has
                        </span>
                        {s.tlBalance > 0 && (
                          <span className="text-[10px] text-emerald-400 font-semibold block">
                            ₺{Math.round(s.tlBalance).toLocaleString('tr-TR')}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ALT TOPTANCI ÖZET BARI */}
            <div className="pt-3 border-t border-gray-800 flex items-center justify-between text-xs font-mono">
              <span className="text-gray-400">Toplam Atölye Has Borcu:</span>
              <span className="font-extrabold text-amber-400 text-sm">
                {totalSupplierHasBalance.toFixed(3)} gr Has
              </span>
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
}

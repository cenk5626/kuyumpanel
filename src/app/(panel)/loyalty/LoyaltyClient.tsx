'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HeartHandshake,
  Crown,
  Sparkles,
  Calendar,
  Gift,
  Coins,
  ShieldCheck,
  RefreshCw,
  Plus,
  Send,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Scale,
  Users,
  Search,
  ExternalLink,
  ChevronRight,
  Clock,
  X,
  Printer,
  Award
} from 'lucide-react';
import { THEME } from '@/constants/theme';
import PageHeader from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import LuxuryTabs from '@/components/LuxuryTabs';
import {
  LOYALTY_TIERS,
  LOYALTY_TIER_CONFIG,
  LoyaltyTier,
  RFM_SEGMENTS,
  RFM_SEGMENT_CONFIG,
  RfmSegment,
  SPECIAL_DAY_TYPES,
  LOYALTY_ACTION_TYPES,
  LOYALTY_DEFAULTS,
} from '@/constants/loyalty';

interface CustomerItem {
  id: string;
  name: string;
  phone?: string | null;
  tcNo?: string | null;
  loyaltyPoints: number;
  loyaltyTier?: LoyaltyTier | null;
  emanetGold: number;
  birthDate?: string | null;
  anniversaryDate?: string | null;
  rfmSegment?: string | null;
  rfmScore?: number | null;
  rfmRecencyDays?: number | null;
  rfmFrequency?: number | null;
  rfmMonetaryTL?: number | null;
  loyaltyLogs?: any[];
  deposits?: any[];
}

interface SpecialDayEvent {
  customerId: string;
  customerName: string;
  phone?: string | null;
  type: string;
  typeLabel: string;
  date: string;
  daysLeft: number;
  loyaltyPoints: number;
  loyaltyTier?: string | null;
}

interface DepositItem {
  id: string;
  customerId: string;
  customer?: { id: string; name: string; phone?: string | null };
  itemDescription: string;
  weight: number;
  carat?: number | null;
  pureGoldWeight: number;
  status: string;
  notes?: string | null;
  createdAt: string;
}

interface LoyaltyClientProps {
  initialData: {
    customers: CustomerItem[];
    upcomingEvents: SpecialDayEvent[];
    deposits: DepositItem[];
    totalEmanetGold: number;
  };
  dealerId: string;
  currentUserName: string;
}

export default function LoyaltyClient({
  initialData,
  dealerId,
  currentUserName,
}: LoyaltyClientProps) {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'rfm' | 'points' | 'special_days' | 'deposits'>('rfm');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSegmentFilter, setSelectedSegmentFilter] = useState<string>('ALL');

  // Modallar
  const [isPointModalOpen, setIsPointModalOpen] = useState(false);
  const [selectedCustomerForPoints, setSelectedCustomerForPoints] = useState<CustomerItem | null>(null);
  const [pointForm, setPointForm] = useState({
    actionType: LOYALTY_ACTION_TYPES.EARN,
    points: '',
    description: '',
  });

  const [isCongratModalOpen, setIsCongratModalOpen] = useState(false);
  const [selectedEventForCongrat, setSelectedEventForCongrat] = useState<SpecialDayEvent | null>(null);
  const [congratForm, setCongratForm] = useState({
    giftPoints: '250',
    discountCode: 'OZELGUN10',
  });

  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [depositForm, setDepositForm] = useState({
    customerId: '',
    itemDescription: '',
    weight: '',
    carat: '22',
    notes: '',
  });

  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // RFM Toplu Skorlama Çalıştır
  const handleRunRfmRecalculation = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/customers/rfm', { method: 'POST' });
      const result = await res.json();
      if (res.ok) {
        showToast(`✓ ${result.message}`, 'success');
        // Verileri yenile
        const rfmRes = await fetch('/api/customers/rfm');
        if (rfmRes.ok) {
          const rfmData = await rfmRes.json();
          setData((prev) => ({
            ...prev,
            customers: rfmData.customers,
          }));
        }
      } else {
        showToast(result.error || 'RFM hesaplanamadı.', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Ağ hatası oluştu.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Puan Ekle / Düş Gönder
  const handlePointSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerForPoints) return;
    const pts = parseFloat(pointForm.points);
    if (!pts || pts <= 0) {
      showToast('Geçerli bir puan giriniz.', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/customers/${selectedCustomerForPoints.id}/loyalty`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionType: pointForm.actionType,
          points: pts,
          description: pointForm.description,
        }),
      });
      const result = await res.json();
      if (res.ok) {
        showToast(`✓ Puan işlemi başarıyla kaydedildi. Güncel Puan: ${result.currentPoints}`, 'success');
        setIsPointModalOpen(false);
        setPointForm({ actionType: LOYALTY_ACTION_TYPES.EARN, points: '', description: '' });
        // Müşteri listesini güncelle
        setData((prev) => ({
          ...prev,
          customers: prev.customers.map((c) =>
            c.id === selectedCustomerForPoints.id ? { ...c, loyaltyPoints: result.currentPoints } : c
          ),
        }));
      } else {
        showToast(result.error || 'Puan kaydedilemedi.', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('İşlem başarısız.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Özel Gün Tebrik & WhatsApp Aç
  const handleCongratSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventForCongrat) return;

    setLoading(true);
    try {
      const res = await fetch('/api/customers/special-days', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: selectedEventForCongrat.customerId,
          specialDayType: selectedEventForCongrat.type,
          giftPoints: parseFloat(congratForm.giftPoints) || 0,
          discountCode: congratForm.discountCode || undefined,
        }),
      });
      const result = await res.json();
      if (res.ok) {
        showToast('✓ Özel gün tebriği oluşturuldu ve puan tanımlandı.', 'success');
        setIsCongratModalOpen(false);
        if (result.waUrl) {
          window.open(result.waUrl, '_blank');
        }
      } else {
        showToast(result.error || 'Tebrik gönderilemedi.', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('İşlem hatası oluştu.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Yeni Emanet Altın Kaydet
  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const w = parseFloat(depositForm.weight);
    if (!w || w <= 0) {
      showToast('Geçerli bir gramaj giriniz.', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/customers/deposits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'DEPOSIT',
          customerId: depositForm.customerId,
          itemDescription: depositForm.itemDescription,
          weight: w,
          carat: parseInt(depositForm.carat) || 24,
          notes: depositForm.notes,
        }),
      });
      const result = await res.json();
      if (res.ok) {
        showToast('✓ Emanet altın kasaya teslim alındı.', 'success');
        setIsDepositModalOpen(false);
        setDepositForm({ customerId: '', itemDescription: '', weight: '', carat: '22', notes: '' });
        // Yenile
        const depRes = await fetch('/api/customers/deposits');
        if (depRes.ok) {
          const depData = await depRes.json();
          setData((prev) => ({
            ...prev,
            deposits: depData,
          }));
        }
      } else {
        showToast(result.error || 'Emanet kaydedilemedi.', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Emanet işlemi başarısız.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Filtrelenmiş Müşteriler
  const filteredCustomers = data.customers.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.phone && c.phone.includes(searchQuery));
    const matchesSegment =
      selectedSegmentFilter === 'ALL' || c.rfmSegment === selectedSegmentFilter;
    return matchesSearch && matchesSegment;
  });

  // KPI Hesaplamaları
  const totalPoints = data.customers.reduce((sum, c) => sum + (c.loyaltyPoints || 0), 0);
  const championsCount = data.customers.filter((c) => c.rfmSegment === RFM_SEGMENTS.CHAMPIONS).length;
  const upcomingCount = data.upcomingEvents.length;

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Bildirimi */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 text-xs font-bold ${
              toastMessage.type === 'success'
                ? 'bg-emerald-500 text-black shadow-emerald-500/20'
                : 'bg-red-500 text-white shadow-red-500/20'
            }`}
          >
            {toastMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
            {toastMessage.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── ÜST BAŞLIK & BUTONLAR ─── */}
      <PageHeader
        icon={<HeartHandshake className="w-6 h-6 text-amber-500" />}
        title="Müşteri Sadakat & RFM Merkezi"
        subtitle="ParaPuan, Otomatik RFM Segmentasyonu, Özel Gün Kutlamaları & Emanet Altın Kasası"
        badges={[
          { label: `${data.customers.length} Müşteri`, variant: 'gold' },
          { label: `${championsCount} Şampiyon VIP`, variant: 'success' },
        ]}
        actions={
          <div className="flex items-center gap-2.5 flex-wrap w-full sm:w-auto">
            {/* RFM Toplu Skorlama */}
            <button
              onClick={handleRunRfmRecalculation}
              disabled={loading}
              className={`${THEME.BTN_SECONDARY} min-h-[44px] flex items-center gap-1.5`}
            >
              <Sparkles size={14} className={loading ? 'animate-spin' : ''} />
              Tüm Havuzu RFM Skorla
            </button>

            {/* Yeni Emanet Al */}
            <button
              onClick={() => setIsDepositModalOpen(true)}
              className={`${THEME.BTN_PRIMARY} min-h-[44px] flex items-center gap-1.5`}
            >
              <Scale size={14} />
              Emanet Altın Al
            </button>
          </div>
        }
      />

      {/* 1. KPI ÖZET KARTLARI (4 KART) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Dolaşımdaki ParaPuan"
          value={`${totalPoints.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} Puan`}
          icon={Coins}
          iconColor="gold"
          subtitle={`Değer: ₺${totalPoints.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`}
        />
        <StatCard
          title="Şampiyon Müşteriler (VIP)"
          value={`${championsCount} Müşteri`}
          icon={Crown}
          iconColor="emerald"
          subtitle="En Yüksek Frekans & Hacimli Kitle"
        />
        <StatCard
          title="Yaklaşan Özel Günler"
          value={`${upcomingCount} Etkinlik`}
          icon={Gift}
          iconColor="purple"
          subtitle="Gelecek 15 Gün İçinde Kutlanacak"
        />
        <StatCard
          title="Emanet Altın Kasası"
          value={`${(data.totalEmanetGold || 0).toFixed(3)} gr`}
          icon={Scale}
          iconColor="blue"
          subtitle={`${data.deposits.length} Adet Aktif Emanet Kaydı`}
        />
      </div>

      {/* 2. SEKME BAŞLIKLARI */}
      <LuxuryTabs<'rfm' | 'points' | 'special_days' | 'deposits'>
        tabs={[
          { id: 'rfm', label: '1. RFM Segmentasyon Matrisi', icon: <Crown className="w-4 h-4" /> },
          { id: 'points', label: '2. Sadakat Kademeleri & ParaPuan', icon: <Award className="w-4 h-4" /> },
          { id: 'special_days', label: '3. Özel Günler Takvimi', icon: <Gift className="w-4 h-4" />, count: data.upcomingEvents.length },
          { id: 'deposits', label: '4. Emanet Altın Kasası', icon: <Scale className="w-4 h-4" />, count: data.deposits.length },
        ]}
        activeTab={activeTab}
        onChange={(tab) => setActiveTab(tab)}
      />

      <div className={`${THEME.GLASS_CARD} flex flex-col overflow-hidden`}>

          {/* ─── SEKME 1: RFM MATRİSİ ─── */}
          {activeTab === 'rfm' && (
            <div className="p-4 flex flex-col gap-4">
              {/* Segment Kartları Rozetleri */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
                {Object.entries(RFM_SEGMENTS).map(([key, value]) => {
                  const config = RFM_SEGMENT_CONFIG[value as RfmSegment];
                  const count = data.customers.filter((c) => c.rfmSegment === value).length;
                  const isSelected = selectedSegmentFilter === value;

                  return (
                    <button
                      key={key}
                      onClick={() => setSelectedSegmentFilter(isSelected ? 'ALL' : value)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        isSelected
                          ? `${config.bg} ${config.border} ring-2 ring-yellow-500/50`
                          : 'bg-slate-900/40 border-slate-800 hover:bg-slate-900'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-[10px] font-black uppercase ${config.color}`}>
                          {config.label}
                        </span>
                        <span className="font-mono font-bold text-xs text-white">({count})</span>
                      </div>
                      <p className="text-[10px] text-slate-400 line-clamp-2 leading-tight">
                        {config.description}
                      </p>
                    </button>
                  );
                })}
              </div>

              {/* Arama ve Filtreleme */}
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="relative flex-1 max-w-sm">
                  <Search size={14} className="absolute left-3 top-3 text-slate-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Müşteri adı veya telefon ara..."
                    className="w-full pl-9 pr-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-yellow-500"
                  />
                </div>
                {selectedSegmentFilter !== 'ALL' && (
                  <button
                    onClick={() => setSelectedSegmentFilter('ALL')}
                    className="text-xs text-yellow-500 hover:underline font-semibold"
                  >
                    Filtreyi Temizle ({selectedSegmentFilter})
                  </button>
                )}
              </div>

              {/* Müşteri Tablosu */}
              <div className="overflow-x-auto border border-slate-800/80 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/60 text-slate-400 text-[10px] uppercase font-bold border-b border-slate-800">
                    <tr>
                      <th className="p-3.5">Müşteri</th>
                      <th className="p-3.5">Telefon</th>
                      <th className="p-3.5">Sadakat Kademesi</th>
                      <th className="p-3.5 text-center">RFM Skoru</th>
                      <th className="p-3.5 text-center">Segment</th>
                      <th className="p-3.5 text-right">Son İşlem (Gün)</th>
                      <th className="p-3.5 text-right">İşlem Adedi</th>
                      <th className="p-3.5 text-right">Toplam Harcama (TL)</th>
                      <th className="p-3.5 text-right">ParaPuan</th>
                      <th className="p-3.5 text-center">İşlem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium text-slate-300">
                    {filteredCustomers.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="p-8 text-center text-slate-500">
                          Kriterlere uygun müşteri bulunamadı.
                        </td>
                      </tr>
                    ) : (
                      filteredCustomers.map((c) => {
                        const seg = (c.rfmSegment as RfmSegment) || RFM_SEGMENTS.NEW_CUSTOMERS;
                        const config = RFM_SEGMENT_CONFIG[seg] || RFM_SEGMENT_CONFIG[RFM_SEGMENTS.NEW_CUSTOMERS];
                        const tier = (c.loyaltyTier as LoyaltyTier) || LOYALTY_TIERS.BRONZE;
                        const tierConfig = LOYALTY_TIER_CONFIG[tier];

                        return (
                          <tr key={c.id} className="hover:bg-slate-900/30 transition-colors">
                            <td className="p-3.5 font-bold text-white">{c.name}</td>
                            <td className="p-3.5 text-slate-400 font-mono">{c.phone || '—'}</td>
                            <td className="p-3.5">
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${tierConfig.bg} ${tierConfig.color} ${tierConfig.border}`}>
                                {tierConfig.label}
                              </span>
                            </td>
                            <td className="p-3.5 text-center font-mono font-bold text-yellow-400">
                              {c.rfmScore || '—'}
                            </td>
                            <td className="p-3.5 text-center">
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${config.bg} ${config.color} ${config.border}`}>
                                {config.label}
                              </span>
                            </td>
                            <td className="p-3.5 text-right font-mono text-slate-300">
                              {c.rfmRecencyDays != null ? `${c.rfmRecencyDays} gün önce` : '—'}
                            </td>
                            <td className="p-3.5 text-right font-mono text-slate-300">
                              {c.rfmFrequency ?? 0}
                            </td>
                            <td className="p-3.5 text-right font-mono font-bold text-white">
                              ₺{(c.rfmMonetaryTL ?? 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="p-3.5 text-right font-mono font-black text-yellow-400">
                              {(c.loyaltyPoints ?? 0).toLocaleString('tr-TR')}
                            </td>
                            <td className="p-3.5 text-center">
                              <button
                                onClick={() => {
                                  setSelectedCustomerForPoints(c);
                                  setIsPointModalOpen(true);
                                }}
                                className="px-2.5 py-1 bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/40 text-yellow-300 rounded-lg text-[10px] font-bold flex items-center gap-1 mx-auto transition-colors"
                              >
                                <Coins size={12} />
                                Puan Ekle
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ─── SEKME 2: SADAKAT KADEMELERİ & PARAPUAN ─── */}
          {activeTab === 'points' && (
            <div className="p-4 flex flex-col gap-6">
              {/* Kademe Kuralları */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {Object.entries(LOYALTY_TIERS).map(([key, tierKey]) => {
                  const cfg = LOYALTY_TIER_CONFIG[tierKey as LoyaltyTier];
                  const memberCount = data.customers.filter((c) => (c.loyaltyTier || 'BRONZE') === tierKey).length;

                  return (
                    <div key={key} className={`${THEME.GLASS_CARD} p-4 border ${cfg.border} ${cfg.bg} flex flex-col justify-between`}>
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-sm font-black uppercase ${cfg.color}`}>{cfg.label}</span>
                          <Crown size={18} className={cfg.color} />
                        </div>
                        <div className="text-xl font-black font-mono text-white mb-1">
                          %{(cfg.earnRate * 100).toFixed(1)} Puan Kazanımı
                        </div>
                        <p className="text-[11px] text-slate-400">
                          {cfg.minSpendTL === 0 ? 'Giriş seviyesi (0 TL+)' : `Min. ₺${cfg.minSpendTL.toLocaleString('tr-TR')} Harcama`}
                        </p>
                      </div>
                      <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                        <span className="text-slate-400">Aktif Üye Sayısı:</span>
                        <span className="font-mono font-black text-white">{memberCount} Müşteri</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* En Çok Puanı Olan Müşteriler Tablosu */}
              <div className="border border-slate-800/80 rounded-xl overflow-hidden">
                <div className="p-3.5 bg-slate-900/60 border-b border-slate-800 flex items-center justify-between">
                  <h3 className="text-xs font-bold text-white flex items-center gap-2">
                    <Coins size={14} className="text-yellow-400" />
                    En Yüksek Puan Bakiyesine Sahip Müşteriler
                  </h3>
                </div>
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/30 text-slate-400 text-[10px] uppercase font-bold border-b border-slate-800">
                    <tr>
                      <th className="p-3.5">Müşteri</th>
                      <th className="p-3.5">Kademe</th>
                      <th className="p-3.5 text-right">ParaPuan Bakiyesi</th>
                      <th className="p-3.5 text-right">TL Değeri</th>
                      <th className="p-3.5 text-center">Hızlı Puan Tanımla</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium text-slate-300">
                    {data.customers.slice(0, 15).map((c) => {
                      const tier = (c.loyaltyTier as LoyaltyTier) || LOYALTY_TIERS.BRONZE;
                      const tierConfig = LOYALTY_TIER_CONFIG[tier];

                      return (
                        <tr key={c.id} className="hover:bg-slate-900/30 transition-colors">
                          <td className="p-3.5 font-bold text-white">{c.name}</td>
                          <td className="p-3.5">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${tierConfig.bg} ${tierConfig.color} ${tierConfig.border}`}>
                              {tierConfig.label}
                            </span>
                          </td>
                          <td className="p-3.5 text-right font-mono font-black text-yellow-400 text-sm">
                            {(c.loyaltyPoints || 0).toLocaleString('tr-TR')}
                          </td>
                          <td className="p-3.5 text-right font-mono font-bold text-emerald-400">
                            ₺{(c.loyaltyPoints || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-3.5 text-center">
                            <button
                              onClick={() => {
                                setSelectedCustomerForPoints(c);
                                setIsPointModalOpen(true);
                              }}
                              className="px-3 py-1 bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/40 text-yellow-300 rounded-lg text-[10px] font-bold transition-colors"
                            >
                              Puan Düzenle
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ─── SEKME 3: ÖZEL GÜNLER TAKVİMİ ─── */}
          {activeTab === 'special_days' && (
            <div className="p-4 flex flex-col gap-4">
              <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-xl text-xs text-purple-300 flex items-center justify-between">
                <span>
                  Önümüzdeki 15 gün içerisinde doğum günü veya evlilik yıldönümü olan müşteriler aşağıda listelenmiştir.
                </span>
                <span className="font-bold font-mono">{data.upcomingEvents.length} Yaklaşan Özel Gün</span>
              </div>

              <div className="overflow-x-auto border border-slate-800/80 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/60 text-slate-400 text-[10px] uppercase font-bold border-b border-slate-800">
                    <tr>
                      <th className="p-3.5">Müşteri</th>
                      <th className="p-3.5">Telefon</th>
                      <th className="p-3.5">Özel Gün Türü</th>
                      <th className="p-3.5">Tarih</th>
                      <th className="p-3.5 text-center">Kalan Süre</th>
                      <th className="p-3.5 text-right">Mevcut Puan</th>
                      <th className="p-3.5 text-center">Kutlama & Hediye</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium text-slate-300">
                    {data.upcomingEvents.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-500">
                          Önümüzdeki 15 gün içinde kayıtlı bir doğum günü veya yıldönümü bulunamadı.
                        </td>
                      </tr>
                    ) : (
                      data.upcomingEvents.map((ev, idx) => (
                        <tr key={idx} className="hover:bg-slate-900/30 transition-colors">
                          <td className="p-3.5 font-bold text-white">{ev.customerName}</td>
                          <td className="p-3.5 font-mono text-slate-400">{ev.phone || '—'}</td>
                          <td className="p-3.5">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              ev.type === 'BIRTHDAY'
                                ? 'bg-pink-500/20 text-pink-400 border border-pink-500/30'
                                : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                            }`}>
                              {ev.typeLabel}
                            </span>
                          </td>
                          <td className="p-3.5 font-mono text-slate-300">
                            {new Date(ev.date).toLocaleDateString('tr-TR', { day: '2-digit', month: 'long' })}
                          </td>
                          <td className="p-3.5 text-center">
                            <span className={`px-2.5 py-1 rounded-xl text-xs font-black font-mono ${
                              ev.daysLeft === 0
                                ? 'bg-emerald-500 text-black'
                                : ev.daysLeft <= 3
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                : 'bg-slate-800 text-slate-300'
                            }`}>
                              {ev.daysLeft === 0 ? 'BUGÜN! 🎉' : `${ev.daysLeft} gün kaldı`}
                            </span>
                          </td>
                          <td className="p-3.5 text-right font-mono font-bold text-yellow-400">
                            {(ev.loyaltyPoints || 0).toLocaleString('tr-TR')}
                          </td>
                          <td className="p-3.5 text-center">
                            <button
                              onClick={() => {
                                setSelectedEventForCongrat(ev);
                                setIsCongratModalOpen(true);
                              }}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-black font-black rounded-xl text-xs flex items-center gap-1.5 mx-auto transition-all shadow-md shadow-emerald-600/20"
                            >
                              <Send size={12} />
                              Tebrik Et & WhatsApp
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ─── SEKME 4: EMANET ALTIN KASASI ─── */}
          {activeTab === 'deposits' && (
            <div className="p-4 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="text-xs text-slate-400">
                  Müşterilerin mağazada saklanmak üzere bıraktığı fiziki altınlar (Burma, Ziynet, Has).
                </div>
                <button
                  onClick={() => setIsDepositModalOpen(true)}
                  className="px-3.5 py-2 bg-yellow-500 hover:bg-yellow-400 text-black rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-md shadow-yellow-500/20"
                >
                  <Plus size={14} />
                  Yeni Emanet Girişi
                </button>
              </div>

              <div className="overflow-x-auto border border-slate-800/80 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/60 text-slate-400 text-[10px] uppercase font-bold border-b border-slate-800">
                    <tr>
                      <th className="p-3.5">Tarih</th>
                      <th className="p-3.5">Müşteri</th>
                      <th className="p-3.5">Emanet Ürün Tanımı</th>
                      <th className="p-3.5 text-right">Ayar</th>
                      <th className="p-3.5 text-right">Gramaj (gr)</th>
                      <th className="p-3.5 text-right">Has Karşılığı (gr)</th>
                      <th className="p-3.5 text-center">Durum</th>
                      <th className="p-3.5">Not</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium text-slate-300">
                    {data.deposits.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-slate-500">
                          Kasada kayıtlı emanet altın bulunmamaktadır.
                        </td>
                      </tr>
                    ) : (
                      data.deposits.map((dep) => (
                        <tr key={dep.id} className="hover:bg-slate-900/30 transition-colors">
                          <td className="p-3.5 text-slate-400 font-mono">
                            {new Date(dep.createdAt).toLocaleDateString('tr-TR')}
                          </td>
                          <td className="p-3.5 font-bold text-white">{dep.customer?.name || '—'}</td>
                          <td className="p-3.5 text-slate-200">{dep.itemDescription}</td>
                          <td className="p-3.5 text-right font-mono text-slate-400">{dep.carat || 24}K</td>
                          <td className="p-3.5 text-right font-mono font-bold text-white">
                            {dep.weight.toFixed(3)} gr
                          </td>
                          <td className="p-3.5 text-right font-mono font-black text-yellow-400">
                            {dep.pureGoldWeight.toFixed(3)} gr
                          </td>
                          <td className="p-3.5 text-center">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              dep.status === 'ACTIVE'
                                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                : 'bg-slate-800 text-slate-400'
                            }`}>
                              {dep.status === 'ACTIVE' ? 'KASADA' : 'İADE EDİLDİ'}
                            </span>
                          </td>
                          <td className="p-3.5 text-slate-400 max-w-xs truncate">{dep.notes || '—'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

      {/* ─── MODAL 1: PUAN DÜZENLEME MODALI ─── */}
      <AnimatePresence>
        {isPointModalOpen && selectedCustomerForPoints && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`${THEME.GLASS_CARD} w-full max-w-md p-6 flex flex-col gap-4 border border-yellow-500/30`}
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Coins className="text-yellow-400" size={20} />
                  <h2 className="text-sm font-bold text-white">ParaPuan Yönetimi</h2>
                </div>
                <button onClick={() => setIsPointModalOpen(false)} className="text-slate-400 hover:text-white">
                  <X size={18} />
                </button>
              </div>

              <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs">
                <div className="text-slate-400">Müşteri: <span className="text-white font-bold">{selectedCustomerForPoints.name}</span></div>
                <div className="text-slate-400 mt-1">Mevcut Bakiye: <span className="text-yellow-400 font-mono font-bold">{selectedCustomerForPoints.loyaltyPoints} Puan</span></div>
              </div>

              <form onSubmit={handlePointSubmit} className="flex flex-col gap-3.5 text-xs">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">İşlem Türü</label>
                  <select
                    value={pointForm.actionType}
                    onChange={(e) => setPointForm({ ...pointForm, actionType: e.target.value as any })}
                    className="w-full px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-yellow-500"
                  >
                    <option value={LOYALTY_ACTION_TYPES.EARN}>Puan Ekle / Hediye Et (+)</option>
                    <option value={LOYALTY_ACTION_TYPES.REDEEM}>Puan Düş / Harcama (-)</option>
                    <option value={LOYALTY_ACTION_TYPES.ADJUST}>Bakiye Düzeltme (±)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Puan Tutarı *</label>
                  <input
                    type="number"
                    step="1"
                    required
                    value={pointForm.points}
                    onChange={(e) => setPointForm({ ...pointForm, points: e.target.value })}
                    placeholder="Örn: 250"
                    className="w-full px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-yellow-500"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">1 ParaPuan = 1.00 TL İndirim</span>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">İşlem Açıklaması / Gerekçe</label>
                  <input
                    type="text"
                    value={pointForm.description}
                    onChange={(e) => setPointForm({ ...pointForm, description: e.target.value })}
                    placeholder="Örn: Sadakat jesti, telafi indirimi..."
                    className="w-full px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-yellow-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800 mt-2">
                  <button
                    type="button"
                    onClick={() => setIsPointModalOpen(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold"
                  >
                    İptal
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-5 py-2 bg-yellow-500 hover:bg-yellow-400 text-black font-black rounded-xl shadow-lg shadow-yellow-500/20"
                  >
                    {loading ? 'İşleniyor...' : 'Puanı Kaydet'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── MODAL 2: ÖZEL GÜN TEBRİK & WHATSAPP MODALI ─── */}
      <AnimatePresence>
        {isCongratModalOpen && selectedEventForCongrat && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`${THEME.GLASS_CARD} w-full max-w-md p-6 flex flex-col gap-4 border border-emerald-500/30`}
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Gift className="text-emerald-400" size={20} />
                  <h2 className="text-sm font-bold text-white">{selectedEventForCongrat.typeLabel} Tebriği</h2>
                </div>
                <button onClick={() => setIsCongratModalOpen(false)} className="text-slate-400 hover:text-white">
                  <X size={18} />
                </button>
              </div>

              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs">
                <div className="text-emerald-300 font-bold">{selectedEventForCongrat.customerName}</div>
                <div className="text-slate-400 text-[11px] mt-0.5">Telefon: {selectedEventForCongrat.phone || 'Tanımsız'}</div>
              </div>

              <form onSubmit={handleCongratSubmit} className="flex flex-col gap-3.5 text-xs">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Tanımlanacak Hediye ParaPuan (TL)</label>
                  <input
                    type="number"
                    step="1"
                    value={congratForm.giftPoints}
                    onChange={(e) => setCongratForm({ ...congratForm, giftPoints: e.target.value })}
                    placeholder="250"
                    className="w-full px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-emerald-500"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">0 bırakırsanız puan yüklenmez, yalnızca kutlama mesajı üretilir.</span>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">İndirim Kupon Kodu (Opsiyonel)</label>
                  <input
                    type="text"
                    value={congratForm.discountCode}
                    onChange={(e) => setCongratForm({ ...congratForm, discountCode: e.target.value })}
                    placeholder="OZELGUN10"
                    className="w-full px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800 mt-2">
                  <button
                    type="button"
                    onClick={() => setIsCongratModalOpen(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold"
                  >
                    Vazgeç
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-black font-black rounded-xl shadow-lg shadow-emerald-600/20 flex items-center gap-1.5"
                  >
                    <Send size={14} />
                    {loading ? 'Hazırlanıyor...' : 'WhatsApp ile Gönder'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── MODAL 3: YENİ EMANET ALTIN MODALI ─── */}
      <AnimatePresence>
        {isDepositModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`${THEME.GLASS_CARD} w-full max-w-md p-6 flex flex-col gap-4 border border-yellow-500/30`}
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Scale className="text-yellow-400" size={20} />
                  <h2 className="text-sm font-bold text-white">Yeni Emanet Altın Girişi</h2>
                </div>
                <button onClick={() => setIsDepositModalOpen(false)} className="text-slate-400 hover:text-white">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleDepositSubmit} className="flex flex-col gap-3.5 text-xs">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Müşteri Seçin *</label>
                  <select
                    required
                    value={depositForm.customerId}
                    onChange={(e) => setDepositForm({ ...depositForm, customerId: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-yellow-500"
                  >
                    <option value="">Seçiniz...</option>
                    {data.customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.phone || 'No yok'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Emanet Altın Tanımı *</label>
                  <input
                    type="text"
                    required
                    value={depositForm.itemDescription}
                    onChange={(e) => setDepositForm({ ...depositForm, itemDescription: e.target.value })}
                    placeholder="Örn: 3 Adet Adana Burma Bilezik veya 20 gr Has Altın"
                    className="w-full px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-yellow-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Gramaj (gr) *</label>
                    <input
                      type="number"
                      step="0.001"
                      required
                      value={depositForm.weight}
                      onChange={(e) => setDepositForm({ ...depositForm, weight: e.target.value })}
                      placeholder="0.000"
                      className="w-full px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-yellow-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Ayar (K)</label>
                    <select
                      value={depositForm.carat}
                      onChange={(e) => setDepositForm({ ...depositForm, carat: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-yellow-500"
                    >
                      <option value="24">24 Ayar (0.995)</option>
                      <option value="22">22 Ayar (0.916)</option>
                      <option value="18">18 Ayar (0.750)</option>
                      <option value="14">14 Ayar (0.585)</option>
                      <option value="8">8 Ayar (0.333)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Özel Notlar</label>
                  <input
                    type="text"
                    value={depositForm.notes}
                    onChange={(e) => setDepositForm({ ...depositForm, notes: e.target.value })}
                    placeholder="Saklama kasası no veya teslim alan personel..."
                    className="w-full px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-yellow-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800 mt-2">
                  <button
                    type="button"
                    onClick={() => setIsDepositModalOpen(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold"
                  >
                    İptal
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-5 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-black font-black rounded-xl shadow-lg shadow-yellow-500/20"
                  >
                    {loading ? 'Kaydediliyor...' : 'Emaneti Teslim Al'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building,
  Coins,
  CreditCard,
  Landmark,
  Flame,
  Scale,
  TrendingUp,
  Clock,
  User,
  Plus,
  Lock,
  Unlock,
  Printer,
  ArrowDownRight,
  ArrowUpRight,
  Search,
  RefreshCw,
  FileText,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Layers,
  ArrowRight,
  X
} from 'lucide-react';
import { THEME, ANIM } from '@/constants/theme';
import { ROUTES } from '@/constants/routes';
import {
  SESSION_STATUS,
  CASH_MOVEMENT_TYPES,
  CASH_MOVEMENT_CATEGORIES,
  CASH_MOVEMENT_CATEGORY_LABELS,
  DISCREPANCY_STATUS,
  DISCREPANCY_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  CASH_CURRENCIES,
  PaymentMethod,
} from '@/constants/kasa';
import { DailyZReportMetrics, CashMovementRecord } from '@/lib/z-report';
import ZReportSlipModal from '@/components/ZReportSlipModal';
import HeaderActions from '@/components/HeaderActions';

interface ZReportClientProps {
  initialSummary: {
    activeSession: DailyZReportMetrics | null;
    archiveSessions: DailyZReportMetrics[];
    recentMovements: CashMovementRecord[];
  };
  dealerId: string;
  currentUserName: string;
}

export default function ZReportClient({
  initialSummary,
  dealerId,
  currentUserName,
}: ZReportClientProps) {
  const [data, setData] = useState(initialSummary);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [activeTab, setActiveTab] = useState<'movements' | 'archive'>('movements');

  // Modallar
  const [isOpenModalOpen, setIsOpenModalOpen] = useState(false);
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [isSlipModalOpen, setIsSlipModalOpen] = useState(false);
  const [selectedSlipMetrics, setSelectedSlipMetrics] = useState<DailyZReportMetrics | null>(null);

  // Kasa Açılış Form State
  const [openForm, setOpenForm] = useState({
    openingCashTL: '0',
    openingCashUSD: '0',
    openingCashEUR: '0',
    openingHasGram: '0',
    openedBy: currentUserName,
    notes: '',
  });

  // Kasa Kapatma Form State
  const [closeForm, setCloseForm] = useState({
    countedCashTL: '',
    countedCashUSD: '',
    countedCashEUR: '',
    countedHasGram: '',
    closedBy: currentUserName,
    notes: '',
  });

  // Manuel Hareket Form State
  const [movementForm, setMovementForm] = useState({
    type: 'INFLOW',
    category: 'CAPITAL',
    amount: '',
    currency: 'TL',
    description: '',
    employeeName: currentUserName,
  });

  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Verileri yenile
  const fetchData = async (dateStr?: string) => {
    setLoading(true);
    try {
      const url = dateStr ? `${ROUTES.API_Z_REPORT}?date=${dateStr}` : ROUTES.API_Z_REPORT;
      const res = await fetch(url);
      const result = await res.json();
      if (res.ok) {
        setData(result);
      } else {
        showToast(result.error || 'Veriler alınamadı.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Ağ hatası oluştu.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Kasa Açılışı Gönder
  const handleOpenShift = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(ROUTES.API_Z_REPORT_SESSION, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'open',
          openingCashTL: parseFloat(openForm.openingCashTL) || 0,
          openingCashUSD: parseFloat(openForm.openingCashUSD) || 0,
          openingCashEUR: parseFloat(openForm.openingCashEUR) || 0,
          openingHasGram: parseFloat(openForm.openingHasGram) || 0,
          openedBy: openForm.openedBy,
          notes: openForm.notes,
        }),
      });
      const result = await res.json();
      if (!res.ok) {
        showToast(result.error || 'Kasa açılamadı.', 'error');
      } else {
        showToast('✓ Kasa oturumu başarıyla açıldı.', 'success');
        setIsOpenModalOpen(false);
        await fetchData(selectedDate);
      }
    } catch (err) {
      console.error(err);
      showToast('Kasa açma işlemi başarısız.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Kasa Kapatma Gönder
  const handleCloseShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!closeForm.countedCashTL) {
      showToast('Lütfen fiili sayılan TL nakit tutarını giriniz.', 'error');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(ROUTES.API_Z_REPORT_SESSION, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'close',
          sessionId: activeSession?.sessionId,
          countedCashTL: parseFloat(closeForm.countedCashTL) || 0,
          countedCashUSD: closeForm.countedCashUSD ? parseFloat(closeForm.countedCashUSD) : null,
          countedCashEUR: closeForm.countedCashEUR ? parseFloat(closeForm.countedCashEUR) : null,
          countedHasGram: closeForm.countedHasGram ? parseFloat(closeForm.countedHasGram) : null,
          closedBy: closeForm.closedBy,
          notes: closeForm.notes,
        }),
      });
      const result = await res.json();
      if (!res.ok) {
        showToast(result.error || 'Kasa kapatılamadı.', 'error');
      } else {
        showToast('✓ Kasa kapatıldı ve Z-Raporu oluşturuldu.', 'success');
        setIsCloseModalOpen(false);
        setSelectedSlipMetrics(result.session);
        setIsSlipModalOpen(true);
        await fetchData(selectedDate);
      }
    } catch (err) {
      console.error(err);
      showToast('Kasa kapatma işlemi başarısız.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Manuel Hareket Gönder
  const handleAddMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(movementForm.amount);
    if (!amountNum || amountNum <= 0) {
      showToast('Geçerli bir tutar giriniz.', 'error');
      return;
    }
    if (!movementForm.description) {
      showToast('Açıklama girilmesi zorunludur.', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(ROUTES.API_Z_REPORT_SESSION, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'movement',
          type: movementForm.type,
          category: movementForm.category,
          amount: amountNum,
          currency: movementForm.currency,
          description: movementForm.description,
          employeeName: movementForm.employeeName,
        }),
      });
      const result = await res.json();
      if (!res.ok) {
        showToast(result.error || 'Hareket eklenemedi.', 'error');
      } else {
        showToast('✓ Kasa hareketi başarıyla kaydedildi.', 'success');
        setIsMovementModalOpen(false);
        setMovementForm({
          type: 'INFLOW',
          category: 'CAPITAL',
          amount: '',
          currency: 'TL',
          description: '',
          employeeName: currentUserName,
        });
        await fetchData(selectedDate);
      }
    } catch (err) {
      console.error(err);
      showToast('Hareket eklenemedi.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const activeSession = data.activeSession;
  const isSessionOpen = activeSession && activeSession.status === SESSION_STATUS.OPEN;

  // Hesaplanan Kasa Farkı (Kapatma modalı için)
  const countedNum = parseFloat(closeForm.countedCashTL) || 0;
  const expectedNum = activeSession?.systemCashTL || 0;
  const currentDiff = closeForm.countedCashTL !== '' ? Number((countedNum - expectedNum).toFixed(2)) : null;

  return (
    <div className="flex flex-col min-h-screen bg-gray-950 text-gray-100 pb-16">
      {/* Toast Mesajı */}
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

      {/* ─── ÜST BAŞLIK & KONTROLLER ─── */}
      <header className="sticky top-0 z-30 bg-gray-950/80 backdrop-blur-md border-b border-gray-800/80 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 rounded-2xl">
            <Building size={22} />
          </div>
          <div>
            <h1 className="text-lg font-black text-white flex items-center gap-2">
              Gün Sonu & Kasa Kapatma (Z-Raporu)
              {isSessionOpen ? (
                <span className="px-2.5 py-0.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-[10px] font-extrabold rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  KASA AÇIK
                </span>
              ) : (
                <span className="px-2.5 py-0.5 bg-gray-800 border border-gray-700 text-gray-400 text-[10px] font-bold rounded-full">
                  KASA KAPALI
                </span>
              )}
            </h1>
            <p className="text-xs text-gray-400">
              Nakit, POS, Havale, Hurda Alış ve Has mutabakatı & Devir Raporu
            </p>
          </div>
        </div>

        {/* Sağ Butonlar */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Tarih Seçici */}
          <div className="flex items-center gap-2 bg-gray-900 border border-gray-800 rounded-xl px-3 py-1.5 text-xs text-gray-300">
            <Calendar size={14} className="text-yellow-500" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                fetchData(e.target.value);
              }}
              className="bg-transparent text-white text-xs focus:outline-none cursor-pointer"
            />
          </div>

          <button
            onClick={() => fetchData(selectedDate)}
            disabled={loading}
            className="p-2.5 bg-gray-900 hover:bg-gray-800 border border-gray-800 text-gray-300 rounded-xl transition-colors disabled:opacity-50"
            title="Yenile"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin text-yellow-500' : ''} />
          </button>

          {isSessionOpen ? (
            <>
              {/* Manuel Hareket Ekle */}
              <button
                onClick={() => setIsMovementModalOpen(true)}
                className="px-3.5 py-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
              >
                <Plus size={14} />
                Kasa Hareketi
              </button>

              {/* Fiş Yazdır */}
              <button
                onClick={() => {
                  setSelectedSlipMetrics(activeSession);
                  setIsSlipModalOpen(true);
                }}
                className="px-3.5 py-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-purple-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
              >
                <Printer size={14} />
                Ara Z-Fişi
              </button>

              {/* Kasa Kapat */}
              <button
                onClick={() => {
                  setCloseForm({
                    countedCashTL: '',
                    countedCashUSD: '',
                    countedCashEUR: '',
                    countedHasGram: '',
                    closedBy: currentUserName,
                    notes: '',
                  });
                  setIsCloseModalOpen(true);
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-lg shadow-red-600/20"
              >
                <Lock size={14} />
                Kasayı Kapat & Z-Raporu Al
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsOpenModalOpen(true)}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-lg shadow-emerald-500/20"
            >
              <Unlock size={14} />
              Yeni Kasa Oturumu Aç
            </button>
          )}

          <HeaderActions />
        </div>
      </header>

      {/* ─── ANA İÇERİK ALANI ─── */}
      <main className="p-6 max-w-[1920px] mx-auto w-full flex flex-col gap-6">
        {/* 1. AKTİF OTURUM DURUM BANDI */}
        {activeSession && (
          <div className={`${THEME.GLASS_CARD} p-5 border border-yellow-500/20 flex flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-gray-900 via-gray-900 to-yellow-950/20`}>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex flex-col">
                <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Oturum No</span>
                <span className="text-sm font-mono font-black text-yellow-400">{activeSession.sessionNumber}</span>
              </div>
              <div className="h-8 w-px bg-gray-800 hidden sm:block" />
              <div className="flex flex-col">
                <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Açılış Saati & Personel</span>
                <span className="text-xs text-white font-medium flex items-center gap-1.5">
                  <Clock size={12} className="text-gray-400" />
                  {new Date(activeSession.openedAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                  <span className="text-gray-500">|</span>
                  <User size={12} className="text-gray-400" />
                  {activeSession.openedBy}
                </span>
              </div>
              <div className="h-8 w-px bg-gray-800 hidden sm:block" />
              <div className="flex flex-col">
                <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Devir Açılış Kasası</span>
                <span className="text-xs font-mono font-bold text-white">
                  ₺{activeSession.openingCashTL.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Mutabakat Durumu Rozeti */}
            {activeSession.status === SESSION_STATUS.CLOSED && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">Mutabakat:</span>
                <span className={`px-3 py-1 rounded-xl text-xs font-black border flex items-center gap-1.5 ${
                  activeSession.discrepancyStatus === DISCREPANCY_STATUS.SHORTAGE
                    ? 'bg-red-500/20 border-red-500/40 text-red-400'
                    : activeSession.discrepancyStatus === DISCREPANCY_STATUS.OVERAGE
                    ? 'bg-blue-500/20 border-blue-500/40 text-blue-400'
                    : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                }`}>
                  {DISCREPANCY_STATUS_LABELS[activeSession.discrepancyStatus]}
                  {activeSession.discrepancyTL != null && activeSession.discrepancyTL !== 0 && (
                    <span className="font-mono">
                      ({activeSession.discrepancyTL >= 0 ? '+' : ''}₺{activeSession.discrepancyTL.toLocaleString('tr-TR', { minimumFractionDigits: 2 })})
                    </span>
                  )}
                </span>
              </div>
            )}
          </div>
        )}

        {/* 2. ÇOK KANALLI HASILAT KARTLARI (6 KPI KARTI) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {/* KART 1: NAKİT KASA (TL) */}
          <div className={`${THEME.GLASS_CARD} p-4 flex flex-col justify-between border-l-4 border-l-amber-500`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-gray-400">Nakit Kasa (TL)</span>
              <div className="p-1.5 bg-amber-500/10 text-amber-400 rounded-lg">
                <Coins size={16} />
              </div>
            </div>
            <div>
              <div className="text-xl font-black font-mono text-white">
                ₺{(activeSession?.systemCashTL ?? 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
              </div>
              <div className="mt-1 flex items-center justify-between text-[10px] text-gray-400">
                <span>Nakit Satış: ₺{(activeSession?.cashSales ?? 0).toLocaleString('tr-TR')}</span>
                <span>Tahsilat: ₺{(activeSession?.customerCashCollections ?? 0).toLocaleString('tr-TR')}</span>
              </div>
            </div>
          </div>

          {/* KART 2: POS / KREDİ KARTI */}
          <div className={`${THEME.GLASS_CARD} p-4 flex flex-col justify-between border-l-4 border-l-purple-500`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-gray-400">POS / Kredi Kartı</span>
              <div className="p-1.5 bg-purple-500/10 text-purple-400 rounded-lg">
                <CreditCard size={16} />
              </div>
            </div>
            <div>
              <div className="text-xl font-black font-mono text-white">
                ₺{(activeSession?.cardSales ?? 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
              </div>
              <div className="mt-1 text-[10px] text-purple-300/80">
                Banka POS Hasılatı
              </div>
            </div>
          </div>

          {/* KART 3: BANKA HAVALE / FAST */}
          <div className={`${THEME.GLASS_CARD} p-4 flex flex-col justify-between border-l-4 border-l-blue-500`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-gray-400">Banka / FAST</span>
              <div className="p-1.5 bg-blue-500/10 text-blue-400 rounded-lg">
                <Landmark size={16} />
              </div>
            </div>
            <div>
              <div className="text-xl font-black font-mono text-white">
                ₺{(activeSession?.bankSales ?? 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
              </div>
              <div className="mt-1 text-[10px] text-blue-300/80">
                Hesaba Gelen Havaleler
              </div>
            </div>
          </div>

          {/* KART 4: HURDA & GERİ ALIŞ */}
          <div className={`${THEME.GLASS_CARD} p-4 flex flex-col justify-between border-l-4 border-l-orange-500`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-gray-400">Hurda / Geri Alış</span>
              <div className="p-1.5 bg-orange-500/10 text-orange-400 rounded-lg">
                <Flame size={16} />
              </div>
            </div>
            <div>
              <div className="text-xl font-black font-mono text-orange-400">
                -₺{(activeSession?.scrapCashPurchases ?? 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
              </div>
              <div className="mt-1 text-[10px] text-gray-400">
                Giren Hurda: <span className="font-bold text-white">{(activeSession?.scrapGoldGramsIn ?? 0).toFixed(3)} gr</span>
              </div>
            </div>
          </div>

          {/* KART 5: HAS ALTIN AKIŞI */}
          <div className={`${THEME.GLASS_CARD} p-4 flex flex-col justify-between border-l-4 border-l-yellow-500`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-gray-400">Has Altın Akışı</span>
              <div className="p-1.5 bg-yellow-500/10 text-yellow-400 rounded-lg">
                <Scale size={16} />
              </div>
            </div>
            <div>
              <div className="text-xl font-black font-mono text-yellow-400">
                {(activeSession?.systemHasGram ?? 0).toFixed(3)} gr
              </div>
              <div className="mt-1 text-[10px] text-gray-400">
                Ödenen: {(activeSession?.supplierHasPaymentsGram ?? 0).toFixed(2)} gr | Tahsilat: {(activeSession?.customerHasCollectionsGram ?? 0).toFixed(2)} gr
              </div>
            </div>
          </div>

          {/* KART 6: GÜNLÜK TOPLAM CİRO */}
          <div className={`${THEME.GLASS_CARD} p-4 flex flex-col justify-between border-l-4 border-l-emerald-500 bg-emerald-950/10`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-emerald-400">Toplam Ciro</span>
              <div className="p-1.5 bg-emerald-500/20 text-emerald-300 rounded-lg">
                <TrendingUp size={16} />
              </div>
            </div>
            <div>
              <div className="text-xl font-black font-mono text-emerald-400">
                ₺{(activeSession?.totalTurnover ?? 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
              </div>
              <div className="mt-1 text-[10px] text-gray-400">
                Toplam {(activeSession?.totalSalesCount ?? 0)} POS Satışı
              </div>
            </div>
          </div>
        </div>

        {/* GÜNLÜK KÂR / ZARAR & MARJ ANALİZ BANNER'I */}
        {activeSession && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className={`${THEME.GLASS_CARD} p-4 border border-emerald-500/30 bg-emerald-950/20 flex flex-col justify-between`}>
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block">Gün Sonu Net Kâr / Zarar</span>
              <div className="text-2xl font-black font-mono text-emerald-300 mt-1">
                {(activeSession.totalProfitTL ?? 0) >= 0 ? '+' : ''}₺{(activeSession.totalProfitTL ?? 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
              </div>
              <span className="text-[11px] text-gray-400 mt-1 block font-medium">
                {activeSession.profitableTransactionsCount ?? 0} Kârlı Satış İşlemi
              </span>
            </div>
            <div className={`${THEME.GLASS_CARD} p-4 border border-blue-500/30 bg-blue-950/20 flex flex-col justify-between`}>
              <span className="text-xs font-bold text-blue-400 uppercase tracking-wider block">Ortalama Kâr Marjı</span>
              <div className="text-2xl font-black font-mono text-blue-300 mt-1">
                %{(activeSession.profitMarginPercent ?? 0).toFixed(1)}
              </div>
              <span className="text-[11px] text-gray-400 mt-1 block font-medium">
                Satış Hasılatı Üstü Net Kârlılık
              </span>
            </div>
            <div className={`${THEME.GLASS_CARD} p-4 border border-yellow-500/30 bg-yellow-950/20 flex flex-col justify-between`}>
              <span className="text-xs font-bold text-yellow-400 uppercase tracking-wider block">Tamamlanan Satışlar</span>
              <div className="text-2xl font-black font-mono text-yellow-300 mt-1">
                {activeSession.totalSalesCount ?? 0} İşlem
              </div>
              <span className="text-[11px] text-gray-400 mt-1 block font-medium">
                Kasa Oturumu Boyunca Satışlar
              </span>
            </div>
          </div>
        )}

        {/* 3. SEKME BAŞLIKLARI VE LİSTELER */}
        <div className={`${THEME.GLASS_CARD} flex flex-col overflow-hidden`}>
          {/* Sekme Butonları */}
          <div className="flex border-b border-gray-800 bg-gray-950/40 p-2 gap-2">
            <button
              onClick={() => setActiveTab('movements')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                activeTab === 'movements'
                  ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/10'
                  : 'text-gray-400 hover:text-white hover:bg-gray-900'
              }`}
            >
              <Layers size={14} />
              Gün İçi Kasa Hareketleri ({data.recentMovements.length})
            </button>
            <button
              onClick={() => setActiveTab('archive')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                activeTab === 'archive'
                  ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/10'
                  : 'text-gray-400 hover:text-white hover:bg-gray-900'
              }`}
            >
              <Clock size={14} />
              Geçmiş Z-Raporları Arşivi ({data.archiveSessions.length})
            </button>
          </div>

          {/* SEKME 1: KASA HAREKETLERİ TABLOSU */}
          {activeTab === 'movements' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-900/60 text-gray-400 text-[10px] uppercase font-bold border-b border-gray-800">
                  <tr>
                    <th className="p-3.5">Saat</th>
                    <th className="p-3.5">Hareket Türü</th>
                    <th className="p-3.5">Kategori</th>
                    <th className="p-3.5">Ödeme Şekli</th>
                    <th className="p-3.5">Açıklama</th>
                    <th className="p-3.5">Personel</th>
                    <th className="p-3.5 text-right">Tutar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60 font-medium text-gray-300">
                  {data.recentMovements.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-gray-500">
                        Henüz gün içi kasa hareketi kaydedilmedi.
                      </td>
                    </tr>
                  ) : (
                    data.recentMovements.map((m) => {
                      const isInflow =
                        m.type === CASH_MOVEMENT_TYPES.POS_SALE ||
                        m.type === CASH_MOVEMENT_TYPES.CUSTOMER_COLLECTION ||
                        m.type === CASH_MOVEMENT_TYPES.INFLOW ||
                        m.type === CASH_MOVEMENT_TYPES.MANUAL_IN;

                      const categoryLabel = m.category && m.category in CASH_MOVEMENT_CATEGORY_LABELS
                        ? CASH_MOVEMENT_CATEGORY_LABELS[m.category as keyof typeof CASH_MOVEMENT_CATEGORY_LABELS]
                        : m.category || 'Genel';

                      const methodLabel = m.paymentMethod in PAYMENT_METHOD_LABELS
                        ? PAYMENT_METHOD_LABELS[m.paymentMethod as PaymentMethod]
                        : m.paymentMethod;

                      return (
                        <tr key={m.id} className="hover:bg-gray-900/30 transition-colors">
                          <td className="p-3.5 text-gray-400 font-mono">
                            {new Date(m.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="p-3.5">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-bold ${
                              isInflow ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                            }`}>
                              {isInflow ? <ArrowDownRight size={12} /> : <ArrowUpRight size={12} />}
                              {m.type}
                            </span>
                          </td>
                          <td className="p-3.5 text-gray-300 font-semibold">{categoryLabel}</td>
                          <td className="p-3.5 text-gray-400">{methodLabel}</td>
                          <td className="p-3.5 text-white max-w-xs truncate">{m.description}</td>
                          <td className="p-3.5 text-gray-400">{m.employeeName || '—'}</td>
                          <td className={`p-3.5 text-right font-mono font-bold ${isInflow ? 'text-emerald-400' : 'text-red-400'}`}>
                            {isInflow ? '+' : '-'}₺{m.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* SEKME 2: GEÇMİŞ Z-RAPORLARI ARŞİVİ TABLOSU */}
          {activeTab === 'archive' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-900/60 text-gray-400 text-[10px] uppercase font-bold border-b border-gray-800">
                  <tr>
                    <th className="p-3.5">Z-Rapor No</th>
                    <th className="p-3.5">Tarih</th>
                    <th className="p-3.5">Açan / Kapatan</th>
                    <th className="p-3.5 text-right">Açılış Devri</th>
                    <th className="p-3.5 text-right">Toplam Ciro</th>
                    <th className="p-3.5 text-right">Beklenen Nakit</th>
                    <th className="p-3.5 text-right">Sayılan Nakit</th>
                    <th className="p-3.5 text-right">Kasa Farkı</th>
                    <th className="p-3.5 text-center">Durum</th>
                    <th className="p-3.5 text-center">İşlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60 font-medium text-gray-300">
                  {data.archiveSessions.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-gray-500">
                        Geçmiş Z-Raporu kaydı bulunamadı.
                      </td>
                    </tr>
                  ) : (
                    data.archiveSessions.map((s) => {
                      const isShort = s.discrepancyStatus === DISCREPANCY_STATUS.SHORTAGE;
                      const isOver = s.discrepancyStatus === DISCREPANCY_STATUS.OVERAGE;

                      return (
                        <tr key={s.sessionId} className="hover:bg-gray-900/30 transition-colors">
                          <td className="p-3.5 font-mono font-black text-yellow-400">{s.sessionNumber}</td>
                          <td className="p-3.5 text-gray-300">
                            {new Date(s.openedAt).toLocaleDateString('tr-TR')}
                          </td>
                          <td className="p-3.5 text-gray-400">
                            {s.openedBy} {s.closedBy ? `→ ${s.closedBy}` : ''}
                          </td>
                          <td className="p-3.5 text-right font-mono">₺{s.openingCashTL.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</td>
                          <td className="p-3.5 text-right font-mono font-bold text-emerald-400">₺{s.totalTurnover.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</td>
                          <td className="p-3.5 text-right font-mono">₺{s.systemCashTL.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</td>
                          <td className="p-3.5 text-right font-mono font-bold text-white">
                            {s.countedCashTL != null ? `₺${s.countedCashTL.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}` : '—'}
                          </td>
                          <td className={`p-3.5 text-right font-mono font-bold ${
                            isShort ? 'text-red-400' : isOver ? 'text-blue-400' : 'text-emerald-400'
                          }`}>
                            {s.discrepancyTL != null
                              ? `${s.discrepancyTL >= 0 ? '+' : ''}₺${s.discrepancyTL.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`
                              : '—'}
                          </td>
                          <td className="p-3.5 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              s.status === SESSION_STATUS.OPEN ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-gray-800 text-gray-400'
                            }`}>
                              {s.status === SESSION_STATUS.OPEN ? 'AÇIK' : 'KAPALI'}
                            </span>
                          </td>
                          <td className="p-3.5 text-center">
                            <button
                              onClick={() => {
                                setSelectedSlipMetrics(s);
                                setIsSlipModalOpen(true);
                              }}
                              className="px-2.5 py-1 bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/40 text-yellow-300 rounded-lg text-[10px] font-bold flex items-center gap-1 mx-auto transition-colors"
                            >
                              <Printer size={12} />
                              Z-Fişi
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* ─── MODAL 1: KASA AÇILIŞ MODALI ─── */}
      <AnimatePresence>
        {isOpenModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className={`${THEME.GLASS_CARD} w-full max-w-md p-6 flex flex-col gap-4 border border-emerald-500/30`}
            >
              <div className="flex items-center justify-between pb-3 border-b border-gray-800">
                <div className="flex items-center gap-2">
                  <Unlock className="text-emerald-400" size={18} />
                  <h2 className="text-sm font-bold text-white">Yeni Kasa Oturumu Açılışı</h2>
                </div>
                <button onClick={() => setIsOpenModalOpen(false)} className="text-gray-400 hover:text-white">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleOpenShift} className="flex flex-col gap-3.5 text-xs">
                <div>
                  <label className="block text-gray-400 font-semibold mb-1">Açılış Devir Kasası (TL) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={openForm.openingCashTL}
                    onChange={(e) => setOpenForm({ ...openForm, openingCashTL: e.target.value })}
                    placeholder="0.00"
                    className="w-full px-3.5 py-2.5 bg-gray-900 border border-gray-800 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-gray-400 font-semibold mb-1">USD Devir</label>
                    <input
                      type="number"
                      step="0.01"
                      value={openForm.openingCashUSD}
                      onChange={(e) => setOpenForm({ ...openForm, openingCashUSD: e.target.value })}
                      placeholder="0.00"
                      className="w-full px-2.5 py-2 bg-gray-900 border border-gray-800 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 font-semibold mb-1">EUR Devir</label>
                    <input
                      type="number"
                      step="0.01"
                      value={openForm.openingCashEUR}
                      onChange={(e) => setOpenForm({ ...openForm, openingCashEUR: e.target.value })}
                      placeholder="0.00"
                      className="w-full px-2.5 py-2 bg-gray-900 border border-gray-800 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 font-semibold mb-1">Has (gr)</label>
                    <input
                      type="number"
                      step="0.001"
                      value={openForm.openingHasGram}
                      onChange={(e) => setOpenForm({ ...openForm, openingHasGram: e.target.value })}
                      placeholder="0.000"
                      className="w-full px-2.5 py-2 bg-gray-900 border border-gray-800 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-gray-400 font-semibold mb-1">Kasayı Açan Personel *</label>
                  <input
                    type="text"
                    required
                    value={openForm.openedBy}
                    onChange={(e) => setOpenForm({ ...openForm, openedBy: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-gray-900 border border-gray-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 font-semibold mb-1">Açılış Notu</label>
                  <input
                    type="text"
                    value={openForm.notes}
                    onChange={(e) => setOpenForm({ ...openForm, notes: e.target.value })}
                    placeholder="İsteğe bağlı not..."
                    className="w-full px-3.5 py-2.5 bg-gray-900 border border-gray-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-800 mt-2">
                  <button
                    type="button"
                    onClick={() => setIsOpenModalOpen(false)}
                    className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl font-bold"
                  >
                    Vazgeç
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-black rounded-xl shadow-lg shadow-emerald-500/20"
                  >
                    {loading ? 'Açılıyor...' : 'Kasayı Aç'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── MODAL 2: KASA KAPATMA & MUTABAKAT MODALI ─── */}
      <AnimatePresence>
        {isCloseModalOpen && activeSession && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className={`${THEME.GLASS_CARD} w-full max-w-lg p-6 flex flex-col gap-4 border border-red-500/30 max-h-[90vh] overflow-y-auto`}
            >
              <div className="flex items-center justify-between pb-3 border-b border-gray-800">
                <div className="flex items-center gap-2">
                  <Lock className="text-red-400" size={18} />
                  <h2 className="text-sm font-bold text-white">Kasa Kapatma ve Z-Raporu Mutabakatı</h2>
                </div>
                <button onClick={() => setIsCloseModalOpen(false)} className="text-gray-400 hover:text-white">
                  <X size={18} />
                </button>
              </div>

              {/* Sistem Hesaplanan Kasa Özeti */}
              <div className="p-4 bg-gray-900/80 rounded-xl border border-gray-800 space-y-1.5 text-xs">
                <div className="flex justify-between text-gray-400">
                  <span>Devir Açılış Kasası:</span>
                  <span className="font-mono text-white">₺{activeSession.openingCashTL.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-emerald-400">
                  <span>(+) Toplam Nakit Giriş (Satış & Tahsilat):</span>
                  <span className="font-mono">+₺{(activeSession.cashSales + activeSession.customerCashCollections + activeSession.manualCashIn).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-red-400">
                  <span>(-) Toplam Nakit Çıkış (Hurda, Tedarikçi & Masraf):</span>
                  <span className="font-mono">-₺{(activeSession.supplierCashPayments + activeSession.scrapCashPurchases + activeSession.manualCashOut).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="border-t border-gray-700/60 pt-1.5 flex justify-between text-sm font-black text-white">
                  <span>Beklenen Kasa Nakdi:</span>
                  <span className="font-mono text-yellow-400">₺{activeSession.systemCashTL.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              <form onSubmit={handleCloseShift} className="flex flex-col gap-3.5 text-xs">
                {/* Fiili Sayılan Nakit Girişi */}
                <div>
                  <label className="block text-gray-300 font-bold mb-1">
                    Sayılan Fiili Nakit (TL Çekmece Mevcudu) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    autoFocus
                    value={closeForm.countedCashTL}
                    onChange={(e) => setCloseForm({ ...closeForm, countedCashTL: e.target.value })}
                    placeholder="Saydığınız TL nakit tutarını giriniz..."
                    className="w-full px-3.5 py-3 bg-gray-900 border border-yellow-500/40 rounded-xl text-white font-mono text-base font-black focus:outline-none focus:border-yellow-500"
                  />
                </div>

                {/* Dinamik Kasa Farkı Kartı */}
                {currentDiff !== null && (
                  <div className={`p-3 rounded-xl border flex items-center justify-between text-xs font-bold ${
                    currentDiff === 0
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : currentDiff > 0
                      ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                      : 'bg-red-500/10 border-red-500/30 text-red-400'
                  }`}>
                    <span>Mutabakat Farkı:</span>
                    <span className="text-sm font-mono font-black">
                      {currentDiff >= 0 ? '+' : ''}₺{currentDiff.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} (
                      {currentDiff === 0 ? 'Dengeli ✓' : currentDiff > 0 ? 'Kasa Fazlası' : 'Kasa Eksiği / Açık'}
                      )
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-gray-400 font-semibold mb-1">Sayılan USD</label>
                    <input
                      type="number"
                      step="0.01"
                      value={closeForm.countedCashUSD}
                      onChange={(e) => setCloseForm({ ...closeForm, countedCashUSD: e.target.value })}
                      placeholder="0.00"
                      className="w-full px-2.5 py-2 bg-gray-900 border border-gray-800 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-yellow-500"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 font-semibold mb-1">Sayılan EUR</label>
                    <input
                      type="number"
                      step="0.01"
                      value={closeForm.countedCashEUR}
                      onChange={(e) => setCloseForm({ ...closeForm, countedCashEUR: e.target.value })}
                      placeholder="0.00"
                      className="w-full px-2.5 py-2 bg-gray-900 border border-gray-800 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-yellow-500"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 font-semibold mb-1">Sayılan Has (gr)</label>
                    <input
                      type="number"
                      step="0.001"
                      value={closeForm.countedHasGram}
                      onChange={(e) => setCloseForm({ ...closeForm, countedHasGram: e.target.value })}
                      placeholder="0.000"
                      className="w-full px-2.5 py-2 bg-gray-900 border border-gray-800 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-yellow-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-gray-400 font-semibold mb-1">Kasayı Kapatan Personel *</label>
                  <input
                    type="text"
                    required
                    value={closeForm.closedBy}
                    onChange={(e) => setCloseForm({ ...closeForm, closedBy: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-gray-900 border border-gray-800 rounded-xl text-white focus:outline-none focus:border-yellow-500"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 font-semibold mb-1">Kapanış / Mutabakat Notu</label>
                  <input
                    type="text"
                    value={closeForm.notes}
                    onChange={(e) => setCloseForm({ ...closeForm, notes: e.target.value })}
                    placeholder="Varsa kasa farkı veya gün sonu açıklaması..."
                    className="w-full px-3.5 py-2.5 bg-gray-900 border border-gray-800 rounded-xl text-white focus:outline-none focus:border-yellow-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-800 mt-2">
                  <button
                    type="button"
                    onClick={() => setIsCloseModalOpen(false)}
                    className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl font-bold"
                  >
                    İptal
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white font-black rounded-xl shadow-lg shadow-red-600/20"
                  >
                    {loading ? 'Kapatılıyor...' : 'Kasayı Kapat & Fişi Yazdır'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── MODAL 3: MANUEL KASA HAREKETİ MODALI ─── */}
      <AnimatePresence>
        {isMovementModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className={`${THEME.GLASS_CARD} w-full max-w-md p-6 flex flex-col gap-4 border border-blue-500/30`}
            >
              <div className="flex items-center justify-between pb-3 border-b border-gray-800">
                <div className="flex items-center gap-2">
                  <Plus className="text-blue-400" size={18} />
                  <h2 className="text-sm font-bold text-white">Manuel Kasa Giriş / Çıkış Hareketi</h2>
                </div>
                <button onClick={() => setIsMovementModalOpen(false)} className="text-gray-400 hover:text-white">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleAddMovement} className="flex flex-col gap-3.5 text-xs">
                {/* Hareket Yönü */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setMovementForm({ ...movementForm, type: 'INFLOW', category: 'CAPITAL' })}
                    className={`py-2.5 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all border ${
                      movementForm.type === 'INFLOW'
                        ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                        : 'bg-gray-900 border-gray-800 text-gray-400'
                    }`}
                  >
                    <ArrowDownRight size={14} />
                    Kasaya Giriş (+)
                  </button>
                  <button
                    type="button"
                    onClick={() => setMovementForm({ ...movementForm, type: 'OUTFLOW', category: 'EXPENSE' })}
                    className={`py-2.5 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all border ${
                      movementForm.type === 'OUTFLOW'
                        ? 'bg-red-500/20 border-red-500/50 text-red-400'
                        : 'bg-gray-900 border-gray-800 text-gray-400'
                    }`}
                  >
                    <ArrowUpRight size={14} />
                    Kasadan Çıkış (-)
                  </button>
                </div>

                {/* Kategori Seçimi */}
                <div>
                  <label className="block text-gray-400 font-semibold mb-1">Hareket Kategorisi</label>
                  <select
                    value={movementForm.category}
                    onChange={(e) => setMovementForm({ ...movementForm, category: e.target.value })}
                    className="w-full px-3.5 py-2 bg-gray-900 border border-gray-800 rounded-xl text-white focus:outline-none focus:border-blue-500"
                  >
                    {movementForm.type === 'INFLOW' ? (
                      <>
                        <option value="CAPITAL">Kasa Devir / Sermaye İlavesi</option>
                        <option value="CORRECTION">Kasa Fazlası / Düzeltme</option>
                      </>
                    ) : (
                      <>
                        <option value="EXPENSE">Mağaza Gideri / Masraf (Yemek, Kargo vb.)</option>
                        <option value="DRAWING">Ortak / Patron Para Çekimi</option>
                        <option value="CORRECTION">Kasa Düzeltme / Yuvarlama</option>
                      </>
                    )}
                  </select>
                </div>

                {/* Tutar & Para Birimi */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label className="block text-gray-400 font-semibold mb-1">Tutar *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={movementForm.amount}
                      onChange={(e) => setMovementForm({ ...movementForm, amount: e.target.value })}
                      placeholder="0.00"
                      className="w-full px-3.5 py-2.5 bg-gray-900 border border-gray-800 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 font-semibold mb-1">Birim</label>
                    <select
                      value={movementForm.currency}
                      onChange={(e) => setMovementForm({ ...movementForm, currency: e.target.value })}
                      className="w-full px-2 py-2.5 bg-gray-900 border border-gray-800 rounded-xl text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="TL">TL (₺)</option>
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="HAS">Has (gr)</option>
                    </select>
                  </div>
                </div>

                {/* Açıklama */}
                <div>
                  <label className="block text-gray-400 font-semibold mb-1">Açıklama *</label>
                  <input
                    type="text"
                    required
                    value={movementForm.description}
                    onChange={(e) => setMovementForm({ ...movementForm, description: e.target.value })}
                    placeholder="Örn: Personel öğle yemeği, kargo ücreti..."
                    className="w-full px-3.5 py-2.5 bg-gray-900 border border-gray-800 rounded-xl text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Personel */}
                <div>
                  <label className="block text-gray-400 font-semibold mb-1">İşlemi Yapan Personel</label>
                  <input
                    type="text"
                    value={movementForm.employeeName}
                    onChange={(e) => setMovementForm({ ...movementForm, employeeName: e.target.value })}
                    className="w-full px-3.5 py-2 bg-gray-900 border border-gray-800 rounded-xl text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-800 mt-2">
                  <button
                    type="button"
                    onClick={() => setIsMovementModalOpen(false)}
                    className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl font-bold"
                  >
                    Vazgeç
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-xl shadow-lg shadow-blue-600/20"
                  >
                    {loading ? 'Kaydediliyor...' : 'Hareketi Kaydet'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── MODAL 4: TERMAL Z-RAPORU FİŞİ MODALI ─── */}
      <ZReportSlipModal
        isOpen={isSlipModalOpen}
        onClose={() => setIsSlipModalOpen(false)}
        metrics={selectedSlipMetrics}
      />
    </div>
  );
}

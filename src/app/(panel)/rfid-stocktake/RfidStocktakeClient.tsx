'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Radio,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Play,
  Square,
  Share2,
  Plus,
  RefreshCw,
  Zap,
  MapPin,
  Check,
  X,
  Layers,
} from 'lucide-react';
import {
  RFID_LOCATIONS,
  RFID_MATCH_STATUS,
  RFID_MATCH_STATUS_LABELS,
  RFID_SESSION_STATUS,
  RFID_SESSION_STATUS_LABELS,
  RfidLocation,
  RfidMatchStatus,
} from '@/constants/rfid';
import { THEME } from '@/constants/theme';
import PageHeader from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import LuxuryTabs from '@/components/LuxuryTabs';
import { simulateRfidScan } from '@/lib/rfid/rfid-engine';

interface StocktakeItem {
  id: string;
  epc: string;
  barcode?: string | null;
  title?: string | null;
  carat?: number | null;
  weight?: number | null;
  expectedLocation?: string | null;
  actualLocation?: string | null;
  matchStatus: RfidMatchStatus;
  readCount: number;
  rssi?: number | null;
  scannedAt?: string | null;
}

interface StocktakeSession {
  id: string;
  sessionNumber: string;
  location: string;
  status: string;
  expectedCount: number;
  scannedCount: number;
  matchedCount: number;
  missingCount: number;
  surplusCount: number;
  startedBy: string;
  completedBy?: string | null;
  startedAt: string;
  completedAt?: string | null;
  notes?: string | null;
  items: StocktakeItem[];
}

interface RfidStocktakeClientProps {
  initialSessions: StocktakeSession[];
  currentSession: StocktakeSession | null;
}

export default function RfidStocktakeClient({
  initialSessions,
  currentSession: initialActiveSession,
}: RfidStocktakeClientProps) {
  const [sessions, setSessions] = useState<StocktakeSession[]>(initialSessions);
  const [activeSession, setActiveSession] = useState<StocktakeSession | null>(
    initialActiveSession
  );

  // Scanning state
  const [isScanning, setIsScanning] = useState(false);
  const [scannedBuffer, setScannedBuffer] = useState<Array<{ epc: string; rssi?: number }>>([]);
  const [filterTab, setFilterTab] = useState<'ALL' | 'MATCHED' | 'MISSING' | 'SURPLUS'>('ALL');

  // Modal State
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [newLocation, setNewLocation] = useState<RfidLocation>('TÜMÜ');
  const [newNotes, setNewNotes] = useState('');
  const [creatingSession, setCreatingSession] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Simulated continuous scan timer
  const scanTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (scanTimerRef.current) clearInterval(scanTimerRef.current);
    };
  }, []);

  // Live Simulated RFID Reader
  const toggleScanning = () => {
    if (isScanning) {
      if (scanTimerRef.current) clearInterval(scanTimerRef.current);
      setIsScanning(false);
    } else {
      setIsScanning(true);
      scanTimerRef.current = setInterval(() => {
        if (!activeSession || activeSession.items.length === 0) return;
        const scans = simulateRfidScan(activeSession.items);
        if (scans.length === 0) return;
        const randomScan = scans[Math.floor(Math.random() * scans.length)];

        setScannedBuffer((prev) => {
          const exists = prev.some((p) => p.epc === randomScan.epc);
          if (exists) return prev;
          return [...prev, randomScan];
        });
      }, 300);
    }
  };

  // Reconcile and save scanned buffer to server
  const handleReconcileAndSync = async (completeSession: boolean = false) => {
    if (!activeSession) return;
    setActionLoading(true);

    try {
      const res = await fetch(`/api/rfid/sessions/${activeSession.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scannedTags: scannedBuffer,
          status: completeSession ? RFID_SESSION_STATUS.COMPLETED : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Mutabakat kaydedilemedi.');

      setActiveSession(data.session);
      setSessions((prev) =>
        prev.map((s) => (s.id === data.session.id ? data.session : s))
      );
      setScannedBuffer([]);

      if (isScanning) {
        if (scanTimerRef.current) clearInterval(scanTimerRef.current);
        setIsScanning(false);
      }
    } catch (err: any) {
      alert(err.message || 'Bir hata oluştu.');
    } finally {
      setActionLoading(false);
    }
  };

  // Create new session
  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingSession(true);

    try {
      const res = await fetch('/api/rfid/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: newLocation,
          notes: newNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Oturum oluşturulamadı.');

      setSessions([data.session, ...sessions]);
      setActiveSession(data.session);
      setNewModalOpen(false);
      setNewNotes('');
    } catch (err: any) {
      alert(err.message || 'Oturum başlatılırken hata.');
    } finally {
      setCreatingSession(false);
    }
  };

  // WhatsApp Raporu Gönderimi
  const handleShareWhatsApp = () => {
    if (!activeSession) return;
    const text = `*KuyumPanel RFID Vitrin Sayım Raporu*\nOturum: ${activeSession.sessionNumber}\nKonum: ${activeSession.location}\nBeklenen: ${activeSession.expectedCount}\nEşleşen: ${activeSession.matchedCount}\nEksik: ${activeSession.missingCount}\nFazlalık: ${activeSession.surplusCount}\nDurum: ${activeSession.status}\nTarih: ${new Date().toLocaleDateString('tr-TR')}`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const filteredItems = (activeSession?.items || []).filter((item) => {
    if (filterTab === 'MATCHED') return item.matchStatus === RFID_MATCH_STATUS.MATCHED;
    if (filterTab === 'MISSING') return item.matchStatus === RFID_MATCH_STATUS.MISSING;
    if (filterTab === 'SURPLUS') return item.matchStatus === RFID_MATCH_STATUS.SURPLUS;
    return true;
  });

  const accuracyPercent =
    activeSession && activeSession.expectedCount > 0
      ? Math.round((activeSession.matchedCount / activeSession.expectedCount) * 100)
      : 0;

  const missingGrams = (activeSession?.items || [])
    .filter((i) => i.matchStatus === RFID_MATCH_STATUS.MISSING)
    .reduce((acc, curr) => acc + (curr.weight || 0), 0);

  const tabs = [
    { id: 'ALL', label: 'Tüm Kalemler', count: activeSession?.items.length || 0 },
    { id: 'MATCHED', label: 'Eşleşenler', count: activeSession?.matchedCount || 0 },
    { id: 'MISSING', label: 'Eksikler', count: activeSession?.missingCount || 0 },
    { id: 'SURPLUS', label: 'Fazlalıklar', count: activeSession?.surplusCount || 0 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="RFID Vitrin & Envanter Sayımı"
        subtitle="UHF Gen2 Toplu Etiket Okuma, Vitrin Mutabakatı ve Anlık Fire/Kayıp Tespiti"
        icon={Radio}
        badges={[
          { label: activeSession ? `${activeSession.location}` : 'Oturum Yok', variant: 'gold' },
          { label: activeSession ? `%${accuracyPercent} Doğruluk` : '%0', variant: accuracyPercent > 90 ? 'success' : 'warning' },
        ]}
        actions={
          <button
            onClick={() => setNewModalOpen(true)}
            className={`${THEME.BTN_PRIMARY} min-h-[44px] flex items-center justify-center gap-2`}
          >
            <Plus className="w-4 h-4" />
            <span>Yeni Sayım Başlat</span>
          </button>
        }
      />

      {/* Session Selector & Scanner Controls */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-amber-500/20 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Aktif Sayım Oturumu
            </label>
            <select
              value={activeSession?.id || ''}
              onChange={(e) => {
                const s = sessions.find((item) => item.id === e.target.value);
                if (s) setActiveSession(s);
              }}
              className="mt-0.5 text-sm font-semibold bg-transparent text-slate-900 dark:text-white focus:outline-none cursor-pointer"
            >
              {sessions.map((s) => (
                <option key={s.id} value={s.id} className="dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                  {s.sessionNumber} — {s.location} ({(RFID_SESSION_STATUS_LABELS as Record<string, string>)[s.status] || s.status})
                </option>
              ))}
            </select>
          </div>
        </div>

        {activeSession && (
          <div className="flex flex-wrap items-center gap-2">
            {/* Live Scan Toggle */}
            <button
              onClick={toggleScanning}
              disabled={activeSession.status === RFID_SESSION_STATUS.COMPLETED}
              className={`min-h-[44px] flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                isScanning
                  ? 'bg-rose-600 text-white animate-pulse'
                  : 'bg-slate-900 text-white dark:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-50'
              }`}
            >
              {isScanning ? (
                <>
                  <Square className="w-3.5 h-3.5 fill-current" />
                  Okumayı Durdur ({scannedBuffer.length} Etiket)
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current text-amber-400" />
                  Canlı RFID Taramasını Başlat
                </>
              )}
            </button>

            {/* Mutabakat & Eşitle Butonu */}
            <button
              onClick={() => handleReconcileAndSync(false)}
              disabled={actionLoading || activeSession.status === RFID_SESSION_STATUS.COMPLETED}
              className="min-h-[44px] flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${actionLoading ? 'animate-spin' : ''}`} />
              Mutabakatı Güncelle
            </button>

            {/* WhatsApp Paylaş */}
            <button
              onClick={handleShareWhatsApp}
              className="min-h-[44px] flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-all"
            >
              <Share2 className="w-3.5 h-3.5" />
              WhatsApp Raporu
            </button>

            {/* Sayımı Tamamla */}
            {activeSession.status === RFID_SESSION_STATUS.ACTIVE && (
              <button
                onClick={() => handleReconcileAndSync(true)}
                disabled={actionLoading}
                className="min-h-[44px] flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white transition-all shadow-sm disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" />
                Sayımı Tamamla & Kilitle
              </button>
            )}
          </div>
        )}
      </div>

      {activeSession ? (
        <>
          {/* KPI Dashboard */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Doğruluk Oranı"
              value={`%${accuracyPercent}`}
              subtitle={`${activeSession.matchedCount} / ${activeSession.expectedCount} Kalem Bulundu`}
              icon={Zap}
              iconColor="gold"
            />
            <StatCard
              title="Eşleşen (Mevcut)"
              value={activeSession.matchedCount}
              subtitle="Fiziken Vitrinde Doğrulandı"
              icon={CheckCircle2}
              iconColor="emerald"
            />
            <StatCard
              title="Eksik (Kayıp Riski)"
              value={activeSession.missingCount}
              subtitle={`Kayıp Ağırlık: ${(Math.round(missingGrams * 100) / 100).toFixed(2)} gr`}
              icon={AlertTriangle}
              iconColor="rose"
            />
            <StatCard
              title="Fazla (Farklı Konum)"
              value={activeSession.surplusCount}
              subtitle="Bu vitrine ait olmayan RFID etiketleri"
              icon={HelpCircle}
              iconColor="purple"
            />
          </div>

          {/* Filter Tabs */}
          <LuxuryTabs
            tabs={tabs}
            activeTab={filterTab}
            onChange={(tabId) => setFilterTab(tabId as 'ALL' | 'MATCHED' | 'MISSING' | 'SURPLUS')}
          />

          {/* Items Table */}
          <div className={THEME.TABLE.CONTAINER}>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className={THEME.TABLE.HEADER}>
                  <tr>
                    <th className={THEME.TABLE.TH}>Durum</th>
                    <th className={THEME.TABLE.TH}>Barkod & Ürün Adı</th>
                    <th className={THEME.TABLE.TH}>Ayar / Gramaj</th>
                    <th className={THEME.TABLE.TH}>RFID EPC (96-Bit)</th>
                    <th className={THEME.TABLE.TH}>Okuma Sayısı</th>
                    <th className={THEME.TABLE.TH}>Sinyal (RSSI)</th>
                    <th className={THEME.TABLE.TH}>Konum</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                        Bu filtreye uygun ürün bulunamadı.
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item) => (
                      <tr
                        key={item.id}
                        className={THEME.TABLE.ROW}
                      >
                        <td className={`${THEME.TABLE.TD} whitespace-nowrap`}>
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                              item.matchStatus === RFID_MATCH_STATUS.MATCHED
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                : item.matchStatus === RFID_MATCH_STATUS.MISSING
                                ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                            }`}
                          >
                            {item.matchStatus === RFID_MATCH_STATUS.MATCHED && (
                              <CheckCircle2 className="w-3 h-3" />
                            )}
                            {item.matchStatus === RFID_MATCH_STATUS.MISSING && (
                              <AlertTriangle className="w-3 h-3" />
                            )}
                            {item.matchStatus === RFID_MATCH_STATUS.SURPLUS && (
                              <HelpCircle className="w-3 h-3" />
                            )}
                            {RFID_MATCH_STATUS_LABELS[item.matchStatus]}
                          </span>
                        </td>

                        <td className={THEME.TABLE.TD}>
                          <p className="font-semibold text-slate-900 dark:text-white">
                            {item.title || 'İsimsiz Ürün'}
                          </p>
                          <span className="text-xs font-mono text-slate-400">
                            {item.barcode || 'Barkodsuz'}
                          </span>
                        </td>

                        <td className={`${THEME.TABLE.TD} whitespace-nowrap`}>
                          <p className="font-medium text-slate-900 dark:text-white">
                            {item.carat ? `${item.carat} Ayar` : '-'}
                          </p>
                          <span className="text-xs text-slate-500 font-mono">
                            {item.weight ? `${item.weight} gr` : '-'}
                          </span>
                        </td>

                        <td className={`${THEME.TABLE.TD} whitespace-nowrap font-mono text-xs text-amber-600 dark:text-amber-400 font-bold`}>
                          {item.epc}
                        </td>

                        <td className={`${THEME.TABLE.TD} whitespace-nowrap text-xs font-bold text-slate-900 dark:text-white font-mono`}>
                          {item.readCount > 0 ? (
                            <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 rounded-lg">
                              {item.readCount} kez
                            </span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>

                        <td className={`${THEME.TABLE.TD} whitespace-nowrap text-xs`}>
                          {item.rssi ? (
                            <div className="flex items-center gap-1.5 font-mono">
                              <span
                                className={`w-2 h-2 rounded-full ${
                                  item.rssi > -50
                                    ? 'bg-emerald-500'
                                    : item.rssi > -70
                                    ? 'bg-amber-500'
                                    : 'bg-rose-500'
                                }`}
                              />
                              {item.rssi} dBm
                            </div>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>

                        <td className={`${THEME.TABLE.TD} whitespace-nowrap text-xs text-slate-500`}>
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            <span>{item.actualLocation || item.expectedLocation || 'Vitrinde'}</span>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-amber-500/20 shadow-sm">
          <Radio className="w-12 h-12 mx-auto text-slate-400 mb-3" />
          <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
            Aktif Sayım Oturumu Bulunmuyor
          </h3>
          <p className="text-sm text-slate-500 mt-1 mb-4">
            RFID vitrin sayımını başlatmak için lütfen yeni bir sayım oturumu oluşturun.
          </p>
          <button
            onClick={() => setNewModalOpen(true)}
            className={`${THEME.BTN_PRIMARY} min-h-[44px]`}
          >
            Yeni Sayım Başlat
          </button>
        </div>
      )}

      {/* New Session Modal */}
      {newModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <form
            onSubmit={handleCreateSession}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-amber-500/20 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 border border-amber-500/20">
                  <Radio className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900 dark:text-white">
                  Yeni RFID Sayım Oturumu
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setNewModalOpen(false)}
                className="min-h-[44px] min-w-[44px] p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Sayım Konumu / Vitrin
                </label>
                <select
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value as RfidLocation)}
                  className={`w-full ${THEME.INPUT}`}
                >
                  {RFID_LOCATIONS.map((loc) => (
                    <option key={loc} value={loc} className="dark:bg-slate-900">
                      {loc}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Not / Açıklama
                </label>
                <textarea
                  rows={3}
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Sayım öncesi vitrin veya personel notu..."
                  className={`w-full resize-none ${THEME.INPUT}`}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setNewModalOpen(false)}
                className={`${THEME.BTN_SECONDARY} min-h-[44px]`}
              >
                Vazgeç
              </button>
              <button
                type="submit"
                disabled={creatingSession}
                className={`${THEME.BTN_PRIMARY} min-h-[44px]`}
              >
                {creatingSession ? 'Başlatılıyor...' : 'Oturumu Başlat'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

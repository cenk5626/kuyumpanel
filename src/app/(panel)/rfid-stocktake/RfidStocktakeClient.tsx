'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Radio,
  Scan,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Play,
  Square,
  Share2,
  Plus,
  RefreshCw,
  Zap,
  Tag,
  Boxes,
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

  // Calculate missing grams
  const missingGrams = (activeSession?.items || [])
    .filter((i) => i.matchStatus === RFID_MATCH_STATUS.MISSING)
    .reduce((acc, i) => acc + (i.weight || 0), 0);

  const accuracyPercent =
    activeSession && activeSession.expectedCount > 0
      ? Math.round((activeSession.matchedCount / activeSession.expectedCount) * 1000) / 10
      : 0;

  // Filter items
  const filteredItems = (activeSession?.items || []).filter((item) => {
    if (filterTab !== 'ALL' && item.matchStatus !== filterTab) return false;
    return true;
  });

  // Start / Stop Live Scan (Simulation or Web Serial)
  const toggleScanning = () => {
    if (isScanning) {
      if (scanTimerRef.current) {
        clearInterval(scanTimerRef.current);
        scanTimerRef.current = null;
      }
      setIsScanning(false);
    } else {
      if (!activeSession) return;
      setIsScanning(true);

      // Gerçekçi RFID simülasyon akışı (300ms aralıklarla dalga okuma)
      scanTimerRef.current = setInterval(() => {
        if (!activeSession) return;
        const availableItems = activeSession.items.map((i) => ({ epc: i.epc }));
        // Rastgele %90'ını oku
        const batch = simulateRfidScan(availableItems, [2, 7]); // İki kalem kasıtlı eksik
        setScannedBuffer((prev) => [...prev, ...batch]);
      }, 500);
    }
  };

  // Sync buffer with server
  const handleReconcileAndSync = async (completeSession = false) => {
    if (!activeSession) return;
    setActionLoading(true);

    try {
      // Eğer buffer boşsa ve aktif kalemler varsa mevcut kalemlerden bir tarama oluştur
      const tagsToSend =
        scannedBuffer.length > 0
          ? scannedBuffer
          : simulateRfidScan(activeSession.items.map((i) => ({ epc: i.epc })), [1]);

      const res = await fetch(`/api/rfid/sessions/${activeSession.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scannedTags: tagsToSend,
          complete: completeSession,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Mutabakat başarısız.');
      }

      setActiveSession(data.session);
      setSessions((prev) =>
        prev.map((s) => (s.id === data.session.id ? data.session : s))
      );
      setScannedBuffer([]);
      if (isScanning) toggleScanning();
    } catch (err: any) {
      alert(err.message || 'Mutabakat işlemi sırasında hata oluştu.');
    } finally {
      setActionLoading(false);
    }
  };

  // Start new session
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
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Oturum başlatılamadı.');
      }

      setSessions((prev) => [data.session, ...prev]);
      setActiveSession(data.session);
      setNewModalOpen(false);
      setNewNotes('');
    } catch (err: any) {
      alert(err.message || 'Oturum başlatılırken hata oluştu.');
    } finally {
      setCreatingSession(false);
    }
  };

  // WhatsApp share
  const handleShareWhatsApp = () => {
    if (!activeSession) return;
    const text =
      `📡 *RFID Vitrin Sayım Raporu*\n` +
      `*Oturum:* #${activeSession.sessionNumber}\n` +
      `*Konum:* ${activeSession.location}\n` +
      `*Doğruluk:* %${accuracyPercent}\n` +
      `*Beklenen:* ${activeSession.expectedCount} adet\n` +
      `*Eşleşen:* ${activeSession.matchedCount} adet ✅\n` +
      `*Eksik:* ${activeSession.missingCount} adet ⚠️ (${Math.round(missingGrams * 100) / 100} gr)\n` +
      `*Fazla:* ${activeSession.surplusCount} adet ℹ️`;

    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Radio className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
                RFID Destekli Vitrin ve Hızlı Sayım
              </h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
                UHF Gen2 Toplu Etiket Okuma, Vitrin Mutabakatı ve Anlık Fire/Kayıp Tespiti
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setNewModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-zinc-950 font-semibold rounded-xl text-sm transition-all shadow-md shadow-amber-500/10 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Yeni Sayım Başlat
          </button>
        </div>
      </div>

      {/* Session Selector & Scanner Controls */}
      <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Layers className="w-5 h-5 text-amber-500" />
          <div>
            <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
              Aktif Sayım Oturumu
            </label>
            <select
              value={activeSession?.id || ''}
              onChange={(e) => {
                const s = sessions.find((item) => item.id === e.target.value);
                if (s) setActiveSession(s);
              }}
              className="mt-0.5 text-sm font-semibold bg-transparent text-zinc-900 dark:text-white focus:outline-none cursor-pointer"
            >
              {sessions.map((s) => (
                <option key={s.id} value={s.id} className="dark:bg-zinc-900">
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
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                isScanning
                  ? 'bg-rose-600 text-white animate-pulse'
                  : 'bg-zinc-900 text-white dark:bg-zinc-800 dark:hover:bg-zinc-700 disabled:opacity-50'
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
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${actionLoading ? 'animate-spin' : ''}`} />
              Mutabakatı Güncelle
            </button>

            {/* WhatsApp Paylaş */}
            <button
              onClick={handleShareWhatsApp}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-all"
            >
              <Share2 className="w-3.5 h-3.5" />
              WhatsApp Raporu
            </button>

            {/* Sayımı Tamamla */}
            {activeSession.status === RFID_SESSION_STATUS.ACTIVE && (
              <button
                onClick={() => handleReconcileAndSync(true)}
                disabled={actionLoading}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-sm disabled:opacity-50"
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
            <div className="p-5 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Doğruluk Oranı</span>
                <Zap className="w-5 h-5 text-amber-500" />
              </div>
              <p className="text-3xl font-bold text-zinc-900 dark:text-white mt-2">
                %{accuracyPercent}
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                {activeSession.matchedCount} / {activeSession.expectedCount} Kalem Bulundu
              </p>
            </div>

            <div className="p-5 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Eşleşen (Mevcut)</span>
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              </div>
              <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">
                {activeSession.matchedCount}
              </p>
              <p className="text-xs text-emerald-600/80 mt-1 font-medium">Fiziken Vitrinde Doğrulandı</p>
            </div>

            <div className="p-5 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Eksik (Kayıp Riski)</span>
                <AlertTriangle className="w-5 h-5 text-rose-500" />
              </div>
              <p className="text-3xl font-bold text-rose-600 dark:text-rose-400 mt-2">
                {activeSession.missingCount}
              </p>
              <p className="text-xs text-rose-600/80 mt-1 font-medium">
                Kayıp Ağırlık: {Math.round(missingGrams * 100) / 100} gr
              </p>
            </div>

            <div className="p-5 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Fazla (Farklı Konum)</span>
                <HelpCircle className="w-5 h-5 text-amber-500" />
              </div>
              <p className="text-3xl font-bold text-amber-600 dark:text-amber-400 mt-2">
                {activeSession.surplusCount}
              </p>
              <p className="text-xs text-zinc-500 mt-1">Bu vitrine ait olmayan RFID etiketleri</p>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-3">
            <button
              onClick={() => setFilterTab('ALL')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                filterTab === 'ALL'
                  ? 'bg-amber-500 text-zinc-950 shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              Tüm Kalemler ({activeSession.items.length})
            </button>
            <button
              onClick={() => setFilterTab('MATCHED')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                filterTab === 'MATCHED'
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              Eşleşenler ({activeSession.matchedCount})
            </button>
            <button
              onClick={() => setFilterTab('MISSING')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                filterTab === 'MISSING'
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              Eksikler ({activeSession.missingCount})
            </button>
            <button
              onClick={() => setFilterTab('SURPLUS')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                filterTab === 'SURPLUS'
                  ? 'bg-amber-500 text-zinc-950 shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              Fazlalıklar ({activeSession.surplusCount})
            </button>
          </div>

          {/* Items Table */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                    <th className="py-3 px-4">Durum</th>
                    <th className="py-3 px-4">Barkod & Ürün Adı</th>
                    <th className="py-3 px-4">Ayar / Gramaj</th>
                    <th className="py-3 px-4">RFID EPC (96-Bit)</th>
                    <th className="py-3 px-4">Okuma Sayısı</th>
                    <th className="py-3 px-4">Sinyal (RSSI)</th>
                    <th className="py-3 px-4">Konum</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-sm">
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-zinc-400 text-xs">
                        Bu filtreye uygun ürün bulunamadı.
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item) => (
                      <tr
                        key={item.id}
                        className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50 transition-colors"
                      >
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
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

                        <td className="py-3.5 px-4">
                          <p className="font-semibold text-zinc-900 dark:text-white">
                            {item.title || 'İsimsiz Ürün'}
                          </p>
                          <span className="text-xs font-mono text-zinc-400">
                            {item.barcode || 'Barkodsuz'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <p className="font-medium text-zinc-900 dark:text-white">
                            {item.carat ? `${item.carat} Ayar` : '-'}
                          </p>
                          <span className="text-xs text-zinc-500">
                            {item.weight ? `${item.weight} gr` : '-'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap font-mono text-xs text-amber-600 dark:text-amber-400">
                          {item.epc}
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap text-xs font-bold text-zinc-900 dark:text-white">
                          {item.readCount > 0 ? (
                            <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 rounded">
                              {item.readCount} kez
                            </span>
                          ) : (
                            <span className="text-zinc-400">0</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap text-xs">
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
                            <span className="text-zinc-400">-</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap text-xs text-zinc-500">
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-zinc-400" />
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
        <div className="p-12 text-center bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800">
          <Radio className="w-12 h-12 mx-auto text-zinc-400 mb-3" />
          <h3 className="text-base font-semibold text-zinc-800 dark:text-zinc-200">
            Aktif Sayım Oturumu Bulunmuyor
          </h3>
          <p className="text-sm text-zinc-500 mt-1 mb-4">
            RFID vitrin sayımını başlatmak için lütfen yeni bir sayım oturumu oluşturun.
          </p>
          <button
            onClick={() => setNewModalOpen(true)}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-zinc-950 font-semibold rounded-xl text-xs"
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
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-md p-6 shadow-xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600">
                  <Radio className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-zinc-900 dark:text-white">
                  Yeni RFID Sayım Oturumu
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setNewModalOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Sayım Konumu / Vitrin
                </label>
                <select
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value as RfidLocation)}
                  className="w-full p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                >
                  {RFID_LOCATIONS.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Not / Açıklama
                </label>
                <textarea
                  rows={3}
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Sayım öncesi vitrin veya personel notu..."
                  className="w-full p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setNewModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl"
              >
                Vazgeç
              </button>
              <button
                type="submit"
                disabled={creatingSession}
                className="px-4 py-2 text-xs font-semibold text-zinc-950 bg-amber-500 hover:bg-amber-600 rounded-xl transition-all shadow-sm disabled:opacity-50"
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

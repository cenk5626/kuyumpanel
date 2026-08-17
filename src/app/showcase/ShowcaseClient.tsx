'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Maximize2,
  Minimize2,
  Clock,
  Radio,
  Sparkles,
  RefreshCw,
  Crown,
  Volume2,
  VolumeX,
} from 'lucide-react';
import ShowcaseRatesGrid from '@/components/ShowcaseRatesGrid';
import ShowcaseTicker from '@/components/ShowcaseTicker';
import {
  SHOWCASE_CONFIG,
  SHOWCASE_PROMOTIONS,
} from '@/constants/showcase';
import { MESSAGES } from '@/constants/messages';
import { ANIM } from '@/constants/theme';

export default function ShowcaseClient() {
  // ─── Canlı Saat ve Tarih State ─────────────────────────────────────────────
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('tr-TR', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        })
      );
      setCurrentDate(
        now.toLocaleDateString('tr-TR', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          weekday: 'long',
        })
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // ─── Tam Ekran (Fullscreen) Yönetimi ──────────────────────────────────────
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement
        .requestFullscreen()
        .then(() => setIsFullscreen(true))
        .catch(err => {
          console.warn('[Showcase Fullscreen Error]', err);
        });
    } else {
      if (document.exitFullscreen) {
        document
          .exitFullscreen()
          .then(() => setIsFullscreen(false))
          .catch(err => {
            console.warn('[Showcase Exit Fullscreen Error]', err);
          });
      }
    }
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F11' || (e.key === 'f' && !e.ctrlKey && !e.metaKey)) {
        e.preventDefault();
        toggleFullscreen();
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [toggleFullscreen]);

  // ─── Otomatik Gizlenen Kontrol Çubuğu (Auto-Hide Controls) ──────────────────
  const [showControls, setShowControls] = useState<boolean>(true);
  const hideControlsTimerRef = useRef<NodeJS.Timeout | null>(null);

  const resetHideTimer = useCallback(() => {
    setShowControls(true);
    if (hideControlsTimerRef.current) {
      clearTimeout(hideControlsTimerRef.current);
    }
    hideControlsTimerRef.current = setTimeout(() => {
      setShowControls(false);
    }, SHOWCASE_CONFIG.AUTO_HIDE_CONTROLS_DELAY_MS);
  }, []);

  useEffect(() => {
    const handleActivity = () => resetHideTimer();

    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('touchstart', handleActivity);
    window.addEventListener('keydown', handleActivity);

    resetHideTimer();

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      if (hideControlsTimerRef.current) {
        clearTimeout(hideControlsTimerRef.current);
      }
    };
  }, [resetHideTimer]);

  // ─── Promosyon / Kampanya Karuseli (Announcement Carousel) ─────────────────
  const [activeBannerIndex, setActiveBannerIndex] = useState<number>(0);

  useEffect(() => {
    const carouselTimer = setInterval(() => {
      setActiveBannerIndex(prev => (prev + 1) % SHOWCASE_PROMOTIONS.length);
    }, SHOWCASE_CONFIG.CAROUSEL_INTERVAL_MS);

    return () => clearInterval(carouselTimer);
  }, []);

  // ─── Canlı Soket Durum & Ticker Özeti ─────────────────────────────────────
  const [liveSummaryText, setLiveSummaryText] = useState<string>('');
  const [socketStatus, setSocketStatus] = useState<{ altis: string; harem: string }>({
    altis: 'connecting',
    harem: 'connecting',
  });

  const isAnySocketConnected =
    socketStatus.altis === 'connected' || socketStatus.harem === 'connected';

  const handleRatesUpdate = useCallback((summary: string) => {
    setLiveSummaryText(summary);
  }, []);

  const handleStatusChange = useCallback((status: { altis: string; harem: string }) => {
    setSocketStatus(status);
  }, []);

  return (
    <main className="relative min-h-screen w-screen bg-[#030712] text-white flex flex-col justify-between overflow-x-hidden select-none font-sans">
      {/* Arka Plan Luxury Gold Ambient Efekti */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-yellow-500/5 rounded-full blur-[140px]" />
        <div className="absolute bottom-10 right-1/4 w-[600px] h-[600px] bg-amber-500/5 rounded-full blur-[160px]" />
      </div>

      {/* ════════════════════ ÜST HEADER BAR (TV SIGNAGE) ════════════════════ */}
      <header className="relative z-20 w-full px-6 md:px-10 py-4 md:py-5 border-b border-yellow-500/20 bg-gray-950/90 backdrop-blur-xl flex items-center justify-between shadow-2xl">
        {/* Mağaza Markası & Logo */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-gradient-to-br from-yellow-400 via-yellow-500 to-amber-600 p-0.5 shadow-xl shadow-yellow-500/20 flex items-center justify-center">
            <div className="w-full h-full bg-gray-950 rounded-[14px] flex items-center justify-center">
              <Crown size={28} className="text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500 bg-clip-text text-transparent drop-shadow-sm">
              {MESSAGES.SHOWCASE_STORE_DEFAULT_NAME}
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs md:text-sm text-yellow-500/90 font-medium tracking-widest uppercase">
                Canlı Fiyatlandırma & Bilgilendirme Ekranı
              </span>
            </div>
          </div>
        </div>

        {/* Canlı Saat & Tarih */}
        <div className="flex items-center gap-6">
          <div className="text-right hidden sm:flex flex-col">
            <span className="text-xs md:text-sm text-gray-400 font-medium capitalize">{currentDate}</span>
            <div className="flex items-center justify-end gap-2 text-2xl md:text-3xl lg:text-4xl font-black font-mono text-yellow-400 tracking-wider">
              <Clock size={22} className="text-yellow-500/80" />
              <span>{currentTime || '00:00:00'}</span>
            </div>
          </div>

          {/* Bağlantı Durumu */}
          <div className="flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-gray-900/90 border border-yellow-500/30 shadow-lg">
            <Radio
              size={18}
              className={isAnySocketConnected ? 'text-emerald-400 animate-pulse' : 'text-yellow-400 animate-spin'}
            />
            <div className="flex flex-col text-left">
              <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
                {isAnySocketConnected ? MESSAGES.SHOWCASE_LIVE_MARKET : MESSAGES.SHOWCASE_CONNECTING}
              </span>
              <span className="text-xs font-bold font-mono text-white">
                {isAnySocketConnected ? 'ONLINE' : 'CONNECTING'}
              </span>
            </div>
          </div>
        </div>

        {/* Otomatik Gizlenen Kontroller (Fullscreen, Refresh) */}
        <AnimatePresence>
          {showControls && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center gap-2 bg-gray-900/90 border border-yellow-500/40 p-1.5 rounded-2xl backdrop-blur-2xl shadow-2xl z-30"
            >
              <button
                onClick={() => window.location.reload()}
                title="Yenile"
                className="p-2.5 rounded-xl hover:bg-yellow-500/20 text-gray-300 hover:text-yellow-400 transition-colors"
              >
                <RefreshCw size={18} />
              </button>

              <button
                onClick={toggleFullscreen}
                title={isFullscreen ? MESSAGES.SHOWCASE_EXIT_FULLSCREEN : MESSAGES.SHOWCASE_FULLSCREEN}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-600 text-black font-bold text-xs hover:from-yellow-400 hover:to-amber-500 transition-all shadow-md"
              >
                {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                <span className="hidden md:inline">{isFullscreen ? 'Çıkış' : 'Tam Ekran (F11)'}</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* ════════════════════ ORTA GÖVDE: KAMPANYA BANDI & FİYAT MATRİSİ ════════════════════ */}
      <div className="relative z-10 flex-1 p-5 md:p-8 flex flex-col justify-between gap-6 w-full max-w-[1920px] mx-auto">
        {/* Promosyon & Duyuru Karuseli (Banner Carousel) */}
        <div className="w-full bg-gradient-to-r from-yellow-500/10 via-amber-500/15 to-yellow-500/10 border border-yellow-500/30 rounded-2xl py-3 px-6 shadow-xl flex items-center justify-between overflow-hidden relative">
          <div className="flex items-center gap-3 w-full">
            <div className="p-2 rounded-xl bg-yellow-500/20 text-yellow-400 border border-yellow-500/40 flex-shrink-0">
              <Sparkles size={18} className="animate-pulse" />
            </div>

            <div className="flex-1 overflow-hidden h-7 relative flex items-center">
              <AnimatePresence mode="wait">
                <motion.p
                  key={activeBannerIndex}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.4 }}
                  className="font-bold text-sm md:text-base lg:text-lg text-yellow-200 tracking-wide truncate"
                >
                  {SHOWCASE_PROMOTIONS[activeBannerIndex]}
                </motion.p>
              </AnimatePresence>
            </div>

            {/* Karusel Gösterge Noktaları */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {SHOWCASE_PROMOTIONS.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveBannerIndex(idx)}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    idx === activeBannerIndex ? 'w-6 bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.8)]' : 'bg-gray-700'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Canlı Fiyat Grid Bileşeni */}
        <ShowcaseRatesGrid
          onRatesUpdate={handleRatesUpdate}
          onStatusChange={handleStatusChange}
        />
      </div>

      {/* ════════════════════ ALT KAYAN YAZI BANDI (TICKER) ════════════════════ */}
      <ShowcaseTicker
        announcements={SHOWCASE_PROMOTIONS}
        liveSummaryText={liveSummaryText}
        speedSeconds={SHOWCASE_CONFIG.TICKER_SPEED_SECONDS}
        showBadge={true}
      />
    </main>
  );
}

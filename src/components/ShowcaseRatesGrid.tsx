'use client';

import React, { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { motion } from 'framer-motion';
import { ChevronUp, ChevronDown, Minus, TrendingUp, DollarSign, Coins, Gem } from 'lucide-react';
import {
  ALTIS_WS_URL,
  HAREM_WS_URL,
  HAREM_WS_PATH,
  SOURCE_LABELS,
  HAS_CODE,
  USDTRY_CODE,
  EURTRY_CODE,
  ZIYNET_TL_OLD_CODES,
  ZIYNET_TL_LABELS,
  PRODUCTS,
  DEFAULT_SETTINGS,
  type ProductKey,
} from '@/constants/prices';
import { SHOWCASE_CONFIG } from '@/constants/showcase';
import { MESSAGES } from '@/constants/messages';
import { THEME, ANIM } from '@/constants/theme';

export interface PriceItem {
  code: string;
  bid: number;
  ask: number;
  dir: 'up' | 'down' | 'none';
}

export interface RatesState {
  hasPrice?: PriceItem;
  dovizUSD?: PriceItem;
  dovizEUR?: PriceItem;
  ziynetPrices: Record<string, PriceItem>;
  productPrices: Record<string, PriceItem>;
  altisStatus: 'connecting' | 'connected' | 'error';
  haremStatus: 'connecting' | 'connected' | 'error';
  lastUpdated: Date;
}

export interface ShowcaseRatesGridProps {
  onRatesUpdate?: (summaryText: string) => void;
  onStatusChange?: (status: { altis: string; harem: string }) => void;
}

interface AppSettings {
  sourceOrder: string[];
  priceOffsets: Record<string, any>;
  mil24Ayar: number;
  mil22Ayar: number;
  milAdanaBurma: number;
  milAjda: number;
  mil14Ayar: number;
}

function parsePriceNumber(val: unknown): number {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  const str = String(val).trim();
  if (str.includes(',')) {
    const normalized = str.replace(/\./g, '').replace(',', '.');
    return parseFloat(normalized) || 0;
  }
  return parseFloat(str) || 0;
}

function fmtTL(val: number | undefined): string {
  if (val == null || isNaN(val) || val <= 0) return '—';
  return Math.round(val).toLocaleString('tr-TR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function fmtDoviz(val: number | undefined): string {
  if (val == null || isNaN(val) || val <= 0) return '—';
  return val.toLocaleString('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function DirIcon({ dir, size = 20 }: { dir: 'up' | 'down' | 'none'; size?: number }) {
  if (dir === 'up') {
    return <ChevronUp size={size} className="text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.8)] animate-pulse" />;
  }
  if (dir === 'down') {
    return <ChevronDown size={size} className="text-red-400 drop-shadow-[0_0_10px_rgba(248,113,113,0.8)] animate-pulse" />;
  }
  return <Minus size={size} className="text-gray-600" />;
}

function ShowcasePriceBox({
  value,
  dir,
  type = 'TL',
  size = 'normal',
}: {
  value: number | undefined;
  dir: 'up' | 'down' | 'none';
  type?: 'TL' | 'Doviz';
  size?: 'hero' | 'normal' | 'compact';
}) {
  const formatted = type === 'TL' ? fmtTL(value) : fmtDoviz(value);

  const glowClass =
    dir === 'up'
      ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400 font-black shadow-[0_0_20px_rgba(16,185,129,0.3)] scale-[1.02]'
      : dir === 'down'
      ? 'bg-red-500/20 border-red-500/50 text-red-400 font-black shadow-[0_0_20px_rgba(239,68,68,0.3)] scale-[1.02]'
      : 'bg-gray-950/80 border-gray-800/80 text-white font-bold';

  const sizeClass =
    size === 'hero'
      ? 'text-3xl sm:text-4xl md:text-5xl lg:text-5xl xl:text-6xl py-3 px-4 rounded-2xl min-w-[140px]'
      : size === 'compact'
      ? 'text-lg sm:text-xl md:text-2xl py-1.5 px-3 rounded-xl min-w-[100px]'
      : 'text-xl sm:text-2xl md:text-3xl py-2.5 px-3.5 rounded-xl min-w-[120px]';

  return (
    <div
      className={`font-mono text-center border transition-all duration-300 select-none flex items-center justify-center ${glowClass} ${sizeClass}`}
    >
      <span>{formatted}</span>
    </div>
  );
}

export default function ShowcaseRatesGrid({ onRatesUpdate, onStatusChange }: ShowcaseRatesGridProps) {
  // Canlı soket verileri
  const [altisData, setAltisData] = useState<Record<string, PriceItem>>({});
  const [haremData, setHaremData] = useState<Record<string, PriceItem>>({});
  const [altisStatus, setAltisStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [haremStatus, setHaremStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');

  // DB ziynet milyemleri
  const [dbZiynets, setDbZiynets] = useState<Record<string, { bid: number; ask: number }>>({});

  // DB Fiyatlandırma ve Milyem Ayarları
  const [settings, setSettings] = useState<AppSettings>({
    sourceOrder: [...DEFAULT_SETTINGS.sourceOrder],
    priceOffsets: { ...DEFAULT_SETTINGS.priceOffsets },
    mil24Ayar: DEFAULT_SETTINGS.mil24Ayar,
    mil22Ayar: DEFAULT_SETTINGS.mil22Ayar,
    milAdanaBurma: DEFAULT_SETTINGS.milAdanaBurma,
    milAjda: DEFAULT_SETTINGS.milAjda,
    mil14Ayar: DEFAULT_SETTINGS.mil14Ayar,
  });

  const altisWsRef = useRef<WebSocket | null>(null);
  const haremSocketRef = useRef<Socket | null>(null);

  // 1. Ayarları ve Ziynet Milyemlerini Çek
  useEffect(() => {
    fetch('/api/prices/settings')
      .then(res => res.json())
      .then((data: AppSettings) => {
        if (data && typeof data === 'object' && Array.isArray(data.sourceOrder)) {
          setSettings(data);
        }
      })
      .catch(err => console.error('[Showcase Settings Fetch Error]', err));

    fetch('/api/prices/ziynet')
      .then(res => res.json())
      .then((data: Array<{ id: string; bid: number; ask: number }>) => {
        const map: Record<string, { bid: number; ask: number }> = {};
        if (Array.isArray(data)) {
          data.forEach(item => {
            map[item.id] = { bid: item.bid, ask: item.ask };
          });
        }
        setDbZiynets(map);
      })
      .catch(err => console.error('[Showcase Ziynet Fetch Error]', err));
  }, []);

  // 2. Altis WebSocket & HTTP Polling Fallback
  useEffect(() => {
    const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';

    const fetchAltisFallback = async () => {
      try {
        const res = await fetch('/api/prices/altis');
        const json = await res.json();
        if (json.success && json.data && Object.keys(json.data).length > 0) {
          setAltisStatus('connected');
          setAltisData(prev => {
            const next = { ...prev };
            Object.entries(json.data as Record<string, { bid: number; ask: number }>).forEach(([code, item]) => {
              const prevItem = prev[code];
              let dir: 'up' | 'down' | 'none' = prevItem?.dir ?? 'none';
              if (prevItem) {
                if (item.ask > prevItem.ask) dir = 'up';
                else if (item.ask < prevItem.ask) dir = 'down';
              }
              next[code] = { code, bid: item.bid, ask: item.ask, dir };
            });
            return next;
          });
        }
      } catch (e) {
        console.error('[Showcase Altis Polling Error]', e);
      }
    };

    if (isHttps) {
      setAltisStatus('connecting');
      fetchAltisFallback();
      const interval = setInterval(fetchAltisFallback, SHOWCASE_CONFIG.PRICE_REFRESH_INTERVAL_MS);
      return () => clearInterval(interval);
    }

    try {
      const ws = new WebSocket(ALTIS_WS_URL);
      altisWsRef.current = ws;
      setAltisStatus('connecting');

      ws.onopen = () => setAltisStatus('connected');
      ws.onerror = () => {
        setAltisStatus('error');
        fetchAltisFallback();
      };
      ws.onclose = () => setAltisStatus('error');

      ws.onmessage = event => {
        try {
          const data = JSON.parse(event.data as string);
          if (!Array.isArray(data)) return;
          setAltisData(prev => {
            const next = { ...prev };
            data.forEach(item => {
              if (!item.Code || item.Bid == null || item.Ask == null) return;
              const bid = parsePriceNumber(item.Bid);
              const ask = parsePriceNumber(item.Ask);
              if (bid <= 0 && ask <= 0) return;

              const prevItem = prev[item.Code];
              let dir: 'up' | 'down' | 'none' = prevItem?.dir ?? 'none';
              if (prevItem) {
                if (ask > prevItem.ask) dir = 'up';
                else if (ask < prevItem.ask) dir = 'down';
              }
              next[item.Code] = { code: item.Code, bid, ask, dir };
            });
            return next;
          });
        } catch (e) {
          console.error('[Showcase Altis WS Parse Error]', e);
        }
      };

      return () => {
        ws.onclose = null;
        ws.close();
      };
    } catch (e) {
      console.warn('[Showcase Altis WS Init Error]', e);
      setAltisStatus('error');
      fetchAltisFallback();
      const interval = setInterval(fetchAltisFallback, SHOWCASE_CONFIG.PRICE_REFRESH_INTERVAL_MS);
      return () => clearInterval(interval);
    }
  }, []);

  // 3. Harem Altın WebSocket
  useEffect(() => {
    const socket = io(HAREM_WS_URL, {
      transports: ['websocket'],
      path: HAREM_WS_PATH,
    });
    haremSocketRef.current = socket;
    setHaremStatus('connecting');

    socket.on('connect', () => setHaremStatus('connected'));
    socket.on('connect_error', () => setHaremStatus('error'));
    socket.on('disconnect', () => setHaremStatus('error'));

    socket.on('price_changed', payload => {
      try {
        if (!payload?.data) return;
        setHaremData(prev => {
          const next = { ...prev };
          Object.values(payload.data).forEach((item: unknown) => {
            const it = item as Record<string, unknown>;
            if (!it.code || it.alis == null || it.satis == null) return;
            const bid = parsePriceNumber(it.alis);
            const ask = parsePriceNumber(it.satis);
            if (bid <= 0 && ask <= 0) return;

            let dir: 'up' | 'down' | 'none' = 'none';
            const dirObj = it.dir as Record<string, string> | undefined;
            if (dirObj?.satis_dir === 'up') dir = 'up';
            else if (dirObj?.satis_dir === 'down') dir = 'down';

            const rawCode = it.code as string;
            const codeMap: Record<string, string> = {
              ALTIN: HAS_CODE,
              CEYREK_ESKI: 'ECEYREKTL',
              CEYREK_YENI: 'ECEYREKTL',
              YARIM_ESKI: 'EYARIMTL',
              YARIM_YENI: 'EYARIMTL',
              TEK_ESKI: 'ETAMTL',
              TEK_YENI: 'ETAMTL',
              ATA_ESKI: 'EATATL',
              ATA_YENI: 'EATATL',
              GREMSE_ESKI: 'EGREMSETL',
              GREMSE_YENI: 'EGREMSETL',
            };
            const code = codeMap[rawCode] ?? rawCode;

            next[code] = { code, bid, ask, dir };
          });
          return next;
        });
      } catch (e) {
        console.error('[Showcase Harem Socket Error]', e);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Durum değişikliği bildirimi
  useEffect(() => {
    if (onStatusChange) {
      onStatusChange({ altis: altisStatus, harem: haremStatus });
    }
  }, [altisStatus, haremStatus, onStatusChange]);

  // ─── Fiyat Hesaplama Mantığı ──────────────────────────────────────────────
  const getAdjustedPrice = (
    code: string,
    rawVal: number | undefined,
    type: 'bid' | 'ask'
  ): number | undefined => {
    if (rawVal == null || isNaN(rawVal) || rawVal <= 0) return undefined;
    const offsetKey = `${code.toLowerCase()}${type === 'bid' ? 'Bid' : 'Ask'}`;
    const offset = settings.priceOffsets?.[offsetKey] ?? 0;
    return rawVal + offset;
  };

  const getZiynetWeight = (code: string): number => {
    const keyMap: Record<string, string> = {
      ECEYREKTL: 'eceyrekWeight',
      EYARIMTL: 'eyarimWeight',
      ETAMTL: 'etamWeight',
      EATATL: 'eataWeight',
      EGREMSETL: 'egremseWeight',
    };
    const key = keyMap[code] || 'eceyrekWeight';
    return settings.priceOffsets?.[key] ?? DEFAULT_SETTINGS.priceOffsets[key] ?? 1;
  };

  // Aktif Kaynak Belirleme
  const hasAltisValid = Object.values(altisData).some(p => p.bid > 0 && p.ask > 0);
  const hasHaremValid = Object.values(haremData).some(p => p.bid > 0 && p.ask > 0);

  const safeSourceOrder = Array.isArray(settings?.sourceOrder) ? settings.sourceOrder : ['harem', 'altis'];
  let activeSrcKey = safeSourceOrder[0] ?? 'harem';

  if (activeSrcKey === 'altis' && !hasAltisValid && hasHaremValid) {
    activeSrcKey = 'harem';
  } else if (activeSrcKey === 'harem' && !hasHaremValid && hasAltisValid) {
    activeSrcKey = 'altis';
  }

  const primaryData = activeSrcKey === 'altis' ? altisData : haremData;
  const rawActiveHas = primaryData[HAS_CODE] ?? altisData[HAS_CODE] ?? haremData[HAS_CODE];

  const activeHas = rawActiveHas
    ? {
        ...rawActiveHas,
        bid: getAdjustedPrice(HAS_CODE, rawActiveHas.bid, 'bid') ?? 0,
        ask: getAdjustedPrice(HAS_CODE, rawActiveHas.ask, 'ask') ?? 0,
      }
    : undefined;

  // Döviz Kurları
  const rawUSD = haremData[USDTRY_CODE] ?? altisData[USDTRY_CODE];
  const rawEUR = haremData[EURTRY_CODE] ?? altisData[EURTRY_CODE];

  const dovizUSD = rawUSD
    ? {
        ...rawUSD,
        bid: getAdjustedPrice(USDTRY_CODE, rawUSD.bid, 'bid') ?? 0,
        ask: getAdjustedPrice(USDTRY_CODE, rawUSD.ask, 'ask') ?? 0,
      }
    : undefined;

  const dovizEUR = rawEUR
    ? {
        ...rawEUR,
        bid: getAdjustedPrice(EURTRY_CODE, rawEUR.bid, 'bid') ?? 0,
        ask: getAdjustedPrice(EURTRY_CODE, rawEUR.ask, 'ask') ?? 0,
      }
    : undefined;

  // Ziynet Hesaplama
  const calcZiynet = (code: string) => {
    const isManuel = settings.priceOffsets?.isManuel === true;
    let bid = 0;
    let ask = 0;
    let dir: 'up' | 'down' | 'none' = 'none';

    if (isManuel) {
      const weight = getZiynetWeight(code);
      if (activeHas) {
        const rawBid = activeHas.bid * weight;
        const rawAsk = activeHas.ask * weight;
        const bidOffset = settings.priceOffsets?.[`${code.toLowerCase()}Bid`] ?? 0;
        const askOffset = settings.priceOffsets?.[`${code.toLowerCase()}Ask`] ?? 0;
        bid = rawBid + bidOffset;
        ask = rawAsk + askOffset;
        dir = activeHas.dir;
      }
    } else {
      const rawD = (activeSrcKey === 'altis' ? altisData[code] : haremData[code]) ?? haremData[code] ?? altisData[code];
      if (rawD && rawD.bid > 0 && rawD.ask > 0) {
        bid = getAdjustedPrice(code, rawD.bid, 'bid') ?? 0;
        ask = getAdjustedPrice(code, rawD.ask, 'ask') ?? 0;
        dir = rawD.dir;
      } else {
        const hasCode = code.replace('TL', '');
        const dbMilyem = dbZiynets[hasCode];
        const fallbackWeight = getZiynetWeight(code);
        const mBid = dbMilyem && dbMilyem.bid > 0 ? dbMilyem.bid : fallbackWeight;
        const mAsk = dbMilyem && dbMilyem.ask > 0 ? dbMilyem.ask : fallbackWeight;

        if (activeHas && mBid > 0 && mAsk > 0) {
          const rawBid = activeHas.bid * mBid;
          const rawAsk = activeHas.ask * mAsk;
          const bidOffset = settings.priceOffsets?.[`${code.toLowerCase()}Bid`] ?? 0;
          const askOffset = settings.priceOffsets?.[`${code.toLowerCase()}Ask`] ?? 0;
          bid = rawBid + bidOffset;
          ask = rawAsk + askOffset;
          dir = activeHas.dir;
        }
      }
    }

    return { bid, ask, dir };
  };

  // Milyem Haritası & İşlenmiş Altın Hesaplama
  const milMap: Record<ProductKey, number> = {
    mil24Ayar: settings.mil24Ayar,
    mil22Ayar: settings.mil22Ayar,
    milAdanaBurma: settings.milAdanaBurma,
    milAjda: settings.milAjda,
    mil14Ayar: settings.mil14Ayar,
  };

  const calcProductPrice = (milieme: number) => {
    if (!activeHas || activeHas.ask <= 0) return { bid: undefined, ask: undefined };
    return {
      bid: (activeHas.bid * milieme) / 1000,
      ask: (activeHas.ask * milieme) / 1000,
    };
  };

  // Ticker İçin Canlı Fiyat Özeti Bildir
  useEffect(() => {
    if (onRatesUpdate && activeHas && activeHas.ask > 0) {
      const parts: string[] = [];
      parts.push(`HAS: ${fmtTL(activeHas.bid)} / ${fmtTL(activeHas.ask)}`);
      if (dovizUSD && dovizUSD.ask > 0) parts.push(`USD: ${fmtDoviz(dovizUSD.ask)}`);
      if (dovizEUR && dovizEUR.ask > 0) parts.push(`EUR: ${fmtDoviz(dovizEUR.ask)}`);

      const ceyrek = calcZiynet('ECEYREKTL');
      if (ceyrek.ask > 0) parts.push(`Çeyrek: ${fmtTL(ceyrek.ask)}`);

      const p22 = calcProductPrice(settings.mil22Ayar);
      if (p22.ask) parts.push(`22 Ayar: ${fmtTL(p22.ask)}`);

      onRatesUpdate(parts.join('  •  '));
    }
  }, [activeHas, dovizUSD, dovizEUR, settings, onRatesUpdate]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 lg:gap-6 flex-1 items-stretch w-full">
      {/* ════════════════════ KOLON 1: HAS & DÖVİZ (HERO) ════════════════════ */}
      <motion.div
        {...ANIM.FADE_UP}
        transition={{ delay: 0.05, duration: ANIM.DURATION.NORMAL }}
        className="bg-gray-900/80 backdrop-blur-2xl border border-yellow-500/25 rounded-3xl p-5 md:p-6 flex flex-col justify-between shadow-2xl shadow-black/60 relative overflow-hidden"
      >
        {/* Dekoratif Altın Işıma */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-yellow-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Kolon Başlığı */}
        <div className="flex items-center justify-between border-b border-yellow-500/20 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-yellow-500/20 border border-yellow-500/40 text-yellow-400 shadow-md">
              <TrendingUp size={22} />
            </div>
            <div>
              <h2 className="text-yellow-400 font-bold text-lg md:text-xl tracking-wider uppercase">
                {MESSAGES.SHOWCASE_HAS_GOLD}
              </h2>
              <span className="text-xs text-gray-400 font-medium tracking-widest uppercase">
                {SOURCE_LABELS[activeSrcKey]} Canlı Kotasyon
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
            <span>Spot</span>
          </div>
        </div>

        {/* HAS ALTIN DEV HERO KARTI */}
        <div className="bg-gradient-to-b from-gray-950/90 to-gray-900/90 border border-yellow-500/30 rounded-2xl p-5 md:p-6 mb-5 shadow-inner flex flex-col justify-center flex-1">
          <div className="flex items-center justify-between mb-3">
            <span className="text-yellow-500 font-bold text-sm md:text-base uppercase tracking-widest">
              24K Has Altın (Gram / TL)
            </span>
            <div className="flex items-center gap-1.5">
              <DirIcon dir={activeHas?.dir ?? 'none'} size={24} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 md:gap-4 items-center">
            {/* Alış */}
            <div className="flex flex-col">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                {MESSAGES.PRICES_ALIS}
              </span>
              <ShowcasePriceBox value={activeHas?.bid} dir={activeHas?.dir ?? 'none'} type="TL" size="hero" />
            </div>
            {/* Satış */}
            <div className="flex flex-col">
              <span className="text-xs font-bold text-yellow-400 uppercase tracking-wider mb-1.5 text-right">
                {MESSAGES.PRICES_SATIS}
              </span>
              <ShowcasePriceBox value={activeHas?.ask} dir={activeHas?.dir ?? 'none'} type="TL" size="hero" />
            </div>
          </div>
        </div>

        {/* DÖVİZ KURLARI (USD & EUR) */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">
            <DollarSign size={16} className="text-yellow-500" />
            <span>{MESSAGES.SHOWCASE_DOVIZ_RATES}</span>
          </div>

          {/* USD/TRY */}
          <div className="bg-gray-950/70 border border-gray-800/80 rounded-2xl p-3.5 flex items-center justify-between hover:border-yellow-500/30 transition-all">
            <div className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center font-bold text-blue-400 text-sm">
                $
              </span>
              <div>
                <p className="font-bold text-white text-base md:text-lg">USD / TRY</p>
                <p className="text-[11px] text-gray-500">Amerikan Doları</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <ShowcasePriceBox value={dovizUSD?.bid} dir={dovizUSD?.dir ?? 'none'} type="Doviz" size="normal" />
              <ShowcasePriceBox value={dovizUSD?.ask} dir={dovizUSD?.dir ?? 'none'} type="Doviz" size="normal" />
              <div className="w-5 flex justify-end">
                <DirIcon dir={dovizUSD?.dir ?? 'none'} size={18} />
              </div>
            </div>
          </div>

          {/* EUR/TRY */}
          <div className="bg-gray-950/70 border border-gray-800/80 rounded-2xl p-3.5 flex items-center justify-between hover:border-yellow-500/30 transition-all">
            <div className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center font-bold text-emerald-400 text-sm">
                €
              </span>
              <div>
                <p className="font-bold text-white text-base md:text-lg">EUR / TRY</p>
                <p className="text-[11px] text-gray-500">Avrupa Para Birimi</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <ShowcasePriceBox value={dovizEUR?.bid} dir={dovizEUR?.dir ?? 'none'} type="Doviz" size="normal" />
              <ShowcasePriceBox value={dovizEUR?.ask} dir={dovizEUR?.dir ?? 'none'} type="Doviz" size="normal" />
              <div className="w-5 flex justify-end">
                <DirIcon dir={dovizEUR?.dir ?? 'none'} size={18} />
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ════════════════════ KOLON 2: SARRAFİYE & ZİYNET ════════════════════ */}
      <motion.div
        {...ANIM.FADE_UP}
        transition={{ delay: 0.1, duration: ANIM.DURATION.NORMAL }}
        className="bg-gray-900/80 backdrop-blur-2xl border border-yellow-500/25 rounded-3xl p-5 md:p-6 flex flex-col justify-between shadow-2xl shadow-black/60 relative overflow-hidden"
      >
        {/* Kolon Başlığı */}
        <div className="flex items-center justify-between border-b border-yellow-500/20 pb-4 mb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 shadow-md">
              <Coins size={22} />
            </div>
            <div>
              <h2 className="text-yellow-400 font-bold text-lg md:text-xl tracking-wider uppercase">
                {MESSAGES.SHOWCASE_ZIYNET_RATES}
              </h2>
              <span className="text-xs text-gray-400 font-medium tracking-widest uppercase">
                Baskı & Darphane Ziynet
              </span>
            </div>
          </div>
          <span className="text-xs text-gray-500 font-bold tracking-widest uppercase">TL</span>
        </div>

        {/* Tablo Başlıkları */}
        <div className="flex items-center justify-between px-3 py-1.5 bg-gray-950/60 rounded-xl border border-gray-800/60 mb-2">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider flex-1">SARRAFİYE CİNSİ</span>
          <div className="flex items-center gap-3 pr-6">
            <span className="w-[120px] text-center text-xs font-bold text-gray-400 uppercase tracking-wider">
              {MESSAGES.PRICES_ALIS}
            </span>
            <span className="w-[120px] text-center text-xs font-bold text-yellow-400 uppercase tracking-wider">
              {MESSAGES.PRICES_SATIS}
            </span>
          </div>
        </div>

        {/* Ziynet Ürün Satırları */}
        <div className="flex flex-col gap-2.5 flex-1 justify-between">
          {ZIYNET_TL_OLD_CODES.map(code => {
            const label = ZIYNET_TL_LABELS[code] ?? code;
            const { bid, ask, dir } = calcZiynet(code);

            return (
              <div
                key={code}
                className="bg-gray-950/70 border border-gray-800/80 rounded-2xl p-3 flex items-center justify-between hover:border-yellow-500/30 transition-all"
              >
                <div className="flex-1 min-w-0 mr-2">
                  <p className="font-bold text-white text-base md:text-lg truncate">{label}</p>
                  <p className="text-[10px] text-gray-500 font-mono">Eski/Yeni Baskı</p>
                </div>
                <div className="flex items-center gap-3">
                  <ShowcasePriceBox value={bid} dir={dir} type="TL" size="normal" />
                  <ShowcasePriceBox value={ask} dir={dir} type="TL" size="normal" />
                  <div className="w-5 flex justify-end">
                    <DirIcon dir={dir} size={18} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* ════════════════════ KOLON 3: BİLEZİK & İŞLENMİŞ ALTIN ════════════════════ */}
      <motion.div
        {...ANIM.FADE_UP}
        transition={{ delay: 0.15, duration: ANIM.DURATION.NORMAL }}
        className="bg-gray-900/80 backdrop-blur-2xl border border-yellow-500/25 rounded-3xl p-5 md:p-6 flex flex-col justify-between shadow-2xl shadow-black/60 relative overflow-hidden"
      >
        {/* Kolon Başlığı */}
        <div className="flex items-center justify-between border-b border-yellow-500/20 pb-4 mb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-yellow-500/20 border border-yellow-500/40 text-yellow-400 shadow-md">
              <Gem size={22} />
            </div>
            <div>
              <h2 className="text-yellow-400 font-bold text-lg md:text-xl tracking-wider uppercase">
                {MESSAGES.SHOWCASE_BILEZIK_RATES}
              </h2>
              <span className="text-xs text-gray-400 font-medium tracking-widest uppercase">
                Ayar & Milyem Değerleri
              </span>
            </div>
          </div>
          <span className="text-xs text-gray-500 font-bold tracking-widest uppercase">Gram TL</span>
        </div>

        {/* Tablo Başlıkları */}
        <div className="flex items-center justify-between px-3 py-1.5 bg-gray-950/60 rounded-xl border border-gray-800/60 mb-2">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider flex-1">ÜRÜN / MODEL</span>
          <div className="flex items-center gap-3 pr-6">
            <span className="w-[120px] text-center text-xs font-bold text-gray-400 uppercase tracking-wider">
              {MESSAGES.PRICES_ALIS}
            </span>
            <span className="w-[120px] text-center text-xs font-bold text-yellow-400 uppercase tracking-wider">
              {MESSAGES.PRICES_SATIS}
            </span>
          </div>
        </div>

        {/* Bilezik ve Diğer Ürün Satırları */}
        <div className="flex flex-col gap-2.5 flex-1 justify-between">
          {PRODUCTS.map(({ key, label }) => {
            const mil = milMap[key as ProductKey];
            const { bid, ask } = calcProductPrice(mil);
            const dir: 'up' | 'down' | 'none' = activeHas?.dir ?? 'none';

            return (
              <div
                key={key}
                className="bg-gray-950/70 border border-gray-800/80 rounded-2xl p-3 flex items-center justify-between hover:border-yellow-500/30 transition-all"
              >
                <div className="flex-1 min-w-0 mr-2">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-white text-base md:text-lg truncate">{label}</p>
                    <span className="px-2 py-0.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 font-mono text-[11px] font-bold">
                      {mil}‰
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-500 font-mono">Has × {mil} / 1000</p>
                </div>
                <div className="flex items-center gap-3">
                  <ShowcasePriceBox value={bid} dir={dir} type="TL" size="normal" />
                  <ShowcasePriceBox value={ask} dir={dir} type="TL" size="normal" />
                  <div className="w-5 flex justify-end">
                    <DirIcon dir={dir} size={18} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}

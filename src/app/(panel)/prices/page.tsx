'use client';

import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronUp, ChevronDown, Minus, Settings,
  X, Save, ArrowUp, ArrowDown, Loader2
} from 'lucide-react';
import { THEME, ANIM } from '@/constants/theme';
import { MESSAGES } from '@/constants/messages';
import HeaderActions from '@/components/HeaderActions';
import {
  ALTIS_WS_URL,
  HAREM_WS_URL,
  HAREM_WS_PATH,
  SOURCE_LABELS,
  HAS_CODE,
  HAREM_HAS_CODE,
  USDTRY_CODE,
  EURTRY_CODE,
  ZIYNET_OLD_CODES,
  ZIYNET_TL_OLD_CODES,
  ZIYNET_TL_LABELS,
  PRODUCTS,
  DEFAULT_SETTINGS,
  type ProductKey,
} from '@/constants/prices';

// ─── Tipler ─────────────────────────────────────────────────────────────────

interface PriceData {
  code: string;
  bid: number;
  ask: number;
  dir: 'up' | 'down' | 'none';
}

type ConnectionStatus = 'connecting' | 'connected' | 'error';

interface AppSettings {
  sourceOrder:   string[];
  priceOffsets:  Record<string, any>;
  mil24Ayar:     number;
  mil22Ayar:     number;
  milAdanaBurma: number;
  milAjda:       number;
  mil14Ayar:     number;
}

type SettingsTab = 'source' | 'milliemes';

// ─── Yardımcı Fonksiyonlar ───────────────────────────────────────────────────

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
  if (val == null || isNaN(val)) return '—';
  return Math.round(val).toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtDoviz(val: number | undefined): string {
  if (val == null || isNaN(val)) return '—';
  return val.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getProductLabel(label: string, mil: number): string {
  if (label.includes('Bilezik')) {
    const formattedMil = (mil / 1000).toLocaleString('tr-TR', {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3
    });
    return `${label} (${formattedMil})`;
  }
  return label;
}

// ─── Alt Bileşenler ─────────────────────────────────────────────────────────

function DirIcon({ dir }: { dir: 'up' | 'down' | 'none' }) {
  if (dir === 'up')
    return <ChevronUp size={18} className="text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]" />;
  if (dir === 'down')
    return <ChevronDown size={18} className="text-red-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.5)]" />;
  return <Minus size={18} className="text-gray-600" />;
}

function dirColor(dir: 'up' | 'down' | 'none'): string {
  if (dir === 'up') return 'text-emerald-400';
  if (dir === 'down') return 'text-red-400';
  return 'text-white';
}

function PriceCell({ value, dir, type = 'TL' }: { value: number | undefined; dir: 'up' | 'down' | 'none'; type?: 'TL' | 'Doviz' }) {
  const formatted = type === 'TL' ? fmtTL(value) : fmtDoviz(value);
  
  const bgClass =
    dir === 'up' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-extrabold' :
    dir === 'down' ? 'bg-red-500/10 border-red-500/30 text-red-400 font-extrabold' :
    'bg-gray-950/60 border-gray-800/60 text-white font-bold';
    
  return (
    <span className={`w-36 text-center font-mono text-xl md:text-2xl px-2.5 py-2 rounded-xl border transition-all duration-300 ${bgClass}`}>
      {formatted}
    </span>
  );
}

function StatusDot({ status }: { status: ConnectionStatus }) {
  if (status === 'connected')
    return <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block" />;
  if (status === 'connecting')
    return <Loader2 size={8} className="text-yellow-400 animate-spin inline-block" />;
  return <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />;
}

function ConnBadge({ label, status }: { label: string; status: ConnectionStatus }) {
  const color =
    status === 'connected' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
    status === 'connecting' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
    'bg-red-500/10 text-red-400 border-red-500/20';
  const txt =
    status === 'connected'  ? MESSAGES.PRICES_CONNECTED :
    status === 'connecting' ? MESSAGES.PRICES_CONNECTING :
    MESSAGES.PRICES_ERROR;

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border ${color}`}>
      <StatusDot status={status} />
      <span className="font-semibold">{label}</span>
      <span className="opacity-70">{txt}</span>
    </div>
  );
}

function CardHeader({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <div className="bg-gradient-to-r from-gray-900 to-gray-800 border-b border-yellow-900/20 py-3 px-5 flex justify-between items-center">
      <h3 className="text-yellow-500 font-semibold tracking-wider text-xs uppercase">{title}</h3>
      {right && <div>{right}</div>}
    </div>
  );
}

// ─── Ana Bileşen ─────────────────────────────────────────────────────────────

export default function PricesPage() {
  // WebSocket verileri
  const [altisData, setAltisData] = useState<Record<string, PriceData>>({});
  const [haremData, setHaremData] = useState<Record<string, PriceData>>({});
  const [altisStatus, setAltisStatus]   = useState<ConnectionStatus>('connecting');
  const [haremStatus, setHaremStatus]   = useState<ConnectionStatus>('connecting');

  // DB'den yüklenen ziynet milyemleri (Otomatik modda Harem'e geçiş için)
  const [dbZiynets, setDbZiynets] = useState<Record<string, { bid: number; ask: number }>>({});

  // Ayarlar
  const [settings, setSettings]       = useState<AppSettings>({
    sourceOrder:   [...DEFAULT_SETTINGS.sourceOrder],
    priceOffsets:  { ...DEFAULT_SETTINGS.priceOffsets },
    mil24Ayar:     DEFAULT_SETTINGS.mil24Ayar,
    mil22Ayar:     DEFAULT_SETTINGS.mil22Ayar,
    milAdanaBurma: DEFAULT_SETTINGS.milAdanaBurma,
    milAjda:       DEFAULT_SETTINGS.milAjda,
    mil14Ayar:     DEFAULT_SETTINGS.mil14Ayar,
  });
  const [editSettings, setEditSettings] = useState<AppSettings>({
    ...settings,
    sourceOrder:  [...settings.sourceOrder],
    priceOffsets: { ...settings.priceOffsets },
  });
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  // UI state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab]       = useState<SettingsTab>('source');
  const [settingsSaving, setSettingsSaving] = useState(false);

  // Refs
  const altisWsRef     = useRef<WebSocket | null>(null);
  const haremSocketRef = useRef<Socket | null>(null);
  const lastHasBid     = useRef<number>(0);
  const lastHasAsk     = useRef<number>(0);
  const ziynetLastRef  = useRef<Record<string, { bid: number; ask: number }>>({});
  const lastSavedPricesRef = useRef<Record<string, { bid: number; ask: number }>>({});

  // ─── Ayarları ve Kayıtlı Ziynet Milyemlerini DB'den yükle ──────────────────

  useEffect(() => {
    // 1. Ayarları yükle
    fetch('/api/prices/settings')
      .then(r => r.json())
      .then((data: AppSettings) => {
        if (!data || typeof data !== 'object' || !Array.isArray(data.sourceOrder)) return;
        setSettings(data);
        setEditSettings({
          ...data,
          sourceOrder:  [...data.sourceOrder],
          priceOffsets: { ...(data.priceOffsets ?? {}) }
        });
        setSettingsLoaded(true);
      })
      .catch(console.error);

    // 2. Ziynet milyemlerini yükle
    fetch('/api/prices/ziynet')
      .then(r => r.json())
      .then((data: Array<{ id: string; bid: number; ask: number }>) => {
        const map: Record<string, { bid: number; ask: number }> = {};
        if (Array.isArray(data)) {
          data.forEach(item => {
            map[item.id] = { bid: item.bid, ask: item.ask };
          });
        }
        setDbZiynets(map);
      })
      .catch(console.error);
  }, []);

  // ─── Altis WebSocket ──────────────────────────────────────────────────

  useEffect(() => {
    const ws = new WebSocket(ALTIS_WS_URL);
    altisWsRef.current = ws;
    setAltisStatus('connecting');

    ws.onopen = () => setAltisStatus('connected');
    ws.onerror = () => setAltisStatus('error');
    ws.onclose = () => setAltisStatus('error');

    ws.onmessage = (event) => {
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
      } catch (e) { console.error('[Altis]', e); }
    };

    return () => { ws.onclose = null; ws.close(); };
  }, []);

  // ─── Harem Altın Socket.io ─────────────────────────────────────────────

  useEffect(() => {
    const socket = io(HAREM_WS_URL, { transports: ['websocket'], path: HAREM_WS_PATH });
    haremSocketRef.current = socket;
    setHaremStatus('connecting');

    socket.on('connect',       () => setHaremStatus('connected'));
    socket.on('connect_error', () => setHaremStatus('error'));
    socket.on('disconnect',    () => setHaremStatus('error'));

    socket.on('price_changed', (payload) => {
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

            // ALTIN ve Ziynet kod eşleştirmeleri
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

            next[code] = {
              code,
              bid,
              ask,
              dir,
            };
          });
          return next;
        });
      } catch (e) { console.error('[Harem]', e); }
    });

    return () => { socket.disconnect(); };
  }, []);

  // ─── Has fiyatı DB'ye yaz (Altis'ten, değişince) ────────────────────────

  useEffect(() => {
    const hasPrice = altisData[HAS_CODE];
    if (!hasPrice) return;
    if (hasPrice.bid === lastHasBid.current && hasPrice.ask === lastHasAsk.current) return;
    lastHasBid.current = hasPrice.bid;
    lastHasAsk.current = hasPrice.ask;

    fetch('/api/prices/has', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bid: hasPrice.bid, ask: hasPrice.ask, source: 'altis' }),
    }).catch(console.error);
  }, [altisData]);

  // ─── Ziynet has milyemleri DB'ye yaz (Altis'ten, değişince) ─────────────
  useEffect(() => {
    const updates: Array<{ id: string; bid: number; ask: number }> = [];

    ZIYNET_OLD_CODES.forEach(code => {
      const price = altisData[code];
      if (!price) return;
      // Sıfır veya geçersiz gelen milyem değerlerini DB'ye ve ref'e kaydetmiyoruz
      if (price.bid <= 0 || price.ask <= 0) return;

      const last = ziynetLastRef.current[code];
      if (last?.bid === price.bid && last?.ask === price.ask) return;

      ziynetLastRef.current[code] = { bid: price.bid, ask: price.ask };
      updates.push({ id: code, bid: price.bid, ask: price.ask });
    });

    if (updates.length > 0) {
      fetch('/api/prices/ziynet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      .then(r => {
        if (r.ok) {
          setDbZiynets(prev => {
            const next = { ...prev };
            updates.forEach(u => {
              next[u.id] = { bid: u.bid, ask: u.ask };
            });
            return next;
          });
        }
      })
      .catch(console.error);
    }
  }, [altisData]);

  // ─── Fiyat Farkı Ekleme / Hesaplama Metodları ──────────────────────────────

  const getAdjustedPrice = (
    code: string,
    rawVal: number | undefined,
    type: 'bid' | 'ask'
  ): number | undefined => {
    if (rawVal == null || isNaN(rawVal)) return undefined;
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

  // ─── Ayarlar kaydet ──────────────────────────────────────────────────────

  const saveSettings = async () => {
    setSettingsSaving(true);
    try {
      const res = await fetch('/api/prices/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceOrder:   editSettings.sourceOrder,
          priceOffsets:  editSettings.priceOffsets,
          mil24Ayar:     editSettings.mil24Ayar,
          mil22Ayar:     editSettings.mil22Ayar,
          milAdanaBurma: editSettings.milAdanaBurma,
          milAjda:       editSettings.milAjda,
          mil14Ayar:     editSettings.mil14Ayar,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        console.error('Settings PUT error:', data);
        alert(`Ayarlar kaydedilemedi: ${data.details || data.error || 'Bilinmeyen hata'}`);
        setSettingsSaving(false);
        return;
      }
      setSettings({ ...(data as AppSettings) });
      setIsSettingsOpen(false);
    } catch (e) {
      console.error(e);
      alert('Ayarlar kaydedilirken bir ağ hatası oluştu.');
    }
    setSettingsSaving(false);
  };

  // Kaynak sırası değiştir
  const moveSource = (idx: number, direction: -1 | 1) => {
    const newOrder = [...editSettings.sourceOrder];
    const target = idx + direction;
    if (target < 0 || target >= newOrder.length) return;
    [newOrder[idx], newOrder[target]] = [newOrder[target], newOrder[idx]];
    setEditSettings(prev => ({ ...prev, sourceOrder: newOrder }));
  };

  // Milyem değiştir
  const setEditMil = (key: ProductKey, val: number) => {
    setEditSettings(prev => ({ ...prev, [key]: val }));
  };

  // Fiyat farkı değiştir
  const setEditOffset = (key: string, val: number) => {
    setEditSettings(prev => ({
      ...prev,
      priceOffsets: {
        ...(prev.priceOffsets ?? {}),
        [key]: val,
      },
    }));
  };

  // ─── Diğer altın ürünler fiyat hesaplama ────────────────────────────────

  const calcProductPrice = (milieme: number): { bid: number | undefined; ask: number | undefined } => {
    if (!activeHas) return { bid: undefined, ask: undefined };
    return {
      bid: activeHas.bid * milieme / 1000,
      ask: activeHas.ask * milieme / 1000,
    };
  };

  const milMap: Record<ProductKey, number> = {
    mil24Ayar:     settings.mil24Ayar,
    mil22Ayar:     settings.mil22Ayar,
    milAdanaBurma: settings.milAdanaBurma,
    milAjda:       settings.milAjda,
    mil14Ayar:     settings.mil14Ayar,
  };

  // ─── Bağlantı durumları ───────────────────────────────────────────────

  const statusMap: Record<string, ConnectionStatus> = {
    altis: altisStatus,
    harem: haremStatus,
  };

  // İkincil ve Birincil kaynak
  const safeSourceOrder = Array.isArray(settings?.sourceOrder) ? settings.sourceOrder : ['harem', 'altis'];
  const secondarySrcKey = safeSourceOrder[1] ?? 'altis';
  let activeSrcKey = safeSourceOrder[0] ?? 'harem';
  const secondaryData   = secondarySrcKey === 'altis' ? altisData : haremData;

  // Döviz (önce Harem, yoksa Altis) - Raw ve Fark uygulanmış versiyonlar
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

  // Aktif kaynak (hesaplamalar için) - Raw ve Fark uygulanmış versiyonlar
  // Altis ve Harem'in online olması için gelen verinin içinde en az bir tane sıfırdan büyük geçerli fiyat olmalı
  const hasAltisValidPrices = Object.values(altisData).some(p => p.bid > 0 && p.ask > 0);
  const hasHaremValidPrices = Object.values(haremData).some(p => p.bid > 0 && p.ask > 0);

  const isAltisOnline = altisStatus === 'connected' && hasAltisValidPrices;
  const isHaremOnline = haremStatus === 'connected' && hasHaremValidPrices;

  if (activeSrcKey === 'altis' && !isAltisOnline && isHaremOnline) {
    activeSrcKey = 'harem';
  } else if (activeSrcKey === 'harem' && !isHaremOnline && isAltisOnline) {
    activeSrcKey = 'altis';
  }

  const primaryData  = activeSrcKey === 'altis' ? altisData : haremData;
  const rawActiveHas = primaryData[HAS_CODE] ?? altisData[HAS_CODE] ?? haremData[HAS_CODE];

  const activeHas = rawActiveHas
    ? {
        ...rawActiveHas,
        bid: getAdjustedPrice(HAS_CODE, rawActiveHas.bid, 'bid') ?? 0,
        ask: getAdjustedPrice(HAS_CODE, rawActiveHas.ask, 'ask') ?? 0,
      }
    : undefined;

  // Ziynet fiyat hesaplama yardımcısı
  const calcZiynet = (
    code: string,
    isManuel: boolean,
    activeHasPrice: { bid: number; ask: number; dir: 'up' | 'down' | 'none' } | undefined
  ): { bid: number; ask: number; dir: 'up' | 'down' | 'none' } => {
    let bid = 0;
    let ask = 0;
    let dir: 'up' | 'down' | 'none' = 'none';

    if (isManuel) {
      const weight = getZiynetWeight(code);
      if (activeHasPrice) {
        const rawBid = activeHasPrice.bid * weight;
        const rawAsk = activeHasPrice.ask * weight;
        const bidOffset = settings.priceOffsets?.[`${code.toLowerCase()}Bid`] ?? 0;
        const askOffset = settings.priceOffsets?.[`${code.toLowerCase()}Ask`] ?? 0;
        bid = rawBid + bidOffset;
        ask = rawAsk + askOffset;
        dir = activeHasPrice.dir;
      }
    } else {
      // Otomatik mod: Önce aktif kaynaktaki ham veriyi kontrol et
      const rawD = (activeSrcKey === 'altis' ? altisData[code] : haremData[code]) ?? haremData[code] ?? altisData[code];
      if (rawD && rawD.bid > 0 && rawD.ask > 0) {
        bid = getAdjustedPrice(code, rawD.bid, 'bid') ?? 0;
        ask = getAdjustedPrice(code, rawD.ask, 'ask') ?? 0;
        dir = rawD.dir;
      } else {
        // DB'deki son ziynet milyemlerini kullanarak aktif Has üzerinden hesapla
        const hasCode = code.replace('TL', '');
        const dbMilyem = dbZiynets[hasCode];
        
        // Eğer DB'den çekilen değerler geçersiz veya sıfır ise, varsayılan ağırlığa düş (fallbackWeight)
        const fallbackWeight = getZiynetWeight(code);
        const mBid = (dbMilyem && dbMilyem.bid > 0) ? dbMilyem.bid : fallbackWeight;
        const mAsk = (dbMilyem && dbMilyem.ask > 0) ? dbMilyem.ask : fallbackWeight;

        if (activeHasPrice && mBid > 0 && mAsk > 0) {
          const rawBid = activeHasPrice.bid * mBid;
          const rawAsk = activeHasPrice.ask * mAsk;
          const bidOffset = settings.priceOffsets?.[`${code.toLowerCase()}Bid`] ?? 0;
          const askOffset = settings.priceOffsets?.[`${code.toLowerCase()}Ask`] ?? 0;
          bid = rawBid + bidOffset;
          ask = rawAsk + askOffset;
          dir = activeHasPrice.dir;
        }
      }
    }

    return { bid, ask, dir };
  };

  // ─── Nihai İşlenmiş Fiyatları DB'ye Yaz ────────────────────────────────
  useEffect(() => {
    if (!activeHas) return;

    const finalPrices: Array<{ id: string; label: string; bid: number; ask: number }> = [];

    // 1. Has Altın
    finalPrices.push({
      id: 'GAUTRY',
      label: 'Has Altın',
      bid: activeHas.bid,
      ask: activeHas.ask,
    });

    // 2. Döviz
    if (dovizUSD) {
      finalPrices.push({
        id: 'USDTRY',
        label: 'Amerikan Doları (USD)',
        bid: dovizUSD.bid,
        ask: dovizUSD.ask,
      });
    }
    if (dovizEUR) {
      finalPrices.push({
        id: 'EURTRY',
        label: 'Euro (EUR)',
        bid: dovizEUR.bid,
        ask: dovizEUR.ask,
      });
    }

    const isManuel = settings.priceOffsets?.isManuel === true;
    ZIYNET_TL_OLD_CODES.forEach(code => {
      const { bid, ask } = calcZiynet(code, isManuel, activeHas);
      finalPrices.push({
        id: code,
        label: ZIYNET_TL_LABELS[code] ?? code,
        bid,
        ask,
      });
    });

    // 4. Diğer Altın Ürünler
    PRODUCTS.forEach(({ key, label }) => {
      const mil = milMap[key as ProductKey];
      const { bid: pBid, ask: pAsk } = calcProductPrice(mil);
      if (pBid != null && pAsk != null) {
        finalPrices.push({
          id: key,
          label,
          bid: pBid,
          ask: pAsk,
        });
      }
    });

    // Değişim kontrolü (Gereksiz DB yükünü engellemek için)
    let hasChanged = false;
    finalPrices.forEach(p => {
      const last = lastSavedPricesRef.current[p.id];
      if (!last || last.bid !== p.bid || last.ask !== p.ask) {
        hasChanged = true;
      }
    });

    if (hasChanged) {
      finalPrices.forEach(p => {
        lastSavedPricesRef.current[p.id] = { bid: p.bid, ask: p.ask };
      });

      fetch('/api/prices/live', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalPrices),
      }).catch(console.error);
    }
  }, [activeHas, dovizUSD, dovizEUR, altisData, settings, milMap]);

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── HEADER ──────────────────────────────────────────────────── */}
      <header className={THEME.HEADER}>
        <div className="flex justify-between items-center w-full flex-wrap gap-3">
          <motion.div {...ANIM.FADE_UP} transition={{ duration: ANIM.DURATION.NORMAL }} className="flex items-center gap-3 flex-wrap">
            <h1 className={THEME.HEADER_TITLE}>{MESSAGES.MENU_PRICES}</h1>
            <ConnBadge label="Altis"      status={altisStatus} />
            <ConnBadge label="Harem"      status={haremStatus} />
            {/* Milyem Mode Badge */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border ${
              settings.priceOffsets?.isManuel
                ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20 shadow-[0_0_10px_rgba(234,179,8,0.05)]'
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.05)]'
            }`}>
              <span className={`w-2 h-2 rounded-full inline-block ${
                settings.priceOffsets?.isManuel ? 'bg-yellow-400' : 'bg-emerald-400'
              }`} />
              <span>Milyem: {settings.priceOffsets?.isManuel ? 'Manuel' : 'Otomatik'}</span>
            </div>
          </motion.div>

          <div className="flex items-center gap-3 ml-auto">
            <button
              onClick={() => {
                setEditSettings({
                  ...settings,
                  sourceOrder:  [...settings.sourceOrder],
                  priceOffsets: { ...settings.priceOffsets },
                });
                setIsSettingsOpen(true);
              }}
              className={`${THEME.BTN_SECONDARY} flex items-center gap-2`}
            >
              <Settings size={16} />
              {MESSAGES.PRICES_SETTINGS_TITLE}
            </button>
            <HeaderActions />
          </div>
        </div>
      </header>

      {/* ── ANA İÇERİK ──────────────────────────────────────────────── */}
      <div className={`${THEME.PAGE_WRAPPER} flex flex-col min-h-[calc(100vh-100px)]`}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 items-stretch min-h-[calc(100vh-140px)]">

          {/* ════════════════════ SOL KOLON (HAS & DÖVİZ) ════════════════════ */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0, duration: ANIM.DURATION.NORMAL }}
            className={`${THEME.GLASS_CARD} overflow-hidden flex flex-col h-full`}
          >
            <CardHeader title="HAS & DÖVİZ" />

            {/* Aktif kaynak — büyük */}
            <div className="px-6 py-6 border-b border-gray-800/50 flex-1 flex flex-col justify-center">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-bold text-yellow-500 uppercase tracking-widest">
                  {SOURCE_LABELS[activeSrcKey]} · {MESSAGES.PRICES_ACTIVE_SOURCE} (HAS)
                </span>
                <StatusDot status={statusMap[activeSrcKey]} />
              </div>
              {activeHas ? (
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 mb-1 font-semibold">{MESSAGES.PRICES_ALIS}</p>
                    <div className={`py-2.5 px-4 rounded-xl border font-mono font-black text-3xl lg:text-4xl xl:text-4xl tracking-tight text-center ${
                      activeHas.dir === 'up' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
                      activeHas.dir === 'down' ? 'bg-red-500/10 border-red-500/30 text-red-400' :
                      'bg-gray-950/60 border-gray-800/60 text-white'
                    }`}>
                      {fmtTL(activeHas.bid)}
                    </div>
                  </div>
                  <div className="w-8 flex justify-center items-center">
                    <DirIcon dir={activeHas.dir} />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 mb-1 font-semibold text-right">{MESSAGES.PRICES_SATIS}</p>
                    <div className={`py-2.5 px-4 rounded-xl border font-mono font-black text-3xl lg:text-4xl xl:text-4xl tracking-tight text-center ${
                      activeHas.dir === 'up' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
                      activeHas.dir === 'down' ? 'bg-red-500/10 border-red-500/30 text-red-400' :
                      'bg-gray-950/60 border-gray-800/60 text-white'
                    }`}>
                      {fmtTL(activeHas.ask)}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 text-sm font-semibold">Bekleniyor...</p>
              )}
            </div>

            {/* İkincil kaynak — küçük */}
            <div className="px-6 py-4 border-b border-gray-800/50 flex-1 flex flex-col justify-center">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
                  {SOURCE_LABELS[secondarySrcKey]} · {MESSAGES.PRICES_SECONDARY_SOURCE} (HAS)
                </span>
                <StatusDot status={statusMap[secondarySrcKey]} />
              </div>
              {secondaryData[HAS_CODE] ? (
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 flex items-center justify-between py-1.5 px-3 rounded-xl bg-gray-950/40 border border-gray-800/60">
                    <span className="text-xs text-gray-500">{MESSAGES.PRICES_ALIS}</span>
                    <span className="font-bold font-mono text-base text-gray-400">
                      {fmtTL(secondaryData[HAS_CODE]?.bid)}
                    </span>
                  </div>
                  <div className="flex-1 flex items-center justify-between py-1.5 px-3 rounded-xl bg-gray-950/40 border border-gray-800/60">
                    <span className="text-xs text-gray-500">{MESSAGES.PRICES_SATIS}</span>
                    <span className="font-bold font-mono text-base text-gray-400">
                      {fmtTL(secondaryData[HAS_CODE]?.ask)}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-gray-655 text-sm">Veri yok</p>
              )}
            </div>

            {/* DÖVİZ — Harem'den */}
            <div className="flex-[2] flex flex-col justify-between">
              {/* Döviz sütun başlıkları */}
              <div className="flex justify-between items-center px-6 py-2 bg-gray-900/40 border-b border-gray-800/30">
                <span className="text-xs text-gray-500 font-bold uppercase tracking-wider flex-1">DÖVİZ</span>
                <div className="flex items-center gap-4 pr-5">
                  <span className="w-36 text-center text-xs text-gray-500 font-bold uppercase tracking-wider">{MESSAGES.PRICES_ALIS}</span>
                  <span className="w-36 text-center text-xs text-gray-500 font-bold uppercase tracking-wider">{MESSAGES.PRICES_SATIS}</span>
                </div>
              </div>

              <div className="divide-y divide-gray-800/30 flex-1 flex flex-col justify-between">
                {[
                  { label: 'USD/TRY', data: dovizUSD },
                  { label: 'EUR/TRY', data: dovizEUR },
                ].map(({ label, data }) => (
                  <div key={label} className="flex-1 flex items-center justify-between py-4 px-6 hover:bg-yellow-500/5 transition-colors">
                    <span className="text-gray-200 font-bold text-base">{label}</span>
                    <div className="flex items-center gap-4">
                      <PriceCell value={data?.bid} dir={data?.dir ?? 'none'} type="Doviz" />
                      <PriceCell value={data?.ask} dir={data?.dir ?? 'none'} type="Doviz" />
                      <div className="w-5 flex justify-end">{data ? <DirIcon dir={data.dir} /> : <Minus size={16} className="text-gray-700" />}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* ════════════════════ ORTA KOLON (ESKİ ZİYNET) ════════════════════ */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: ANIM.DURATION.NORMAL }}
            className={`${THEME.GLASS_CARD} overflow-hidden flex flex-col h-full`}
          >
            <CardHeader title={MESSAGES.PRICES_ZIYNET_TL_TITLE} />
            <div className="flex justify-between items-center px-6 py-3 bg-gray-900/40 border-b border-gray-800/30">
              <span className="text-xs text-gray-500 font-bold uppercase tracking-wider flex-1">ÜRÜN</span>
              <div className="flex items-center gap-4 pr-5">
                <span className="w-36 text-center text-xs text-gray-500 font-bold uppercase tracking-wider">{MESSAGES.PRICES_ALIS}</span>
                <span className="w-36 text-center text-xs text-gray-500 font-bold uppercase tracking-wider">{MESSAGES.PRICES_SATIS}</span>
              </div>
            </div>
            <div className="divide-y divide-gray-800/50 flex-1 flex flex-col justify-between">
              {ZIYNET_TL_OLD_CODES.map(code => {
                const isManuel = settings.priceOffsets?.isManuel === true;
                const { bid, ask, dir } = calcZiynet(code, isManuel, activeHas);

                return (
                  <div key={code} className="flex-1 flex items-center justify-between py-3 px-6 hover:bg-yellow-500/5 transition-colors">
                    <div className="flex-1 min-w-0 mr-3 flex items-center">
                      <p className="text-gray-200 font-bold text-base truncate">{ZIYNET_TL_LABELS[code]}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <PriceCell value={bid} dir={dir} type="TL" />
                      <PriceCell value={ask} dir={dir} type="TL" />
                      <div className="w-5 flex justify-end">{bid != null ? <DirIcon dir={dir} /> : <Minus size={16} className="text-gray-700" />}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* ════════════════════ SAĞ KOLON (DİĞER ALTIN ÜRÜNLER) ════════════════════ */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: ANIM.DURATION.NORMAL }}
            className={`${THEME.GLASS_CARD} overflow-hidden flex flex-col h-full`}
          >
            <CardHeader
              title={MESSAGES.PRICES_PRODUCTS_TITLE}
              right={<span className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Has × Milyem</span>}
            />
            <div className="flex justify-between items-center px-6 py-3 bg-gray-900/40 border-b border-gray-800/30">
              <span className="text-xs text-gray-500 font-bold uppercase tracking-wider flex-1">ÜRÜN</span>
              <div className="flex items-center gap-4 pr-5">
                <span className="w-8 text-center text-xs text-gray-500 font-bold uppercase tracking-wider">MİL</span>
                <span className="w-36 text-center text-xs text-gray-500 font-bold uppercase tracking-wider">{MESSAGES.PRICES_ALIS}</span>
                <span className="w-36 text-center text-xs text-gray-500 font-bold uppercase tracking-wider">{MESSAGES.PRICES_SATIS}</span>
              </div>
            </div>

            <div className="divide-y divide-gray-800/50 flex-1 flex flex-col justify-between">
              {PRODUCTS.map(({ key, label }) => {
                const mil = milMap[key as ProductKey];
                const { bid, ask } = calcProductPrice(mil);
                const dir: 'up' | 'down' | 'none' = activeHas?.dir ?? 'none';
                const dynamicLabel = getProductLabel(label, mil);

                return (
                  <div key={key} className="flex-1 flex items-center justify-between py-3 px-6 hover:bg-yellow-500/5 transition-colors">
                    <div className="flex-1 min-w-0 mr-3 flex items-center">
                      <p className="text-gray-200 font-bold text-base truncate">{label}</p>
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0">
                      <span className="w-8 text-center text-gray-400 text-xs font-mono font-bold">{mil.toFixed(0)}</span>
                      <PriceCell value={bid} dir={dir} type="TL" />
                      <PriceCell value={ask} dir={dir} type="TL" />
                      <div className="w-5 flex justify-end">{bid != null ? <DirIcon dir={dir} /> : <Minus size={16} className="text-gray-700" />}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {!activeHas && (
              <div className="px-6 py-4 text-center text-gray-500 text-sm font-semibold">
                Has fiyatı bekleniyor...
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* ════════════════════ AYARLAR MODALI ════════════════════ */}
      <AnimatePresence>
        {isSettingsOpen && (
          <>
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
              onClick={() => setIsSettingsOpen(false)}
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 flex items-center justify-center z-50 p-4"
              onClick={e => e.stopPropagation()}
            >
              <div className="bg-gray-900 border border-yellow-900/30 rounded-2xl shadow-2xl w-full max-w-6xl overflow-hidden flex flex-col max-h-[95vh]">

                {/* Modal başlık */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-yellow-900/20 bg-gradient-to-r from-gray-900 to-gray-800 flex-shrink-0">
                  <h2 className="text-white font-semibold text-lg flex items-center gap-2">
                    <Settings size={18} className="text-yellow-500" />
                    {MESSAGES.PRICES_SETTINGS_TITLE}
                  </h2>
                  <button
                    onClick={() => setIsSettingsOpen(false)}
                    className={THEME.BTN_ICON}
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Sekmeler */}
                <div className="flex border-b border-gray-800 flex-shrink-0">
                  {[
                    { id: 'source' as SettingsTab,    label: MESSAGES.PRICES_SOURCE_ORDER_TAB },
                    { id: 'milliemes' as SettingsTab, label: MESSAGES.PRICES_MILLIEMES_TAB },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setSettingsTab(tab.id)}
                      className={`flex-1 py-3 text-sm font-medium transition-colors ${
                        settingsTab === tab.id
                          ? 'text-yellow-400 border-b-2 border-yellow-500 bg-yellow-500/5'
                          : 'text-gray-500 hover:text-gray-300'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Sekme içeriği */}
                <div className="p-6 overflow-y-auto flex-1">

                  {/* ── KAYNAK ÖNCELİĞİ ──────────────────────────────── */}
                  {settingsTab === 'source' && (
                    <div className="space-y-3">
                      <p className="text-gray-500 text-xs mb-4">
                        İlk sıradaki kaynak aktif (birincil) olarak kullanılır. Bağlantı kesilirse ikinci kaynağa bakılır.
                      </p>
                      {editSettings.sourceOrder.map((src, idx) => (
                        <div
                          key={src}
                          className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${
                            idx === 0
                              ? 'bg-yellow-500/10 border-yellow-500/30'
                              : 'bg-gray-800/50 border-gray-700/50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className={`text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center ${
                              idx === 0 ? 'bg-yellow-500 text-black' : 'bg-gray-700 text-gray-400'
                            }`}>
                              {idx + 1}
                            </span>
                            <div>
                              <p className={`font-medium text-sm ${idx === 0 ? 'text-yellow-400' : 'text-gray-300'}`}>
                                {SOURCE_LABELS[src]}
                              </p>
                              {idx === 0 && <p className="text-xs text-yellow-600">Aktif Kaynak</p>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <ConnBadge label="" status={statusMap[src]} />
                            <div className="flex flex-col gap-1 ml-1">
                              <button
                                onClick={() => moveSource(idx, -1)}
                                disabled={idx === 0}
                                className="p-1 rounded hover:bg-gray-700 disabled:opacity-20 disabled:cursor-not-allowed text-gray-400 hover:text-white transition-colors"
                              >
                                <ArrowUp size={14} />
                              </button>
                              <button
                                onClick={() => moveSource(idx, 1)}
                                disabled={idx === editSettings.sourceOrder.length - 1}
                                className="p-1 rounded hover:bg-gray-700 disabled:opacity-20 disabled:cursor-not-allowed text-gray-400 hover:text-white transition-colors"
                              >
                                <ArrowDown size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* ── ÜRÜN FİYATLANDIRMA ──────────────────────────────── */}
                  {settingsTab === 'milliemes' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                      {/* HAS & DÖVİZ OFFSETS (Sol Sütun) */}
                      <div className="bg-gray-800/10 p-4 rounded-xl border border-gray-800/40 flex flex-col h-full">
                        <h4 className="text-yellow-500 font-bold text-sm mb-1 uppercase tracking-wider">Has & Döviz Ayarları</h4>
                        <p className="text-gray-500 text-[10px] mb-4">
                          Sol sütundaki Has fiyatı ve döviz kurları için alış/satış makas farkları (spread).
                        </p>
                        <div className="space-y-3 flex-1 flex flex-col justify-between">
                          {[
                            { label: 'Has Fiyatı (GAUTRY)', key: 'gautry' },
                            { label: 'USD/TRY', key: 'usdtry' },
                            { label: 'EUR/TRY', key: 'eurtry' },
                          ].map(item => (
                            <div key={item.key} className="flex flex-col gap-1 bg-gray-900/60 p-2.5 rounded-lg border border-gray-850">
                              <span className="text-gray-300 text-xs font-semibold">{item.label}</span>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="text-[9px] text-gray-500">Alış Fark (+/-)</label>
                                  <input
                                    type="number"
                                    step="0.0001"
                                    value={editSettings.priceOffsets?.[`${item.key}Bid`] ?? 0}
                                    onChange={e => setEditOffset(`${item.key}Bid`, Number(e.target.value))}
                                    className="w-full px-2 py-1 bg-gray-800/80 border border-gray-700/50 rounded-lg text-white text-xs font-mono text-right focus:outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/30 transition-all"
                                  />
                                </div>
                                <div>
                                  <label className="text-[9px] text-gray-500">Satış Fark (+/-)</label>
                                  <input
                                    type="number"
                                    step="0.0001"
                                    value={editSettings.priceOffsets?.[`${item.key}Ask`] ?? 0}
                                    onChange={e => setEditOffset(`${item.key}Ask`, Number(e.target.value))}
                                    className="w-full px-2 py-1 bg-gray-800/80 border border-gray-700/50 rounded-lg text-white text-xs font-mono text-right focus:outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/30 transition-all"
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* ZİYNET TL OFFSETS (Orta Sütun) */}
                      <div className="bg-gray-800/10 p-4 rounded-xl border border-gray-800/40 flex flex-col h-full">
                        <h4 className="text-yellow-500 font-bold text-sm mb-1 uppercase tracking-wider">Ziynet Ayarları</h4>
                        
                        {/* Yöntem Toggle */}
                        <div className="flex items-center justify-between p-2 bg-gray-900/60 rounded-lg border border-gray-800/60 mb-4 mt-2">
                          <div>
                            <span className="text-gray-300 text-xs font-semibold block">Milyem Yöntemi</span>
                            <span className="text-[9px] text-gray-500">Otomatik (WS) / Manuel (Has × Ağırlık)</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => {
                                setEditSettings(prev => ({
                                  ...prev,
                                  priceOffsets: {
                                    ...(prev.priceOffsets ?? {}),
                                    isManuel: !prev.priceOffsets?.isManuel
                                  }
                                }));
                              }}
                              className={`w-9 h-5 flex items-center rounded-full p-0.5 cursor-pointer transition-colors duration-300 ${
                                editSettings.priceOffsets?.isManuel ? 'bg-yellow-500' : 'bg-emerald-500'
                              }`}
                            >
                              <div
                                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${
                                  editSettings.priceOffsets?.isManuel ? 'translate-x-4' : 'translate-x-0'
                                }`}
                              />
                            </button>
                            <span className={`text-[10px] font-bold ${editSettings.priceOffsets?.isManuel ? 'text-yellow-400' : 'text-emerald-400'}`}>
                              {editSettings.priceOffsets?.isManuel ? 'Manuel' : 'Oto'}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-3 flex-1 flex flex-col justify-between overflow-y-auto pr-1">
                          {ZIYNET_TL_OLD_CODES.map(code => {
                            const label = ZIYNET_TL_LABELS[code];
                            const key = code.toLowerCase();
                            const isManuel = editSettings.priceOffsets?.isManuel === true;
                            const keyMap: Record<string, string> = {
                              ECEYREKTL: 'eceyrekWeight',
                              EYARIMTL: 'eyarimWeight',
                              ETAMTL: 'etamWeight',
                              EATATL: 'eataWeight',
                              EGREMSETL: 'egremseWeight',
                            };
                            const wKey = keyMap[code];

                            return (
                              <div key={code} className="flex flex-col gap-1 bg-gray-900/60 p-2.5 rounded-lg border border-gray-850">
                                <div className="flex justify-between items-center">
                                  <span className="text-gray-300 text-xs font-semibold">{label} ({code})</span>
                                  {isManuel && (
                                    <div className="flex items-center gap-1">
                                      <span className="text-[9px] text-gray-500">Milyem:</span>
                                      <input
                                        type="number"
                                        step="0.001"
                                        value={editSettings.priceOffsets?.[wKey] ?? DEFAULT_SETTINGS.priceOffsets[wKey]}
                                        onChange={e => setEditOffset(wKey, Number(e.target.value))}
                                        className="w-16 px-1 py-0.5 bg-gray-800 border border-gray-700 rounded text-white text-[10px] font-mono text-center focus:outline-none focus:border-yellow-500/50"
                                        placeholder="gr"
                                      />
                                    </div>
                                  )}
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="text-[9px] text-gray-500">Alış Fark (+/- TL)</label>
                                    <input
                                      type="number"
                                      step="0.01"
                                      value={editSettings.priceOffsets?.[`${key}Bid`] ?? 0}
                                      onChange={e => setEditOffset(`${key}Bid`, Number(e.target.value))}
                                      className="w-full px-2 py-1 bg-gray-800/80 border border-gray-700/50 rounded-lg text-white text-xs font-mono text-right focus:outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/30 transition-all"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[9px] text-gray-500">Satış Fark (+/- TL)</label>
                                    <input
                                      type="number"
                                      step="0.01"
                                      value={editSettings.priceOffsets?.[`${key}Ask`] ?? 0}
                                      onChange={e => setEditOffset(`${key}Ask`, Number(e.target.value))}
                                      className="w-full px-2 py-1 bg-gray-800/80 border border-gray-700/50 rounded-lg text-white text-xs font-mono text-right focus:outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/30 transition-all"
                                    />
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* ÜRÜN MİLYEMLERİ (Sağ Sütun) */}
                      <div className="bg-gray-800/10 p-4 rounded-xl border border-gray-800/40 flex flex-col h-full">
                        <h4 className="text-yellow-500 font-bold text-sm mb-1 uppercase tracking-wider">Diğer Ürün Milyemleri</h4>
                        <p className="text-gray-500 text-[10px] mb-4">
                          Sağ sütundaki ürünler için milyem oranları. (Fiyat = Has × Milyem / 1000)
                        </p>
                        <div className="space-y-3 flex-1 flex flex-col justify-between">
                          {PRODUCTS.map(({ key, label }) => (
                            <div key={key} className="flex items-center justify-between gap-4">
                              <label className="text-gray-300 text-xs flex-1">{label}</label>
                              <div className="relative w-24">
                                <input
                                  type="number"
                                  step="1"
                                  min="1"
                                  max="1000"
                                  value={editSettings[key as ProductKey]}
                                  onChange={e => setEditMil(key as ProductKey, Number(e.target.value))}
                                  className="w-full px-2 py-1.5 bg-gray-800/80 border border-gray-700/50 rounded-lg text-white text-xs font-mono text-right focus:outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/30 transition-all"
                                />
                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-650 pointer-events-none">‰</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                    </div>
                  )}
                </div>

                {/* Modal footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-800 bg-gray-900/50 flex-shrink-0">
                  <button
                    onClick={() => setIsSettingsOpen(false)}
                    className={THEME.BTN_SECONDARY}
                  >
                    {MESSAGES.CANCEL}
                  </button>
                  <button
                    onClick={saveSettings}
                    disabled={settingsSaving}
                    className={`${THEME.BTN_PRIMARY} gap-2`}
                  >
                    {settingsSaving
                      ? <><Loader2 size={14} className="animate-spin" /> Kaydediliyor...</>
                      : <><Save size={14} /> {MESSAGES.PRICES_SAVE}</>
                    }
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

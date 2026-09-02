'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  UserPlus,
  Pencil,
  Trash2,
  X,
  Plus,
  CreditCard,
  ArrowUpRight,
  ArrowDownLeft,
  DollarSign,
  Euro,
  Scale,
  Phone,
  Mail,
  FileText,
  MapPin,
  Search,
  Printer,
  Calendar,
  Sparkles,
  TrendingUp,
  Share2,
  Coins,
  Eye,
} from 'lucide-react';
import { THEME } from '@/constants/theme';
import { ROUTES } from '@/constants/routes';
import HeaderActions from '@/components/HeaderActions';
import {
  CUSTOMER_TRANSACTION_TYPES,
  ASSET_TYPES,
  type AssetType,
  GOLD_FINENESS_RATES,
  ZIYNET_WEIGHTS,
  calculateHasEquivalent,
} from '@/constants/cari';
import {
  formatCurrency,
  formatGoldGram,
  buildWhatsAppStatementUrl,
  computeConsolidatedCustomerDebt,
  ConsolidatedDebtSummary,
  CustomerStatementRow,
  CustomerBalanceSummary,
} from '@/lib/cari';

interface Customer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  tcNo: string | null;
  address: string | null;
  note: string | null;
  dealerId: string;
  tlBalance: number;
  usdBalance: number;
  eurBalance: number;
  hasBalance?: number;
  creditLimitTL?: number;
  creditLimitHas?: number;
  totalHasEquivalent: number;
  transactionCount: number;
  createdAt: string;
}

interface StatementApiResponse {
  customer: {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
    tcNo: string | null;
    address: string | null;
    note: string | null;
    dealerId: string;
    createdAt: string;
  };
  summary: CustomerBalanceSummary & { usdRate?: number; eurRate?: number };
  openingBalance: {
    tl: number;
    has: number;
  };
  rows: CustomerStatementRow[];
  spotRate: number;
}

interface CustomersClientProps {
  initialCustomers: Customer[];
  liveHasPrice: number;
  liveUsdPrice: number;
  liveEurPrice: number;
}

// Varlık Kategori Tanımlamaları
const ASSET_CATEGORIES = [
  { id: 'HAS', label: 'Has Altın (gr)', icon: '👑', desc: 'Saf 24K Has Altın' },
  { id: 'TL', label: 'Türk Lirası (₺)', icon: '₺', desc: 'Nakit / Havale' },
  { id: 'DOVIZ', label: 'Döviz ($ / €)', icon: '💵', desc: 'Dolar & Euro' },
  { id: 'ZIYNET', label: 'Ziynet Altın', icon: '🪙', desc: 'Çeyrek, Ata vb.' },
  { id: 'ALTIN_AYAR', label: 'Ayar / Bilezik', icon: '⚖️', desc: '22A, 14A, 18A' },
] as const;

export type AssetCategory = 'HAS' | 'TL' | 'DOVIZ' | 'ZIYNET' | 'ALTIN_AYAR';

// Altın Ayarları
const GOLD_CARAT_OPTIONS = [
  { id: ASSET_TYPES.HAS, label: 'Has Altın (24K / 0.995+)', milyem: 1.000, suffix: 'gr' },
  { id: ASSET_TYPES.K24, label: '24 Ayar Altın (0.995)', milyem: 0.995, suffix: 'gr' },
  { id: ASSET_TYPES.K22, label: '22 Ayar Bilezik/Gram (0.916)', milyem: 0.916, suffix: 'gr' },
  { id: ASSET_TYPES.K18, label: '18 Ayar Altın (0.750)', milyem: 0.750, suffix: 'gr' },
  { id: ASSET_TYPES.K14, label: '14 Ayar Altın (0.585)', milyem: 0.585, suffix: 'gr' },
  { id: ASSET_TYPES.K8, label: '8 Ayar Altın (0.333)', milyem: 0.333, suffix: 'gr' },
];

// Ziynet Altın Çeşitleri
const ZIYNET_OPTIONS = [
  { id: ASSET_TYPES.CEYREK, label: 'Çeyrek Altın', hasWeight: ZIYNET_WEIGHTS.CEYREK, suffix: 'Adet' },
  { id: ASSET_TYPES.YARIM, label: 'Yarım Altın', hasWeight: ZIYNET_WEIGHTS.YARIM, suffix: 'Adet' },
  { id: ASSET_TYPES.TAM, label: 'Tam (Ziynet) Altın', hasWeight: ZIYNET_WEIGHTS.TAM, suffix: 'Adet' },
  { id: ASSET_TYPES.ATA, label: 'Ata Lira (Cumhuriyet)', hasWeight: ZIYNET_WEIGHTS.ATA, suffix: 'Adet' },
  { id: ASSET_TYPES.GREMSE, label: 'Gremse (2.5\'luk)', hasWeight: ZIYNET_WEIGHTS.GREMSE, suffix: 'Adet' },
];

// Döviz Çeşitleri
const FX_OPTIONS = [
  { id: ASSET_TYPES.USD, label: 'Amerikan Doları ($)', symbol: '$' },
  { id: ASSET_TYPES.EUR, label: 'Euro (€)', symbol: '€' },
];

export default function CustomersClient({
  initialCustomers,
  liveHasPrice: initialHasPrice,
  liveUsdPrice: initialUsdPrice,
  liveEurPrice: initialEurPrice,
}: CustomersClientProps) {
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Canlı fiyatlar
  const [hasPrice, setHasPrice] = useState(initialHasPrice);
  const [usdPrice, setUsdPrice] = useState(initialUsdPrice);
  const [eurPrice, setEurPrice] = useState(initialEurPrice);

  // Müşteri Modal State
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [customerFormData, setCustomerFormData] = useState({
    name: '',
    phone: '',
    email: '',
    tcNo: '',
    address: '',
    note: '',
    creditLimitTL: '',
    creditLimitHas: '',
    initialHasDebt: '',
    initialTlDebt: '',
    initialUsdDebt: '',
    initialEurDebt: '',
  });

  // Borç / Tahsilat İşlem Modalı State
  const [showTxModal, setShowTxModal] = useState(false);
  const [selectedCustomerForTx, setSelectedCustomerForTx] = useState<Customer | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<AssetCategory>('HAS');
  const [txFormData, setTxFormData] = useState({
    type: CUSTOMER_TRANSACTION_TYPES.BORC as 'BORC' | 'TAHSILAT',
    assetType: ASSET_TYPES.HAS as string,
    amount: '',
    unitPrice: '',
    description: '',
  });

  // Ekstre (Detay) Modalı State
  const [showStatementModal, setShowStatementModal] = useState(false);
  const [statementCustomer, setStatementCustomer] = useState<Customer | null>(null);
  const [statementData, setStatementData] = useState<StatementApiResponse | null>(null);
  const [loadingStatement, setLoadingStatement] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [quickDateFilter, setQuickDateFilter] = useState<'ALL' | 'TODAY' | 'WEEK' | 'MONTH'>('ALL');
  // Tablo ve Genel Borç Görünüm Modu ('DETAILED' | 'TL' | 'HAS' | 'USD' | 'EUR')
  const [tableCurrencyView, setTableCurrencyView] = useState<'DETAILED' | 'TL' | 'HAS' | 'USD' | 'EUR'>('DETAILED');

  // Canlı fiyatları periyodik yenile
  const fetchLivePrices = useCallback(async () => {
    try {
      const res = await fetch(ROUTES.API_PRICES_LIVE);
      if (res.ok) {
        const prices = await res.json();
        if (Array.isArray(prices)) {
          const has = prices.find((p: any) => p.id === 'GAUTRY');
          const usd = prices.find((p: any) => p.id === 'USDTRY');
          const eur = prices.find((p: any) => p.id === 'EURTRY');
          if (has?.ask) setHasPrice(has.ask);
          if (usd?.ask) setUsdPrice(usd.ask);
          if (eur?.ask) setEurPrice(eur.ask);
        }
      }
    } catch {
      /* quiet */
    }
  }, []);

  useEffect(() => {
    fetchLivePrices();
    const interval = setInterval(fetchLivePrices, 15000);
    return () => clearInterval(interval);
  }, [fetchLivePrices]);

  // Müşteri Listesini Yenile
  const fetchCustomers = async () => {
    try {
      const res = await fetch(ROUTES.API_CUSTOMERS);
      if (res.ok) {
        const data = await res.json();
        setCustomers(data);
      }
    } catch {
      /* quiet */
    }
  };

  // Müşteri Formu Sıfırla
  const resetCustomerForm = () => {
    setCustomerFormData({
      name: '',
      phone: '',
      email: '',
      tcNo: '',
      address: '',
      note: '',
      creditLimitTL: '',
      creditLimitHas: '',
      initialHasDebt: '',
      initialTlDebt: '',
      initialUsdDebt: '',
      initialEurDebt: '',
    });
    setEditingCustomer(null);
    setError(null);
  };

  // Müşteri Ekle / Düzenle Kaydet
  const handleCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const isEdit = !!editingCustomer;
      const url = ROUTES.API_CUSTOMERS;
      const method = isEdit ? 'PUT' : 'POST';
      const payload = isEdit ? { id: editingCustomer.id, ...customerFormData } : customerFormData;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'İşlem başarısız.');
        return;
      }

      setShowCustomerModal(false);
      resetCustomerForm();
      await fetchCustomers();
    } catch {
      setError('Bağlantı hatası oluştu.');
    } finally {
      setLoading(false);
    }
  };

  // Müşteri Sil
  const handleCustomerDelete = async (customer: Customer) => {
    if (!confirm(`${customer.name} müşterisini silmek istediğinize emin misiniz?`)) return;

    try {
      const res = await fetch(`${ROUTES.API_CUSTOMERS}?id=${customer.id}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchCustomers();
      } else {
        const data = await res.json();
        alert(data.error);
      }
    } catch {
      alert('Müşteri silinemedi.');
    }
  };

  // Müşteri Düzenle Aç
  const openEditCustomer = (c: Customer) => {
    setEditingCustomer(c);
    setCustomerFormData({
      name: c.name,
      phone: c.phone || '',
      email: c.email || '',
      tcNo: c.tcNo || '',
      address: c.address || '',
      note: c.note || '',
      creditLimitTL: c.creditLimitTL ? String(c.creditLimitTL) : '',
      creditLimitHas: c.creditLimitHas ? String(c.creditLimitHas) : '',
      initialHasDebt: '',
      initialTlDebt: '',
      initialUsdDebt: '',
      initialEurDebt: '',
    });
    setError(null);
    setShowCustomerModal(true);
  };

  // Borç / Tahsilat İşlem Modalı Aç
  const openTxModal = (c: Customer, defaultType: 'BORC' | 'TAHSILAT' = CUSTOMER_TRANSACTION_TYPES.BORC, defaultCat: AssetCategory = 'HAS') => {
    setSelectedCustomerForTx(c);
    setSelectedCategory(defaultCat);
    let defaultAsset = ASSET_TYPES.HAS as string;
    let defaultPrice = hasPrice ? hasPrice.toFixed(2) : '';

    if (defaultCat === 'TL') {
      defaultAsset = ASSET_TYPES.TL;
      defaultPrice = hasPrice ? hasPrice.toFixed(2) : '';
    } else if (defaultCat === 'DOVIZ') {
      defaultAsset = ASSET_TYPES.USD;
      defaultPrice = usdPrice ? usdPrice.toFixed(2) : '38.50';
    } else if (defaultCat === 'ZIYNET') {
      defaultAsset = ASSET_TYPES.CEYREK;
      defaultPrice = hasPrice ? hasPrice.toFixed(2) : '';
    } else if (defaultCat === 'ALTIN_AYAR') {
      defaultAsset = ASSET_TYPES.K22;
      defaultPrice = hasPrice ? hasPrice.toFixed(2) : '';
    }

    setTxFormData({
      type: defaultType,
      assetType: defaultAsset,
      amount: '',
      unitPrice: defaultPrice,
      description: '',
    });
    setError(null);
    setShowTxModal(true);
  };

  // Kategori değiştiğinde varsayılan assetType ayarla
  const handleCategoryChange = (cat: AssetCategory) => {
    setSelectedCategory(cat);
    let defaultAsset: string = ASSET_TYPES.HAS;
    let defaultPrice = hasPrice ? hasPrice.toFixed(2) : '';

    if (cat === 'HAS') {
      defaultAsset = ASSET_TYPES.HAS;
      defaultPrice = hasPrice ? hasPrice.toFixed(2) : '';
    } else if (cat === 'TL') {
      defaultAsset = ASSET_TYPES.TL;
      defaultPrice = hasPrice ? hasPrice.toFixed(2) : '';
    } else if (cat === 'DOVIZ') {
      defaultAsset = ASSET_TYPES.USD;
      defaultPrice = usdPrice ? usdPrice.toFixed(2) : '38.50';
    } else if (cat === 'ZIYNET') {
      defaultAsset = ASSET_TYPES.CEYREK;
      defaultPrice = hasPrice ? hasPrice.toFixed(2) : '';
    } else if (cat === 'ALTIN_AYAR') {
      defaultAsset = ASSET_TYPES.K22;
      defaultPrice = hasPrice ? hasPrice.toFixed(2) : '';
    }

    setTxFormData((prev) => ({
      ...prev,
      assetType: defaultAsset,
      unitPrice: defaultPrice,
    }));
  };

  // Has Karşılığı Otomatik Hesaplama (Önizleme)
  const computedHasEquivalent = useMemo(() => {
    const amt = parseFloat(txFormData.amount) || 0;
    const pr = parseFloat(txFormData.unitPrice) || (txFormData.assetType === 'USD' ? usdPrice : txFormData.assetType === 'EUR' ? eurPrice : hasPrice);
    return calculateHasEquivalent(txFormData.assetType, amt, pr, hasPrice);
  }, [txFormData.assetType, txFormData.amount, txFormData.unitPrice, hasPrice, usdPrice, eurPrice]);

  // Borç / Tahsilat İşlemi Kaydet
  const handleTxSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerForTx) return;

    setError(null);
    setLoading(true);

    try {
      let priceToSend = parseFloat(txFormData.unitPrice);
      if (!priceToSend || isNaN(priceToSend) || priceToSend <= 0) {
        if (txFormData.assetType === 'USD') priceToSend = usdPrice || 38.5;
        else if (txFormData.assetType === 'EUR') priceToSend = eurPrice || 41.5;
        else priceToSend = hasPrice;
      }

      const res = await fetch(ROUTES.API_CUSTOMER_TRANSACTIONS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: selectedCustomerForTx.id,
          type: txFormData.type,
          assetType: txFormData.assetType,
          amount: parseFloat(txFormData.amount),
          hasEquivalent: computedHasEquivalent,
          unitPrice: priceToSend,
          description: txFormData.description,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'İşlem gerçekleştirilemedi.');
        return;
      }

      setShowTxModal(false);
      await fetchCustomers();

      // Eğer ekstre modalı açıksa ekstreyi de yenile
      if (statementCustomer?.id === selectedCustomerForTx.id) {
        fetchStatement(selectedCustomerForTx.id, startDate, endDate);
      }
    } catch {
      setError('Bağlantı hatası oluştu.');
    } finally {
      setLoading(false);
    }
  };

  // Müşteri Ekstresi Getir
  const fetchStatement = async (customerId: string, start?: string, end?: string) => {
    setLoadingStatement(true);
    try {
      let url = `/api/customers/${customerId}/statement?spotRate=${hasPrice}`;
      if (start) url += `&startDate=${start}`;
      if (end) url += `&endDate=${end}`;

      const res = await fetch(url);
      if (res.ok) {
        const data: StatementApiResponse = await res.json();
        setStatementData(data);
      }
    } catch (err) {
      console.error('Ekstre fetch hatası:', err);
    } finally {
      setLoadingStatement(false);
    }
  };

  // Müşteri Ekstresi (Detay) Aç
  const openStatementModal = async (c: Customer) => {
    setStatementCustomer(c);
    setStartDate('');
    setEndDate('');
    setQuickDateFilter('ALL');
    setShowStatementModal(true);
    await fetchStatement(c.id);
  };

  // Hızlı Tarih Filtresi Seçimi
  const handleQuickFilter = (type: 'ALL' | 'TODAY' | 'WEEK' | 'MONTH') => {
    setQuickDateFilter(type);
    if (!statementCustomer) return;

    const now = new Date();
    let start = '';
    let end = now.toISOString().split('T')[0];

    if (type === 'TODAY') {
      start = end;
    } else if (type === 'WEEK') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      start = d.toISOString().split('T')[0];
    } else if (type === 'MONTH') {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      start = d.toISOString().split('T')[0];
    } else {
      start = '';
      end = '';
    }

    setStartDate(start);
    setEndDate(end);
    fetchStatement(statementCustomer.id, start, end);
  };

  // Ekstre Yazdır
  const handlePrintStatement = () => {
    window.print();
  };

  // WhatsApp Paylaşım URL'i
  const whatsappUrl = useMemo(() => {
    if (!statementCustomer || !statementData) return '#';
    const phone = statementCustomer.phone || '';
    return buildWhatsAppStatementUrl(
      phone,
      statementCustomer.name,
      statementData.summary,
      statementData.rows
    );
  }, [statementCustomer, statementData]);

  // Filtrelenmiş Müşteriler
  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.phone && c.phone.includes(searchQuery)) ||
      (c.tcNo && c.tcNo.includes(searchQuery))
  );

  // Toplam Alacak Özetleri (Tüm bayideki alacaklarımız)
  const totalTlDebt = customers.reduce((acc, c) => acc + c.tlBalance, 0);
  const totalUsdDebt = customers.reduce((acc, c) => acc + c.usdBalance, 0);
  const totalEurDebt = customers.reduce((acc, c) => acc + c.eurBalance, 0);
  const totalHasDebt = customers.reduce(
    (acc, c) => acc + (c.hasBalance !== undefined ? c.hasBalance : c.totalHasEquivalent),
    0
  );

  const storewideConsolidated = computeConsolidatedCustomerDebt(
    totalHasDebt,
    totalTlDebt,
    totalUsdDebt,
    totalEurDebt,
    hasPrice,
    usdPrice,
    eurPrice
  );

  return (
    <div className="space-y-6">
      {/* ── HEADER & TOPLAM ALACAK ÖZET KARTLARI ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Users className="text-yellow-400" size={28} />
            Müşteriler & Has / Altın Cari & Veresiye Takibi
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Fiziki Gram Has Altın, Ziynet ve TL bazında çift bakiye, anlık altın değerlemesi ve detaylı yürüyen ekstreler.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              resetCustomerForm();
              setShowCustomerModal(true);
            }}
            className={`${THEME.BTN_PRIMARY} gap-2 text-sm px-5 py-2.5`}
          >
            <UserPlus size={18} />
            Yeni Müşteri Ekle
          </button>
          <HeaderActions />
        </div>
      </div>

      {/* ÖZET KARTLARI (Çift Bakiye & Portföy Değerlemesi) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Toplam Has Altın Alacak */}
        <div className={THEME.STAT_CARD}>
          <div className="flex justify-between items-start mb-2">
            <div>
              <span className={THEME.STAT_LABEL}>Toplam Has Altın Alacak</span>
              <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 mt-1 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 font-medium">
                <Sparkles size={10} /> Canlı Spot: ₺{hasPrice.toLocaleString('tr-TR')}/gr
              </span>
            </div>
            <div className={THEME.STAT_ICON_WRAPPER}>
              <Scale size={20} />
            </div>
          </div>
          <div className="text-2xl font-bold text-yellow-400 font-mono">
            {formatGoldGram(totalHasDebt)}
          </div>
          <div className="flex items-center justify-between text-xs text-gray-400 mt-2 pt-2 border-t border-gray-800/60">
            <span>Canlı TL Karşılığı:</span>
            <span className="font-bold text-yellow-300 font-mono">
              {formatCurrency(totalHasDebt * hasPrice, 'TL')}
            </span>
          </div>
        </div>

        {/* Net TL Borç Bakiyesi */}
        <div className={THEME.STAT_CARD}>
          <div className="flex justify-between items-start mb-2">
            <div>
              <span className={THEME.STAT_LABEL}>Net TL Borç Bakiyesi</span>
              <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 mt-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                <TrendingUp size={10} /> Müşteri Veresiyesi
              </span>
            </div>
            <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-400 font-bold">
              ₺
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-400 font-mono">
            {formatCurrency(totalTlDebt, 'TL')}
          </div>
          <div className="flex items-center justify-between text-xs text-gray-400 mt-2 pt-2 border-t border-gray-800/60">
            <span>Has Eşdeğeri:</span>
            <span className="font-bold text-emerald-300 font-mono">
              ~{hasPrice > 0 ? formatGoldGram(totalTlDebt / hasPrice) : '0,000 gr'}
            </span>
          </div>
        </div>

        {/* Toplam Dolar Bakiyesi */}
        <div className={THEME.STAT_CARD}>
          <div className="flex justify-between items-start mb-2">
            <div>
              <span className={THEME.STAT_LABEL}>Net Dolar Bakiyesi</span>
              <span className="text-[11px] text-gray-500 block mt-0.5">USD/TRY: ₺{usdPrice.toFixed(2)}</span>
            </div>
            <div className="p-3 bg-green-500/10 rounded-xl border border-green-500/20 text-green-400">
              <DollarSign size={20} />
            </div>
          </div>
          <div className="text-2xl font-bold text-green-400 font-mono">
            {formatCurrency(totalUsdDebt, 'USD')}
          </div>
          <div className="flex items-center justify-between text-xs text-gray-400 mt-2 pt-2 border-t border-gray-800/60">
            <span>TL Karşılığı:</span>
            <span className="font-bold text-green-300 font-mono">
              {formatCurrency(totalUsdDebt * usdPrice, 'TL')}
            </span>
          </div>
        </div>

        {/* Toplam Euro Bakiyesi */}
        <div className={THEME.STAT_CARD}>
          <div className="flex justify-between items-start mb-2">
            <div>
              <span className={THEME.STAT_LABEL}>Net Euro Bakiyesi</span>
              <span className="text-[11px] text-gray-500 block mt-0.5">EUR/TRY: ₺{eurPrice.toFixed(2)}</span>
            </div>
            <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20 text-blue-400">
              <Euro size={20} />
            </div>
          </div>
          <div className="text-2xl font-bold text-blue-400 font-mono">
            {formatCurrency(totalEurDebt, 'EUR')}
          </div>
          <div className="flex items-center justify-between text-xs text-gray-400 mt-2 pt-2 border-t border-gray-800/60">
            <span>TL Karşılığı:</span>
            <span className="font-bold text-blue-300 font-mono">
              {formatCurrency(totalEurDebt * eurPrice, 'TL')}
            </span>
          </div>
        </div>
      </div>

      {/* ── GENEL KONSOLİDE TOPLAM ALACAK BANNERI (4 TEMEL PARA BİRİMİNDE ANLIK DEĞERLEME) ── */}
      <div className="bg-gradient-to-r from-yellow-500/15 via-emerald-500/10 to-blue-500/15 border border-yellow-500/30 rounded-2xl p-4 sm:p-5 shadow-lg">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-3">
          <div className="flex items-center gap-2">
            <Coins className="text-yellow-400" size={20} />
            <h3 className="text-base font-bold text-white">Mağaza Genel Konsolide Alacağı (Tüm Borçların Toplamı)</h3>
          </div>
          <span className="text-xs text-gray-400 font-mono">
            Canlı Kurlar: Has ₺{hasPrice.toFixed(0)} | USD ₺{usdPrice.toFixed(2)} | EUR ₺{eurPrice.toFixed(2)}
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 bg-gray-950/80 rounded-xl border border-emerald-500/30">
            <span className="text-[10px] uppercase font-bold text-emerald-400 block">₺ Tamamen TL İle</span>
            <span className="text-lg sm:text-xl font-bold font-mono text-emerald-300 block mt-0.5">
              {formatCurrency(storewideConsolidated.totalTL, 'TL')}
            </span>
            <span className="text-[10px] text-gray-400">Tüm alacakların TL karşılığı</span>
          </div>
          <div className="p-3 bg-gray-950/80 rounded-xl border border-yellow-500/30">
            <span className="text-[10px] uppercase font-bold text-yellow-400 block">👑 Tamamen Has Altın İle</span>
            <span className="text-lg sm:text-xl font-bold font-mono text-yellow-300 block mt-0.5">
              {formatGoldGram(storewideConsolidated.totalHas)}
            </span>
            <span className="text-[10px] text-gray-400">Saf 24K Has karşılığı</span>
          </div>
          <div className="p-3 bg-gray-950/80 rounded-xl border border-green-500/30">
            <span className="text-[10px] uppercase font-bold text-green-400 block">💵 Tamamen Dolar İle</span>
            <span className="text-lg sm:text-xl font-bold font-mono text-green-300 block mt-0.5">
              {formatCurrency(storewideConsolidated.totalUSD, 'USD')}
            </span>
            <span className="text-[10px] text-gray-400">USD kuruyla hesaplanan</span>
          </div>
          <div className="p-3 bg-gray-950/80 rounded-xl border border-blue-500/30">
            <span className="text-[10px] uppercase font-bold text-blue-400 block">💶 Tamamen Euro İle</span>
            <span className="text-lg sm:text-xl font-bold font-mono text-blue-300 block mt-0.5">
              {formatCurrency(storewideConsolidated.totalEUR, 'EUR')}
            </span>
            <span className="text-[10px] text-gray-400">EUR kuruyla hesaplanan</span>
          </div>
        </div>
      </div>

      {/* ── ARAMA VE MÜŞTERİ LİSTESİ ── */}
      <div className={`${THEME.GLASS_CARD} p-4`}>
        <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3 mb-4">
          <div className="relative max-w-md w-full">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Müşteri adı, telefon veya TC No ara..."
              className={`${THEME.INPUT} pl-10 text-sm py-2`}
            />
          </div>

          {/* Para Birimi Görünüm Seçici Toolbar */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-gray-950 border border-gray-800 rounded-xl">
            <span className="text-[11px] font-semibold text-gray-400 px-2 flex items-center gap-1">
              <Eye size={12} /> Görünüm:
            </span>
            {(
              [
                { id: 'DETAILED', label: '📋 Ayrıntılı' },
                { id: 'TL', label: '₺ TL' },
                { id: 'HAS', label: '👑 Has (gr)' },
                { id: 'USD', label: '💵 Dolar ($)' },
                { id: 'EUR', label: '💶 Euro (€)' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setTableCurrencyView(tab.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  tableCurrencyView === tab.id
                    ? 'bg-yellow-500 text-black shadow-sm font-bold'
                    : 'text-gray-400 hover:text-white hover:bg-gray-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <span className="text-xs text-gray-400 font-mono self-end md:self-center">
            {filteredCustomers.length} müşteri
          </span>
        </div>

        <div className={THEME.TABLE.WRAPPER}>
          <table className={THEME.TABLE.MAIN}>
            <thead className={THEME.TABLE.THEAD}>
              <tr>
                <th className={THEME.TABLE.TH}>Müşteri Ad Soyad</th>
                <th className={THEME.TABLE.TH}>İletişim / TC</th>
                <th className={THEME.TABLE.TH}>Net Has Altın Bakiyesi</th>
                <th className={THEME.TABLE.TH}>TL Bakiyesi</th>
                <th className={THEME.TABLE.TH}>Döviz Bakiyesi (USD / EUR)</th>
                <th className={`${THEME.TABLE.TH} bg-yellow-500/5 border-l border-yellow-500/20`}>
                  <div className="flex items-center gap-1 text-yellow-400">
                    <Sparkles size={13} />
                    <span>Konsolide Toplam Borç</span>
                  </div>
                </th>
                <th className={THEME.TABLE.TH}>İşlemler</th>
              </tr>
            </thead>
            <tbody className={THEME.TABLE.TBODY}>
              {filteredCustomers.length > 0 ? (
                filteredCustomers.map((c, i) => {
                  const effectiveHas = c.hasBalance !== undefined ? c.hasBalance : c.totalHasEquivalent;
                  const cDebt = computeConsolidatedCustomerDebt(
                    effectiveHas,
                    c.tlBalance,
                    c.usdBalance,
                    c.eurBalance,
                    hasPrice,
                    usdPrice,
                    eurPrice
                  );
                  return (
                    <motion.tr
                      key={c.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      className={THEME.TABLE.TR}
                    >
                      {/* İsim & Not */}
                      <td className={THEME.TABLE.TD}>
                        <div>
                          <span
                            onClick={() => openStatementModal(c)}
                            className="font-bold text-white hover:text-yellow-400 cursor-pointer block text-sm"
                          >
                            {c.name}
                          </span>
                          {c.note && (
                            <span className="text-[11px] text-gray-500 block truncate max-w-xs">{c.note}</span>
                          )}
                        </div>
                      </td>

                      {/* İletişim */}
                      <td className={THEME.TABLE.TD}>
                        <div className="space-y-0.5 text-xs text-gray-400">
                          {c.phone && (
                            <div className="flex items-center gap-1">
                              <Phone size={12} className="text-gray-500" /> {c.phone}
                            </div>
                          )}
                          {c.tcNo && <div className="text-[10px] text-gray-500 font-mono">TC: {c.tcNo}</div>}
                        </div>
                      </td>

                      {/* Has Altın Bakiyesi + Değerleme Rozeti */}
                      <td className={THEME.TABLE.TD}>
                        <div>
                          <span
                            className={`text-sm font-mono font-bold ${
                              effectiveHas > 0
                                ? 'text-yellow-400'
                                : effectiveHas < 0
                                ? 'text-emerald-400'
                                : 'text-gray-400'
                            }`}
                          >
                            {formatGoldGram(effectiveHas)}
                          </span>
                          {effectiveHas !== 0 && (
                            <span className="text-[10px] text-yellow-300/70 block font-mono">
                              ~{formatCurrency(effectiveHas * hasPrice, 'TL')}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* TL Bakiyesi & Limit */}
                      <td className={THEME.TABLE.TD}>
                        <div>
                          <span
                            className={`text-sm font-mono font-bold ${
                              c.tlBalance > 0
                                ? 'text-red-400'
                                : c.tlBalance < 0
                                ? 'text-emerald-400'
                                : 'text-gray-400'
                            }`}
                          >
                            {formatCurrency(c.tlBalance, 'TL')}
                          </span>
                          {c.creditLimitTL != null && c.creditLimitTL > 0 && (
                            <div className="mt-0.5">
                              <span className="text-[10px] text-gray-500 block font-mono">
                                Limit: ₺{c.creditLimitTL.toLocaleString('tr-TR')}
                              </span>
                              {c.tlBalance > c.creditLimitTL && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse">
                                  Limit Aşıldı! (+₺{(c.tlBalance - c.creditLimitTL).toLocaleString('tr-TR')})
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Döviz Bakiyeleri */}
                      <td className={THEME.TABLE.TD}>
                        <div className="flex flex-col text-xs font-mono gap-0.5">
                          {c.usdBalance !== 0 && (
                            <span className="text-green-400 font-bold">
                              {formatCurrency(c.usdBalance, 'USD')}{' '}
                              <span className="text-[10px] text-gray-500 font-normal">
                                ({formatCurrency(c.usdBalance * usdPrice, 'TL')})
                              </span>
                            </span>
                          )}
                          {c.eurBalance !== 0 && (
                            <span className="text-blue-400 font-bold">
                              {formatCurrency(c.eurBalance, 'EUR')}{' '}
                              <span className="text-[10px] text-gray-500 font-normal">
                                ({formatCurrency(c.eurBalance * eurPrice, 'TL')})
                              </span>
                            </span>
                          )}
                          {c.usdBalance === 0 && c.eurBalance === 0 && <span className="text-gray-500">—</span>}
                        </div>
                      </td>

                      {/* ── KONSOLİDE TOPLAM BORÇ (4 TEMEL PARA BİRİMİNDE) ── */}
                      <td className={`${THEME.TABLE.TD} bg-yellow-500/5 border-l border-yellow-500/20`}>
                        {tableCurrencyView === 'DETAILED' && (
                          <div>
                            <div className="text-sm font-bold font-mono text-white">
                              {formatCurrency(cDebt.totalTL, 'TL')}
                            </div>
                            <div className="flex flex-wrap items-center gap-1 mt-1">
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-400 font-mono border border-yellow-500/20" title="Saf Has Eşdeğeri">
                                👑 {formatGoldGram(cDebt.totalHas)}
                              </span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-400 font-mono border border-green-500/20" title="Dolar Karşılığı">
                                {formatCurrency(cDebt.totalUSD, 'USD')}
                              </span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 font-mono border border-blue-500/20" title="Euro Karşılığı">
                                {formatCurrency(cDebt.totalEUR, 'EUR')}
                              </span>
                            </div>
                          </div>
                        )}
                        {tableCurrencyView === 'TL' && (
                          <div>
                            <div className="text-base font-bold font-mono text-emerald-400">
                              {formatCurrency(cDebt.totalTL, 'TL')}
                            </div>
                            <span className="text-[10px] text-gray-400 block font-mono">
                              Has + TL + USD + EUR Toplamı
                            </span>
                          </div>
                        )}
                        {tableCurrencyView === 'HAS' && (
                          <div>
                            <div className="text-base font-bold font-mono text-yellow-400">
                              {formatGoldGram(cDebt.totalHas)}
                            </div>
                            <span className="text-[10px] text-yellow-300/70 block font-mono">
                              ~{formatCurrency(cDebt.totalTL, 'TL')}
                            </span>
                          </div>
                        )}
                        {tableCurrencyView === 'USD' && (
                          <div>
                            <div className="text-base font-bold font-mono text-green-400">
                              {formatCurrency(cDebt.totalUSD, 'USD')}
                            </div>
                            <span className="text-[10px] text-gray-400 block font-mono">
                              ₺{usdPrice.toFixed(2)} kuruyla
                            </span>
                          </div>
                        )}
                        {tableCurrencyView === 'EUR' && (
                          <div>
                            <div className="text-base font-bold font-mono text-blue-400">
                              {formatCurrency(cDebt.totalEUR, 'EUR')}
                            </div>
                            <span className="text-[10px] text-gray-400 block font-mono">
                              ₺{eurPrice.toFixed(2)} kuruyla
                            </span>
                          </div>
                        )}
                      </td>

                      {/* İşlem Düğmeleri */}
                      <td className={THEME.TABLE.TD}>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => openTxModal(c, CUSTOMER_TRANSACTION_TYPES.BORC)}
                            className="px-2.5 py-1.5 bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all"
                            title="Borç Yaz (Veresiye)"
                          >
                            <ArrowUpRight size={14} />
                            Borç Yaz
                          </button>
                          <button
                            onClick={() => openTxModal(c, CUSTOMER_TRANSACTION_TYPES.TAHSILAT)}
                            className="px-2.5 py-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all"
                            title="Tahsilat Al"
                          >
                            <ArrowDownLeft size={14} />
                            Tahsilat
                          </button>
                          <button
                            onClick={() => openStatementModal(c)}
                            className={THEME.BTN_ICON}
                            title="Hesap Ekstresi & Yürüyen Bakiye"
                          >
                            <FileText size={16} />
                          </button>
                          <button
                            onClick={() => openEditCustomer(c)}
                            className={THEME.BTN_ICON}
                            title="Düzenle"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => handleCustomerDelete(c)}
                            className={THEME.BTN_DANGER}
                            title="Sil"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-gray-500">
                    Henüz kayıtlı müşteri bulunamadı.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── MÜŞTERİ EKLEME / DÜZENLEME MODALI ─── */}
      <AnimatePresence>
        {showCustomerModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-3 sm:p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`${THEME.GLASS_CARD} w-full max-w-lg p-4 sm:p-6 max-h-[90vh] overflow-y-auto`}
            >
              <div className="flex justify-between items-center mb-5">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Users size={20} className="text-yellow-400" />
                  {editingCustomer ? 'Müşteri Bilgilerini Düzenle' : 'Yeni Müşteri Tanımla'}
                </h2>
                <button onClick={() => setShowCustomerModal(false)} className={THEME.BTN_ICON}>
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleCustomerSubmit} className="space-y-4">
                <div>
                  <label className={THEME.LABEL}>Ad Soyad *</label>
                  <input
                    type="text"
                    required
                    value={customerFormData.name}
                    onChange={(e) => setCustomerFormData({ ...customerFormData, name: e.target.value })}
                    placeholder="Örn: Ahmet Yılmaz"
                    className={THEME.INPUT}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={THEME.LABEL}>Telefon</label>
                    <input
                      type="text"
                      value={customerFormData.phone}
                      onChange={(e) => setCustomerFormData({ ...customerFormData, phone: e.target.value })}
                      placeholder="0532 000 00 00"
                      className={THEME.INPUT}
                    />
                  </div>
                  <div>
                    <label className={THEME.LABEL}>TC Kimlik No (11 Haneli)</label>
                    <input
                      type="text"
                      maxLength={11}
                      value={customerFormData.tcNo}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 11);
                        setCustomerFormData({ ...customerFormData, tcNo: val });
                      }}
                      placeholder="11 Haneli TC No"
                      className={THEME.INPUT}
                    />
                  </div>
                </div>

                <div>
                  <label className={THEME.LABEL}>E-posta</label>
                  <input
                    type="email"
                    value={customerFormData.email}
                    onChange={(e) => setCustomerFormData({ ...customerFormData, email: e.target.value })}
                    placeholder="ahmet@example.com"
                    className={THEME.INPUT}
                  />
                </div>

                <div>
                  <label className={THEME.LABEL}>Adres</label>
                  <textarea
                    rows={2}
                    value={customerFormData.address}
                    onChange={(e) => setCustomerFormData({ ...customerFormData, address: e.target.value })}
                    placeholder="Müşteri adresi..."
                    className={THEME.INPUT}
                  />
                </div>

                <div>
                  <label className={THEME.LABEL}>Özel Not</label>
                  <input
                    type="text"
                    value={customerFormData.note}
                    onChange={(e) => setCustomerFormData({ ...customerFormData, note: e.target.value })}
                    placeholder="Örn: Güvenilir müşteri, altın veresiyesi var"
                    className={THEME.INPUT}
                  />
                </div>

                {/* Açılış / Devir Borç Bakiyeleri Tanımlama (İsteğe Bağlı) */}
                {!editingCustomer && (
                  <div className="p-3.5 bg-yellow-500/5 border border-yellow-500/20 rounded-xl space-y-2.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-yellow-400">
                      <Coins size={14} />
                      Açılış / Devir Borç Bakiyeleri (İsteğe Bağlı)
                    </div>
                    <p className="text-[11px] text-gray-400">
                      Müşterinizin önceki dönemden devreden borcu varsa buradan tek seferde girebilirsiniz. Otomatik veresiye ekstresi açılır.
                    </p>
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[10px] font-semibold text-yellow-400 mb-1">
                          👑 Açılış Has Borcu (gr)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={customerFormData.initialHasDebt}
                          onChange={(e) => setCustomerFormData({ ...customerFormData, initialHasDebt: e.target.value })}
                          placeholder="Örn: 25.40 gr"
                          className={THEME.INPUT}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-emerald-400 mb-1">
                          ₺ Açılış TL Borcu (₺)
                        </label>
                        <input
                          type="number"
                          step="10"
                          value={customerFormData.initialTlDebt}
                          onChange={(e) => setCustomerFormData({ ...customerFormData, initialTlDebt: e.target.value })}
                          placeholder="Örn: 5000 ₺"
                          className={THEME.INPUT}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-green-400 mb-1">
                          💵 Açılış Dolar Borcu ($)
                        </label>
                        <input
                          type="number"
                          step="1"
                          value={customerFormData.initialUsdDebt}
                          onChange={(e) => setCustomerFormData({ ...customerFormData, initialUsdDebt: e.target.value })}
                          placeholder="Örn: 500 $"
                          className={THEME.INPUT}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-blue-400 mb-1">
                          💶 Açılış Euro Borcu (€)
                        </label>
                        <input
                          type="number"
                          step="1"
                          value={customerFormData.initialEurDebt}
                          onChange={(e) => setCustomerFormData({ ...customerFormData, initialEurDebt: e.target.value })}
                          placeholder="Örn: 300 €"
                          className={THEME.INPUT}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Borç / Kredi Limiti Tanımlama */}
                <div className="p-3.5 bg-yellow-500/5 border border-yellow-500/20 rounded-xl space-y-3">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-yellow-400">
                    <Scale size={14} />
                    Müşteri Borç / Kredi Limitleri (0 = Limitsiz)
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-300 mb-1">Maks. TL Borç Limiti (₺)</label>
                      <input
                        type="number"
                        min="0"
                        step="100"
                        value={customerFormData.creditLimitTL}
                        onChange={(e) => setCustomerFormData({ ...customerFormData, creditLimitTL: e.target.value })}
                        placeholder="Örn: 50000 (0 = Limitsiz)"
                        className={THEME.INPUT}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-300 mb-1">Maks. Has Borç Limiti (gr)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={customerFormData.creditLimitHas}
                        onChange={(e) => setCustomerFormData({ ...customerFormData, creditLimitHas: e.target.value })}
                        placeholder="Örn: 50.0 (0 = Limitsiz)"
                        className={THEME.INPUT}
                      />
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                    {error}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button type="submit" disabled={loading} className={`${THEME.BTN_PRIMARY} flex-1 justify-center`}>
                    {loading ? 'Kaydediliyor...' : 'Kaydet'}
                  </button>
                  <button type="button" onClick={() => setShowCustomerModal(false)} className={THEME.BTN_SECONDARY}>
                    İptal
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── BORÇ VERME / TAHSİLAT ALMA MODALI (GELİŞMİŞ HAS & ZİYNET DÖNÜŞÜMÜ) ─── */}
      <AnimatePresence>
        {showTxModal && selectedCustomerForTx && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`${THEME.GLASS_CARD} w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto`}
            >
              <div className="flex justify-between items-center mb-4 border-b border-gray-800 pb-3">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <CreditCard size={20} className="text-yellow-400" />
                    Müşteri Borç / Tahsilat Kaydı
                  </h2>
                  <p className="text-xs text-yellow-500 font-semibold mt-0.5">
                    Müşteri: {selectedCustomerForTx.name}
                  </p>
                </div>
                <button onClick={() => setShowTxModal(false)} className={THEME.BTN_ICON}>
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleTxSubmit} className="space-y-4">
                {/* İşlem Türü Seçimi (Borçlandırma vs Tahsilat) */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setTxFormData({ ...txFormData, type: CUSTOMER_TRANSACTION_TYPES.BORC })}
                    className={`py-3 rounded-xl font-bold text-sm border flex items-center justify-center gap-2 transition-all ${
                      txFormData.type === CUSTOMER_TRANSACTION_TYPES.BORC
                        ? 'bg-red-500/20 text-red-400 border-red-500/50 shadow-lg shadow-red-500/10'
                        : 'bg-gray-900 border-gray-800 text-gray-400 hover:border-gray-700'
                    }`}
                  >
                    <ArrowUpRight size={18} />
                    Borç Yaz (Veresiye)
                  </button>

                  <button
                    type="button"
                    onClick={() => setTxFormData({ ...txFormData, type: CUSTOMER_TRANSACTION_TYPES.TAHSILAT })}
                    className={`py-3 rounded-xl font-bold text-sm border flex items-center justify-center gap-2 transition-all ${
                      txFormData.type === CUSTOMER_TRANSACTION_TYPES.TAHSILAT
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 shadow-lg shadow-emerald-500/10'
                        : 'bg-gray-900 border-gray-800 text-gray-400 hover:border-gray-700'
                    }`}
                  >
                    <ArrowDownLeft size={18} />
                    Tahsilat Al (Ödeme)
                  </button>
                </div>

                {/* Varlık Kategori Sekmeleri */}
                <div>
                  <label className={THEME.LABEL}>Varlık Kategorisi</label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {ASSET_CATEGORIES.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => handleCategoryChange(cat.id as any)}
                        className={`p-2 rounded-xl text-xs font-semibold border text-center transition-all ${
                          selectedCategory === cat.id
                            ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50 shadow-sm'
                            : 'bg-gray-950 border-gray-800 text-gray-400 hover:bg-gray-900'
                        }`}
                      >
                        <div className="text-base mb-0.5">{cat.icon}</div>
                        <div>{cat.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Seçilen Kategoriye Göre Varlık Türü */}
                {selectedCategory === 'HAS' && (
                  <div>
                    <label className={THEME.LABEL}>Varlık Türü</label>
                    <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl text-sm font-bold text-yellow-400 flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Sparkles size={16} /> 24 Ayar Saf Has Altın (1.000 Milyem)
                      </span>
                      <span className="text-xs text-yellow-300 font-mono">1 gr = 1.000 gr Has</span>
                    </div>
                  </div>
                )}

                {selectedCategory === 'TL' && (
                  <div>
                    <label className={THEME.LABEL}>Varlık Türü</label>
                    <div className="p-3 bg-gray-950 border border-gray-800 rounded-xl text-sm font-bold text-emerald-400 flex items-center justify-between">
                      <span>Türk Lirası (₺)</span>
                      <span className="text-xs text-gray-500">Nakit / Havale / Kasa</span>
                    </div>
                  </div>
                )}

                {selectedCategory === 'DOVIZ' && (
                  <div>
                    <label className={THEME.LABEL}>Döviz Para Birimi *</label>
                    <div className="grid grid-cols-2 gap-2">
                      {FX_OPTIONS.map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => {
                            setTxFormData({
                              ...txFormData,
                              assetType: f.id,
                              unitPrice: f.id === 'USD' ? usdPrice.toFixed(2) : eurPrice.toFixed(2),
                            });
                          }}
                          className={`p-2.5 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition-all ${
                            txFormData.assetType === f.id
                              ? 'bg-green-500/20 text-green-400 border-green-500/50 shadow-sm'
                              : 'bg-gray-950 border-gray-800 text-gray-400 hover:bg-gray-900'
                          }`}
                        >
                          <span className="text-sm">{f.symbol}</span>
                          <span>{f.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {selectedCategory === 'ZIYNET' && (
                  <div>
                    <label className={THEME.LABEL}>Ziynet Altın Seçimi *</label>
                    <select
                      value={txFormData.assetType}
                      onChange={(e) => setTxFormData({ ...txFormData, assetType: e.target.value })}
                      className={THEME.SELECT}
                    >
                      {ZIYNET_OPTIONS.map((z) => (
                        <option key={z.id} value={z.id}>
                          {z.label} (Has: ~{z.hasWeight} gr/adet)
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {selectedCategory === 'ALTIN_AYAR' && (
                  <div>
                    <label className={THEME.LABEL}>Altın Ayar Seçimi *</label>
                    <select
                      value={txFormData.assetType}
                      onChange={(e) => setTxFormData({ ...txFormData, assetType: e.target.value })}
                      className={THEME.SELECT}
                    >
                      {GOLD_CARAT_OPTIONS.filter((g) => g.id !== ASSET_TYPES.HAS).map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.label} (Milyem: {g.milyem})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Miktar & Birim Fiyat (Has Fiyatı / Döviz Kuru) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={THEME.LABEL}>
                      {selectedCategory === 'HAS'
                        ? 'Has Altın Gramajı (gr) *'
                        : selectedCategory === 'ZIYNET'
                        ? 'Ziynet Adedi (Adet) *'
                        : selectedCategory === 'ALTIN_AYAR'
                        ? 'Gramaj (gr) *'
                        : selectedCategory === 'DOVIZ'
                        ? txFormData.assetType === 'USD' ? 'Dolar Tutarı ($) *' : 'Euro Tutarı (€) *'
                        : 'TL Tutar (₺) *'}
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={txFormData.amount}
                      onChange={(e) => setTxFormData({ ...txFormData, amount: e.target.value })}
                      placeholder={
                        selectedCategory === 'HAS'
                          ? 'Örn: 15.5 gr'
                          : selectedCategory === 'ZIYNET'
                          ? 'Örn: 2 Adet'
                          : selectedCategory === 'DOVIZ'
                          ? 'Örn: 500'
                          : selectedCategory === 'ALTIN_AYAR'
                          ? 'Örn: 25.0 gr'
                          : 'Örn: 10000 ₺'
                      }
                      className={THEME.INPUT}
                    />
                  </div>

                  <div>
                    <label className={THEME.LABEL}>
                      {selectedCategory === 'DOVIZ'
                        ? txFormData.assetType === 'USD' ? 'Döviz Kuru (USD/TRY)' : 'Döviz Kuru (EUR/TRY)'
                        : 'İşlem Anındaki Has Fiyatı (TL/gr)'}
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={txFormData.unitPrice}
                      onChange={(e) => setTxFormData({ ...txFormData, unitPrice: e.target.value })}
                      placeholder={
                        selectedCategory === 'DOVIZ'
                          ? txFormData.assetType === 'USD' ? `₺${usdPrice.toFixed(2)}` : `₺${eurPrice.toFixed(2)}`
                          : `₺${hasPrice.toFixed(0)}/gr`
                      }
                      className={THEME.INPUT}
                    />
                  </div>
                </div>

                {/* Has Çevrim ve Canlı Değerleme Bilgi Kutusu */}
                {txFormData.amount && parseFloat(txFormData.amount) > 0 && (
                  <div className="bg-yellow-500/10 border border-yellow-500/20 p-3.5 rounded-xl text-xs space-y-1.5">
                    <div className="text-yellow-400 font-bold flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Coins size={14} />
                        Hesaplanan Has Altın Karşılığı:
                      </span>
                      <span className="font-mono text-sm font-bold text-yellow-300">
                        {formatGoldGram(computedHasEquivalent)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-gray-300 pt-1 border-t border-yellow-500/20">
                      <span>Tahmini Canlı TL Değeri:</span>
                      <span className="font-mono font-semibold text-white">
                        {selectedCategory === 'TL'
                          ? formatCurrency(parseFloat(txFormData.amount) || 0, 'TL')
                          : selectedCategory === 'DOVIZ'
                          ? formatCurrency(
                              (parseFloat(txFormData.amount) || 0) * (parseFloat(txFormData.unitPrice) || (txFormData.assetType === 'USD' ? usdPrice : eurPrice)),
                              'TL'
                            )
                          : formatCurrency(computedHasEquivalent * hasPrice, 'TL')}
                      </span>
                    </div>

                    <p className="text-gray-400 text-[11px] mt-1">
                      {selectedCategory === 'HAS'
                        ? `${txFormData.amount} gr Has Altın, doğrudan saf 24K Has Altın borç hesabına yazılacaktır.`
                        : selectedCategory === 'TL'
                        ? `${txFormData.amount} TL işlem, ₺${txFormData.unitPrice || hasPrice}/gr kuruyla Has karşılığına bağlandı.`
                        : selectedCategory === 'ZIYNET'
                        ? `${txFormData.amount} adet ${txFormData.assetType} için standart gramaj üzerinden Has karşılığı hesaplandı.`
                        : selectedCategory === 'ALTIN_AYAR'
                        ? `${txFormData.amount} gr ${txFormData.assetType} ayar milyemi üzerinden saf Has Altın'a dönüştürüldü.`
                        : `${txFormData.amount} ${txFormData.assetType} döviz borcu olarak cariye işlenecek, güncel kurla TL eşdeğeri izlenecektir.`}
                    </p>
                  </div>
                )}

                {/* Açıklama / Not */}
                <div>
                  <label className={THEME.LABEL}>İşlem Açıklaması / Belge No</label>
                  <input
                    type="text"
                    value={txFormData.description}
                    onChange={(e) => setTxFormData({ ...txFormData, description: e.target.value })}
                    placeholder="Örn: Düğün için 2 adet çeyrek altın veresiye verildi"
                    className={THEME.INPUT}
                  />
                </div>

                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                    {error}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button type="submit" disabled={loading} className={`${THEME.BTN_PRIMARY} flex-1 justify-center`}>
                    {loading ? 'İşleniyor...' : 'İşlemi Kaydet'}
                  </button>
                  <button type="button" onClick={() => setShowTxModal(false)} className={THEME.BTN_SECONDARY}>
                    İptal
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── GELİŞMİŞ HESAP EKSTRESİ & YÜRÜYEN BAKİYE (RUNNING BALANCE) MODALI ─── */}
      <AnimatePresence>
        {showStatementModal && statementCustomer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:static">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className={`${THEME.GLASS_CARD} w-full max-w-4xl p-4 sm:p-6 my-4 sm:my-8 max-h-[90vh] overflow-y-auto print:border-none print:shadow-none print:bg-white print:text-black print:my-0`}
            >
              {/* Ekstre Üst Başlık */}
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-5 border-b border-gray-800 print:border-black pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-yellow-400 print:text-black font-bold uppercase tracking-wider">
                      Müşteri Cari Hesap Ekstresi
                    </span>
                    <span className="text-[10px] px-2 py-0.5 bg-yellow-500/10 text-yellow-400 print:hidden rounded-full font-mono font-semibold">
                      Spot Has: ₺{hasPrice.toLocaleString('tr-TR')}/gr
                    </span>
                  </div>
                  <h2 className="text-2xl font-bold text-white print:text-black mt-1">
                    {statementCustomer.name}
                  </h2>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400 print:text-gray-700 mt-1">
                    {statementCustomer.phone && <span>Tel: {statementCustomer.phone}</span>}
                    {statementCustomer.tcNo && <span>TC: {statementCustomer.tcNo}</span>}
                    {statementCustomer.address && <span>Adres: {statementCustomer.address}</span>}
                  </div>
                </div>

                {/* Yazdır, WhatsApp ve Kapat Düğmeleri */}
                <div className="flex items-center gap-2 print:hidden">
                  <button
                    onClick={() => {
                      if (statementCustomer) {
                        openTxModal(statementCustomer, CUSTOMER_TRANSACTION_TYPES.BORC);
                      }
                    }}
                    className="px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
                  >
                    <ArrowUpRight size={14} />
                    + Borç Yaz
                  </button>
                  <button
                    onClick={() => {
                      if (statementCustomer) {
                        openTxModal(statementCustomer, CUSTOMER_TRANSACTION_TYPES.TAHSILAT);
                      }
                    }}
                    className="px-3 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
                  >
                    <ArrowDownLeft size={14} />
                    + Tahsilat Al
                  </button>
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-emerald-900/20 transition-all"
                  >
                    <Share2 size={14} />
                    WhatsApp
                  </a>
                  <button
                    onClick={handlePrintStatement}
                    className={`${THEME.BTN_SECONDARY} gap-1.5 text-xs py-2`}
                  >
                    <Printer size={14} /> Yazdır
                  </button>
                  <button onClick={() => setShowStatementModal(false)} className={THEME.BTN_ICON}>
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Tarih Filtreleme Çubuğu (Print esnasında gizlenir) */}
              <div className="flex flex-wrap items-center justify-between gap-3 mb-5 p-3 bg-gray-950/80 rounded-xl border border-gray-800 print:hidden">
                <div className="flex items-center gap-1.5">
                  <Calendar size={16} className="text-yellow-400" />
                  <span className="text-xs font-semibold text-gray-300">Tarih Aralığı:</span>
                  <div className="flex gap-1 ml-2">
                    {(['ALL', 'TODAY', 'WEEK', 'MONTH'] as const).map((filterKey) => {
                      const labels = {
                        ALL: 'Tümü',
                        TODAY: 'Bugün',
                        WEEK: 'Son 7 Gün',
                        MONTH: 'Son 30 Gün',
                      };
                      return (
                        <button
                          key={filterKey}
                          onClick={() => handleQuickFilter(filterKey)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                            quickDateFilter === filterKey
                              ? 'bg-yellow-500 text-black font-bold'
                              : 'bg-gray-900 text-gray-400 hover:text-white'
                          }`}
                        >
                          {labels[filterKey]}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setQuickDateFilter('ALL');
                      fetchStatement(statementCustomer.id, e.target.value, endDate);
                    }}
                    className={`${THEME.INPUT} py-1 text-xs`}
                  />
                  <span className="text-gray-500">-</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      setQuickDateFilter('ALL');
                      fetchStatement(statementCustomer.id, startDate, e.target.value);
                    }}
                    className={`${THEME.INPUT} py-1 text-xs`}
                  />
                </div>
              </div>

              {/* ─── KONSOLİDE TOPLAM BORÇ KARTI (4 PARA BİRİMİNDE SEÇİLEBİLİR VE GÖRÜNTÜLENEBİLİR) ─── */}
              {statementData && (() => {
                const cDebt = computeConsolidatedCustomerDebt(
                  statementData.summary.hasBalance,
                  statementData.summary.tlBalance,
                  statementData.summary.usdBalance,
                  statementData.summary.eurBalance,
                  statementData.spotRate || hasPrice,
                  usdPrice,
                  eurPrice
                );
                return (
                  <div className="bg-gradient-to-r from-yellow-500/10 via-emerald-500/10 to-blue-500/10 border border-yellow-500/30 rounded-2xl p-4 mb-5 print:border-gray-300 print:bg-gray-100">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <Sparkles className="text-yellow-400 print:text-black" size={18} />
                        <span className="text-sm font-bold text-white print:text-black">
                          Konsolide Toplam Müşteri Borcu (4 Para Birimi Seçeneği)
                        </span>
                      </div>
                      <span className="text-[11px] text-gray-400 print:text-gray-600 font-mono">
                        Müşteri borcunu bu 4 seçenekten herhangi biriyle tek seferde kapatabilir.
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {/* Tamamen TL */}
                      <div className="p-3 bg-gray-950/90 print:bg-white rounded-xl border border-emerald-500/30 print:border-gray-300">
                        <span className="text-[10px] uppercase font-bold text-emerald-400 print:text-emerald-700 block">₺ Tamamen TL İle</span>
                        <div className="text-lg font-bold font-mono text-emerald-300 print:text-black mt-0.5">
                          {formatCurrency(cDebt.totalTL, 'TL')}
                        </div>
                        <span className="text-[10px] text-gray-400 print:text-gray-600 block mt-1">Nakit / Havale ile</span>
                      </div>

                      {/* Tamamen Has Altın */}
                      <div className="p-3 bg-gray-950/90 print:bg-white rounded-xl border border-yellow-500/30 print:border-gray-300">
                        <span className="text-[10px] uppercase font-bold text-yellow-400 print:text-yellow-700 block">👑 Tamamen Has İle</span>
                        <div className="text-lg font-bold font-mono text-yellow-300 print:text-black mt-0.5">
                          {formatGoldGram(cDebt.totalHas)}
                        </div>
                        <span className="text-[10px] text-gray-400 print:text-gray-600 block mt-1">24K Saf Külçe Has</span>
                      </div>

                      {/* Tamamen Dolar */}
                      <div className="p-3 bg-gray-950/90 print:bg-white rounded-xl border border-green-500/30 print:border-gray-300">
                        <span className="text-[10px] uppercase font-bold text-green-400 print:text-green-700 block">💵 Tamamen Dolar İle</span>
                        <div className="text-lg font-bold font-mono text-green-300 print:text-black mt-0.5">
                          {formatCurrency(cDebt.totalUSD, 'USD')}
                        </div>
                        <span className="text-[10px] text-gray-400 print:text-gray-600 block mt-1">₺{usdPrice.toFixed(2)} kuru ile</span>
                      </div>

                      {/* Tamamen Euro */}
                      <div className="p-3 bg-gray-950/90 print:bg-white rounded-xl border border-blue-500/30 print:border-gray-300">
                        <span className="text-[10px] uppercase font-bold text-blue-400 print:text-blue-700 block">💶 Tamamen Euro İle</span>
                        <div className="text-lg font-bold font-mono text-blue-300 print:text-black mt-0.5">
                          {formatCurrency(cDebt.totalEUR, 'EUR')}
                        </div>
                        <span className="text-[10px] text-gray-400 print:text-gray-600 block mt-1">₺{eurPrice.toFixed(2)} kuru ile</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Bakiye Özet Kartları */}
              {statementData && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                  <div className="bg-gray-950 print:bg-gray-100 p-3 rounded-xl border border-gray-800 print:border-gray-300">
                    <span className="text-[10px] text-gray-500 uppercase font-bold block">
                      Net Has Altın Borcu
                    </span>
                    <span className="text-sm font-bold text-yellow-400 print:text-black font-mono block mt-0.5">
                      {formatGoldGram(statementData.summary.hasBalance)}
                    </span>
                    <span className="text-[10px] text-yellow-300/70 print:text-gray-600 block">
                      ~{formatCurrency(statementData.summary.hasBalance * statementData.spotRate, 'TL')}
                    </span>
                  </div>

                  <div className="bg-gray-950 print:bg-gray-100 p-3 rounded-xl border border-gray-800 print:border-gray-300">
                    <span className="text-[10px] text-gray-500 uppercase font-bold block">
                      Net TL Borç Bakiyesi
                    </span>
                    <span className="text-sm font-bold text-emerald-400 print:text-black font-mono block mt-0.5">
                      {formatCurrency(statementData.summary.tlBalance, 'TL')}
                    </span>
                    <span className="text-[10px] text-gray-500 block">Nakit Açık Hesap</span>
                  </div>

                  <div className="bg-gray-950 print:bg-gray-100 p-3 rounded-xl border border-gray-800 print:border-gray-300">
                    <span className="text-[10px] text-gray-500 uppercase font-bold block">
                      Döviz Bakiyeleri
                    </span>
                    <span className="text-xs font-bold text-green-400 print:text-black font-mono block mt-0.5">
                      {statementData.summary.usdBalance !== 0
                        ? formatCurrency(statementData.summary.usdBalance, 'USD')
                        : '—'}
                    </span>
                    <span className="text-xs font-bold text-blue-400 print:text-black font-mono block">
                      {statementData.summary.eurBalance !== 0
                        ? formatCurrency(statementData.summary.eurBalance, 'EUR')
                        : '—'}
                    </span>
                  </div>

                  <div className="bg-gray-950 print:bg-gray-100 p-3 rounded-xl border border-yellow-500/30 print:border-gray-300">
                    <span className="text-[10px] text-yellow-400 print:text-black uppercase font-bold block">
                      Toplam Portföy Değeri
                    </span>
                    <span className="text-base font-bold text-yellow-300 print:text-black font-mono block mt-0.5">
                      {formatCurrency(statementData.summary.estimatedTotalTL, 'TL')}
                    </span>
                    <span className="text-[10px] text-gray-400 block">Has + TL + Döviz</span>
                  </div>
                </div>
              )}

              {/* Açılış Devir Bilgisi (Eğer filtre uygulandıysa) */}
              {statementData && (statementData.openingBalance.tl !== 0 || statementData.openingBalance.has !== 0) && (
                <div className="p-2.5 mb-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs text-blue-300 flex justify-between items-center">
                  <span>Dönem Başı Açılış Bakiyesi:</span>
                  <span className="font-mono font-bold">
                    TL: {formatCurrency(statementData.openingBalance.tl, 'TL')} | Has: {formatGoldGram(statementData.openingBalance.has)}
                  </span>
                </div>
              )}

              {/* İşlem Hareketleri ve Yürüyen Bakiye Tablosu */}
              <div className="overflow-x-auto max-h-96 overflow-y-auto rounded-xl border border-gray-800 print:border-gray-300 mb-4">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-900 print:bg-gray-200 text-gray-400 print:text-black font-semibold sticky top-0">
                    <tr>
                      <th className="p-3">Tarih</th>
                      <th className="p-3">Tür</th>
                      <th className="p-3">Varlık</th>
                      <th className="p-3">Miktar</th>
                      <th className="p-3">Has Karşılığı</th>
                      <th className="p-3 bg-yellow-500/10 print:bg-transparent font-bold text-yellow-400 print:text-black">
                        Yürüyen Has (gr)
                      </th>
                      <th className="p-3 bg-emerald-500/10 print:bg-transparent font-bold text-emerald-400 print:text-black">
                        Yürüyen TL (₺)
                      </th>
                      <th className="p-3">Açıklama</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800 print:divide-gray-300 text-gray-300 print:text-black">
                    {loadingStatement ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-gray-500">
                          Ekstre ve yürüyen bakiyeler hesaplanıyor...
                        </td>
                      </tr>
                    ) : statementData && statementData.rows.length > 0 ? (
                      statementData.rows.map((tx) => {
                        const isDebt =
                          tx.type === CUSTOMER_TRANSACTION_TYPES.BORC ||
                          tx.type === CUSTOMER_TRANSACTION_TYPES.ODEME;
                        return (
                          <tr key={tx.id || Math.random().toString()} className="hover:bg-gray-900/50">
                            <td className="p-3 font-mono text-gray-400 print:text-gray-700">
                              {tx.createdAt ? new Date(tx.createdAt).toLocaleDateString('tr-TR') : '—'}
                            </td>
                            <td className="p-3 font-bold">
                              <span
                                className={`px-2 py-0.5 rounded text-[11px] ${
                                  isDebt
                                    ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                                    : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                }`}
                              >
                                {isDebt ? 'BORÇ' : 'TAHSİLAT'}
                              </span>
                            </td>
                            <td className="p-3 font-bold text-white print:text-black">{tx.assetType}</td>
                            <td className="p-3 font-mono font-bold">
                              {tx.amount} {tx.assetType}
                            </td>
                            <td className="p-3 font-mono text-yellow-400 print:text-black font-semibold">
                              {tx.hasEquivalent > 0 ? formatGoldGram(tx.hasEquivalent) : '—'}
                            </td>
                            <td className="p-3 font-mono font-bold text-yellow-300 print:text-black bg-yellow-500/5 print:bg-transparent">
                              {formatGoldGram(tx.runningBalanceHas)}
                            </td>
                            <td className="p-3 font-mono font-bold text-emerald-400 print:text-black bg-emerald-500/5 print:bg-transparent">
                              {formatCurrency(tx.runningBalanceTL, 'TL')}
                            </td>
                            <td className="p-3 text-gray-400 print:text-gray-700 max-w-xs truncate">
                              {tx.description || '—'}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-gray-500">
                          Seçilen tarih aralığında işlem hareketi bulunamadı.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Ekstre Alt Bilgi & Kapat */}
              <div className="flex justify-between items-center pt-2 print:hidden">
                <span className="text-xs text-gray-500">
                  Ekstre Çıktısı: {new Date().toLocaleString('tr-TR')}
                </span>
                <button onClick={() => setShowStatementModal(false)} className={THEME.BTN_SECONDARY}>
                  Kapat
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

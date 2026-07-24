'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, UserPlus, Pencil, Trash2, X, Plus, CreditCard, ArrowUpRight, ArrowDownLeft,
  DollarSign, Euro, Scale, Phone, Mail, FileText, MapPin, Search, Printer, FileSpreadsheet, ShieldAlert
} from 'lucide-react';
import { THEME, ANIM } from '@/constants/theme';
import { ROUTES } from '@/constants/routes';
import HeaderActions from '@/components/HeaderActions';

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
  totalHasEquivalent: number;
  transactionCount: number;
  createdAt: string;
}

interface CustomerTx {
  id: string;
  customerId: string;
  type: string; // "BORC" | "TAHSILAT"
  assetType: string; // "TL", "USD", "EUR", "HAS", "22K", "CEYREK", etc.
  amount: number;
  hasEquivalent: number;
  unitPrice: number | null;
  description: string | null;
  employeeName: string | null;
  createdAt: string;
}

interface LivePrice {
  id: string;
  label: string;
  bid: number;
  ask: number;
}

interface CustomersClientProps {
  initialCustomers: Customer[];
  liveHasPrice: number;
  liveUsdPrice: number;
  liveEurPrice: number;
}

const ASSET_TYPES = [
  { id: 'TL', label: 'Türk Lirası (₺)', category: 'TL' },
  { id: 'USD', label: 'Amerikan Doları ($)', category: 'DOVIZ' },
  { id: 'EUR', label: 'Euro (€)', category: 'DOVIZ' },
  { id: 'HAS', label: 'Has Altın (24K / gr)', category: 'ALTIN' },
  { id: '22K', label: '22 Ayar Gram / Bilezik', category: 'ALTIN' },
  { id: 'CEYREK', label: 'Çeyrek Altın (Adet)', category: 'ALTIN' },
  { id: 'YARIM', label: 'Yarım Altın (Adet)', category: 'ALTIN' },
  { id: 'TAM', label: 'Tam Altın (Adet)', category: 'ALTIN' },
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
  });

  // Borç / Tahsilat İşlem Modalı State
  const [showTxModal, setShowTxModal] = useState(false);
  const [selectedCustomerForTx, setSelectedCustomerForTx] = useState<Customer | null>(null);
  const [txFormData, setTxFormData] = useState({
    type: 'BORC' as 'BORC' | 'TAHSILAT',
    assetType: 'TL',
    amount: '',
    unitPrice: '',
    description: '',
  });

  // Ekstre (Detay) Modalı State
  const [showStatementModal, setShowStatementModal] = useState(false);
  const [statementCustomer, setStatementCustomer] = useState<Customer | null>(null);
  const [statementTxs, setStatementTxs] = useState<CustomerTx[]>([]);
  const [loadingStatement, setLoadingStatement] = useState(false);

  // Canlı fiyatları periyodik yenile
  const fetchLivePrices = useCallback(async () => {
    try {
      const res = await fetch(ROUTES.API_PRICES_LIVE);
      if (res.ok) {
        const prices: LivePrice[] = await res.json();
        const has = prices.find(p => p.id === 'GAUTRY')?.ask || 0;
        const usd = prices.find(p => p.id === 'USDTRY')?.ask || 0;
        const eur = prices.find(p => p.id === 'EURTRY')?.ask || 0;
        if (has > 0) setHasPrice(has);
        if (usd > 0) setUsdPrice(usd);
        if (eur > 0) setEurPrice(eur);
      }
    } catch { /* quiet */ }
  }, []);

  useEffect(() => {
    const interval = setInterval(fetchLivePrices, 10000);
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
    } catch { /* quiet */ }
  };

  // Müşteri Formu Sıfırla
  const resetCustomerForm = () => {
    setCustomerFormData({ name: '', phone: '', email: '', tcNo: '', address: '', note: '' });
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
    });
    setError(null);
    setShowCustomerModal(true);
  };

  // Borç / Tahsilat İşlem Modalı Aç
  const openTxModal = (c: Customer, defaultType: 'BORC' | 'TAHSILAT' = 'BORC') => {
    setSelectedCustomerForTx(c);
    setTxFormData({
      type: defaultType,
      assetType: 'TL',
      amount: '',
      unitPrice: hasPrice ? hasPrice.toFixed(2) : '',
      description: '',
    });
    setError(null);
    setShowTxModal(true);
  };

  // Borç / Tahsilat İşlemi Kaydet
  const handleTxSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerForTx) return;

    setError(null);
    setLoading(true);

    try {
      const res = await fetch(ROUTES.API_CUSTOMER_TRANSACTIONS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: selectedCustomerForTx.id,
          type: txFormData.type,
          assetType: txFormData.assetType,
          amount: parseFloat(txFormData.amount),
          unitPrice: parseFloat(txFormData.unitPrice) || hasPrice,
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
        openStatementModal(selectedCustomerForTx);
      }
    } catch {
      setError('Bağlantı hatası oluştu.');
    } finally {
      setLoading(false);
    }
  };

  // Müşteri Ekstresi (Detay) Aç
  const openStatementModal = async (c: Customer) => {
    setStatementCustomer(c);
    setShowStatementModal(true);
    setLoadingStatement(true);

    try {
      const res = await fetch(`${ROUTES.API_CUSTOMER_TRANSACTIONS}?customerId=${c.id}`);
      if (res.ok) {
        const txs: CustomerTx[] = await res.json();
        setStatementTxs(txs);
      }
    } catch {
      setStatementTxs([]);
    } finally {
      setLoadingStatement(false);
    }
  };

  // Ekstre Yazdır
  const handlePrintStatement = () => {
    window.print();
  };

  // Filtrelenmiş Müşteriler
  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.phone && c.phone.includes(searchQuery)) ||
    (c.tcNo && c.tcNo.includes(searchQuery))
  );

  // Toplam Alacak Özetleri (Tüm bayideki alacaklarımız)
  const totalTlDebt = customers.reduce((acc, c) => acc + c.tlBalance, 0);
  const totalUsdDebt = customers.reduce((acc, c) => acc + c.usdBalance, 0);
  const totalEurDebt = customers.reduce((acc, c) => acc + c.eurBalance, 0);
  const totalHasDebt = customers.reduce((acc, c) => acc + c.totalHasEquivalent, 0);

  const formatTL = (val: number) => val.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const formatHas = (val: number) => val.toLocaleString('tr-TR', { minimumFractionDigits: 3, maximumFractionDigits: 3 });

  return (
    <div className="space-y-6">

      {/* ── HEADER & TOPLAM ALACAK ÖZET KARTLARI ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Users className="text-yellow-400" size={28} />
            Müşteriler & Borç / Alacak (Veresiye) Takibi
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Müşteri rehberi, veresiye borçlandırma, TL/Döviz borçları ve Has Altın karşılıklı cari ekstreler.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => { resetCustomerForm(); setShowCustomerModal(true); }}
            className={`${THEME.BTN_PRIMARY} gap-2 text-sm px-5 py-2.5`}
          >
            <UserPlus size={18} />
            Yeni Müşteri Ekle
          </button>
          <HeaderActions />
        </div>
      </div>

      {/* ÖZET KARTLARI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Toplam Has Alacak */}
        <div className={THEME.STAT_CARD}>
          <div className="flex justify-between items-start mb-2">
            <span className={THEME.STAT_LABEL}>Toplam Has Alacak</span>
            <div className={THEME.STAT_ICON_WRAPPER}>
              <Scale size={20} />
            </div>
          </div>
          <div className="text-2xl font-bold text-yellow-400 font-mono">
            {formatHas(totalHasDebt)} gr Has
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Canlı Değeri: ₺{formatTL(totalHasDebt * hasPrice)}
          </p>
        </div>

        {/* Toplam TL Alacak */}
        <div className={THEME.STAT_CARD}>
          <div className="flex justify-between items-start mb-2">
            <span className={THEME.STAT_LABEL}>Net TL Borç Bakiyesi</span>
            <div className="p-3 bg-black/50 rounded-xl border border-emerald-900/30 text-emerald-400">
              ₺
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-400 font-mono">
            ₺{formatTL(totalTlDebt)}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Has Karşılığı: ~{hasPrice > 0 ? formatHas(totalTlDebt / hasPrice) : '0.000'} gr
          </p>
        </div>

        {/* Toplam Dolar Alacak */}
        <div className={THEME.STAT_CARD}>
          <div className="flex justify-between items-start mb-2">
            <span className={THEME.STAT_LABEL}>Net Dolar Bakiyesi</span>
            <div className="p-3 bg-black/50 rounded-xl border border-green-900/30 text-green-400">
              <DollarSign size={20} />
            </div>
          </div>
          <div className="text-2xl font-bold text-green-400 font-mono">
            ${formatTL(totalUsdDebt)}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            TL Karşılığı: ₺{formatTL(totalUsdDebt * usdPrice)}
          </p>
        </div>

        {/* Toplam Euro Alacak */}
        <div className={THEME.STAT_CARD}>
          <div className="flex justify-between items-start mb-2">
            <span className={THEME.STAT_LABEL}>Net Euro Bakiyesi</span>
            <div className="p-3 bg-black/50 rounded-xl border border-blue-900/30 text-blue-400">
              <Euro size={20} />
            </div>
          </div>
          <div className="text-2xl font-bold text-blue-400 font-mono">
            €{formatTL(totalEurDebt)}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            TL Karşılığı: ₺{formatTL(totalEurDebt * eurPrice)}
          </p>
        </div>
      </div>

      {/* ── ARAMA VE MÜŞTERİ LİSTESİ ── */}
      <div className={`${THEME.GLASS_CARD} p-4`}>
        <div className="relative max-w-md w-full mb-4">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Müşteri adı, telefon veya TC No ara..."
            className={`${THEME.INPUT} pl-10 text-sm py-2`}
          />
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
                <th className={THEME.TABLE.TH}>İşlemler</th>
              </tr>
            </thead>
            <tbody className={THEME.TABLE.TBODY}>
              {filteredCustomers.length > 0 ? (
                filteredCustomers.map((c, i) => (
                  <motion.tr
                    key={c.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
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
                        {c.note && <span className="text-[11px] text-gray-500 block truncate max-w-xs">{c.note}</span>}
                      </div>
                    </td>

                    {/* İletişim */}
                    <td className={THEME.TABLE.TD}>
                      <div className="space-y-0.5 text-xs text-gray-400">
                        {c.phone && <div className="flex items-center gap-1"><Phone size={12} className="text-gray-500" /> {c.phone}</div>}
                        {c.tcNo && <div className="text-[10px] text-gray-500 font-mono">TC: {c.tcNo}</div>}
                      </div>
                    </td>

                    {/* Has Altın Bakiyesi */}
                    <td className={THEME.TABLE.TD}>
                      <div>
                        <span className={`text-sm font-mono font-bold ${c.totalHasEquivalent > 0 ? 'text-yellow-400' : 'text-gray-400'}`}>
                          {formatHas(c.totalHasEquivalent)} gr Has
                        </span>
                        {c.totalHasEquivalent > 0 && (
                          <span className="text-[10px] text-gray-500 block">
                            ~₺{formatTL(c.totalHasEquivalent * hasPrice)}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* TL Bakiyesi */}
                    <td className={THEME.TABLE.TD}>
                      <span className={`text-sm font-mono font-bold ${c.tlBalance > 0 ? 'text-red-400' : c.tlBalance < 0 ? 'text-emerald-400' : 'text-gray-400'}`}>
                        {c.tlBalance !== 0 ? `₺${formatTL(c.tlBalance)}` : '₺0,00'}
                      </span>
                    </td>

                    {/* Döviz Bakiyeleri */}
                    <td className={THEME.TABLE.TD}>
                      <div className="flex flex-col text-xs font-mono gap-0.5">
                        {c.usdBalance !== 0 && (
                          <span className="text-green-400 font-bold">
                            ${formatTL(c.usdBalance)} <span className="text-[10px] text-gray-500 font-normal">(₺{formatTL(c.usdBalance * usdPrice)})</span>
                          </span>
                        )}
                        {c.eurBalance !== 0 && (
                          <span className="text-blue-400 font-bold">
                            €{formatTL(c.eurBalance)} <span className="text-[10px] text-gray-500 font-normal">(₺{formatTL(c.eurBalance * eurPrice)})</span>
                          </span>
                        )}
                        {c.usdBalance === 0 && c.eurBalance === 0 && <span className="text-gray-500">—</span>}
                      </div>
                    </td>

                    {/* İşlem Düğmeleri */}
                    <td className={THEME.TABLE.TD}>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => openTxModal(c, 'BORC')}
                          className="px-2.5 py-1.5 bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 rounded-lg text-xs font-semibold flex items-center gap-1"
                          title="Borç Yaz"
                        >
                          <ArrowUpRight size={14} />
                          Borç Yaz
                        </button>
                        <button
                          onClick={() => openTxModal(c, 'TAHSILAT')}
                          className="px-2.5 py-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 rounded-lg text-xs font-semibold flex items-center gap-1"
                          title="Tahsilat Al"
                        >
                          <ArrowDownLeft size={14} />
                          Tahsilat
                        </button>
                        <button
                          onClick={() => openStatementModal(c)}
                          className={THEME.BTN_ICON}
                          title="Hesap Ekstresi"
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
                ))
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
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`${THEME.GLASS_CARD} w-full max-w-lg p-6`}
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

      {/* ─── BORÇ VERME / TAHSİLAT ALMA MODALI ─── */}
      <AnimatePresence>
        {showTxModal && selectedCustomerForTx && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`${THEME.GLASS_CARD} w-full max-w-lg p-6`}
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
                {/* İşlem Türü Seçimi */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setTxFormData({ ...txFormData, type: 'BORC' })}
                    className={`py-3 rounded-xl font-bold text-sm border flex items-center justify-center gap-2 transition-all ${
                      txFormData.type === 'BORC'
                        ? 'bg-red-500/20 text-red-400 border-red-500/50 shadow-lg shadow-red-500/10'
                        : 'bg-gray-900 border-gray-800 text-gray-400'
                    }`}
                  >
                    <ArrowUpRight size={18} />
                    Borç Yaz (Veresiye)
                  </button>

                  <button
                    type="button"
                    onClick={() => setTxFormData({ ...txFormData, type: 'TAHSILAT' })}
                    className={`py-3 rounded-xl font-bold text-sm border flex items-center justify-center gap-2 transition-all ${
                      txFormData.type === 'TAHSILAT'
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 shadow-lg shadow-emerald-500/10'
                        : 'bg-gray-900 border-gray-800 text-gray-400'
                    }`}
                  >
                    <ArrowDownLeft size={18} />
                    Tahsilat Al (Ödeme)
                  </button>
                </div>

                {/* Varlık Cinsi */}
                <div>
                  <label className={THEME.LABEL}>Varlık / Para Cinsi *</label>
                  <select
                    value={txFormData.assetType}
                    onChange={(e) => setTxFormData({ ...txFormData, assetType: e.target.value })}
                    className={THEME.SELECT}
                  >
                    {ASSET_TYPES.map(a => (
                      <option key={a.id} value={a.id}>{a.label}</option>
                    ))}
                  </select>
                </div>

                {/* Miktar & İşlem Anındaki Kur/Fiyat */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={THEME.LABEL}>Miktar *</label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={txFormData.amount}
                      onChange={(e) => setTxFormData({ ...txFormData, amount: e.target.value })}
                      placeholder={txFormData.assetType === 'CEYREK' ? 'Örn: 2 Adet' : 'Örn: 10000'}
                      className={THEME.INPUT}
                    />
                  </div>

                  <div>
                    <label className={THEME.LABEL}>İşlem Anındaki Has Fiyatı (TL/gr)</label>
                    <input
                      type="number"
                      step="any"
                      value={txFormData.unitPrice}
                      onChange={(e) => setTxFormData({ ...txFormData, unitPrice: e.target.value })}
                      placeholder="₺/gr"
                      className={THEME.INPUT}
                    />
                  </div>
                </div>

                {/* Has Çevrim Bilgi Kutusu */}
                {txFormData.amount && parseFloat(txFormData.amount) > 0 && (
                  <div className="bg-yellow-500/10 border border-yellow-500/20 p-3 rounded-xl text-xs space-y-1">
                    <div className="text-yellow-400 font-bold flex items-center justify-between">
                      <span>Otomatik Has Karşılığı:</span>
                      <span className="font-mono text-sm">
                        {(() => {
                          const amt = parseFloat(txFormData.amount) || 0;
                          const pr = parseFloat(txFormData.unitPrice) || hasPrice;
                          let eq = 0;
                          if (txFormData.assetType === 'TL' && pr > 0) eq = amt / pr;
                          else if (txFormData.assetType === 'HAS') eq = amt;
                          else if (txFormData.assetType === '22K') eq = amt * 0.916;
                          else if (txFormData.assetType === 'CEYREK') eq = amt * 1.605;
                          else if (txFormData.assetType === 'YARIM') eq = amt * 3.21;
                          else if (txFormData.assetType === 'TAM') eq = amt * 6.42;
                          return `${eq.toFixed(3)} gr Has`;
                        })()}
                      </span>
                    </div>
                    <p className="text-gray-400 text-[11px]">
                      {txFormData.assetType === 'TL'
                        ? `${txFormData.amount} TL borç verildi. Fiyat ₺${txFormData.unitPrice || hasPrice}/gr üzerinden Has karşılığına çevrildi.`
                        : txFormData.assetType.includes('USD') || txFormData.assetType.includes('EUR')
                        ? 'Döviz borcu kendi biriminde tutulacaktır.'
                        : 'Altın borcu Has Altın gram karşılığına çevrildi.'}
                    </p>
                  </div>
                )}

                {/* Açıklama / Not */}
                <div>
                  <label className={THEME.LABEL}>İşlem Açıklaması / Not</label>
                  <input
                    type="text"
                    value={txFormData.description}
                    onChange={(e) => setTxFormData({ ...txFormData, description: e.target.value })}
                    placeholder="Örn: 2 adet çeyrek veresiye verildi"
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

      {/* ─── HESAP EKSTRESİ MODALI ─── */}
      <AnimatePresence>
        {showStatementModal && statementCustomer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className={`${THEME.GLASS_CARD} w-full max-w-3xl p-6 my-8`}
            >
              {/* Ekstre Üst Başlık */}
              <div className="flex justify-between items-start mb-6 border-b border-gray-800 pb-4">
                <div>
                  <span className="text-xs text-yellow-400 font-bold uppercase tracking-wider block">Müşteri Cari Hesap Ekstresi</span>
                  <h2 className="text-2xl font-bold text-white mt-1">{statementCustomer.name}</h2>
                  <div className="flex items-center gap-4 text-xs text-gray-400 mt-1">
                    {statementCustomer.phone && <span>Tel: {statementCustomer.phone}</span>}
                    {statementCustomer.tcNo && <span>TC: {statementCustomer.tcNo}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePrintStatement}
                    className={`${THEME.BTN_SECONDARY} gap-1.5 text-xs py-2`}
                  >
                    <Printer size={14} /> Yazdır / PDF
                  </button>
                  <button onClick={() => setShowStatementModal(false)} className={THEME.BTN_ICON}>
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Bakiye Özet Kartları */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                <div className="bg-gray-950 p-3 rounded-xl border border-gray-800">
                  <span className="text-[10px] text-gray-500 uppercase font-bold block">Net Has Alacak</span>
                  <span className="text-sm font-bold text-yellow-400 font-mono block mt-0.5">
                    {formatHas(statementCustomer.totalHasEquivalent)} gr
                  </span>
                  <span className="text-[10px] text-gray-600">~₺{formatTL(statementCustomer.totalHasEquivalent * hasPrice)}</span>
                </div>

                <div className="bg-gray-950 p-3 rounded-xl border border-gray-800">
                  <span className="text-[10px] text-gray-500 uppercase font-bold block">Net TL Bakiyesi</span>
                  <span className="text-sm font-bold text-emerald-400 font-mono block mt-0.5">
                    ₺{formatTL(statementCustomer.tlBalance)}
                  </span>
                </div>

                <div className="bg-gray-950 p-3 rounded-xl border border-gray-800">
                  <span className="text-[10px] text-gray-500 uppercase font-bold block">Dolar Bakiyesi</span>
                  <span className="text-sm font-bold text-green-400 font-mono block mt-0.5">
                    ${formatTL(statementCustomer.usdBalance)}
                  </span>
                </div>

                <div className="bg-gray-950 p-3 rounded-xl border border-gray-800">
                  <span className="text-[10px] text-gray-500 uppercase font-bold block">Euro Bakiyesi</span>
                  <span className="text-sm font-bold text-blue-400 font-mono block mt-0.5">
                    €{formatTL(statementCustomer.eurBalance)}
                  </span>
                </div>
              </div>

              {/* İşlem Hareketleri Tablosu */}
              <div className="overflow-x-auto max-h-80 overflow-y-auto rounded-xl border border-gray-800 mb-4">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-900 text-gray-400 font-semibold sticky top-0">
                    <tr>
                      <th className="p-3">Tarih</th>
                      <th className="p-3">İşlem Türü</th>
                      <th className="p-3">Varlık Cinsi</th>
                      <th className="p-3">İşlem Miktarı</th>
                      <th className="p-3">Has Karşılığı</th>
                      <th className="p-3">Açıklama</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800 text-gray-300">
                    {loadingStatement ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-gray-500">Ekstre yükleniyor...</td>
                      </tr>
                    ) : statementTxs.length > 0 ? (
                      statementTxs.map(tx => {
                        const isDebt = tx.type === 'BORC';
                        return (
                          <tr key={tx.id} className="hover:bg-gray-900/50">
                            <td className="p-3 font-mono text-gray-400">
                              {new Date(tx.createdAt).toLocaleDateString('tr-TR')}
                            </td>
                            <td className="p-3 font-bold">
                              <span className={`px-2 py-0.5 rounded text-[11px] ${isDebt ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                                {isDebt ? 'BORÇ YAZILDI' : 'TAHSİLAT ALINDI'}
                              </span>
                            </td>
                            <td className="p-3 font-bold text-white">{tx.assetType}</td>
                            <td className="p-3 font-mono font-bold">
                              {tx.amount} {tx.assetType}
                            </td>
                            <td className="p-3 font-mono text-yellow-400 font-bold">
                              {tx.hasEquivalent > 0 ? `${formatHas(tx.hasEquivalent)} gr` : '—'}
                            </td>
                            <td className="p-3 text-gray-400 max-w-xs truncate">
                              {tx.description || '—'}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-gray-500">Henüz işlem hareketi yok.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end pt-2">
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

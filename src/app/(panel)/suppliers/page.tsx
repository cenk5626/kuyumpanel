'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Truck, 
  Coins, 
  Receipt, 
  Plus, 
  RefreshCw, 
  Printer, 
  Search, 
  ArrowDownLeft, 
  ArrowUpRight, 
  CheckCircle2, 
  Building2, 
  Calendar, 
  FileText, 
  TrendingUp, 
  TrendingDown, 
  Scale, 
  AlertCircle,
  X,
  CreditCard,
  DollarSign
} from 'lucide-react';
import { THEME, ANIM } from '@/constants/theme';
import HeaderActions from '@/components/HeaderActions';

// ─── Tipler ───────────────────────────────────────────────────────────────────

interface Supplier {
  id: string;
  name: string;
  phone?: string | null;
  address?: string | null;
  note?: string | null;
  hasBalance: number; // gr Has (Pozitif = Borcumuz var)
  tlBalance: number;  // ₺ TL (Pozitif = Borcumuz var)
  createdAt: string;
  updatedAt?: string;
  _count?: {
    transactions: number;
  };
}

interface SupplierTransaction {
  id: string;
  supplierId: string;
  type: 'PURCHASE' | 'HAS_PAYMENT' | 'TL_PAYMENT' | 'SETTLEMENT';
  hasAmount: number;
  tlAmount: number;
  unitPrice?: number | null;
  documentNo?: string | null;
  description?: string | null;
  employeeName?: string | null;
  createdAt: string;
}

interface LiveHasPrice {
  bid: number;
  ask: number;
}

const TRANSACTION_TYPES = {
  PURCHASE: { label: '📦 Mal Alımı', color: 'bg-purple-500/10 text-purple-400 border-purple-500/30' },
  HAS_PAYMENT: { label: '🟡 Has Altın Ödemesi', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30' },
  TL_PAYMENT: { label: '💵 TL Ödemesi', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
  SETTLEMENT: { label: '⚖️ Mutabakat Düzeltmesi', color: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
} as const;

export default function SuppliersPage() {
  const [activeTab, setActiveTab] = useState<'reconciliation' | 'purchasing'>('reconciliation');
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<SupplierTransaction[]>([]);
  const [hasPrice, setHasPrice] = useState<LiveHasPrice | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [saving, setSaving] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');

  // Modallar
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [newSupplierData, setNewSupplierData] = useState({
    name: '',
    phone: '',
    address: '',
    note: '',
    hasBalance: '0',
    tlBalance: '0',
  });

  // Ödeme / Borç Düş Formu
  const [paymentFormData, setPaymentFormData] = useState({
    type: 'HAS_PAYMENT' as 'HAS_PAYMENT' | 'TL_PAYMENT' | 'SETTLEMENT',
    hasAmount: '',
    tlAmount: '',
    documentNo: '',
    description: '',
  });

  // Mal Alımı Formu State'leri
  const [purchaseFormData, setPurchaseFormData] = useState({
    supplierId: '',
    documentNo: '',
    carat: '24',
    weight: '',
    costMilyem: '0.995',
    laborMilyem: '0.000',
    tlAmount: '0',
    description: '',
  });

  // ─── Veri Çekme ─────────────────────────────────────────────────────────────

  const fetchSuppliers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/suppliers');
      if (res.ok) {
        const data = await res.json();
        setSuppliers(data);
        if (data.length > 0 && !selectedSupplierId) {
          setSelectedSupplierId(data[0].id);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [selectedSupplierId]);

  const fetchLiveHasPrice = useCallback(async () => {
    try {
      const res = await fetch('/api/prices/has');
      if (res.ok) {
        const data = await res.json();
        setHasPrice(data);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const fetchTransactions = useCallback(async (supplierId: string) => {
    try {
      setLoadingTransactions(true);
      const res = await fetch(`/api/supplier-transactions?supplierId=${supplierId}`);
      if (res.ok) {
        const data = await res.json();
        setTransactions(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingTransactions(false);
    }
  }, []);

  useEffect(() => {
    fetchSuppliers();
    fetchLiveHasPrice();
  }, [fetchSuppliers, fetchLiveHasPrice]);

  useEffect(() => {
    if (selectedSupplierId) {
      fetchTransactions(selectedSupplierId);
    }
  }, [selectedSupplierId, fetchTransactions]);

  // Selected supplier object
  const selectedSupplier = suppliers.find(s => s.id === selectedSupplierId) || null;

  // Search filter
  const filteredSuppliers = suppliers.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.phone && s.phone.includes(searchQuery))
  );

  // Genel Toplam Hesaplamaları
  const totalHasBalance = suppliers.reduce((acc, s) => acc + (s.hasBalance || 0), 0);
  const totalTlBalance = suppliers.reduce((acc, s) => acc + (s.tlBalance || 0), 0);
  const totalOwedSuppliersCount = suppliers.filter(s => (s.hasBalance || 0) > 0 || (s.tlBalance || 0) > 0).length;

  // ─── Aksiyonlar ─────────────────────────────────────────────────────────────

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupplierData.name.trim()) return;

    setSaving(true);
    try {
      const res = await fetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSupplierData),
      });

      if (res.ok) {
        const created = await res.json();
        setSuppliers(prev => [created, ...prev]);
        setSelectedSupplierId(created.id);
        setShowAddSupplierModal(false);
        setNewSupplierData({ name: '', phone: '', address: '', note: '', hasBalance: '0', tlBalance: '0' });
      } else {
        const err = await res.json();
        alert(err.error || 'Toptancı eklenemedi.');
      }
    } catch (e) {
      console.error(e);
      alert('Sunucu hatası.');
    } finally {
      setSaving(false);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierId) return;

    setSaving(true);
    try {
      const res = await fetch('/api/supplier-transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierId: selectedSupplierId,
          type: paymentFormData.type,
          hasAmount: paymentFormData.hasAmount || '0',
          tlAmount: paymentFormData.tlAmount || '0',
          unitPrice: hasPrice?.ask || null,
          documentNo: paymentFormData.documentNo,
          description: paymentFormData.description,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        // Güncel toptancı bakiyesini güncelle
        setSuppliers(prev => prev.map(s => s.id === selectedSupplierId ? data.supplier : s));
        setTransactions(prev => [data.transaction, ...prev]);
        setShowPaymentModal(false);
        setPaymentFormData({
          type: 'HAS_PAYMENT',
          hasAmount: '',
          tlAmount: '',
          documentNo: '',
          description: '',
        });
      } else {
        const err = await res.json();
        alert(err.error || 'İşlem kaydedilemedi.');
      }
    } catch (e) {
      console.error(e);
      alert('Ağ hatası.');
    } finally {
      setSaving(false);
    }
  };

  // Mal Alımı Hesaplaması
  const purchaseWeight = parseFloat(purchaseFormData.weight) || 0;
  const purchaseCostMilyem = parseFloat(purchaseFormData.costMilyem) || 0;
  const purchaseLaborMilyem = parseFloat(purchaseFormData.laborMilyem) || 0;
  const totalPurchaseMilyem = purchaseCostMilyem + purchaseLaborMilyem;
  const calculatedHasAmount = purchaseWeight * totalPurchaseMilyem;
  const calculatedTlAmount = parseFloat(purchaseFormData.tlAmount) || 0;

  const handleRecordPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!purchaseFormData.supplierId) {
      alert('Lütfen toptancı seçin.');
      return;
    }
    if (calculatedHasAmount <= 0 && calculatedTlAmount <= 0) {
      alert('Lütfen Has ağırlığı veya TL tutarı girin.');
      return;
    }

    setSaving(true);
    try {
      const desc = purchaseFormData.description 
        ? `${purchaseFormData.carat} Ayar Mal Alımı (${purchaseWeight} gr) - ${purchaseFormData.description}`
        : `${purchaseFormData.carat} Ayar Mal Alımı (${purchaseWeight} gr @ ${totalPurchaseMilyem.toFixed(3)} milyem)`;

      const res = await fetch('/api/supplier-transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierId: purchaseFormData.supplierId,
          type: 'PURCHASE',
          hasAmount: calculatedHasAmount.toFixed(3),
          tlAmount: calculatedTlAmount.toString(),
          unitPrice: hasPrice?.ask || null,
          documentNo: purchaseFormData.documentNo,
          description: desc,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSuppliers(prev => prev.map(s => s.id === purchaseFormData.supplierId ? data.supplier : s));
        if (purchaseFormData.supplierId === selectedSupplierId) {
          setTransactions(prev => [data.transaction, ...prev]);
        }
        alert('Mal alım kaydı toptancı cari hesabına işlendi.');
        setPurchaseFormData({
          supplierId: purchaseFormData.supplierId,
          documentNo: '',
          carat: '24',
          weight: '',
          costMilyem: '0.995',
          laborMilyem: '0.000',
          tlAmount: '0',
          description: '',
        });
      } else {
        const err = await res.json();
        alert(err.error || 'Mal alımı kaydedilemedi.');
      }
    } catch (e) {
      console.error(e);
      alert('Ağ hatası.');
    } finally {
      setSaving(false);
    }
  };

  // Ekstre Yazdırma (Print Window)
  const handlePrintStatement = () => {
    if (!selectedSupplier) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    let runningHas = 0;
    let runningTl = 0;

    // Kronolojik sıra (en eskiden yeniye yürüterek bakiye hesabı)
    const sortedTx = [...transactions].reverse();
    const rowsHtml = sortedTx.map(tx => {
      if (tx.type === 'PURCHASE') {
        runningHas += tx.hasAmount;
        runningTl += tx.tlAmount;
      } else if (tx.type === 'HAS_PAYMENT') {
        runningHas -= tx.hasAmount;
      } else if (tx.type === 'TL_PAYMENT') {
        runningTl -= tx.tlAmount;
      } else if (tx.type === 'SETTLEMENT') {
        runningHas = tx.hasAmount;
        runningTl = tx.tlAmount;
      }

      return `
        <tr>
          <td>${new Date(tx.createdAt).toLocaleString('tr-TR')}</td>
          <td>${TRANSACTION_TYPES[tx.type]?.label || tx.type}</td>
          <td>${tx.documentNo || '—'}</td>
          <td>${tx.description || '—'}</td>
          <td style="text-align: right; color: ${tx.hasAmount > 0 ? '#d97706' : '#6b7280'}">${tx.hasAmount ? tx.hasAmount.toFixed(3) + ' gr' : '—'}</td>
          <td style="text-align: right; color: ${tx.tlAmount > 0 ? '#059669' : '#6b7280'}">${tx.tlAmount ? '₺' + Math.round(tx.tlAmount).toLocaleString('tr-TR') : '—'}</td>
          <td style="text-align: right; font-weight: bold;">${runningHas.toFixed(3)} gr / ₺${Math.round(runningTl).toLocaleString('tr-TR')}</td>
        </tr>
      `;
    }).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Toptan Mutabakat Ekstresi - ${selectedSupplier.name}</title>
          <style>
            body { font-family: sans-serif; padding: 20px; font-size: 12px; color: #111; }
            .header { border-b: 2px solid #333; padding-bottom: 10px; margin-bottom: 15px; display: flex; justify-content: space-between; }
            .title { font-size: 18px; font-weight: bold; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f3f4f6; font-size: 11px; text-transform: uppercase; }
            .summary { margin-top: 20px; font-size: 14px; background: #f9fafb; padding: 15px; border-radius: 8px; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="title">KUYUMPANEL TOPTAN MUTABAKAT EKSTRESİ</div>
              <div>Toptancı: <strong>${selectedSupplier.name}</strong> (${selectedSupplier.phone || 'Telefon Yok'})</div>
            </div>
            <div style="text-align: right;">
              <div>Tarih: ${new Date().toLocaleDateString('tr-TR')}</div>
              <div>Anlık Has Satış: ₺${hasPrice?.ask ? hasPrice.ask.toFixed(2) : '—'} / gr</div>
            </div>
          </div>

          <div class="summary">
            <div>Mevcut Güncel Has Borç Bakiyesi: <span style="color: #b45309;">${selectedSupplier.hasBalance.toFixed(3)} gr Has</span></div>
            <div>Mevcut Güncel TL Borç Bakiyesi: <span style="color: #047857;">₺${Math.round(selectedSupplier.tlBalance).toLocaleString('tr-TR')}</span></div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Tarih</th>
                <th>İşlem Türü</th>
                <th>Belge No</th>
                <th>Açıklama</th>
                <th style="text-align: right;">Has Miktarı</th>
                <th style="text-align: right;">TL Tutarı</th>
                <th style="text-align: right;">Yürüyen Bakiye</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          <div style="margin-top: 40px; display: flex; justify-content: space-between;">
            <div>Teslim Eden (Kuyumcu): _______________</div>
            <div>Teslim Alan (Toptancı): _______________</div>
          </div>

          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6">
      {/* BAŞLIK & HEADER ACTIONS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Truck className="text-yellow-400" size={26} />
            Toptancı & Mutabakat Yönetimi
          </h1>
          <p className="text-gray-400 text-xs mt-1">
            Toptancı mal alımları, Has/TL borç bakiyeleri, cari hesap ekstresi ve toptan mutabakat takibi.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddSupplierModal(true)}
            className="px-4 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-xl text-xs flex items-center gap-2 transition-colors shadow-lg shadow-yellow-500/10"
          >
            <Plus size={16} /> Yeni Toptancı Ekle
          </button>
          <HeaderActions />
        </div>
      </div>

      {/* İKİLİ TAB SEÇİCİ */}
      <div className="flex bg-gray-900/80 p-1.5 rounded-2xl border border-gray-800/80 max-w-xl backdrop-blur-md">
        <button
          onClick={() => setActiveTab('reconciliation')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all ${
            activeTab === 'reconciliation'
              ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Scale size={16} /> 1. Toptan Mutabakat & Cari Hesaplar
        </button>
        <button
          onClick={() => setActiveTab('purchasing')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all ${
            activeTab === 'purchasing'
              ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Receipt size={16} /> 2. Toptancı Mal Alımı Kaydı
        </button>
      </div>

      {/* TOPLAM STAT KARTLARI */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className={`${THEME.GLASS_CARD} p-5 flex items-center justify-between`}>
          <div>
            <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">Toplam Has Borcumuz</p>
            <p className="text-xl font-extrabold text-amber-400 font-mono mt-1">
              {totalHasBalance.toFixed(3)} gr Has
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Coins size={20} />
          </div>
        </div>

        <div className={`${THEME.GLASS_CARD} p-5 flex items-center justify-between`}>
          <div>
            <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">Toplam TL Borcumuz</p>
            <p className="text-xl font-extrabold text-emerald-400 font-mono mt-1">
              ₺{Math.round(totalTlBalance).toLocaleString('tr-TR')}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <CreditCard size={20} />
          </div>
        </div>

        <div className={`${THEME.GLASS_CARD} p-5 flex items-center justify-between`}>
          <div>
            <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">Borçlu Toptancı Sayısı</p>
            <p className="text-xl font-extrabold text-purple-400 font-mono mt-1">
              {totalOwedSuppliersCount} Toptancı
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <Building2 size={20} />
          </div>
        </div>

        <div className={`${THEME.GLASS_CARD} p-5 flex items-center justify-between`}>
          <div>
            <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">Anlık Has Satış Fiyatı</p>
            <p className="text-xl font-extrabold text-yellow-400 font-mono mt-1">
              {hasPrice?.ask ? `₺${hasPrice.ask.toFixed(2)}` : '—'}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-yellow-400">
            <TrendingUp size={20} />
          </div>
        </div>
      </div>

      {/* TAB 1: TOPTAN MUTABAKAT VE CARİ HESAP EKSTRESİ */}
      {activeTab === 'reconciliation' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* SOL PANEL: TOPTANCI LİSTESİ */}
          <div className="lg:col-span-4 space-y-4">
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                <Search size={16} />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Toptancı ara..."
                className="w-full pl-10 pr-4 py-2.5 bg-gray-900/90 border border-gray-800 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500/50"
              />
            </div>

            <div className={`${THEME.GLASS_CARD} p-3 max-h-[600px] overflow-y-auto space-y-2 border border-gray-800/60`}>
              {loading ? (
                <div className="text-center py-10 text-gray-500 text-xs">
                  <RefreshCw size={18} className="animate-spin inline mr-2" /> Yükleniyor...
                </div>
              ) : filteredSuppliers.length === 0 ? (
                <div className="text-center py-10 text-gray-500 text-xs">Toptancı bulunamadı.</div>
              ) : (
                filteredSuppliers.map(s => {
                  const isSelected = s.id === selectedSupplierId;
                  const hasDebt = s.hasBalance > 0 || s.tlBalance > 0;

                  return (
                    <div
                      key={s.id}
                      onClick={() => setSelectedSupplierId(s.id)}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-yellow-500/10 border-yellow-500/40 text-white shadow-md'
                          : 'bg-gray-950/40 border-gray-800/80 hover:bg-gray-900/60 text-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-white">{s.name}</span>
                        {hasDebt && (
                          <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] px-2 py-0.5 rounded-md font-bold">
                            Borçlu
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-gray-800/40 text-xs font-mono">
                        <div>
                          <span className="text-[10px] text-gray-500 block">Has Borcu</span>
                          <span className={s.hasBalance > 0 ? 'text-amber-400 font-bold' : 'text-gray-400'}>
                            {s.hasBalance.toFixed(3)} gr
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-gray-500 block">TL Borcu</span>
                          <span className={s.tlBalance > 0 ? 'text-emerald-400 font-bold' : 'text-gray-400'}>
                            ₺{Math.round(s.tlBalance).toLocaleString('tr-TR')}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* SAĞ PANEL: CARİ HESAP EKSTRESİ (LEDGER) */}
          <div className="lg:col-span-8 space-y-4">
            {selectedSupplier ? (
              <motion.div
                key={selectedSupplier.id}
                {...ANIM.FADE_UP}
                className={`${THEME.GLASS_CARD} p-6 border border-gray-800 space-y-6`}
              >
                {/* TOPTANCI BAŞLIĞI VE AKSİYONLAR */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-800/60">
                  <div>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      <Building2 className="text-yellow-400" size={20} />
                      {selectedSupplier.name}
                    </h2>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {selectedSupplier.phone || 'Telefon yok'} {selectedSupplier.address ? `• ${selectedSupplier.address}` : ''}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowPaymentModal(true)}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors shadow-md"
                    >
                      <Coins size={14} /> Ödeme Yap / Borç Düş
                    </button>

                    <button
                      onClick={handlePrintStatement}
                      className="px-3.5 py-2 bg-gray-800 hover:bg-gray-700 text-yellow-400 border border-gray-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors"
                    >
                      <Printer size={14} /> Ekstre Yazdır
                    </button>
                  </div>
                </div>

                {/* GÜNCEL BAKİYE ÖZET BARI */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-950/60 p-4 rounded-xl border border-gray-800/80">
                  <div className="flex items-center justify-between border-r sm:border-r border-gray-800/60 pr-4">
                    <div>
                      <span className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Güncel Has Borç Bakiyesi</span>
                      <p className="text-lg font-black text-amber-400 font-mono mt-0.5">
                        {selectedSupplier.hasBalance.toFixed(3)} gr Has
                      </p>
                    </div>
                    <Scale className="text-amber-500/40" size={24} />
                  </div>

                  <div className="flex items-center justify-between pl-2">
                    <div>
                      <span className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Güncel TL Borç Bakiyesi</span>
                      <p className="text-lg font-black text-emerald-400 font-mono mt-0.5">
                        ₺{Math.round(selectedSupplier.tlBalance).toLocaleString('tr-TR')}
                      </p>
                    </div>
                    <CreditCard className="text-emerald-500/40" size={24} />
                  </div>
                </div>

                {/* EKSTRE HAREKET TABLOSU */}
                <div>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Receipt size={14} className="text-yellow-500" /> Cari Hesap Ekstresi Geçmişi
                  </h3>

                  {loadingTransactions ? (
                    <div className="text-center py-12 text-gray-500 text-xs">
                      <RefreshCw size={18} className="animate-spin inline mr-2" /> İşlemler yükleniyor...
                    </div>
                  ) : transactions.length === 0 ? (
                    <div className="text-center py-12 text-gray-500 text-xs bg-gray-950/30 rounded-xl border border-gray-800/50">
                      Henüz bu toptancıya ait işlem kaydı bulunmuyor.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-gray-800/60 text-gray-500 uppercase text-[10px] font-bold">
                            <th className="px-3 py-2.5 text-left">Tarih</th>
                            <th className="px-3 py-2.5 text-left">İşlem Türü</th>
                            <th className="px-3 py-2.5 text-left">Belge / Açıklama</th>
                            <th className="px-3 py-2.5 text-right">Has Miktarı</th>
                            <th className="px-3 py-2.5 text-right">TL Tutarı</th>
                            <th className="px-3 py-2.5 text-right">Personel</th>
                          </tr>
                        </thead>
                        <tbody>
                          {transactions.map(tx => (
                            <tr key={tx.id} className="border-b border-gray-800/30 hover:bg-yellow-500/3 transition-colors">
                              <td className="px-3 py-3 text-gray-400 font-mono">
                                {new Date(tx.createdAt).toLocaleString('tr-TR')}
                              </td>
                              <td className="px-3 py-3">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${TRANSACTION_TYPES[tx.type]?.color || ''}`}>
                                  {TRANSACTION_TYPES[tx.type]?.label || tx.type}
                                </span>
                              </td>
                              <td className="px-3 py-3 text-gray-300">
                                <div className="font-semibold text-white">{tx.documentNo ? `No: ${tx.documentNo}` : '—'}</div>
                                {tx.description && <div className="text-[10px] text-gray-500 line-clamp-1">{tx.description}</div>}
                              </td>
                              <td className="px-3 py-3 text-right font-mono font-bold">
                                {tx.hasAmount > 0 ? (
                                  <span className={tx.type === 'PURCHASE' ? 'text-amber-400' : 'text-emerald-400'}>
                                    {tx.type === 'PURCHASE' ? '+' : '-'}{tx.hasAmount.toFixed(3)} gr
                                  </span>
                                ) : '—'}
                              </td>
                              <td className="px-3 py-3 text-right font-mono font-bold">
                                {tx.tlAmount > 0 ? (
                                  <span className={tx.type === 'PURCHASE' ? 'text-amber-400' : 'text-emerald-400'}>
                                    {tx.type === 'PURCHASE' ? '+' : '-'}₺{Math.round(tx.tlAmount).toLocaleString('tr-TR')}
                                  </span>
                                ) : '—'}
                              </td>
                              <td className="px-3 py-3 text-right text-gray-400">
                                {tx.employeeName || '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </motion.div>
            ) : (
              <div className={`${THEME.GLASS_CARD} p-12 text-center text-gray-500 text-xs`}>
                İşlemlerini görmek için sol menüden bir toptancı seçin.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: TOPTANCI MAL ALIMI KAYDI (PURCHASING) */}
      {activeTab === 'purchasing' && (
        <motion.div
          {...ANIM.FADE_UP}
          className={`${THEME.GLASS_CARD} p-6 border border-gray-800 max-w-4xl mx-auto space-y-6`}
        >
          <div className="border-b border-gray-800 pb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Receipt className="text-yellow-400" size={22} />
              Yeni Toptancı Mal Alım Faturası / Girişi
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              Toptancıdan alınan Has, ziynet veya mamül altınların tutarlarını toptancının cari hesabına borç olarak işleyin.
            </p>
          </div>

          <form onSubmit={handleRecordPurchase} className="space-y-6">
            {/* TOPTANCI VE FATURA BİLGİLERİ */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={THEME.LABEL}>Toptancı Seçimi *</label>
                <select
                  required
                  value={purchaseFormData.supplierId}
                  onChange={e => setPurchaseFormData({ ...purchaseFormData, supplierId: e.target.value })}
                  className={THEME.SELECT}
                >
                  <option value="">-- Toptancı Seçin --</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} (Has Borç: {s.hasBalance.toFixed(3)} gr)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={THEME.LABEL}>Fatura / İrsaliye / Belge No</label>
                <input
                  type="text"
                  placeholder="Örn: IRS-2026-0041"
                  value={purchaseFormData.documentNo}
                  onChange={e => setPurchaseFormData({ ...purchaseFormData, documentNo: e.target.value })}
                  className={THEME.INPUT}
                />
              </div>
            </div>

            {/* HAS ALTIN MAL ALIM KIRILIMI */}
            <div className="bg-gray-950/60 p-5 rounded-2xl border border-gray-800 space-y-4">
              <h3 className="text-xs font-bold text-yellow-400 uppercase tracking-wider flex items-center gap-1.5">
                <Coins size={16} /> Has Altın & İşçilik Kırılımı (Has Borcu Oluşturan)
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className={THEME.LABEL}>Ayar</label>
                  <select
                    value={purchaseFormData.carat}
                    onChange={e => {
                      const c = e.target.value;
                      let defaultMil = '0.995';
                      if (c === '22') defaultMil = '0.916';
                      if (c === '18') defaultMil = '0.750';
                      if (c === '14') defaultMil = '0.585';
                      if (c === '8') defaultMil = '0.333';
                      setPurchaseFormData({ ...purchaseFormData, carat: c, costMilyem: defaultMil });
                    }}
                    className={THEME.SELECT}
                  >
                    <option value="24">24 Ayar (Has)</option>
                    <option value="22">22 Ayar (916)</option>
                    <option value="18">18 Ayar (750)</option>
                    <option value="14">14 Ayar (585)</option>
                    <option value="8">8 Ayar (333)</option>
                  </select>
                </div>

                <div>
                  <label className={THEME.LABEL}>Ağırlık (gr) *</label>
                  <input
                    type="number"
                    step="0.001"
                    placeholder="Örn: 150.00"
                    value={purchaseFormData.weight}
                    onChange={e => setPurchaseFormData({ ...purchaseFormData, weight: e.target.value })}
                    className={THEME.INPUT}
                  />
                </div>

                <div>
                  <label className={THEME.LABEL}>Giriş Milyemi</label>
                  <input
                    type="number"
                    step="0.001"
                    value={purchaseFormData.costMilyem}
                    onChange={e => setPurchaseFormData({ ...purchaseFormData, costMilyem: e.target.value })}
                    className={THEME.INPUT}
                  />
                </div>

                <div>
                  <label className={THEME.LABEL}>İşçilik Milyemi (cm)</label>
                  <input
                    type="number"
                    step="0.001"
                    placeholder="Örn: 0.120"
                    value={purchaseFormData.laborMilyem}
                    onChange={e => setPurchaseFormData({ ...purchaseFormData, laborMilyem: e.target.value })}
                    className={THEME.INPUT}
                  />
                </div>
              </div>

              {/* NAKİT / TL MAL ALIM TUTARI */}
              <div className="pt-2 border-t border-gray-800/60 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={THEME.LABEL}>Nakit / TL Borç Tutarı (₺)</label>
                  <input
                    type="number"
                    placeholder="Örn: 5000 ₺ (TL borcu yaratan)"
                    value={purchaseFormData.tlAmount}
                    onChange={e => setPurchaseFormData({ ...purchaseFormData, tlAmount: e.target.value })}
                    className={THEME.INPUT}
                  />
                </div>

                <div>
                  <label className={THEME.LABEL}>Açıklama / Not</label>
                  <input
                    type="text"
                    placeholder="Örn: Adana burma bilezik alımı..."
                    value={purchaseFormData.description}
                    onChange={e => setPurchaseFormData({ ...purchaseFormData, description: e.target.value })}
                    className={THEME.INPUT}
                  />
                </div>
              </div>
            </div>

            {/* ANLIK MATEMATİKSEL FATURA ÖZETİ */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-yellow-500/10 border border-yellow-500/30 p-4 rounded-xl font-mono text-center">
              <div>
                <span className="text-[10px] text-gray-400 uppercase font-bold block">Toptancıya Eklenecek Has Borcu</span>
                <span className="text-lg font-black text-amber-400">{calculatedHasAmount.toFixed(3)} gr Has</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 uppercase font-bold block">Toptancıya Eklenecek TL Borcu</span>
                <span className="text-lg font-black text-emerald-400">₺{Math.round(calculatedTlAmount).toLocaleString('tr-TR')}</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 uppercase font-bold block">Tahmini TL Karşılığı</span>
                <span className="text-lg font-black text-yellow-400">
                  ₺{Math.round((hasPrice?.ask || 0) * calculatedHasAmount + calculatedTlAmount).toLocaleString('tr-TR')}
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-3.5 bg-yellow-500 hover:bg-yellow-400 text-black font-extrabold text-sm rounded-xl transition-colors shadow-xl shadow-yellow-500/20 disabled:opacity-50"
            >
              {saving ? 'Kaydediliyor...' : 'Mal Alımını Kaydet ve Toptancı Cari Hesabına İşle'}
            </button>
          </form>
        </motion.div>
      )}

      {/* MODAL 1: YENİ TOPTANCI EKLE */}
      <AnimatePresence>
        {showAddSupplierModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              {...ANIM.SCALE_UP}
              className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Building2 size={18} className="text-yellow-400" /> Yeni Toptancı Tanımla
                </h3>
                <button onClick={() => setShowAddSupplierModal(false)} className="text-gray-400 hover:text-white">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreateSupplier} className="space-y-4">
                <div>
                  <label className={THEME.LABEL}>Toptancı Adı / Unvanı *</label>
                  <input
                    type="text"
                    required
                    placeholder="Örn: Ahlatcı Has Altın A.Ş."
                    value={newSupplierData.name}
                    onChange={e => setNewSupplierData({ ...newSupplierData, name: e.target.value })}
                    className={THEME.INPUT}
                  />
                </div>

                <div>
                  <label className={THEME.LABEL}>Telefon No</label>
                  <input
                    type="text"
                    placeholder="Örn: 0212 555 0000"
                    value={newSupplierData.phone}
                    onChange={e => setNewSupplierData({ ...newSupplierData, phone: e.target.value })}
                    className={THEME.INPUT}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={THEME.LABEL}>Devreden Has Borç (gr)</label>
                    <input
                      type="number"
                      step="0.001"
                      placeholder="0.000"
                      value={newSupplierData.hasBalance}
                      onChange={e => setNewSupplierData({ ...newSupplierData, hasBalance: e.target.value })}
                      className={THEME.INPUT}
                    />
                  </div>
                  <div>
                    <label className={THEME.LABEL}>Devreden TL Borç (₺)</label>
                    <input
                      type="number"
                      placeholder="0 ₺"
                      value={newSupplierData.tlBalance}
                      onChange={e => setNewSupplierData({ ...newSupplierData, tlBalance: e.target.value })}
                      className={THEME.INPUT}
                    />
                  </div>
                </div>

                <div>
                  <label className={THEME.LABEL}>Not / Açıklama</label>
                  <input
                    type="text"
                    placeholder="Örn: Sarrafiye ve Has altın alımı yaptığımız firma"
                    value={newSupplierData.note}
                    onChange={e => setNewSupplierData({ ...newSupplierData, note: e.target.value })}
                    className={THEME.INPUT}
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddSupplierModal(false)}
                    className="flex-1 py-2.5 bg-gray-800 text-gray-300 font-bold text-xs rounded-xl hover:bg-gray-700"
                  >
                    İptal
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 py-2.5 bg-yellow-500 text-black font-bold text-xs rounded-xl hover:bg-yellow-400 disabled:opacity-50"
                  >
                    {saving ? 'Kaydediliyor...' : 'Toptancıyı Kaydet'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: ÖDEME YAP / BORÇ DÜŞ */}
      <AnimatePresence>
        {showPaymentModal && selectedSupplier && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              {...ANIM.SCALE_UP}
              className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Coins size={18} className="text-emerald-400" /> Toptancı Ödemesi / Borç Düşme
                  </h3>
                  <p className="text-xs text-gray-400">{selectedSupplier.name}</p>
                </div>
                <button onClick={() => setShowPaymentModal(false)} className="text-gray-400 hover:text-white">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleRecordPayment} className="space-y-4">
                <div>
                  <label className={THEME.LABEL}>Ödeme Türü *</label>
                  <select
                    value={paymentFormData.type}
                    onChange={e => setPaymentFormData({ ...paymentFormData, type: e.target.value as any })}
                    className={THEME.SELECT}
                  >
                    <option value="HAS_PAYMENT">🟡 Has Altın Ödemesi (Has borcundan düşer)</option>
                    <option value="TL_PAYMENT">💵 TL Ödemesi (Nakit/Havale - TL borcundan düşer)</option>
                    <option value="SETTLEMENT">⚖️ Mutabakat Düzeltmesi (Bakiyeleri günceller)</option>
                  </select>
                </div>

                {paymentFormData.type === 'HAS_PAYMENT' && (
                  <div>
                    <label className={THEME.LABEL}>Ödenen Has Altın Miktarı (gr Has) *</label>
                    <input
                      type="number"
                      step="0.001"
                      required
                      placeholder="Örn: 50.00 gr Has"
                      value={paymentFormData.hasAmount}
                      onChange={e => setPaymentFormData({ ...paymentFormData, hasAmount: e.target.value })}
                      className={THEME.INPUT}
                    />
                  </div>
                )}

                {paymentFormData.type === 'TL_PAYMENT' && (
                  <div>
                    <label className={THEME.LABEL}>Ödenen TL Tutarı (₺) *</label>
                    <input
                      type="number"
                      required
                      placeholder="Örn: 25000 ₺"
                      value={paymentFormData.tlAmount}
                      onChange={e => setPaymentFormData({ ...paymentFormData, tlAmount: e.target.value })}
                      className={THEME.INPUT}
                    />
                  </div>
                )}

                {paymentFormData.type === 'SETTLEMENT' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={THEME.LABEL}>Yeni Has Bakiyesi (gr)</label>
                      <input
                        type="number"
                        step="0.001"
                        placeholder="0.000"
                        value={paymentFormData.hasAmount}
                        onChange={e => setPaymentFormData({ ...paymentFormData, hasAmount: e.target.value })}
                        className={THEME.INPUT}
                      />
                    </div>
                    <div>
                      <label className={THEME.LABEL}>Yeni TL Bakiyesi (₺)</label>
                      <input
                        type="number"
                        placeholder="0 ₺"
                        value={paymentFormData.tlAmount}
                        onChange={e => setPaymentFormData({ ...paymentFormData, tlAmount: e.target.value })}
                        className={THEME.INPUT}
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className={THEME.LABEL}>Makbuz / Dekont / Belge No</label>
                  <input
                    type="text"
                    placeholder="Örn: DEKONT-9821"
                    value={paymentFormData.documentNo}
                    onChange={e => setPaymentFormData({ ...paymentFormData, documentNo: e.target.value })}
                    className={THEME.INPUT}
                  />
                </div>

                <div>
                  <label className={THEME.LABEL}>Açıklama</label>
                  <input
                    type="text"
                    placeholder="Örn: Banka havalesi ile borç ödemesi yapıldı"
                    value={paymentFormData.description}
                    onChange={e => setPaymentFormData({ ...paymentFormData, description: e.target.value })}
                    className={THEME.INPUT}
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowPaymentModal(false)}
                    className="flex-1 py-2.5 bg-gray-800 text-gray-300 font-bold text-xs rounded-xl hover:bg-gray-700"
                  >
                    İptal
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 py-2.5 bg-emerald-600 text-white font-bold text-xs rounded-xl hover:bg-emerald-500 disabled:opacity-50"
                  >
                    {saving ? 'İşleniyor...' : 'Ödemeyi Kaydet ve Borçtan Düş'}
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

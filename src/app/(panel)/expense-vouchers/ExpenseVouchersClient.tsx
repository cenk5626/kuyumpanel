'use client';

import React, { useState, useMemo } from 'react';
import {
  FileText,
  Plus,
  Search,
  Filter,
  Printer,
  Send,
  XCircle,
  CheckCircle2,
  AlertTriangle,
  Scale,
  Building2,
  Trash2,
  Eye,
  ShieldCheck,
  Receipt,
  Download,
  Coins,
} from 'lucide-react';
import ScaleButton from '@/components/ScaleButton';
import PageHeader from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import LuxuryTabs from '@/components/LuxuryTabs';
import { THEME } from '@/constants/theme';
import {
  EXPENSE_VOUCHER_STATUS,
  EXPENSE_VOUCHER_STATUS_LABELS,
  EXPENSE_VOUCHER_SIGNATURE_STATUS,
  EXPENSE_VOUCHER_SIGNATURE_LABELS,
  EXPENSE_VOUCHER_PAYMENT_METHODS,
  EXPENSE_VOUCHER_PAYMENT_METHOD_LABELS,
  EXPENSE_VOUCHER_WITHHOLDING_RATES,
  EXPENSE_VOUCHER_DEFAULTS,
  CARAT_PURITY,
} from '@/constants/expense-voucher';

interface VoucherLine {
  id?: string;
  description: string;
  carat: number;
  milyem: number;
  weight: number;
  unitPrice: number;
  totalPrice: number;
  hasEquivalent: number;
}

interface Voucher {
  id: string;
  voucherNumber: string;
  issueDate: string;
  sellerName: string;
  sellerTaxId: string;
  sellerPhone?: string | null;
  sellerAddress?: string | null;
  paymentMethod: string;
  grossAmount: number;
  withholdingRate: number;
  withholdingAmount: number;
  netAmount: number;
  hasEquivalent: number;
  status: string;
  signatureStatus: string;
  notes?: string | null;
  branch?: { id: string; name: string; code: string } | null;
  lines: VoucherLine[];
  events: Array<{ id: string; eventType: string; actorEmail?: string | null; notes?: string | null; createdAt: string }>;
}

interface ExpenseVouchersClientProps {
  initialVouchers: Voucher[];
  branches: Array<{ id: string; name: string; code: string }>;
}

export default function ExpenseVouchersClient({
  initialVouchers,
  branches,
}: ExpenseVouchersClientProps) {
  const [vouchers, setVouchers] = useState<Voucher[]>(initialVouchers);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [branchFilter, setBranchFilter] = useState('ALL');

  // Modallar
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [selectedVoucherForPrint, setSelectedVoucherForPrint] = useState<Voucher | null>(null);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [voucherToCancel, setVoucherToCancel] = useState<Voucher | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Yeni Gider Pusulası Form State
  const [sellerName, setSellerName] = useState('');
  const [sellerTaxId, setSellerTaxId] = useState('');
  const [sellerPhone, setSellerPhone] = useState('');
  const [sellerAddress, setSellerAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<string>(EXPENSE_VOUCHER_PAYMENT_METHODS.NAKIT);
  const [withholdingRate, setWithholdingRate] = useState<number>(EXPENSE_VOUCHER_WITHHOLDING_RATES.EXEMPT);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [notes, setNotes] = useState('');

  const [formLines, setFormLines] = useState<Array<{
    description: string;
    carat: number;
    weight: number;
    unitPrice: number;
  }>>([
    { description: '22 Ayar Hurda Bilezik', carat: 22, weight: 10.0, unitPrice: 3250 },
  ]);

  // KPI Hesaplamaları
  const kpis = useMemo(() => {
    const totalCount = vouchers.length;
    const approvedVouchers = vouchers.filter((v) => v.status === EXPENSE_VOUCHER_STATUS.APPROVED);
    const totalNetAmount = approvedVouchers.reduce((acc, v) => acc + (v.netAmount || 0), 0);
    const totalHasWeight = approvedVouchers.reduce((acc, v) => acc + (v.hasEquivalent || 0), 0);
    const pendingSignCount = vouchers.filter((v) => v.signatureStatus === EXPENSE_VOUCHER_SIGNATURE_STATUS.PENDING).length;

    return {
      totalCount,
      totalNetAmount,
      totalHasWeight,
      pendingSignCount,
    };
  }, [vouchers]);

  // Canlı Form Toplamları
  const calculatedFormTotals = useMemo(() => {
    let gross = 0;
    let totalHas = 0;

    const calculatedLines = formLines.map((line) => {
      const milyem = CARAT_PURITY[line.carat] || 916;
      const total = (line.weight || 0) * (line.unitPrice || 0);
      const has = (line.weight || 0) * (milyem / 1000);
      gross += total;
      totalHas += has;
      return {
        ...line,
        milyem,
        total,
        has,
      };
    });

    const withholdingAmt = (gross * withholdingRate) / 100;
    const net = gross - withholdingAmt;

    return {
      calculatedLines,
      gross,
      withholdingAmt,
      net,
      totalHas,
    };
  }, [formLines, withholdingRate]);

  // Filtrelenmiş Liste
  const filteredVouchers = useMemo(() => {
    return vouchers.filter((v) => {
      const matchesSearch =
        !searchQuery ||
        v.voucherNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.sellerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.sellerTaxId.includes(searchQuery);

      const matchesStatus =
        statusFilter === 'ALL'
          ? true
          : statusFilter === 'PENDING_SIGN'
          ? v.signatureStatus === EXPENSE_VOUCHER_SIGNATURE_STATUS.PENDING
          : v.status === statusFilter;
      const matchesBranch = branchFilter === 'ALL' || v.branch?.id === branchFilter;

      return matchesSearch && matchesStatus && matchesBranch;
    });
  }, [vouchers, searchQuery, statusFilter, branchFilter]);

  const handleAddLine = () => {
    setFormLines([
      ...formLines,
      { description: '14K Hurda Kolye', carat: 14, weight: 5.0, unitPrice: 1950 },
    ]);
  };

  const handleRemoveLine = (index: number) => {
    if (formLines.length === 1) return;
    setFormLines(formLines.filter((_, i) => i !== index));
  };

  const handleLineChange = (index: number, field: string, value: any) => {
    const updated = [...formLines];
    updated[index] = { ...updated[index], [field]: value };
    setFormLines(updated);
  };

  const handleCreateVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sellerName.trim() || !sellerTaxId.trim()) {
      alert('Lütfen satıcı adı ve TCKN giriniz.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/expense-vouchers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sellerName,
          sellerTaxId,
          sellerPhone,
          sellerAddress,
          paymentMethod,
          withholdingRate,
          branchId: selectedBranchId || null,
          notes,
          lines: formLines,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gider pusulası oluşturulamadı.');
      }

      const created = await res.json();
      setVouchers([created, ...vouchers]);
      setIsNewModalOpen(false);

      // Formu sıfırla
      setSellerName('');
      setSellerTaxId('');
      setSellerPhone('');
      setSellerAddress('');
      setNotes('');
      setFormLines([{ description: '22 Ayar Hurda Bilezik', carat: 22, weight: 10.0, unitPrice: 3250 }]);

      alert(`Gider pusulası ${created.voucherNumber} başarıyla düzenlendi!`);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelVoucher = async () => {
    if (!voucherToCancel) return;
    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/expense-vouchers/${voucherToCancel.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CANCEL',
          reason: cancelReason || 'Kullanıcı talebiyle iptal edildi.',
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'İptal edilemedi.');
      }

      const updated = await res.json();
      setVouchers(vouchers.map((v) => (v.id === updated.id ? updated : v)));
      setIsCancelModalOpen(false);
      setVoucherToCancel(null);
      setCancelReason('');
      alert('Gider pusulası başarıyla iptal edildi ve hurda/kasa stokları tersine çevrildi.');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendToGib = async (voucherId: string) => {
    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/expense-vouchers/${voucherId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'SUBMIT_E_DOCUMENT' }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'GİB iletimi başarısız.');
      }

      const data = await res.json();
      setVouchers(vouchers.map((v) => (v.id === voucherId ? { ...v, events: data.events } : v)));
      alert(`e-Gider Pusulası başarıyla GİB sistemine iletildi!\nUUID: ${data.submission?.uuid}`);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Üst Başlık & Eylemler */}
      <PageHeader
        title="Resmî Gider Pusulası & e-Belge"
        subtitle="213 sayılı VUK 234 uyarınca nihai tüketicilerden hurda altın/kıymetli maden alım belgeleri ve GİB entegrasyonu."
        icon={FileText}
        badges={[
          { label: `${kpis.totalCount} Belge`, variant: 'gold' },
          { label: `${kpis.totalHasWeight.toFixed(3)} gr Has Girişi`, variant: 'success' },
          ...(kpis.pendingSignCount > 0 ? [{ label: `${kpis.pendingSignCount} İmza Bekliyor`, variant: 'warning' as const }] : []),
        ]}
        actions={
          <button
            onClick={() => setIsNewModalOpen(true)}
            className={`${THEME.BTN_PRIMARY} min-h-[44px] flex items-center justify-center gap-2`}
          >
            <Plus className="h-4 w-4" />
            <span>Yeni Gider Pusulası Düzenle</span>
          </button>
        }
      />

      {/* KPI Kartları */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Toplam Belge Sayısı"
          value={`${kpis.totalCount} Adet`}
          subtitle="Düzenlenen gider pusulası"
          icon={Receipt}
          iconColor="gold"
        />
        <StatCard
          title="Net Ödenen Tutar"
          value={`₺${kpis.totalNetAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`}
          subtitle="Nihai tüketicilere ödenen"
          icon={Coins}
          iconColor="emerald"
        />
        <StatCard
          title="Alınan Has Karşılığı"
          value={`${kpis.totalHasWeight.toFixed(3)} gr`}
          subtitle="Kasaya giren has altın"
          icon={Scale}
          iconColor="gold"
        />
        <StatCard
          title="İmza Bekleyenler"
          value={`${kpis.pendingSignCount} Belge`}
          subtitle="Islak / dijital onay"
          icon={ShieldCheck}
          iconColor="purple"
        />
      </div>

      {/* 4'lü Ana Tab Seçici (LuxuryTabs) */}
      <LuxuryTabs<string>
        tabs={[
          { id: 'ALL', label: '1. Tüm Belgeler', count: kpis.totalCount },
          { id: EXPENSE_VOUCHER_STATUS.APPROVED, label: '2. Onaylanan & GİB', count: vouchers.filter((v) => v.status === EXPENSE_VOUCHER_STATUS.APPROVED).length },
          { id: 'PENDING_SIGN', label: '3. İmza Bekleyenler', count: kpis.pendingSignCount },
          { id: EXPENSE_VOUCHER_STATUS.CANCELLED, label: '4. İptal Edilenler', count: vouchers.filter((v) => v.status === EXPENSE_VOUCHER_STATUS.CANCELLED).length },
        ]}
        activeTab={statusFilter}
        onChange={(tab) => setStatusFilter(tab)}
      />

      {/* Arama & Filtreleme */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder="Belge No, Müşteri Adı veya TCKN ile ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-10 pr-4 min-h-[44px] ${THEME.INPUT}`}
          />
        </div>
        <div className="flex items-center gap-2">
          {branches.length > 0 && (
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className={`min-h-[44px] ${THEME.INPUT}`}
            >
              <option value="ALL">Tüm Şubeler</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Belge Tablosu */}
      <div className={THEME.TABLE.CONTAINER}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className={THEME.TABLE.HEADER}>
              <tr>
                <th className={THEME.TABLE.TH}>Belge No & Tarih</th>
                <th className={THEME.TABLE.TH}>Satıcı (TCKN)</th>
                <th className={THEME.TABLE.TH}>Şube / Ödeme</th>
                <th className={THEME.TABLE.TH}>Brüt (₺)</th>
                <th className={THEME.TABLE.TH}>Stopaj (%)</th>
                <th className={THEME.TABLE.TH}>Net Ödenen (₺)</th>
                <th className="py-3.5 px-4">Has Altın (gr)</th>
                <th className="py-3.5 px-4">Durum</th>
                <th className="py-3.5 px-4 text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80 text-slate-900 dark:text-white">
              {filteredVouchers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-500">
                    Kayıtlı gider pusulası bulunamadı.
                  </td>
                </tr>
              ) : (
                filteredVouchers.map((voucher) => (
                  <tr key={voucher.id} className={THEME.TABLE.BODY_ROW}>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {voucher.voucherNumber}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {new Date(voucher.issueDate).toLocaleDateString('tr-TR')}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-900 dark:text-white">
                        {voucher.sellerName}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {voucher.sellerTaxId}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-xs font-medium text-slate-800 dark:text-slate-200">
                        {voucher.branch?.name || 'Merkez'}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {EXPENSE_VOUCHER_PAYMENT_METHOD_LABELS[voucher.paymentMethod as keyof typeof EXPENSE_VOUCHER_PAYMENT_METHOD_LABELS] || voucher.paymentMethod}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-medium">
                      ₺{voucher.grossAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                        %{voucher.withholdingRate} (₺{voucher.withholdingAmount.toFixed(2)})
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      ₺{voucher.netAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-semibold text-amber-600 dark:text-amber-400">
                      {voucher.hasEquivalent.toFixed(3)} gr
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                          voucher.status === EXPENSE_VOUCHER_STATUS.APPROVED
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                            : voucher.status === EXPENSE_VOUCHER_STATUS.CANCELLED
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300'
                        }`}
                      >
                        {EXPENSE_VOUCHER_STATUS_LABELS[voucher.status as keyof typeof EXPENSE_VOUCHER_STATUS_LABELS] || voucher.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedVoucherForPrint(voucher)}
                          title="Matbu A4 Yazdır / Önizle"
                          className="min-h-[36px] min-w-[36px] p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center transition"
                        >
                          <Printer className="h-4 w-4" />
                        </button>
                        {voucher.status === EXPENSE_VOUCHER_STATUS.APPROVED && (
                          <button
                            onClick={() => handleSendToGib(voucher.id)}
                            title="e-Gider Pusulası Olarak GİB'e İlet"
                            className="p-1.5 rounded-lg border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-600 dark:text-blue-400"
                          >
                            <Send className="h-4 w-4" />
                          </button>
                        )}
                        {voucher.status === EXPENSE_VOUCHER_STATUS.APPROVED && (
                          <button
                            onClick={() => {
                              setVoucherToCancel(voucher);
                              setIsCancelModalOpen(true);
                            }}
                            title="İptal Et"
                            className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-rose-600 dark:text-rose-400"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* YENİ GİDER PUSULASI DÜZENLEME MODALI */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-amber-500" />
                <h3 className="font-bold text-slate-900 dark:text-white">
                  Yeni Resmî Gider Pusulası Düzenle
                </h3>
              </div>
              <button
                onClick={() => setIsNewModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateVoucher} className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Satıcı Bilgileri */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Satıcı Adı-Soyadı *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Örn: Ayşe Yılmaz"
                    value={sellerName}
                    onChange={(e) => setSellerName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    TC Kimlik Numarası (11 Hane) *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={11}
                    placeholder="Örn: 12345678901"
                    value={sellerTaxId}
                    onChange={(e) => setSellerTaxId(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Telefon Numarası
                  </label>
                  <input
                    type="text"
                    placeholder="0532..."
                    value={sellerPhone}
                    onChange={(e) => setSellerPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Ödeme Yöntemi
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                  >
                    <option value={EXPENSE_VOUCHER_PAYMENT_METHODS.NAKIT}>Nakit Kasa Çıkışı</option>
                    <option value={EXPENSE_VOUCHER_PAYMENT_METHODS.BANKA_HAVALE}>Banka Transferi (EFT/Havale)</option>
                    <option value={EXPENSE_VOUCHER_PAYMENT_METHODS.HAS_TAKAS}>Has / Mamul Altın Takası</option>
                  </select>
                </div>
              </div>

              {/* Hurda Kalemleri Tablosu & Teraziden Alma */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Alınan Hurda / Kıymetli Maden Kalemleri
                  </span>
                  <button
                    type="button"
                    onClick={handleAddLine}
                    className="text-xs font-semibold text-amber-600 hover:text-amber-700 dark:text-amber-400 flex items-center gap-1"
                  >
                    <Plus className="h-3.5 w-3.5" /> Kalem Ekle
                  </button>
                </div>

                <div className="space-y-2.5">
                  {formLines.map((line, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 grid grid-cols-12 gap-2.5 items-center text-xs"
                    >
                      <div className="col-span-12 sm:col-span-4">
                        <label className="block text-[10px] text-slate-400 mb-0.5">Ürün / Hurda Cinsi</label>
                        <input
                          type="text"
                          value={line.description}
                          onChange={(e) => handleLineChange(idx, 'description', e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                        />
                      </div>
                      <div className="col-span-4 sm:col-span-2">
                        <label className="block text-[10px] text-slate-400 mb-0.5">Ayar</label>
                        <select
                          value={line.carat}
                          onChange={(e) => handleLineChange(idx, 'carat', Number(e.target.value))}
                          className="w-full px-2 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white"
                        >
                          <option value={8}>8K (333)</option>
                          <option value={14}>14K (585)</option>
                          <option value={18}>18K (750)</option>
                          <option value={22}>22K (916)</option>
                          <option value={24}>24K (995)</option>
                        </select>
                      </div>
                      <div className="col-span-4 sm:col-span-2">
                        <div className="flex items-center justify-between mb-0.5">
                          <label className="text-[10px] text-slate-400">Gramaj</label>
                          <ScaleButton
                            size="sm"
                            onWeightReceived={(weight: number) => handleLineChange(idx, 'weight', weight)}
                          />
                        </div>
                        <input
                          type="number"
                          step="0.01"
                          value={line.weight}
                          onChange={(e) => handleLineChange(idx, 'weight', parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono font-medium text-slate-900 dark:text-white"
                        />
                      </div>
                      <div className="col-span-4 sm:col-span-3">
                        <label className="block text-[10px] text-slate-400 mb-0.5">Birim Fiyat (₺/gr)</label>
                        <input
                          type="number"
                          step="1"
                          value={line.unitPrice}
                          onChange={(e) => handleLineChange(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono font-medium text-slate-900 dark:text-white"
                        />
                      </div>
                      <div className="col-span-12 sm:col-span-1 flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleRemoveLine(idx)}
                          className="p-1.5 text-slate-400 hover:text-rose-500 transition"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Stopaj ve Vergi Tercihi */}
              <div className="p-4 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Gelir Vergisi Stopaj Oranı
                  </label>
                  <select
                    value={withholdingRate}
                    onChange={(e) => setWithholdingRate(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-sm font-medium text-slate-900 dark:text-white"
                  >
                    <option value={EXPENSE_VOUCHER_WITHHOLDING_RATES.EXEMPT}>
                      %0 — Bireysel Tüketiciden Hurda Altın Alımı (Muaf)
                    </option>
                    <option value={EXPENSE_VOUCHER_WITHHOLDING_RATES.WITHHOLDING_2}>
                      %2 — Ticari / Hurda Metal Tevkifatı
                    </option>
                    <option value={EXPENSE_VOUCHER_WITHHOLDING_RATES.SERVICES_10}>
                      %10 — Hizmet & İşçilik Gideri
                    </option>
                  </select>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-col justify-center">
                  <span>{EXPENSE_VOUCHER_DEFAULTS.LEGAL_NOTICE}</span>
                </div>
              </div>

              {/* Canlı Özet Döküm */}
              <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800 flex flex-col gap-2 font-mono text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Brüt Hurda Bedeli:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    ₺{calculatedFormTotals.gross.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Stopaj Kesintisi (%{withholdingRate}):</span>
                  <span className="text-rose-600 dark:text-rose-400">
                    -₺{calculatedFormTotals.withholdingAmt.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Toplam Saf Has Karşılığı:</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400">
                    {calculatedFormTotals.totalHas.toFixed(3)} gr Has
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between text-sm font-bold">
                  <span className="text-slate-900 dark:text-white">Ödenecek Net Tutar:</span>
                  <span className="text-emerald-600 dark:text-emerald-400">
                    ₺{calculatedFormTotals.net.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="min-h-[44px] px-4 py-2 rounded-xl text-sm font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="min-h-[44px] px-5 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow hover:from-amber-600 hover:to-amber-700 disabled:opacity-50"
                >
                  {isSubmitting ? 'Kaydediliyor...' : 'Gider Pusulasını Onayla & Kes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MATBU A4 YAZDIRMA & ÖNİZLEME MODALI */}
      {selectedVoucherForPrint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-4xl max-h-[95vh] flex flex-col rounded-2xl bg-white dark:bg-slate-900 shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between print:hidden">
              <h3 className="font-bold text-slate-900 dark:text-white">
                Gider Pusulası Matbu Form (A4)
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="min-h-[44px] flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-950 font-bold transition shadow-md shadow-amber-500/20"
                >
                  <Printer className="h-4 w-4" /> Yazdır
                </button>
                <button
                  onClick={() => setSelectedVoucherForPrint(null)}
                  className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-8 overflow-y-auto bg-white text-slate-900 print:p-0">
              <div className="border border-slate-300 p-6 rounded-lg space-y-6">
                <div className="flex justify-between items-start border-b border-slate-300 pb-4">
                  <div>
                    <h2 className="text-xl font-bold tracking-wider">
                      {EXPENSE_VOUCHER_DEFAULTS.DOCUMENT_TITLE}
                    </h2>
                    <p className="text-xs text-slate-600 mt-1">
                      {EXPENSE_VOUCHER_DEFAULTS.LEGAL_NOTICE}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-mono font-bold text-amber-700">
                      {selectedVoucherForPrint.voucherNumber}
                    </div>
                    <div className="text-xs text-slate-600">
                      Tarih: {new Date(selectedVoucherForPrint.issueDate).toLocaleDateString('tr-TR')}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6 text-xs">
                  <div className="border border-slate-200 p-3 rounded">
                    <span className="font-bold block text-slate-800 mb-1">MÜŞTERİ / SATICI BİLGİLERİ</span>
                    <div>Adı Soyadı: <strong>{selectedVoucherForPrint.sellerName}</strong></div>
                    <div>T.C. Kimlik No: <strong>{selectedVoucherForPrint.sellerTaxId}</strong></div>
                    <div>Telefon: {selectedVoucherForPrint.sellerPhone || '-'}</div>
                    <div>Adres: {selectedVoucherForPrint.sellerAddress || '-'}</div>
                  </div>
                  <div className="border border-slate-200 p-3 rounded">
                    <span className="font-bold block text-slate-800 mb-1">ÖDEME BİLGİLERİ</span>
                    <div>Ödeme Yöntemi: {selectedVoucherForPrint.paymentMethod}</div>
                    <div>İşlem Şubesi: {selectedVoucherForPrint.branch?.name || 'Merkez Şube'}</div>
                    <div>Stopaj Oranı: %{selectedVoucherForPrint.withholdingRate}</div>
                  </div>
                </div>

                <table className="w-full text-xs text-left border-collapse border border-slate-300">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="border border-slate-300 p-2">Sıra</th>
                      <th className="border border-slate-300 p-2">Malın / Hurdanın Cinsi</th>
                      <th className="border border-slate-300 p-2">Ayar</th>
                      <th className="border border-slate-300 p-2">Gramaj (gr)</th>
                      <th className="border border-slate-300 p-2">Birim Alış (₺)</th>
                      <th className="border border-slate-300 p-2">Tutar (₺)</th>
                      <th className="border border-slate-300 p-2">Has Karşılığı</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedVoucherForPrint.lines.map((l, i) => (
                      <tr key={i}>
                        <td className="border border-slate-300 p-2 text-center">{i + 1}</td>
                        <td className="border border-slate-300 p-2 font-medium">{l.description}</td>
                        <td className="border border-slate-300 p-2 text-center">{l.carat}K</td>
                        <td className="border border-slate-300 p-2 text-right font-mono">{l.weight.toFixed(2)}</td>
                        <td className="border border-slate-300 p-2 text-right font-mono">₺{l.unitPrice.toLocaleString('tr-TR')}</td>
                        <td className="border border-slate-300 p-2 text-right font-mono font-medium">₺{l.totalPrice.toLocaleString('tr-TR')}</td>
                        <td className="border border-slate-300 p-2 text-right font-mono font-semibold text-amber-700">{l.hasEquivalent.toFixed(3)} gr</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="flex justify-end text-xs font-mono space-y-1">
                  <div className="w-64 space-y-1 border border-slate-300 p-3 rounded bg-slate-50">
                    <div className="flex justify-between">
                      <span>Brüt Bedel:</span>
                      <span>₺{selectedVoucherForPrint.grossAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-rose-600">
                      <span>Stopaj (%{selectedVoucherForPrint.withholdingRate}):</span>
                      <span>-₺{selectedVoucherForPrint.withholdingAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between font-bold text-sm pt-2 border-t border-slate-300">
                      <span>Net Ödenen:</span>
                      <span className="text-emerald-700">₺{selectedVoucherForPrint.netAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-8 pt-8 border-t border-slate-300 text-center text-xs">
                  <div>
                    <div className="font-bold mb-8">MAL VE BEDELİ TESLİM EDEN (SATICI)</div>
                    <div className="text-slate-500">İmza</div>
                  </div>
                  <div>
                    <div className="font-bold mb-8">MAL VE BEDELİ TESLİM ALAN (KUYUMCU)</div>
                    <div className="text-slate-500">Kaşe / Yetkili İmza</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* İPTAL MODALI */}
      {isCancelModalOpen && voucherToCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6">
            <div className="flex items-center gap-2.5 text-rose-600 dark:text-rose-400 mb-3">
              <AlertTriangle className="h-5 w-5" />
              <h3 className="font-bold text-slate-900 dark:text-white">
                Gider Pusulasını İptal Et
              </h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 mb-4">
              <strong>{voucherToCancel.voucherNumber}</strong> numaralı gider pusulası iptal edilecektir.
              Hurda kasasına eklenen gramajlar otomatik düşülecek ve nakit ödeme kasaya iade edilecektir.
            </p>
            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                İptal Gerekçesi *
              </label>
              <textarea
                required
                rows={3}
                placeholder="Örn: Yanlış tartım, müşteri satmaktan vazgeçti..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div className="flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setIsCancelModalOpen(false);
                  setVoucherToCancel(null);
                }}
                className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Vazgeç
              </button>
              <button
                type="button"
                disabled={!cancelReason.trim() || isSubmitting}
                onClick={handleCancelVoucher}
                className="min-h-[44px] px-5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-sm disabled:opacity-50"
              >
                {isSubmitting ? 'İptal Ediliyor...' : 'İptali Onayla'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

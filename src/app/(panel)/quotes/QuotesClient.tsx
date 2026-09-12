'use client';

import React, { useState } from 'react';
import {
  BadgePercent,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  Printer,
  Trash2,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  Calendar,
  Share2,
} from 'lucide-react';
import ScaleButton from '@/components/ScaleButton';
import PageHeader from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import LuxuryTabs from '@/components/LuxuryTabs';
import { THEME } from '@/constants/theme';
import {
  QUOTE_STATUS,
  QUOTE_STATUS_LABELS,
  QUOTE_VALIDITY_OPTIONS,
  QUOTE_DEFAULTS,
  QuoteStatus,
} from '@/constants/pricing';
import {
  calculateQuoteTotals,
  formatQuoteWhatsAppNotification,
} from '@/lib/pricing/quote-engine';

interface QuotesClientProps {
  initialQuotes: any[];
  customers: any[];
  liveGoldPrice: number;
}

export default function QuotesClient({
  initialQuotes,
  customers,
  liveGoldPrice,
}: QuotesClientProps) {
  const [quotes, setQuotes] = useState<any[]>(initialQuotes);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modallar
  const [showNewQuoteModal, setShowNewQuoteModal] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<any | null>(null);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [convertPaymentMethod, setConvertPaymentMethod] = useState('CASH');
  const [isConverting, setIsConverting] = useState(false);

  // Form State - Yeni Teklif
  const [customerId, setCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [validityMinutes, setValidityMinutes] = useState(60);
  const [tolerancePercent, setTolerancePercent] = useState(1.5);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [discountTl, setDiscountTl] = useState(0);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Kalemler
  const [lines, setLines] = useState<any[]>([
    {
      title: '22 Ayar Şarnelli Bilezik',
      carat: 22,
      weight: 15.0,
      unitPrice: 3250,
      laborCost: 0,
    },
  ]);

  // Aktif tartım yapılan satır index'i
  const [activeScaleIndex, setActiveScaleIndex] = useState<number | null>(null);

  // Müşteri seçimi
  const handleCustomerSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const custId = e.target.value;
    setCustomerId(custId);
    const found = customers.find((c) => c.id === custId);
    if (found) {
      setCustomerName(found.name);
      setCustomerPhone(found.phone || '');
    }
  };

  // Kalem ekle/sil/güncelle
  const addLine = () => {
    setLines((prev) => [
      ...prev,
      {
        title: '14 Ayar Baget Yüzük',
        carat: 14,
        weight: 3.5,
        unitPrice: 2100,
        laborCost: 0,
      },
    ]);
  };

  const removeLine = (idx: number) => {
    setLines((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateLine = (idx: number, field: string, value: any) => {
    setLines((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item))
    );
  };

  // Anlık Hesaplanan Toplamlar
  const totals = calculateQuoteTotals(lines, discountPercent, discountTl);

  // Yeni Teklif Kaydet
  const handleCreateQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      alert('Lütfen müşteri adı giriniz.');
      return;
    }
    if (lines.length === 0) {
      alert('Lütfen en az bir ürün kalemi ekleyiniz.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: customerId || undefined,
          customerName,
          customerPhone,
          lines,
          discountPercent,
          discountTl,
          validityMinutes,
          maxGoldTolerancePercent: tolerancePercent,
          notes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Teklif oluşturulamadı.');
      }

      setQuotes((prev) => [data.quote, ...prev]);
      setShowNewQuoteModal(false);
      setCustomerName('');
      setCustomerPhone('');
      setCustomerId('');
      setNotes('');

      if (data.authCheck?.requiresApproval) {
        alert(
          `Teklif oluşturuldu ancak iskonto tavanı aşıldığı için "Yönetici Onayı Bekliyor" durumuna alındı (${data.authCheck.reason}).`
        );
      } else {
        alert('Teklif başarıyla oluşturuldu ve onaylandı!');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Teklifi Satışa Dönüştür
  const handleConvertQuote = async () => {
    if (!selectedQuote) return;
    setIsConverting(true);
    try {
      const res = await fetch(`/api/quotes/${selectedQuote.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CONVERT',
          paymentMethod: convertPaymentMethod,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Satışa dönüştürülemedi.');
      }

      setQuotes((prev) =>
        prev.map((q) => (q.id === selectedQuote.id ? data.quote : q))
      );
      setShowConvertModal(false);
      setSelectedQuote(null);
      alert('Teklif başarıyla satış işlemine dönüştürüldü!');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsConverting(false);
    }
  };

  // Yönetici Onayı Ver
  const handleApproveQuote = async (quoteId: string) => {
    try {
      const res = await fetch(`/api/quotes/${quoteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'APPROVE' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setQuotes((prev) => prev.map((q) => (q.id === quoteId ? data.quote : q)));
      if (selectedQuote && selectedQuote.id === quoteId) {
        setSelectedQuote(data.quote);
      }
      alert('Teklif yönetici tarafından onaylandı!');
    } catch (err: any) {
      alert(err.message);
    }
  };

  // KPI Hesaplamaları
  const totalCount = quotes.length;
  const pendingApprovalCount = quotes.filter((q) => q.status === QUOTE_STATUS.PENDING_APPROVAL).length;
  const convertedCount = quotes.filter((q) => q.status === QUOTE_STATUS.CONVERTED).length;
  const invalidatedCount = quotes.filter((q) => q.isInvalidated).length;

  return (
    <div className="space-y-6 pb-12">
      {/* Üst Başlık & Eylemler */}
      <PageHeader
        title="Teklif Yönetimi & Özel İskonto"
        subtitle="Altın kuru toleranslı teklif hazırlama, iskonto yetki kontrolü ve tek tıkla satışa dönüştürme."
        icon={BadgePercent}
        badges={[
          { label: `${totalCount} Teklif Kaydı`, variant: 'gold' },
          { label: `Canlı Has: ₺${liveGoldPrice.toLocaleString('tr-TR')}`, variant: 'success' },
          ...(pendingApprovalCount > 0 ? [{ label: `${pendingApprovalCount} Onay Bekliyor`, variant: 'warning' as const }] : []),
        ]}
        actions={
          <button
            onClick={() => setShowNewQuoteModal(true)}
            className={`${THEME.BTN_PRIMARY} min-h-[44px] flex items-center justify-center gap-2`}
          >
            <Plus className="w-4 h-4" />
            <span>Yeni Teklif Hazırla</span>
          </button>
        }
      />

      {/* 4 KPI Kartı */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Toplam Teklif"
          value={totalCount}
          subtitle="Tüm teklif arşivi"
          icon={BadgePercent}
          iconColor="gold"
        />
        <StatCard
          title="Onay Bekleyenler"
          value={pendingApprovalCount}
          subtitle="İskonto yetki kontrolünde"
          icon={ShieldAlert}
          iconColor="blue"
        />
        <StatCard
          title="Satışa Dönüşen"
          value={convertedCount}
          subtitle="Onaylanıp satılanlar"
          icon={CheckCircle2}
          iconColor="emerald"
        />
        <StatCard
          title="Süresi Dolan / Geçersiz"
          value={invalidatedCount}
          subtitle="Kur toleransı aşılmış"
          icon={Clock}
          iconColor="rose"
        />
      </div>

      {/* 4'lü Ana Tab Seçici (LuxuryTabs) */}
      <LuxuryTabs<string>
        tabs={[
          { id: '', label: '1. Tüm Teklifler', count: totalCount },
          { id: QUOTE_STATUS.PENDING_APPROVAL, label: '2. Onay Bekleyenler', count: pendingApprovalCount },
          { id: QUOTE_STATUS.CONVERTED, label: '3. Satışa Dönüşenler', count: convertedCount },
          { id: 'INVALIDATED', label: '4. Süresi Dolan / İptal', count: invalidatedCount },
        ]}
        activeTab={statusFilter}
        onChange={(tab) => setStatusFilter(tab)}
      />

      {/* Arama & Tablo Konteyneri */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-amber-500/20 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Teklif No veya Müşteri Ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-10 pr-3 min-h-[44px] ${THEME.INPUT}`}
            />
          </div>
        </div>

        {/* Tablo */}
        <div className="overflow-x-auto scrollbar-none">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 text-xs">
                <th className="py-3 px-4">Teklif No</th>
                <th className="py-3 px-4">Müşteri</th>
                <th className="py-3 px-4">Toplam Tutar</th>
                <th className="py-3 px-4">Has Altın</th>
                <th className="py-3 px-4">İskonto</th>
                <th className="py-3 px-4">Geçerlilik</th>
                <th className="py-3 px-4">Durum / Kur Alarmı</th>
                <th className="py-3 px-4 text-right">Eylem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {quotes
                .filter((q) => {
                  const matchesSearch =
                    !searchQuery ||
                    q.quoteNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    q.customerName.toLowerCase().includes(searchQuery.toLowerCase());
                  const matchesStatus =
                    !statusFilter ||
                    (statusFilter === 'INVALIDATED' ? q.isInvalidated : q.status === statusFilter);
                  return matchesSearch && matchesStatus;
                })
                .map((q) => (
                  <tr key={q.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-750/30">
                    <td className="py-3 px-4 font-mono font-bold text-amber-600 dark:text-amber-400">
                      {q.quoteNumber}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">
                        {q.customerName}
                      </div>
                      <div className="text-xs text-slate-500">{q.customerPhone || 'Telefonsuz'}</div>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-100">
                      ₺{q.totalTl.toLocaleString('tr-TR')}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-600 dark:text-slate-300">
                      {q.totalHas} gr
                    </td>
                    <td className="py-3 px-4 text-xs">
                      {q.discountPercent > 0 ? (
                        <span className="text-amber-600 font-semibold">%{q.discountPercent}</span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-500">
                      {new Date(q.validUntil).toLocaleTimeString('tr-TR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-col gap-1 items-start">
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            q.status === QUOTE_STATUS.APPROVED
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                              : q.status === QUOTE_STATUS.PENDING_APPROVAL
                              ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                              : q.status === QUOTE_STATUS.CONVERTED
                              ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {QUOTE_STATUS_LABELS[q.status as QuoteStatus] || q.status}
                        </span>

                        {q.isInvalidated && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            {q.invalidationReason === 'PRICE_SURGE' ? 'Kur Toleransı Aşıldı' : 'Süre Doldu'}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setSelectedQuote(q)}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 transition"
                      >
                        İncele & İşlem
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* YENİ TEKLİF HAZIRLAMA MODALI */}
      {showNewQuoteModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-4xl w-full border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <BadgePercent className="w-5 h-5 text-amber-500" />
                Yeni Fiyat Teklifi Hazırla
              </h3>
              <button
                onClick={() => setShowNewQuoteModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateQuote} className="p-6 overflow-y-auto space-y-6">
              {/* Müşteri & Süre Bilgileri */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Kayıtlı Müşteri (Opsiyonel)
                  </label>
                  <select
                    value={customerId}
                    onChange={handleCustomerSelect}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                  >
                    <option value="">-- Müşteri Seç / Yeni Giriş --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.phone || 'Telefonsuz'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Müşteri Adı *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Müşteri ad soyad"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Telefon (WhatsApp için)
                  </label>
                  <input
                    type="text"
                    placeholder="05xxxxxxxxx"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              {/* Geçerlilik & Tolerans */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 dark:bg-slate-900/40 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Geçerlilik Süresi
                  </label>
                  <select
                    value={validityMinutes}
                    onChange={(e) => setValidityMinutes(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  >
                    {QUOTE_VALIDITY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Kur Artış Toleransı (%)
                  </label>
                  <select
                    value={tolerancePercent}
                    onChange={(e) => setTolerancePercent(parseFloat(e.target.value))}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  >
                    <option value={1.0}>%1.0 (Düşük Tolerans)</option>
                    <option value={1.5}>%1.5 (Standart Tolerans)</option>
                    <option value={2.0}>%2.0 (Yüksek Tolerans)</option>
                  </select>
                </div>

                <div>
                  <div className="text-xs text-slate-500">Referans Taban Kur</div>
                  <div className="text-base font-bold text-amber-600 dark:text-amber-400 mt-1">
                    ₺{liveGoldPrice.toLocaleString('tr-TR')} / gr Has
                  </div>
                </div>
              </div>

              {/* Kalemler Tablosu & Terazi */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Teklif Kalemleri ({lines.length})
                  </h4>
                  <button
                    type="button"
                    onClick={addLine}
                    className="px-3 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Satır Ekle
                  </button>
                </div>

                <div className="space-y-3">
                  {lines.map((line, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-12 gap-2 items-center"
                    >
                      <div className="sm:col-span-4">
                        <input
                          type="text"
                          required
                          placeholder="Ürün adı"
                          value={line.title}
                          onChange={(e) => updateLine(idx, 'title', e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <select
                          value={line.carat}
                          onChange={(e) => updateLine(idx, 'carat', parseInt(e.target.value, 10))}
                          className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                        >
                          <option value={24}>24 Ayar</option>
                          <option value={22}>22 Ayar</option>
                          <option value={18}>18 Ayar</option>
                          <option value={14}>14 Ayar</option>
                          <option value={8}>8 Ayar</option>
                        </select>
                      </div>

                      <div className="sm:col-span-2 flex items-center gap-1">
                        <input
                          type="number"
                          step="0.01"
                          required
                          placeholder="Gram"
                          value={line.weight}
                          onChange={(e) => updateLine(idx, 'weight', parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                        />
                        <ScaleButton
                          onWeightReceived={(w) => updateLine(idx, 'weight', w)}
                          size="sm"
                          buttonText="Tart"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <input
                          type="number"
                          step="10"
                          required
                          placeholder="Birim ₺"
                          value={line.unitPrice}
                          onChange={(e) => updateLine(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                        />
                      </div>

                      <div className="sm:col-span-1 text-xs font-bold text-slate-900 dark:text-slate-100 font-mono text-right">
                        ₺{Math.round(line.weight * line.unitPrice + (line.laborCost || 0)).toLocaleString('tr-TR')}
                      </div>

                      <div className="sm:col-span-1 text-right">
                        {lines.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeLine(idx)}
                            className="p-1 text-red-500 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* İskonto & Toplamlar */}
              <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row justify-between gap-4">
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Özel İskonto Oranı (%)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.5"
                      max="100"
                      value={discountPercent}
                      onChange={(e) => setDiscountPercent(parseFloat(e.target.value) || 0)}
                      className="w-24 px-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    />
                    <span className="text-xs text-slate-500">
                      (Standart personel tavanı: %3 • Müdür tavanı: %10)
                    </span>
                  </div>

                  {discountPercent > 3 && (
                    <div className="text-xs text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1 mt-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Personel iskonto tavanı aşıldı. Teklif yönetici onayına sunulacaktır.
                    </div>
                  )}
                </div>

                <div className="text-right space-y-1">
                  <div className="text-xs text-slate-500">
                    Ara Toplam: ₺{totals.subtotalTl.toLocaleString('tr-TR')}
                  </div>
                  {totals.discountAmountTl > 0 && (
                    <div className="text-xs text-red-500">
                      İskonto Tutarı: -₺{totals.discountAmountTl.toLocaleString('tr-TR')} (%{totals.appliedDiscountPercent})
                    </div>
                  )}
                  <div className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    Net Tutar: ₺{totals.totalTl.toLocaleString('tr-TR')}
                  </div>
                  <div className="text-xs font-mono text-amber-600 dark:text-amber-400">
                    Has Altın: {totals.totalHas} gr Has
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewQuoteModal(false)}
                  className="px-4 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-sm font-semibold rounded-lg bg-amber-500 hover:bg-amber-600 text-white shadow-sm disabled:opacity-50"
                >
                  {isSubmitting ? 'Kaydediliyor...' : 'Teklifi Oluştur'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TEKLİF İNCELEME & SATIŞA DÖNÜŞTÜRME MODALI */}
      {selectedQuote && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <BadgePercent className="w-5 h-5 text-amber-500" />
                  Teklif Detayı: {selectedQuote.quoteNumber}
                </h3>
                <div className="text-xs text-slate-500 mt-0.5">
                  Müşteri: <strong>{selectedQuote.customerName}</strong> ({selectedQuote.customerPhone || 'Telefonsuz'})
                </div>
              </div>
              <button
                onClick={() => setSelectedQuote(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              {/* Tolerans / Süre Uyarısı */}
              {selectedQuote.isInvalidated && (
                <div className="p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-800 dark:text-red-300 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong>Teklif Geçersiz / Süresi Dolmuş:</strong> {selectedQuote.invalidationMessage}
                  </div>
                </div>
              )}

              {/* Kalemler */}
              <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500">
                    <tr>
                      <th className="py-2.5 px-3">Ürün</th>
                      <th className="py-2.5 px-3">Ayar</th>
                      <th className="py-2.5 px-3">Gram</th>
                      <th className="py-2.5 px-3">Birim Fiyat</th>
                      <th className="py-2.5 px-3 text-right">Tutar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {selectedQuote.lines?.map((line: any) => (
                      <tr key={line.id}>
                        <td className="py-2.5 px-3 font-medium">{line.title}</td>
                        <td className="py-2.5 px-3">{line.carat}K</td>
                        <td className="py-2.5 px-3 font-mono">{line.weight} gr</td>
                        <td className="py-2.5 px-3 font-mono">₺{line.unitPrice.toLocaleString('tr-TR')}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-right">
                          ₺{line.totalPrice.toLocaleString('tr-TR')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Tutar Özeti */}
              <div className="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-xl space-y-1 text-sm">
                <div className="flex justify-between text-slate-500">
                  <span>Ara Toplam:</span>
                  <span>₺{selectedQuote.subtotalTl.toLocaleString('tr-TR')}</span>
                </div>
                {selectedQuote.discountTl > 0 && (
                  <div className="flex justify-between text-red-500">
                    <span>İskonto (%{selectedQuote.discountPercent}):</span>
                    <span>-₺{selectedQuote.discountTl.toLocaleString('tr-TR')}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold text-slate-900 dark:text-slate-100 pt-1 border-t border-slate-200 dark:border-slate-700">
                  <span>Toplam Tutar:</span>
                  <span>₺{selectedQuote.totalTl.toLocaleString('tr-TR')}</span>
                </div>
                <div className="flex justify-between text-xs text-amber-600 dark:text-amber-400 font-mono">
                  <span>Has Altın Karşılığı:</span>
                  <span>{selectedQuote.totalHas} gr Has</span>
                </div>
              </div>

              {/* Butonlar */}
              <div className="flex flex-wrap gap-2 pt-2">
                {selectedQuote.customerPhone && (
                  <a
                    href={formatQuoteWhatsAppNotification({
                      quoteNumber: selectedQuote.quoteNumber,
                      customerName: selectedQuote.customerName,
                      customerPhone: selectedQuote.customerPhone,
                      totalTl: selectedQuote.totalTl,
                      totalHas: selectedQuote.totalHas,
                      validUntil: selectedQuote.validUntil,
                      storeName: 'Kuyumcumuz',
                      linesCount: selectedQuote.lines?.length || 0,
                    })}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 transition"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    WhatsApp ile Gönder
                  </a>
                )}

                <button
                  onClick={() => window.print()}
                  className="px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-1.5 text-slate-700 dark:text-slate-200"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Matbu Teklif Yazdır
                </button>

                {selectedQuote.status === QUOTE_STATUS.PENDING_APPROVAL && (
                  <button
                    onClick={() => handleApproveQuote(selectedQuote.id)}
                    className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Yönetici Onayı Ver
                  </button>
                )}

                {selectedQuote.status === QUOTE_STATUS.APPROVED && !selectedQuote.isInvalidated && (
                  <button
                    onClick={() => setShowConvertModal(true)}
                    className="px-4 py-2 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-600 text-white flex items-center gap-1.5 shadow-sm ml-auto"
                  >
                    <ArrowRight className="w-4 h-4" />
                    Satışa Çevir
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SATIŞA DÖNÜŞTÜRME ONAY MODALI */}
      {showConvertModal && selectedQuote && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-700 shadow-2xl p-6">
            <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100 mb-2">
              Teklifi Satışa Dönüştür
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              <strong>{selectedQuote.quoteNumber}</strong> numaralı teklif için resmi satış kaydı oluşturulacaktır.
              Toplam Tutar: <strong>₺{selectedQuote.totalTl.toLocaleString('tr-TR')}</strong>
            </p>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Tahsilat / Ödeme Yöntemi
              </label>
              <select
                value={convertPaymentMethod}
                onChange={(e) => setConvertPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              >
                <option value="CASH">Nakit (Kasa Girişi)</option>
                <option value="CARD">Kredi / Banka Kartı</option>
                <option value="BANK">Havale / EFT / IBAN</option>
                <option value="HAS">Has Altın / Takas</option>
                <option value="DEBT">Veresiye / Açık Hesap</option>
              </select>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowConvertModal(false)}
                className="px-4 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
              >
                İptal
              </button>
              <button
                type="button"
                disabled={isConverting}
                onClick={handleConvertQuote}
                className="px-5 py-2 text-sm font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm disabled:opacity-50"
              >
                {isConverting ? 'Dönüştürülüyor...' : 'Satışı Tamamla'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

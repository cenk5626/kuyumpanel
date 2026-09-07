'use client';

import React, { useState } from 'react';
import {
  ReceiptText,
  Plus,
  Search,
  Printer,
  FileText,
  ShieldCheck,
  Coins,
  DollarSign,
  TrendingUp,
  X,
  Trash2,
  Calendar,
  CheckCircle2,
  Info,
  Scale,
} from 'lucide-react';
import { THEME } from '@/constants/theme';
import {
  INVOICE_TYPES,
  INVOICE_DOCUMENT_TYPES,
  INVOICE_TYPE_LABELS,
  INVOICE_DOCUMENT_LABELS,
  INVOICE_DEFAULTS,
  INVOICE_KDV_RATES,
} from '@/constants/invoice';
import { CARAT_MILYEM_MAP } from '@/constants/workshop';
import ScaleButton from '@/components/ScaleButton';
import { calculateSpecialMatrixInvoice, SpecialMatrixItemInput } from '@/lib/invoice/special-matrix';

interface InvoiceItem {
  name: string;
  weight: number;
  carat: number;
  milyem: number;
  pureGoldWeight: number;
  goldCost: number;
  laborAmount: number;
  kdvPercent: number;
  kdvAmount: number;
  total: number;
}

interface InvoiceRecord {
  id: string;
  invoiceNumber: string;
  type: string;
  documentType: string;
  status: string;
  customerName: string;
  customerTaxId?: string | null;
  customerTaxOffice?: string | null;
  customerAddress?: string | null;
  items: InvoiceItem[];
  totalPureGoldWeight: number;
  totalGoldAmount: number;
  totalLaborAmount: number;
  totalKdvAmount: number;
  grandTotal: number;
  note?: string | null;
  issueDate: string;
}

interface CustomerOption {
  id: string;
  name: string;
  phone?: string | null;
  tcNo?: string | null;
  address?: string | null;
}

interface InvoicesClientProps {
  initialInvoices: InvoiceRecord[];
  customers: CustomerOption[];
  currentHasPrice: number;
}

export default function InvoicesClient({
  initialInvoices,
  customers,
  currentHasPrice,
}: InvoicesClientProps) {
  const [invoices, setInvoices] = useState<InvoiceRecord[]>(initialInvoices);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [docTypeFilter, setDocTypeFilter] = useState('ALL');

  // Modal State'leri
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [printInvoice, setPrintInvoice] = useState<InvoiceRecord | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Yeni Fatura Form State
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerTaxId, setCustomerTaxId] = useState('');
  const [customerTaxOffice, setCustomerTaxOffice] = useState<string>(INVOICE_DEFAULTS.TAX_OFFICE);
  const [customerAddress, setCustomerAddress] = useState('');
  const [invoiceType, setInvoiceType] = useState<string>(INVOICE_TYPES.OZEL_MATRAH);
  const [documentType, setDocumentType] = useState<string>(INVOICE_DOCUMENT_TYPES.E_ARSIV);
  const [formItems, setFormItems] = useState<SpecialMatrixItemInput[]>([
    {
      name: '22 Ayar Burma Bilezik',
      weight: 15.0,
      carat: 22,
      milyem: CARAT_MILYEM_MAP[22],
      hasGoldPrice: currentHasPrice,
      laborCost: 1800,
    },
  ]);

  // Müşteri seçildiğinde bilgileri doldur
  const handleSelectCustomer = (customerId: string) => {
    setSelectedCustomerId(customerId);
    const found = customers.find((c) => c.id === customerId);
    if (found) {
      setCustomerName(found.name);
      setCustomerTaxId(found.tcNo || '');
      setCustomerAddress(found.address || '');
    }
  };

  // Form kalem güncelleme
  const handleItemChange = (index: number, field: keyof SpecialMatrixItemInput, value: any) => {
    setFormItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      if (field === 'carat') {
        const caratNum = Number(value);
        updated[index].milyem = CARAT_MILYEM_MAP[caratNum] || 0.995;
      }
      return updated;
    });
  };

  const handleAddItem = () => {
    setFormItems((prev) => [
      ...prev,
      {
        name: '14 Ayar Baget Yüzük',
        weight: 3.5,
        carat: 14,
        milyem: CARAT_MILYEM_MAP[14],
        hasGoldPrice: currentHasPrice,
        laborCost: 950,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (formItems.length <= 1) return;
    setFormItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Anlık Önizleme Hesabı
  const liveCalculation = calculateSpecialMatrixInvoice(formItems);

  // Fatura Kaydet
  const handleSaveInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      alert('Lütfen müşteri adı veya unvanı giriniz.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: selectedCustomerId || null,
          customerName: customerName.trim(),
          customerTaxId: customerTaxId.trim() || null,
          customerTaxOffice: customerTaxOffice.trim() || null,
          customerAddress: customerAddress.trim() || null,
          type: invoiceType,
          documentType,
          items: formItems,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Fatura kaydedilemedi.');
      }

      const newInv = await res.json();
      setInvoices((prev) => [newInv, ...prev]);
      setIsNewModalOpen(false);
      setPrintInvoice(newInv); // Doğrudan yazdırma önizlemesini aç
    } catch (err: any) {
      alert(err.message || 'Bir hata meydana geldi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtreleme
  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch =
      inv.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (inv.customerTaxId && inv.customerTaxId.includes(searchQuery));

    const matchesType = typeFilter === 'ALL' || inv.type === typeFilter;
    const matchesDocType = docTypeFilter === 'ALL' || inv.documentType === docTypeFilter;

    return matchesSearch && matchesType && matchesDocType;
  });

  // KPI Toplamları
  const totalGoldCost = invoices.reduce((s, i) => s + (i.totalGoldAmount || 0), 0);
  const totalLaborCost = invoices.reduce((s, i) => s + (i.totalLaborAmount || 0), 0);
  const totalKdv = invoices.reduce((s, i) => s + (i.totalKdvAmount || 0), 0);
  const totalGrand = invoices.reduce((s, i) => s + (i.grandTotal || 0), 0);

  return (
    <div className="p-4 sm:p-6 max-w-[1920px] mx-auto space-y-6">
      {/* Üst Başlık & Açıklama */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-amber-500/20 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <ReceiptText className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Özel Matrahlı Fatura & e-Arşiv
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                3065 sayılı KDV Kanunu Madde 23/e: Külçe bedeli KDV istisnası, yalnızca işçilik matrahına %20 KDV.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => setIsNewModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-950 font-bold rounded-xl shadow-lg shadow-amber-500/20 active:scale-95 transition-all text-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Yeni Fatura Düzenle</span>
        </button>
      </div>

      {/* KPI Kartları */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-amber-500/20 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold mb-1">
            <span>Toplam Belge</span>
            <FileText className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            {invoices.length}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Düzenlenen Fatura</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-amber-500/20 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold mb-1">
            <span>Külçe İstisna Bedeli</span>
            <Coins className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-lg sm:text-xl font-black text-amber-600 dark:text-amber-400 font-mono">
            {totalGoldCost.toLocaleString('tr-TR', { maximumFractionDigits: 2 })} ₺
          </div>
          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 font-semibold">%0 KDV İstisnası</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-amber-500/20 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold mb-1">
            <span>İşçilik Matrahı</span>
            <DollarSign className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-lg sm:text-xl font-black text-slate-900 dark:text-white font-mono">
            {totalLaborCost.toLocaleString('tr-TR', { maximumFractionDigits: 2 })} ₺
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Vergiye Tabi Tutar</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-amber-500/20 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold mb-1">
            <span>Tahakkuk Eden KDV</span>
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
            {totalKdv.toLocaleString('tr-TR', { maximumFractionDigits: 2 })} ₺
          </div>
          <div className="text-[10px] text-slate-400 mt-1">%20 KDV Tutarı</div>
        </div>

        <div className="col-span-2 lg:col-span-1 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent bg-white dark:bg-slate-900 p-4 rounded-2xl border border-amber-500/30 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold mb-1">
            <span>Genel Toplam Ciro</span>
            <TrendingUp className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-amber-400 font-mono">
            {totalGrand.toLocaleString('tr-TR', { maximumFractionDigits: 2 })} ₺
          </div>
          <div className="text-[10px] text-amber-600 dark:text-amber-400/80 mt-1 font-semibold">Tüm Belgeler</div>
        </div>
      </div>

      {/* Arama & Filtreleme Çubuğu */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-amber-500/20">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Fatura no, müşteri adı veya TCKN ara..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <select
            value={docTypeFilter}
            onChange={(e) => setDocTypeFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="ALL">Tüm Belge Türleri</option>
            <option value={INVOICE_DOCUMENT_TYPES.E_ARSIV}>e-Arşiv Fatura</option>
            <option value={INVOICE_DOCUMENT_TYPES.E_FATURA}>e-Fatura</option>
            <option value={INVOICE_DOCUMENT_TYPES.BILGI_FISI}>Bilgi Fişi</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="ALL">Tüm Matrah Şekilleri</option>
            <option value={INVOICE_TYPES.OZEL_MATRAH}>Özel Matrah (23/e)</option>
            <option value={INVOICE_TYPES.STANDART}>Standart Fatura</option>
          </select>
        </div>
      </div>

      {/* Fatura Tablosu */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-amber-500/20 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 dark:bg-slate-950/80 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4">Fatura No / Tarih</th>
                <th className="py-3.5 px-4">Belge Türü</th>
                <th className="py-3.5 px-4">Müşteri / TCKN</th>
                <th className="py-3.5 px-4 text-right">Has Altın (gr)</th>
                <th className="py-3.5 px-4 text-right">Külçe Bedeli (İstisna)</th>
                <th className="py-3.5 px-4 text-right">İşçilik (Matrah)</th>
                <th className="py-3.5 px-4 text-right">KDV (%20)</th>
                <th className="py-3.5 px-4 text-right">Genel Toplam</th>
                <th className="py-3.5 px-4 text-center">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-10 text-slate-400 text-xs">
                    Kayıtlı fatura bulunamadı.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => (
                  <tr
                    key={inv.id}
                    className="hover:bg-amber-500/5 transition-colors font-sans"
                  >
                    <td className="py-3 px-4">
                      <div className="font-mono font-bold text-amber-600 dark:text-amber-400">
                        {inv.invoiceNumber}
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3 h-3" />
                        {new Date(inv.issueDate).toLocaleDateString('tr-TR')}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                        {INVOICE_DOCUMENT_LABELS[inv.documentType as keyof typeof INVOICE_DOCUMENT_LABELS] || inv.documentType}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 dark:text-white">
                        {inv.customerName}
                      </div>
                      {inv.customerTaxId && (
                        <div className="text-[11px] text-slate-400 font-mono">
                          {inv.customerTaxId}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-700 dark:text-slate-300">
                      {inv.totalPureGoldWeight.toFixed(3)} gr
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-amber-600 dark:text-amber-400">
                      {inv.totalGoldAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-800 dark:text-slate-200">
                      {inv.totalLaborAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-emerald-600 dark:text-emerald-400">
                      {inv.totalKdvAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-black text-slate-950 dark:text-white">
                      {inv.grandTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => setPrintInvoice(inv)}
                        className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-amber-500 hover:bg-amber-500/10 transition-colors"
                        title="Matbu A4 Yazdır & Önizle"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: YENİ FATURA DÜZENLE */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/70 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-amber-500/30 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden my-6">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50">
              <div className="flex items-center gap-2.5">
                <ReceiptText className="w-5 h-5 text-amber-500" />
                <h3 className="font-extrabold text-slate-900 dark:text-white text-base sm:text-lg">
                  Yeni Kuyumcu Faturası / e-Arşiv Düzenle
                </h3>
              </div>
              <button
                onClick={() => setIsNewModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveInvoice} className="p-4 sm:p-6 space-y-5">
              {/* Belge ve Alıcı Bilgileri */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Müşteri Rehberinden Seç
                  </label>
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => handleSelectCustomer(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white"
                  >
                    <option value="">Manuel Müşteri Girişi</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.phone ? `(${c.phone})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Müşteri Adı / Unvanı *
                  </label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Ad Soyad veya Şirket Unvanı"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    TCKN / VKN
                  </label>
                  <input
                    type="text"
                    value={customerTaxId}
                    onChange={(e) => setCustomerTaxId(e.target.value)}
                    placeholder="11 haneli TCKN veya 10 haneli VKN"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              {/* Fatura Türü & Belge Türü */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Fatura Matrah Şekli
                  </label>
                  <select
                    value={invoiceType}
                    onChange={(e) => setInvoiceType(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white"
                  >
                    <option value={INVOICE_TYPES.OZEL_MATRAH}>Özel Matrah (KDV Kanunu 23/e)</option>
                    <option value={INVOICE_TYPES.STANDART}>Standart Fatura (Tamamı KDV'li)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Belge Türü
                  </label>
                  <select
                    value={documentType}
                    onChange={(e) => setDocumentType(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white"
                  >
                    <option value={INVOICE_DOCUMENT_TYPES.E_ARSIV}>e-Arşiv Fatura (Bireysel / Nihai Tüketici)</option>
                    <option value={INVOICE_DOCUMENT_TYPES.E_FATURA}>e-Fatura (Vergi Mükellefi)</option>
                    <option value={INVOICE_DOCUMENT_TYPES.BILGI_FISI}>Bilgi Fişi (Mali Olmayan Bilgilendirme)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Vergi Dairesi
                  </label>
                  <input
                    type="text"
                    value={customerTaxOffice}
                    onChange={(e) => setCustomerTaxOffice(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Ürün Kalemleri Listesi */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-950/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Fatura Kalemleri (Altın Takı & Külçe)
                  </span>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Kalem Ekle
                  </button>
                </div>

                <div className="space-y-3">
                  {formItems.map((item, idx) => {
                    const itemMilyem = item.milyem || CARAT_MILYEM_MAP[item.carat || 24] || 0.995;
                    const pureWeight = Number(((item.weight || 0) * itemMilyem).toFixed(3));
                    const goldCost = Number((pureWeight * (item.hasGoldPrice || currentHasPrice)).toFixed(2));
                    const labor = item.laborCost || 0;
                    const kdv = Number((labor * 0.2).toFixed(2));
                    const lineTotal = Number((goldCost + labor + kdv).toFixed(2));

                    return (
                      <div
                        key={idx}
                        className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end text-xs"
                      >
                        <div className="sm:col-span-3">
                          <label className="text-[10px] text-slate-400 font-semibold block mb-1">Ürün Cinsi</label>
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="text-[10px] text-slate-400 font-semibold block mb-1">Ayar</label>
                          <select
                            value={item.carat || 24}
                            onChange={(e) => handleItemChange(idx, 'carat', Number(e.target.value))}
                            className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white"
                          >
                            <option value="24">24K (995 Has)</option>
                            <option value="22">22K (916)</option>
                            <option value="18">18K (750)</option>
                            <option value="14">14K (585)</option>
                            <option value="8">8K (333)</option>
                          </select>
                        </div>

                        <div className="sm:col-span-3">
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-[10px] text-slate-400 font-semibold">Gramaj (gr)</label>
                            <ScaleButton
                              size="sm"
                              onWeightReceived={(w) => handleItemChange(idx, 'weight', w)}
                            />
                          </div>
                          <input
                            type="number"
                            step="0.01"
                            value={item.weight}
                            onChange={(e) => handleItemChange(idx, 'weight', Number(e.target.value))}
                            className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white font-mono"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="text-[10px] text-slate-400 font-semibold block mb-1">İşçilik (TL)</label>
                          <input
                            type="number"
                            step="10"
                            value={item.laborCost}
                            onChange={(e) => handleItemChange(idx, 'laborCost', Number(e.target.value))}
                            className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white font-mono"
                          />
                        </div>

                        <div className="sm:col-span-2 flex items-center justify-between gap-1">
                          <div className="font-mono text-right">
                            <span className="text-[10px] text-slate-400 block">Tutar</span>
                            <span className="font-bold text-amber-600 dark:text-amber-400">{lineTotal} ₺</span>
                          </div>
                          {formItems.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(idx)}
                              className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Fatura Toplam Özeti & KDV Kanunu 23/e Şerhi */}
              <div className="bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Toplam Has Altın</span>
                    <span className="font-bold text-slate-900 dark:text-white text-sm">
                      {liveCalculation.totalPureGoldWeight} gr
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Külçe Bedeli (KDV İstisna)</span>
                    <span className="font-bold text-amber-600 dark:text-amber-400 text-sm">
                      {liveCalculation.totalGoldAmount.toLocaleString('tr-TR')} ₺
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">İşçilik Matrahı + %20 KDV</span>
                    <span className="font-bold text-slate-900 dark:text-white text-sm">
                      {(liveCalculation.totalLaborAmount + liveCalculation.totalKdvAmount).toLocaleString('tr-TR')} ₺
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Fatura Genel Toplamı</span>
                    <span className="font-black text-emerald-600 dark:text-emerald-400 text-base">
                      {liveCalculation.grandTotal.toLocaleString('tr-TR')} ₺
                    </span>
                  </div>
                </div>

                <div className="text-[11px] text-amber-800 dark:text-amber-300/90 bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20 flex items-start gap-2">
                  <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <span>{INVOICE_DEFAULTS.NOTE_23E}</span>
                </div>
              </div>

              {/* Butonlar */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs sm:text-sm font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl shadow-lg shadow-amber-500/20 disabled:opacity-50"
                >
                  {isSubmitting ? 'Fatura Kesiliyor...' : 'Faturayı Onayla & Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: MATBU A4 e-ARŞİV FATURA BASKI ÖNİZLEME */}
      {printInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/70 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white text-slate-900 rounded-2xl w-full max-w-4xl shadow-2xl my-6 overflow-hidden print:m-0 print:p-0 print:border-none print:shadow-none">
            {/* Üst Toolbar (Yazdırmada Gizli) */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between print:hidden">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-400" />
                <span className="font-bold text-sm">Resmi A4 Fatura Baskı Önizleme</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-lg flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" /> Yazdır
                </button>
                <button
                  onClick={() => setPrintInvoice(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* A4 Matbu Belge Gövdesi */}
            <div className="p-8 sm:p-12 space-y-6 bg-white min-h-[700px] text-xs leading-relaxed">
              {/* Başlık Bölümü */}
              <div className="flex justify-between items-start border-b-2 border-slate-900 pb-5">
                <div>
                  <h2 className="text-xl font-black tracking-tight text-slate-900">
                    KUYUMPANEL MÜCEVHERAT & SARRAFİYE
                  </h2>
                  <p className="text-slate-600 text-[11px] mt-0.5">Kapalıçarşı Kuyumcular Cad. No: 12 Fatih / İSTANBUL</p>
                  <p className="text-slate-600 text-[11px]">Vergi Dairesi: Beyoğlu V.D. • VKN: 1234567890 • Tel: 0212 555 0000</p>
                </div>
                <div className="text-right">
                  <div className="inline-block px-3 py-1 border border-slate-900 font-extrabold uppercase tracking-wider text-sm bg-slate-50">
                    {INVOICE_DOCUMENT_LABELS[printInvoice.documentType as keyof typeof INVOICE_DOCUMENT_LABELS] || printInvoice.documentType}
                  </div>
                  <div className="mt-2 font-mono font-bold text-sm text-slate-900">
                    {printInvoice.invoiceNumber}
                  </div>
                  <div className="text-slate-500 text-[11px]">
                    Düzenleme Tarihi: {new Date(printInvoice.issueDate).toLocaleDateString('tr-TR')}
                  </div>
                </div>
              </div>

              {/* Alıcı Bilgileri */}
              <div className="grid grid-cols-2 gap-4 border border-slate-200 p-4 rounded-lg bg-slate-50">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">SAYIN / ALICI:</span>
                  <span className="font-bold text-sm text-slate-900 block mt-0.5">{printInvoice.customerName}</span>
                  <span className="text-slate-600 text-[11px] block mt-0.5">{printInvoice.customerAddress || 'İstanbul'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">VERGİ BİLGİLERİ:</span>
                  <span className="font-mono text-slate-900 block mt-0.5">TCKN / VKN: {printInvoice.customerTaxId || '11111111111'}</span>
                  <span className="text-slate-600 text-[11px] block">Vergi Dairesi: {printInvoice.customerTaxOffice || 'Büyük Mükellefler V.D.'}</span>
                </div>
              </div>

              {/* Kalemler Tablosu */}
              <table className="w-full text-left border-collapse border border-slate-300">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300 text-[10px] uppercase">
                    <th className="p-2 border border-slate-300">S.No</th>
                    <th className="p-2 border border-slate-300">Mal / Hizmet Cinsi</th>
                    <th className="p-2 border border-slate-300 text-center">Ayar</th>
                    <th className="p-2 border border-slate-300 text-right">Miktar (gr)</th>
                    <th className="p-2 border border-slate-300 text-right">Has Altın (gr)</th>
                    <th className="p-2 border border-slate-300 text-right">Külçe İstisna Bedeli</th>
                    <th className="p-2 border border-slate-300 text-right">İşçilik Matrahı</th>
                    <th className="p-2 border border-slate-300 text-right">KDV (%20)</th>
                    <th className="p-2 border border-slate-300 text-right">Tutar (TL)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
                  {printInvoice.items && printInvoice.items.map((it, idx) => (
                    <tr key={idx}>
                      <td className="p-2 border border-slate-300 text-center">{idx + 1}</td>
                      <td className="p-2 border border-slate-300 font-sans font-medium">{it.name}</td>
                      <td className="p-2 border border-slate-300 text-center">{it.carat}K</td>
                      <td className="p-2 border border-slate-300 text-right">{it.weight.toFixed(2)}</td>
                      <td className="p-2 border border-slate-300 text-right">{it.pureGoldWeight.toFixed(3)}</td>
                      <td className="p-2 border border-slate-300 text-right">{it.goldCost.toLocaleString('tr-TR')} ₺</td>
                      <td className="p-2 border border-slate-300 text-right">{it.laborAmount.toLocaleString('tr-TR')} ₺</td>
                      <td className="p-2 border border-slate-300 text-right">{it.kdvAmount.toLocaleString('tr-TR')} ₺</td>
                      <td className="p-2 border border-slate-300 text-right font-bold">{it.total.toLocaleString('tr-TR')} ₺</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Alt Vergi & Toplam Özeti */}
              <div className="flex justify-between items-start pt-2">
                <div className="w-1/2 p-3 border border-slate-200 rounded text-[11px] bg-slate-50 leading-relaxed text-slate-700">
                  <strong className="block text-slate-900 mb-1 font-bold">MEŞRUAT / VERGİ İSTİSNASI ŞERHİ:</strong>
                  {printInvoice.note || INVOICE_DEFAULTS.NOTE_23E}
                </div>

                <div className="w-2/5 font-mono text-xs space-y-1.5">
                  <div className="flex justify-between text-slate-600">
                    <span>Toplam Has Altın:</span>
                    <span className="font-bold">{printInvoice.totalPureGoldWeight.toFixed(3)} gr</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Külçe Bedeli (KDV İstisnası):</span>
                    <span>{printInvoice.totalGoldAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>İşçilik Matrahı:</span>
                    <span>{printInvoice.totalLaborAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Hesaplanan KDV (%20):</span>
                    <span>{printInvoice.totalKdvAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</span>
                  </div>
                  <div className="flex justify-between font-black text-sm text-slate-950 border-t-2 border-slate-900 pt-1.5">
                    <span>GENEL TOPLAM:</span>
                    <span>{printInvoice.grandTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</span>
                  </div>
                </div>
              </div>

              {/* İmza & Kaşe Alanı */}
              <div className="grid grid-cols-2 pt-10 text-center text-xs">
                <div>
                  <p className="font-bold text-slate-800">Teslim Eden</p>
                  <p className="text-slate-400 text-[10px] mt-1">İmza / Kaşe</p>
                </div>
                <div>
                  <p className="font-bold text-slate-800">Teslim Alan</p>
                  <p className="text-slate-400 text-[10px] mt-1">İmza</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

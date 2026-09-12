'use client';

import React, { useState } from 'react';
import {
  Boxes,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Truck,
  PackageCheck,
  AlertTriangle,
  Printer,
  ChevronDown,
  ChevronUp,
  X,
  Trash2,
  Loader2,
  Calendar,
  Building2,
  Scale,
  FileSpreadsheet,
  AlertCircle,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import {
  PO_STATUS,
  PO_STATUS_LABELS,
  PurchaseOrderStatus,
  PRODUCT_CATEGORIES,
  PO_DEFAULTS,
} from '@/constants/purchase';
import {
  getCaratMilyem,
  calculateHasEquivalent,
  calculateWeightVariance,
} from '@/lib/purchase/variance-calculator';
import { THEME } from '@/constants/theme';
import PageHeader from '@/components/PageHeader';
import LuxuryTabs from '@/components/LuxuryTabs';
import StatCard from '@/components/StatCard';
import ReceiptPrintModal from './ReceiptPrintModal';

interface Supplier {
  id: string;
  name: string;
  phone?: string | null;
  hasBalance: number;
  tlBalance: number;
}

interface Branch {
  id: string;
  name: string;
  code: string;
  isDefault: boolean;
}

interface PurchaseOrderLine {
  id: string;
  productCategory: string;
  description: string;
  carat: number;
  orderedWeight: number;
  orderedQuantity: number;
  laborCostPerGram: number;
  laborCurrency: string;
  receivedWeight: number;
  receivedQuantity: number;
  status: string;
  notes?: string | null;
}

interface PurchaseOrder {
  id: string;
  orderNumber: string;
  supplierId: string;
  branchId?: string | null;
  orderDate: string;
  expectedDeliveryDate?: string | null;
  status: string;
  totalEstimatedWeight: number;
  totalEstimatedHas: number;
  totalEstimatedTl: number;
  notes?: string | null;
  createdBy?: string | null;
  supplier: Supplier;
  branch?: Branch | null;
  lines: PurchaseOrderLine[];
  receipts?: { id: string; receiptNumber: string; totalActualWeight: number }[];
}

interface GoodsReceiptLine {
  id: string;
  description: string;
  barcode?: string | null;
  carat: number;
  milyem: number;
  actualWeight: number;
  quantity: number;
  laborCostPerGram: number;
  laborCostTl: number;
  hasEquivalent: number;
  weightVariance?: number | null;
  costVarianceNote?: string | null;
}

interface GoodsReceipt {
  id: string;
  receiptNumber: string;
  supplierId: string;
  purchaseOrderId?: string | null;
  branchId?: string | null;
  receiptDate: string;
  invoiceNumber?: string | null;
  receivedBy: string;
  totalActualWeight: number;
  totalHasEquivalent: number;
  totalLaborCostTl: number;
  notes?: string | null;
  supplier: Supplier;
  branch?: Branch | null;
  purchaseOrder?: { id: string; orderNumber: string; orderDate: string; status: string } | null;
  lines: GoodsReceiptLine[];
}

interface PurchasesClientProps {
  initialOrders: PurchaseOrder[];
  initialReceipts: GoodsReceipt[];
  suppliers: Supplier[];
  branches: Branch[];
  defaultBranchId?: string;
  currentUserRole: string;
}

export default function PurchasesClient({
  initialOrders,
  initialReceipts,
  suppliers,
  branches,
  defaultBranchId,
}: PurchasesClientProps) {
  const [orders, setOrders] = useState<PurchaseOrder[]>(initialOrders);
  const [receipts, setReceipts] = useState<GoodsReceipt[]>(initialReceipts);
  const [activeMainTab, setActiveMainTab] = useState<'ORDERS' | 'RECEIPTS'>('ORDERS');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [printReceipt, setPrintReceipt] = useState<GoodsReceipt | null>(null);

  // Modallar
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Yeni Sipariş Formu State
  const [orderSupplierId, setOrderSupplierId] = useState(suppliers[0]?.id || '');
  const [orderBranchId, setOrderBranchId] = useState(defaultBranchId || branches[0]?.id || '');
  const [expectedDate, setExpectedDate] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [orderLines, setOrderLines] = useState<
    {
      productCategory: string;
      description: string;
      carat: number;
      orderedWeight: number;
      orderedQuantity: number;
      laborCostPerGram: number;
      laborCurrency: string;
    }[]
  >([
    {
      productCategory: 'BILEZIK',
      description: '22K Şarnel Bilezik',
      carat: 22,
      orderedWeight: 100,
      orderedQuantity: 5,
      laborCostPerGram: 35,
      laborCurrency: 'TL',
    },
  ]);

  // Mal Kabul Formu State
  const [receiptSupplierId, setReceiptSupplierId] = useState(suppliers[0]?.id || '');
  const [receiptPoId, setReceiptPoId] = useState<string>('');
  const [receiptBranchId, setReceiptBranchId] = useState(defaultBranchId || branches[0]?.id || '');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [receiptNotes, setReceiptNotes] = useState('');
  const [receiptLines, setReceiptLines] = useState<
    {
      purchaseOrderLineId?: string;
      description: string;
      barcode?: string;
      carat: number;
      milyem: number;
      actualWeight: number;
      orderedWeight?: number;
      quantity: number;
      laborCostPerGram: number;
    }[]
  >([]);

  // Filtrelenmiş Siparişler
  const filteredOrders = orders.filter((o) => {
    const q = searchQuery.toLowerCase();
    const matchesNum = o.orderNumber.toLowerCase().includes(q);
    const matchesSup = o.supplier.name.toLowerCase().includes(q);
    const matchesLine = o.lines.some((l) => l.description.toLowerCase().includes(q));
    return matchesNum || matchesSup || matchesLine;
  });

  // Filtrelenmiş Mal Kabuller
  const filteredReceipts = receipts.filter((r) => {
    const q = searchQuery.toLowerCase();
    const matchesNum = r.receiptNumber.toLowerCase().includes(q);
    const matchesSup = r.supplier.name.toLowerCase().includes(q);
    const matchesInv = r.invoiceNumber ? r.invoiceNumber.toLowerCase().includes(q) : false;
    return matchesNum || matchesSup || matchesInv;
  });

  // Sipariş Kalemi Ekleme / Çıkarma
  const handleAddOrderLine = () => {
    setOrderLines((prev) => [
      ...prev,
      {
        productCategory: 'BILEZIK',
        description: 'Yeni Takı Grubu',
        carat: 14,
        orderedWeight: 50,
        orderedQuantity: 1,
        laborCostPerGram: 25,
        laborCurrency: 'TL',
      },
    ]);
  };

  const handleRemoveOrderLine = (idx: number) => {
    setOrderLines((prev) => prev.filter((_, i) => i !== idx));
  };

  // Yeni Sipariş Kaydet
  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      if (!orderSupplierId) throw new Error('Lütfen tedarikçi seçiniz.');
      if (orderLines.length === 0) throw new Error('En az bir sipariş kalemi ekleyiniz.');

      const res = await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierId: orderSupplierId,
          branchId: orderBranchId,
          expectedDeliveryDate: expectedDate || null,
          notes: orderNotes,
          lines: orderLines,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Sipariş oluşturulamadı.');

      setOrders((prev) => [data.order, ...prev]);
      setIsOrderModalOpen(false);
      setSuccessMessage(`${data.order.orderNumber} tedarik siparişi oluşturuldu.`);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Sipariş Seçildiğinde Mal Kabul Kalemlerini Doldur
  const handleSelectPoForReceipt = (poId: string) => {
    setReceiptPoId(poId);
    if (!poId) {
      setReceiptLines([]);
      return;
    }

    const selectedPo = orders.find((o) => o.id === poId);
    if (selectedPo) {
      setReceiptSupplierId(selectedPo.supplierId);
      if (selectedPo.branchId) setReceiptBranchId(selectedPo.branchId);

      const linesToReceive = selectedPo.lines.map((l) => {
        const remainingWeight = Math.max(0, l.orderedWeight - l.receivedWeight);
        const remainingQty = Math.max(1, l.orderedQuantity - l.receivedQuantity);
        return {
          purchaseOrderLineId: l.id,
          description: l.description,
          carat: l.carat,
          milyem: getCaratMilyem(l.carat),
          actualWeight: remainingWeight > 0 ? remainingWeight : l.orderedWeight,
          orderedWeight: l.orderedWeight,
          quantity: remainingQty,
          laborCostPerGram: l.laborCostPerGram,
        };
      });

      setReceiptLines(linesToReceive);
    }
  };

  // Mal Kabul Kalemi Ekleme (Bağımsız Mal Kabul İçin)
  const handleAddReceiptLine = () => {
    setReceiptLines((prev) => [
      ...prev,
      {
        description: 'Yeni Mal Kabul Kalemi',
        carat: 14,
        milyem: 585,
        actualWeight: 20,
        quantity: 1,
        laborCostPerGram: 0,
      },
    ]);
  };

  // Mal Kabul Kaydet
  const handleCreateReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      if (!receiptSupplierId) throw new Error('Lütfen tedarikçi seçiniz.');
      if (receiptLines.length === 0) throw new Error('En az bir mal kabul kalemi ekleyiniz.');

      const res = await fetch('/api/purchases/receipts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierId: receiptSupplierId,
          purchaseOrderId: receiptPoId || null,
          branchId: receiptBranchId,
          invoiceNumber,
          notes: receiptNotes,
          lines: receiptLines,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Mal kabul işlemi başarısız.');

      setReceipts((prev) => [data.receipt, ...prev]);

      // Bağlı sipariş varsa güncelle
      if (receiptPoId) {
        setOrders((prev) =>
          prev.map((o) => {
            if (o.id === receiptPoId) {
              return {
                ...o,
                status: PO_STATUS.RECEIVED,
              };
            }
            return o;
          })
        );
      }

      setIsReceiptModalOpen(false);
      setSuccessMessage(`${data.receipt.receiptNumber} nolu mal kabul gerçekleştirildi ve toptancı carisine Has borcu işlendi.`);
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Sipariş Silme
  const handleDeleteOrder = async (order: PurchaseOrder) => {
    if (!confirm(`${order.orderNumber} nolu siparişi silmek istediğinize emin misiniz?`)) return;

    try {
      setIsLoading(true);
      const res = await fetch(`/api/purchases/${order.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Silinemedi.');

      setOrders((prev) => prev.filter((o) => o.id !== order.id));
      setSuccessMessage('Sipariş başarıyla silindi.');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // KPI Hesaplamaları
  const pendingOrdersCount = orders.filter(
    (o) => o.status === PO_STATUS.ORDERED || o.status === PO_STATUS.PARTIALLY_RECEIVED
  ).length;
  const totalPendingWeight = orders
    .filter((o) => o.status === PO_STATUS.ORDERED)
    .reduce((acc, o) => acc + o.totalEstimatedWeight, 0);
  const totalReceiptWeight = receipts.reduce((acc, r) => acc + r.totalActualWeight, 0);
  const totalReceiptHas = receipts.reduce((acc, r) => acc + r.totalHasEquivalent, 0);

  return (
    <div className="space-y-6">
      {/* Üst Başlık & Aksiyonlar (Luxury Jewelry Design System) */}
      <PageHeader
        icon={<Boxes className="w-6 h-6 text-amber-500 animate-pulse" />}
        title="Tedarik Siparişi & Mal Kabul"
        subtitle="Toptancı siparişleri, terazi tartımlı mal kabul, Has ve maliyet farkı mutabakatı"
        badges={[
          { label: `${pendingOrdersCount} Açık Sipariş`, variant: 'gold' },
          { label: 'Terazi & Has Mutabakatı Aktif', variant: 'success' },
        ]}
        actions={
          <div className="flex items-center gap-2.5 flex-wrap w-full sm:w-auto">
            <button
              onClick={() => {
                setIsReceiptModalOpen(true);
                setErrorMessage(null);
                setReceiptPoId('');
                setReceiptLines([]);
              }}
              className={THEME.BTN_SECONDARY}
            >
              <Scale className="w-4 h-4 text-amber-500 mr-2" />
              Mal Kabul Girişi
            </button>
            <button
              onClick={() => {
                setIsOrderModalOpen(true);
                setErrorMessage(null);
              }}
              className={THEME.BTN_PRIMARY}
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Yeni Tedarik Siparişi
            </button>
          </div>
        }
      />

      {/* Başarı Bildirimi */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs sm:text-sm font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-500" />
          {successMessage}
        </div>
      )}

      {/* 2'Lİ ANA TAB SEÇİCİ & ARAMA ÇUBUĞU */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <LuxuryTabs
          tabs={[
            { id: 'ORDERS', label: '1. Tedarik Siparişleri', icon: <Boxes className="w-4 h-4" />, count: orders.length },
            { id: 'RECEIPTS', label: '2. Terazi Mal Kabul & Mutabakat', icon: <PackageCheck className="w-4 h-4" />, count: receipts.length },
          ]}
          activeTab={activeMainTab}
          onChange={(tab) => setActiveMainTab(tab as 'ORDERS' | 'RECEIPTS')}
        />

        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="No, toptancı veya ürün ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`${THEME.INPUT} pl-10`}
          />
        </div>
      </div>

      {/* KPI İstatistik Kartları */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          label="Açık Siparişler"
          value={pendingOrdersCount}
          subtitle="Teslimat bekleyen sipariş"
          icon={<Clock className="w-5 h-5 text-amber-500" />}
        />
        <StatCard
          label="Bekleyen Gramaj"
          value={`${totalPendingWeight.toFixed(1)} gr`}
          subtitle="Yoldaki tahmini altın"
          icon={<Truck className="w-5 h-5 text-blue-500" />}
        />
        <StatCard
          label="Kabul Edilen Toplam"
          value={`${totalReceiptWeight.toFixed(1)} gr`}
          subtitle={`${receipts.length} mal kabul makbuzu`}
          icon={<PackageCheck className="w-5 h-5 text-emerald-500" />}
        />
        <StatCard
          label="Cari Has Borçlanması"
          value={`${totalReceiptHas.toFixed(2)} Has`}
          subtitle="Toptancıya işlenen saf altın"
          icon={<Scale className="w-5 h-5 text-purple-500" />}
        />
      </div>

      {/* 1. SEKMELİ GÖRÜNÜM: Tedarik Siparişleri */}
      {activeMainTab === 'ORDERS' && (
        <div className={THEME.TABLE.WRAPPER}>
          <table className={THEME.TABLE.MAIN}>
            <thead className={THEME.TABLE.THEAD}>
              <tr>
                <th className={THEME.TABLE.TH}>Sipariş No</th>
                <th className={THEME.TABLE.TH}>Toptancı (Tedarikçi)</th>
                <th className={THEME.TABLE.TH}>Şube</th>
                <th className={`${THEME.TABLE.TH} text-center`}>Kalem</th>
                <th className={`${THEME.TABLE.TH} text-right`}>Tahmini Gramaj</th>
                <th className={`${THEME.TABLE.TH} text-right`}>Tahmini Has</th>
                <th className={THEME.TABLE.TH}>Durum</th>
                <th className={THEME.TABLE.TH}>Teslimat Tarihi</th>
                <th className={`${THEME.TABLE.TH} text-right`}>İşlemler</th>
              </tr>
            </thead>
            <tbody className={THEME.TABLE.TBODY}>
              {filteredOrders.map((order) => {
                const isExpanded = expandedId === order.id;
                const statusMeta =
                  PO_STATUS_LABELS[order.status as PurchaseOrderStatus] || {
                    label: order.status,
                    color: 'text-slate-500',
                    bg: 'bg-slate-500/10',
                  };

                return (
                  <React.Fragment key={order.id}>
                    <tr className={THEME.TABLE.TR}>
                      <td className={`${THEME.TABLE.TD} font-mono font-bold text-slate-900 dark:text-white`}>
                        {order.orderNumber}
                      </td>
                      <td className={`${THEME.TABLE.TD} font-bold text-slate-800 dark:text-slate-200`}>
                        {order.supplier.name}
                      </td>
                      <td className={`${THEME.TABLE.TD} text-slate-600 dark:text-slate-300`}>
                        {order.branch ? order.branch.name : 'Merkez'}
                      </td>
                      <td className={`${THEME.TABLE.TD} text-center font-medium text-slate-700 dark:text-slate-300`}>
                        {order.lines.length} Kalem
                      </td>
                      <td className={`${THEME.TABLE.TD} text-right font-mono font-bold text-slate-900 dark:text-white`}>
                        {order.totalEstimatedWeight.toFixed(2)} gr
                      </td>
                      <td className={`${THEME.TABLE.TD} text-right font-mono font-black text-amber-600 dark:text-amber-400`}>
                        {order.totalEstimatedHas.toFixed(3)} Has
                      </td>
                      <td className={THEME.TABLE.TD}>
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold border border-current/20 ${statusMeta.color} ${statusMeta.bg}`}
                        >
                          {statusMeta.label}
                        </span>
                      </td>
                      <td className={`${THEME.TABLE.TD} text-slate-500 dark:text-slate-400 font-mono`}>
                        {order.expectedDeliveryDate
                          ? new Date(order.expectedDeliveryDate).toLocaleDateString('tr-TR')
                          : 'Belirtilmedi'}
                      </td>
                      <td className={`${THEME.TABLE.TD} text-right`}>
                        <div className="flex items-center justify-end gap-1.5">
                          {order.status !== PO_STATUS.RECEIVED && (
                            <button
                              onClick={() => {
                                handleSelectPoForReceipt(order.id);
                                setIsReceiptModalOpen(true);
                              }}
                              className="px-3 py-2 rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500 hover:text-white font-bold transition-all flex items-center gap-1.5 min-h-[44px]"
                              title="Bu Siparişi Mal Kabul Et"
                            >
                              <Scale className="w-4 h-4" />
                              Mal Kabul
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteOrder(order)}
                            className="p-2.5 rounded-xl text-rose-500 hover:bg-rose-500/10 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                            title="Siparişi Sil"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : order.id)}
                            className="p-2.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Genişletilmiş Kalem Detayı */}
                    {isExpanded && (
                      <tr className="bg-slate-50/80 dark:bg-slate-950/60 border-t border-slate-200 dark:border-slate-800">
                        <td colSpan={9} className="p-4 sm:p-5">
                          <div className="space-y-3">
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              <strong className="text-slate-700 dark:text-slate-300">Sipariş Oluşturan:</strong> {order.createdBy || 'Yetkili'}
                              {order.notes && (
                                <span className="ml-4">
                                  <strong className="text-slate-700 dark:text-slate-300">Not:</strong> {order.notes}
                                </span>
                              )}
                            </div>
                            <div className="border border-slate-200 dark:border-amber-500/15 rounded-xl overflow-hidden shadow-xs">
                              <table className="w-full text-left text-xs">
                                <thead className="bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-amber-400/90 font-bold uppercase text-[10px]">
                                  <tr>
                                    <th className="py-2.5 px-3">Kategori</th>
                                    <th className="py-2.5 px-3">Tanım</th>
                                    <th className="py-2.5 px-3 text-center">Ayar</th>
                                    <th className="py-2.5 px-3 text-right">Sipariş Gram</th>
                                    <th className="py-2.5 px-3 text-right">Gelen Gram</th>
                                    <th className="py-2.5 px-3 text-right">İşçilik / Gr</th>
                                    <th className="py-2.5 px-3 text-center">Durum</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900/50">
                                  {order.lines.map((l) => (
                                    <tr key={l.id} className="hover:bg-amber-500/[0.03]">
                                      <td className="py-2 px-3 font-semibold text-slate-700 dark:text-slate-300">
                                        {PRODUCT_CATEGORIES[l.productCategory as keyof typeof PRODUCT_CATEGORIES] || l.productCategory}
                                      </td>
                                      <td className="py-2 px-3 text-slate-800 dark:text-slate-200">{l.description}</td>
                                      <td className="py-2 px-3 text-center font-bold text-amber-600">{l.carat}K</td>
                                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                                        {l.orderedWeight.toFixed(2)} gr
                                      </td>
                                      <td className="py-2 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                                        {l.receivedWeight.toFixed(2)} gr
                                      </td>
                                      <td className="py-2 px-3 text-right font-mono text-slate-700 dark:text-slate-300">
                                        {l.laborCostPerGram > 0 ? `${l.laborCostPerGram} ${l.laborCurrency}` : '-'}
                                      </td>
                                      <td className="py-2 px-3 text-center">
                                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                          {l.status}
                                        </span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}

              {filteredOrders.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-slate-400">
                    <Boxes className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700 mb-3 animate-pulse" />
                    <p className="text-base font-bold text-slate-700 dark:text-slate-300">Tedarik siparişi bulunamadı.</p>
                    <p className="text-xs text-slate-500 mt-1">Yeni bir tedarik siparişi oluşturabilirsiniz.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* 2. SEKMELİ GÖRÜNÜM: Mal Kabul Makbuzları */}
      {activeMainTab === 'RECEIPTS' && (
        <div className={THEME.TABLE.WRAPPER}>
          <table className={THEME.TABLE.MAIN}>
            <thead className={THEME.TABLE.THEAD}>
              <tr>
                <th className={THEME.TABLE.TH}>Makbuz No</th>
                <th className={THEME.TABLE.TH}>Toptancı (Tedarikçi)</th>
                <th className={THEME.TABLE.TH}>İrsaliye / Fatura No</th>
                <th className={THEME.TABLE.TH}>Kabul Şubesi</th>
                <th className={`${THEME.TABLE.TH} text-center`}>Kalem / Adet</th>
                <th className={`${THEME.TABLE.TH} text-right`}>Fiili Gramaj</th>
                <th className={`${THEME.TABLE.TH} text-right`}>Has Altın Karşılığı</th>
                <th className={`${THEME.TABLE.TH} text-right`}>İşçilik Tutarı</th>
                <th className={THEME.TABLE.TH}>Tarih</th>
                <th className={`${THEME.TABLE.TH} text-right`}>İşlemler</th>
              </tr>
            </thead>
            <tbody className={THEME.TABLE.TBODY}>
              {filteredReceipts.map((rec) => {
                const isExpanded = expandedId === rec.id;
                const totalQty = rec.lines.reduce((acc, l) => acc + (l.quantity || 1), 0);

                return (
                  <React.Fragment key={rec.id}>
                    <tr className={THEME.TABLE.TR}>
                      <td className={`${THEME.TABLE.TD} font-mono font-bold text-slate-900 dark:text-white`}>
                        {rec.receiptNumber}
                      </td>
                      <td className={`${THEME.TABLE.TD} font-bold text-slate-800 dark:text-slate-200`}>
                        {rec.supplier.name}
                      </td>
                      <td className={`${THEME.TABLE.TD} font-mono text-slate-600 dark:text-slate-300`}>
                        {rec.invoiceNumber || '-'}
                      </td>
                      <td className={`${THEME.TABLE.TD} text-slate-600 dark:text-slate-300`}>
                        {rec.branch ? rec.branch.name : 'Merkez'}
                      </td>
                      <td className={`${THEME.TABLE.TD} text-center font-medium text-slate-700 dark:text-slate-300`}>
                        {rec.lines.length} Kalem / {totalQty} Adet
                      </td>
                      <td className={`${THEME.TABLE.TD} text-right font-mono font-bold text-slate-900 dark:text-white`}>
                        {rec.totalActualWeight.toFixed(2)} gr
                      </td>
                      <td className={`${THEME.TABLE.TD} text-right font-mono font-black text-amber-600 dark:text-amber-400`}>
                        {rec.totalHasEquivalent.toFixed(3)} Has
                      </td>
                      <td className={`${THEME.TABLE.TD} text-right font-mono text-slate-800 dark:text-slate-200`}>
                        {rec.totalLaborCostTl > 0 ? `${rec.totalLaborCostTl.toLocaleString('tr-TR')} ₺` : '-'}
                      </td>
                      <td className={`${THEME.TABLE.TD} text-slate-500 dark:text-slate-400 font-mono`}>
                        {new Date(rec.receiptDate).toLocaleDateString('tr-TR')}
                      </td>
                      <td className={`${THEME.TABLE.TD} text-right`}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setPrintReceipt(rec)}
                            className="p-2.5 rounded-xl text-slate-500 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-500/10 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                            title="Mal Kabul Makbuzu Yazdır"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : rec.id)}
                            className="p-2.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Genişletilmiş Mal Kabul Kalemleri */}
                    {isExpanded && (
                      <tr className="bg-slate-50/80 dark:bg-slate-950/60 border-t border-slate-200 dark:border-slate-800">
                        <td colSpan={10} className="p-4 sm:p-5">
                          <div className="space-y-3">
                            <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between flex-wrap gap-2">
                              <div>
                                <strong className="text-slate-700 dark:text-slate-300">Kabul Eden:</strong> {rec.receivedBy}
                                {rec.purchaseOrder && (
                                  <span className="ml-4 font-mono text-amber-700 dark:text-amber-400 font-bold">
                                    Bağlı Sipariş: {rec.purchaseOrder.orderNumber}
                                  </span>
                                )}
                              </div>
                              {rec.notes && <div><strong className="text-slate-700 dark:text-slate-300">Not:</strong> {rec.notes}</div>}
                            </div>
                            <div className="border border-slate-200 dark:border-amber-500/15 rounded-xl overflow-hidden shadow-xs">
                              <table className="w-full text-left text-xs">
                                <thead className="bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-amber-400/90 font-bold uppercase text-[10px]">
                                  <tr>
                                    <th className="py-2.5 px-3">Tanım</th>
                                    <th className="py-2.5 px-3 font-mono">Barkod</th>
                                    <th className="py-2.5 px-3 text-center">Ayar / Milyem</th>
                                    <th className="py-2.5 px-3 text-right">Fiili Gramaj</th>
                                    <th className="py-2.5 px-3 text-right">Has Karşılığı</th>
                                    <th className="py-2.5 px-3 text-right">İşçilik (TL)</th>
                                    <th className="py-2.5 px-3">Fark Notu</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900/50">
                                  {rec.lines.map((l) => (
                                    <tr key={l.id} className="hover:bg-amber-500/[0.03]">
                                      <td className="py-2 px-3 font-medium text-slate-800 dark:text-slate-200">
                                        {l.description}
                                      </td>
                                      <td className="py-2 px-3 font-mono text-slate-500">{l.barcode || '-'}</td>
                                      <td className="py-2 px-3 text-center text-slate-600 dark:text-slate-300 font-bold">{l.carat}K ({l.milyem})</td>
                                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                                        {l.actualWeight.toFixed(2)} gr
                                      </td>
                                      <td className="py-2 px-3 text-right font-mono font-black text-amber-600 dark:text-amber-400">
                                        {l.hasEquivalent.toFixed(3)} Has
                                      </td>
                                      <td className="py-2 px-3 text-right font-mono text-slate-800 dark:text-slate-200">
                                        {l.laborCostTl > 0 ? `${l.laborCostTl.toLocaleString('tr-TR')} ₺` : '-'}
                                      </td>
                                      <td className="py-2 px-3 text-xs text-amber-700 dark:text-amber-400 font-medium">
                                        {l.costVarianceNote || '-'}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}

              {filteredReceipts.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-16 text-center text-slate-400">
                    <Scale className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700 mb-3 animate-pulse" />
                    <p className="text-base font-bold text-slate-700 dark:text-slate-300">Mal kabul kaydı bulunamadı.</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Tedarikçiden gelen ürünlerin terazi tartımı ile mal kabulünü yapabilirsiniz.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Yeni Tedarik Siparişi Modalı */}
      {isOrderModalOpen && (
        <div className={THEME.MODAL.BACKDROP}>
          <div className={`${THEME.MODAL.CONTAINER} max-w-2xl`}>
            <div className={THEME.MODAL.HEADER}>
              <h2 className={THEME.MODAL.TITLE}>
                <Boxes className="w-5 h-5 text-amber-500" />
                Yeni Tedarik Siparişi Oluştur
              </h2>
              <button
                type="button"
                onClick={() => setIsOrderModalOpen(false)}
                className={THEME.MODAL.CLOSE_BTN}
                aria-label="Kapat"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="flex flex-col flex-1 overflow-hidden">
              <div className={THEME.MODAL.BODY}>
                {errorMessage && (
                  <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-500" />
                    {errorMessage}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={THEME.LABEL}>
                      Tedarikçi (Toptancı) *
                    </label>
                    <select
                      value={orderSupplierId}
                      onChange={(e) => setOrderSupplierId(e.target.value)}
                      className={THEME.SELECT}
                    >
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} (Bakiye: {s.hasBalance.toFixed(2)} Has)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className={THEME.LABEL}>
                      Teslim Alınacak Şube
                    </label>
                    <select
                      value={orderBranchId}
                      onChange={(e) => setOrderBranchId(e.target.value)}
                      className={THEME.SELECT}
                    >
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name} ({b.code})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className={THEME.LABEL}>
                    Beklenen Teslimat Tarihi
                  </label>
                  <input
                    type="date"
                    value={expectedDate}
                    onChange={(e) => setExpectedDate(e.target.value)}
                    className={THEME.INPUT}
                  />
                </div>

                {/* Sipariş Kalemleri */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Sipariş Kalemleri ({orderLines.length})
                    </span>
                    <button
                      type="button"
                      onClick={handleAddOrderLine}
                      className="text-xs font-black text-amber-600 dark:text-amber-400 hover:text-amber-500 flex items-center gap-1 min-h-[44px] px-2"
                    >
                      <Plus className="w-4 h-4" /> Kalem Ekle
                    </button>
                  </div>

                  <div className="space-y-3">
                    {orderLines.map((line, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-amber-500/15 grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center"
                      >
                        <div className="sm:col-span-3">
                          <select
                            value={line.productCategory}
                            onChange={(e) => {
                              const val = e.target.value;
                              setOrderLines((prev) =>
                                prev.map((l, i) => (i === idx ? { ...l, productCategory: val } : l))
                              );
                            }}
                            className={THEME.SELECT}
                          >
                            {Object.entries(PRODUCT_CATEGORIES).map(([k, v]) => (
                              <option key={k} value={k}>
                                {v}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="sm:col-span-3">
                          <input
                            type="text"
                            value={line.description}
                            placeholder="Ürün açıklaması"
                            onChange={(e) => {
                              const val = e.target.value;
                              setOrderLines((prev) =>
                                prev.map((l, i) => (i === idx ? { ...l, description: val } : l))
                              );
                            }}
                            className={THEME.INPUT}
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <select
                            value={line.carat}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setOrderLines((prev) =>
                                prev.map((l, i) => (i === idx ? { ...l, carat: val } : l))
                              );
                            }}
                            className={THEME.SELECT}
                          >
                            <option value={24}>24K</option>
                            <option value={22}>22K</option>
                            <option value={18}>18K</option>
                            <option value={14}>14K</option>
                            <option value={8}>8K</option>
                          </select>
                        </div>

                        <div className="sm:col-span-2">
                          <input
                            type="number"
                            step="0.1"
                            placeholder="Gram"
                            value={line.orderedWeight}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              setOrderLines((prev) =>
                                prev.map((l, i) => (i === idx ? { ...l, orderedWeight: val } : l))
                              );
                            }}
                            className={`${THEME.INPUT} text-right font-mono font-bold`}
                          />
                        </div>

                        <div className="sm:col-span-2 flex items-center justify-end gap-1.5">
                          <input
                            type="number"
                            step="1"
                            placeholder="İşçilik"
                            value={line.laborCostPerGram}
                            title="Gram başına işçilik bedeli"
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              setOrderLines((prev) =>
                                prev.map((l, i) => (i === idx ? { ...l, laborCostPerGram: val } : l))
                              );
                            }}
                            className={`${THEME.INPUT} text-right font-mono text-xs`}
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveOrderLine(idx)}
                            className="p-2 rounded-xl text-rose-500 hover:bg-rose-500/10 min-h-[44px] min-w-[44px] flex items-center justify-center flex-shrink-0"
                            aria-label="Kalemi Kaldır"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className={THEME.LABEL}>
                    Sipariş Notu
                  </label>
                  <textarea
                    rows={2}
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    placeholder="Örn: Hafta sonuna kadar vitrine yetiştirilecek..."
                    className={`${THEME.INPUT} min-h-[60px] resize-none`}
                  />
                </div>
              </div>

              <div className={THEME.MODAL.FOOTER}>
                <button
                  type="button"
                  onClick={() => setIsOrderModalOpen(false)}
                  disabled={isLoading}
                  className={THEME.BTN_SECONDARY}
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className={THEME.BTN_PRIMARY}
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
                  Siparişi Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mal Kabul Girişi Modalı */}
      {isReceiptModalOpen && (
        <div className={THEME.MODAL.BACKDROP}>
          <div className={`${THEME.MODAL.CONTAINER} max-w-3xl`}>
            <div className={THEME.MODAL.HEADER}>
              <h2 className={THEME.MODAL.TITLE}>
                <Scale className="w-5 h-5 text-amber-500" />
                Mal Kabul ve Terazi Tartım Girişi
              </h2>
              <button
                type="button"
                onClick={() => setIsReceiptModalOpen(false)}
                className={THEME.MODAL.CLOSE_BTN}
                aria-label="Kapat"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateReceipt} className="flex flex-col flex-1 overflow-hidden">
              <div className={THEME.MODAL.BODY}>
                {errorMessage && (
                  <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-500" />
                    {errorMessage}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className={THEME.LABEL}>
                      Bağlı Tedarik Siparişi (Opsiyonel)
                    </label>
                    <select
                      value={receiptPoId}
                      onChange={(e) => handleSelectPoForReceipt(e.target.value)}
                      className={THEME.SELECT}
                    >
                      <option value="">Bağımsız Doğrudan Mal Kabul</option>
                      {orders
                        .filter((o) => o.status !== PO_STATUS.RECEIVED)
                        .map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.orderNumber} ({o.supplier.name})
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className={THEME.LABEL}>
                      Tedarikçi (Toptancı) *
                    </label>
                    <select
                      value={receiptSupplierId}
                      onChange={(e) => setReceiptSupplierId(e.target.value)}
                      disabled={!!receiptPoId}
                      className={`${THEME.SELECT} disabled:opacity-60`}
                    >
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className={THEME.LABEL}>
                      Kabul Edilen Şube *
                    </label>
                    <select
                      value={receiptBranchId}
                      onChange={(e) => setReceiptBranchId(e.target.value)}
                      className={THEME.SELECT}
                    >
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name} ({b.code})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className={THEME.LABEL}>
                    Toptancının İrsaliye / Fatura No
                  </label>
                  <input
                    type="text"
                    placeholder="Örn: IRS-2026-98124"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className={THEME.INPUT}
                  />
                </div>

                {/* Mal Kabul Kalemleri */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Gelen Kalemler & Terazi Tartımı ({receiptLines.length})
                    </span>
                    {!receiptPoId && (
                      <button
                        type="button"
                        onClick={handleAddReceiptLine}
                        className="text-xs font-black text-amber-600 dark:text-amber-400 hover:text-amber-500 flex items-center gap-1 min-h-[44px] px-2"
                      >
                        <Plus className="w-4 h-4" /> Kalem Ekle
                      </button>
                    )}
                  </div>

                  <div className="space-y-3">
                    {receiptLines.map((line, idx) => {
                      const lineVariance = line.orderedWeight
                        ? calculateWeightVariance(line.orderedWeight, line.actualWeight)
                        : null;
                      const lineHas = calculateHasEquivalent(line.actualWeight, line.carat, line.milyem);

                      return (
                        <div
                          key={idx}
                          className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-amber-500/15 space-y-2"
                        >
                          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
                            <div className="sm:col-span-4">
                              <input
                                type="text"
                                value={line.description}
                                placeholder="Tanım / Model"
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setReceiptLines((prev) =>
                                    prev.map((l, i) => (i === idx ? { ...l, description: val } : l))
                                  );
                                }}
                                className={THEME.INPUT}
                              />
                            </div>

                            <div className="sm:col-span-2">
                              <select
                                value={line.carat}
                                onChange={(e) => {
                                  const c = Number(e.target.value);
                                  setReceiptLines((prev) =>
                                    prev.map((l, i) =>
                                      i === idx ? { ...l, carat: c, milyem: getCaratMilyem(c) } : l
                                    )
                                  );
                                }}
                                className={THEME.SELECT}
                              >
                                <option value={24}>24K (995)</option>
                                <option value={22}>22K (916)</option>
                                <option value={18}>18K (750)</option>
                                <option value={14}>14K (585)</option>
                                <option value={8}>8K (333)</option>
                              </select>
                            </div>

                            <div className="sm:col-span-3">
                              <div className="relative">
                                <input
                                  type="number"
                                  step="0.01"
                                  placeholder="Fiili Gram"
                                  value={line.actualWeight}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value) || 0;
                                    setReceiptLines((prev) =>
                                      prev.map((l, i) => (i === idx ? { ...l, actualWeight: val } : l))
                                    );
                                  }}
                                  className={`${THEME.INPUT} pr-8 text-right font-mono font-black text-amber-600 dark:text-amber-400`}
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-mono pointer-events-none">gr</span>
                              </div>
                            </div>

                            <div className="sm:col-span-2">
                              <input
                                type="number"
                                step="0.5"
                                placeholder="İşçilik TL/gr"
                                value={line.laborCostPerGram}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0;
                                  setReceiptLines((prev) =>
                                    prev.map((l, i) => (i === idx ? { ...l, laborCostPerGram: val } : l))
                                  );
                                }}
                                className={`${THEME.INPUT} text-right font-mono text-xs`}
                              />
                            </div>

                            <div className="sm:col-span-1 text-right">
                              <button
                                type="button"
                                onClick={() => setReceiptLines((prev) => prev.filter((_, i) => i !== idx))}
                                className="p-2 rounded-xl text-rose-500 hover:bg-rose-500/10 min-h-[44px] min-w-[44px] flex items-center justify-center"
                                aria-label="Kalemi Sil"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {/* Canlı Fark ve Has Hesaplama Göstergesi */}
                          <div className="flex items-center justify-between text-[11px] pt-2 border-t border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 flex-wrap gap-2">
                            <div className="flex items-center gap-3">
                              <span className="font-mono font-black text-amber-600 dark:text-amber-400">
                                Has Karşılığı: {lineHas.toFixed(3)} Has
                              </span>
                              {line.laborCostPerGram > 0 && (
                                <span className="font-mono text-slate-600 dark:text-slate-300">
                                  Toplam İşçilik: {(line.actualWeight * line.laborCostPerGram).toLocaleString('tr-TR')} ₺
                                </span>
                              )}
                            </div>
                            {lineVariance && (
                              <div className="flex items-center gap-1 font-bold">
                                {lineVariance.isExcess ? (
                                  <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                    <TrendingUp className="w-3.5 h-3.5" />
                                    {lineVariance.statusText}
                                  </span>
                                ) : (
                                  <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                    <TrendingDown className="w-3.5 h-3.5" />
                                    {lineVariance.statusText}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className={THEME.LABEL}>
                    Mal Kabul Notu
                  </label>
                  <textarea
                    rows={2}
                    value={receiptNotes}
                    onChange={(e) => setReceiptNotes(e.target.value)}
                    placeholder="Kabul ile ilgili ek gözlemler veya fatura notu..."
                    className={`${THEME.INPUT} min-h-[60px] resize-none`}
                  />
                </div>
              </div>

              <div className={THEME.MODAL.FOOTER}>
                <button
                  type="button"
                  onClick={() => setIsReceiptModalOpen(false)}
                  disabled={isLoading}
                  className={THEME.BTN_SECONDARY}
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={isLoading || receiptLines.length === 0}
                  className={`${THEME.BTN_PRIMARY} bg-gradient-to-r from-emerald-600 to-teal-600 text-white`}
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
                  Mal Kabulü Tamamla ve Stoğa Ekle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Matbu Makbuz Yazdırma Modalı */}
      {printReceipt && (
        <ReceiptPrintModal
          receipt={printReceipt}
          onClose={() => setPrintReceipt(null)}
        />
      )}
    </div>
  );
}

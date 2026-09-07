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
      {/* Başlık ve Butonlar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Boxes className="w-7 h-7 text-amber-500" />
            Tedarik Siparişi & Mal Kabul
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Toptancı siparişleri, terazi tartımlı mal kabul, Has ve maliyet farkı mutabakatı
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setIsReceiptModalOpen(true);
              setErrorMessage(null);
              setReceiptPoId('');
              setReceiptLines([]);
            }}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-semibold text-xs transition-colors shadow-sm"
          >
            <Scale className="w-4 h-4 text-amber-400" />
            Mal Kabul Girişi
          </button>
          <button
            onClick={() => {
              setIsOrderModalOpen(true);
              setErrorMessage(null);
            }}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-zinc-950 font-semibold shadow-lg shadow-amber-500/20 transition-all text-xs"
          >
            <Plus className="w-4 h-4" />
            Yeni Tedarik Siparişi
          </button>
        </div>
      </div>

      {/* Başarı Bildirimi */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          {successMessage}
        </div>
      )}

      {/* KPI Kartları */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Açık Siparişler
            </span>
            <Clock className="w-5 h-5 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-2">{pendingOrdersCount}</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Teslimat bekleyen sipariş</p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Bekleyen Gramaj
            </span>
            <Truck className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-2">
            {totalPendingWeight.toFixed(1)} gr
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Yoldaki tahmini altın</p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Kabul Edilen Toplam
            </span>
            <PackageCheck className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-2">
            {totalReceiptWeight.toFixed(1)} gr
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            {receipts.length} mal kabul makbuzu
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Cari Has Borçlanması
            </span>
            <Boxes className="w-5 h-5 text-purple-500" />
          </div>
          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-2">
            {totalReceiptHas.toFixed(2)} Has
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Toptancıya işlenen saf altın</p>
        </div>
      </div>

      {/* Ana Sekmeler & Arama */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-800/60 w-fit">
          <button
            onClick={() => setActiveMainTab('ORDERS')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeMainTab === 'ORDERS'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            Tedarik Siparişleri ({orders.length})
          </button>
          <button
            onClick={() => setActiveMainTab('RECEIPTS')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeMainTab === 'RECEIPTS'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            Mal Kabul Makbuzları ({receipts.length})
          </button>
        </div>

        <div className="relative w-full md:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            placeholder="No, toptancı veya ürün ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
          />
        </div>
      </div>

      {/* 1. SEKMELİ GÖRÜNÜM: Tedarik Siparişleri */}
      {activeMainTab === 'ORDERS' && (
        <div className="overflow-hidden rounded-2xl bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/60 text-zinc-500 dark:text-zinc-400 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Sipariş No</th>
                  <th className="py-3 px-4">Toptancı (Tedarikçi)</th>
                  <th className="py-3 px-4">Şube</th>
                  <th className="py-3 px-4 text-center">Kalem</th>
                  <th className="py-3 px-4 text-right">Tahmini Gramaj</th>
                  <th className="py-3 px-4 text-right">Tahmini Has</th>
                  <th className="py-3 px-4">Durum</th>
                  <th className="py-3 px-4">Teslimat Tarihi</th>
                  <th className="py-3 px-4 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {filteredOrders.map((order) => {
                  const isExpanded = expandedId === order.id;
                  const statusMeta =
                    PO_STATUS_LABELS[order.status as PurchaseOrderStatus] || {
                      label: order.status,
                      color: 'text-zinc-500',
                      bg: 'bg-zinc-500/10',
                    };

                  return (
                    <React.Fragment key={order.id}>
                      <tr className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-zinc-900 dark:text-zinc-100">
                          {order.orderNumber}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-zinc-800 dark:text-zinc-200">
                          {order.supplier.name}
                        </td>
                        <td className="py-3.5 px-4 text-zinc-600 dark:text-zinc-300">
                          {order.branch ? order.branch.name : 'Merkez'}
                        </td>
                        <td className="py-3.5 px-4 text-center font-medium text-zinc-700 dark:text-zinc-300">
                          {order.lines.length} Kalem
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-zinc-900 dark:text-zinc-100">
                          {order.totalEstimatedWeight.toFixed(2)} gr
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-amber-600">
                          {order.totalEstimatedHas.toFixed(3)} Has
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold ${statusMeta.color} ${statusMeta.bg}`}
                          >
                            {statusMeta.label}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-zinc-500 dark:text-zinc-400">
                          {order.expectedDeliveryDate
                            ? new Date(order.expectedDeliveryDate).toLocaleDateString('tr-TR')
                            : 'Belirtilmedi'}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {order.status !== PO_STATUS.RECEIVED && (
                              <button
                                onClick={() => {
                                  handleSelectPoForReceipt(order.id);
                                  setIsReceiptModalOpen(true);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white font-semibold transition-colors flex items-center gap-1"
                                title="Bu Siparişi Mal Kabul Et"
                              >
                                <Scale className="w-3.5 h-3.5" />
                                Mal Kabul
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteOrder(order)}
                              className="p-1 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors"
                              title="Siparişi Sil"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setExpandedId(isExpanded ? null : order.id)}
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
                            >
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Genişletilmiş Kalem Detayı */}
                      {isExpanded && (
                        <tr className="bg-zinc-50/80 dark:bg-zinc-950/40">
                          <td colSpan={9} className="p-4">
                            <div className="space-y-3">
                              <div className="text-xs text-zinc-500 dark:text-zinc-400">
                                <strong>Sipariş Oluşturan:</strong> {order.createdBy || 'Yetkili'}
                                {order.notes && (
                                  <span className="ml-4">
                                    <strong>Not:</strong> {order.notes}
                                  </span>
                                )}
                              </div>
                              <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                                <table className="w-full text-left text-xs">
                                  <thead className="bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 font-semibold">
                                    <tr>
                                      <th className="py-2 px-3">Kategori</th>
                                      <th className="py-2 px-3">Tanım</th>
                                      <th className="py-2 px-3 text-center">Ayar</th>
                                      <th className="py-2 px-3 text-right">Sipariş Gram</th>
                                      <th className="py-2 px-3 text-right">Gelen Gram</th>
                                      <th className="py-2 px-3 text-right">İşçilik / Gr</th>
                                      <th className="py-2 px-3 text-center">Durum</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                                    {order.lines.map((l) => (
                                      <tr key={l.id}>
                                        <td className="py-2 px-3 font-semibold text-zinc-700 dark:text-zinc-300">
                                          {PRODUCT_CATEGORIES[l.productCategory as keyof typeof PRODUCT_CATEGORIES] || l.productCategory}
                                        </td>
                                        <td className="py-2 px-3 text-zinc-800 dark:text-zinc-200">{l.description}</td>
                                        <td className="py-2 px-3 text-center text-zinc-600">{l.carat}K</td>
                                        <td className="py-2 px-3 text-right font-mono font-bold text-zinc-900 dark:text-zinc-100">
                                          {l.orderedWeight.toFixed(2)} gr
                                        </td>
                                        <td className="py-2 px-3 text-right font-mono text-emerald-600 font-bold">
                                          {l.receivedWeight.toFixed(2)} gr
                                        </td>
                                        <td className="py-2 px-3 text-right font-mono text-zinc-700 dark:text-zinc-300">
                                          {l.laborCostPerGram > 0 ? `${l.laborCostPerGram} ${l.laborCurrency}` : '-'}
                                        </td>
                                        <td className="py-2 px-3 text-center">
                                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
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
                    <td colSpan={9} className="py-16 text-center text-zinc-400">
                      <Boxes className="w-12 h-12 mx-auto text-zinc-300 dark:text-zinc-700 mb-3" />
                      <p className="text-base font-semibold">Tedarik siparişi bulunamadı.</p>
                      <p className="text-xs text-zinc-500 mt-1">Yeni bir tedarik siparişi oluşturabilirsiniz.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. SEKMELİ GÖRÜNÜM: Mal Kabul Makbuzları */}
      {activeMainTab === 'RECEIPTS' && (
        <div className="overflow-hidden rounded-2xl bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/60 text-zinc-500 dark:text-zinc-400 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Makbuz No</th>
                  <th className="py-3 px-4">Toptancı (Tedarikçi)</th>
                  <th className="py-3 px-4">İrsaliye / Fatura No</th>
                  <th className="py-3 px-4">Kabul Şubesi</th>
                  <th className="py-3 px-4 text-center">Kalem / Adet</th>
                  <th className="py-3 px-4 text-right">Fiili Gramaj</th>
                  <th className="py-3 px-4 text-right">Has Altın Karşılığı</th>
                  <th className="py-3 px-4 text-right">İşçilik Tutarı</th>
                  <th className="py-3 px-4">Tarih</th>
                  <th className="py-3 px-4 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {filteredReceipts.map((rec) => {
                  const isExpanded = expandedId === rec.id;
                  const totalQty = rec.lines.reduce((acc, l) => acc + (l.quantity || 1), 0);

                  return (
                    <React.Fragment key={rec.id}>
                      <tr className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-zinc-900 dark:text-zinc-100">
                          {rec.receiptNumber}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-zinc-800 dark:text-zinc-200">
                          {rec.supplier.name}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-zinc-600 dark:text-zinc-300">
                          {rec.invoiceNumber || '-'}
                        </td>
                        <td className="py-3.5 px-4 text-zinc-600 dark:text-zinc-300">
                          {rec.branch ? rec.branch.name : 'Merkez'}
                        </td>
                        <td className="py-3.5 px-4 text-center font-medium text-zinc-700 dark:text-zinc-300">
                          {rec.lines.length} Kalem / {totalQty} Adet
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-zinc-900 dark:text-zinc-100">
                          {rec.totalActualWeight.toFixed(2)} gr
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-amber-600">
                          {rec.totalHasEquivalent.toFixed(3)} Has
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-zinc-800 dark:text-zinc-200">
                          {rec.totalLaborCostTl > 0 ? `${rec.totalLaborCostTl.toLocaleString('tr-TR')} ₺` : '-'}
                        </td>
                        <td className="py-3.5 px-4 text-zinc-500 dark:text-zinc-400">
                          {new Date(rec.receiptDate).toLocaleDateString('tr-TR')}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setPrintReceipt(rec)}
                              className="p-1.5 rounded-lg text-zinc-500 hover:text-amber-500 hover:bg-amber-500/10 transition-colors"
                              title="Mal Kabul Makbuzu Yazdır"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setExpandedId(isExpanded ? null : rec.id)}
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
                            >
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Genişletilmiş Mal Kabul Kalemleri */}
                      {isExpanded && (
                        <tr className="bg-zinc-50/80 dark:bg-zinc-950/40">
                          <td colSpan={10} className="p-4">
                            <div className="space-y-3">
                              <div className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center justify-between">
                                <div>
                                  <strong>Kabul Eden:</strong> {rec.receivedBy}
                                  {rec.purchaseOrder && (
                                    <span className="ml-4 font-mono text-amber-700">
                                      Bağlı Sipariş: {rec.purchaseOrder.orderNumber}
                                    </span>
                                  )}
                                </div>
                                {rec.notes && <div><strong>Not:</strong> {rec.notes}</div>}
                              </div>
                              <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                                <table className="w-full text-left text-xs">
                                  <thead className="bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 font-semibold">
                                    <tr>
                                      <th className="py-2 px-3">Tanım</th>
                                      <th className="py-2 px-3 font-mono">Barkod</th>
                                      <th className="py-2 px-3 text-center">Ayar / Milyem</th>
                                      <th className="py-2 px-3 text-right">Fiili Gramaj</th>
                                      <th className="py-2 px-3 text-right">Has Karşılığı</th>
                                      <th className="py-2 px-3 text-right">İşçilik (TL)</th>
                                      <th className="py-2 px-3">Fark Notu</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                                    {rec.lines.map((l) => (
                                      <tr key={l.id}>
                                        <td className="py-2 px-3 font-medium text-zinc-800 dark:text-zinc-200">
                                          {l.description}
                                        </td>
                                        <td className="py-2 px-3 font-mono text-zinc-500">{l.barcode || '-'}</td>
                                        <td className="py-2 px-3 text-center text-zinc-600">{l.carat}K ({l.milyem})</td>
                                        <td className="py-2 px-3 text-right font-mono font-bold text-zinc-900 dark:text-zinc-100">
                                          {l.actualWeight.toFixed(2)} gr
                                        </td>
                                        <td className="py-2 px-3 text-right font-mono font-bold text-amber-600">
                                          {l.hasEquivalent.toFixed(3)} Has
                                        </td>
                                        <td className="py-2 px-3 text-right font-mono text-zinc-800 dark:text-zinc-200">
                                          {l.laborCostTl > 0 ? `${l.laborCostTl.toLocaleString('tr-TR')} ₺` : '-'}
                                        </td>
                                        <td className="py-2 px-3 text-xs text-amber-700">
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
                    <td colSpan={10} className="py-16 text-center text-zinc-400">
                      <Scale className="w-12 h-12 mx-auto text-zinc-300 dark:text-zinc-700 mb-3" />
                      <p className="text-base font-semibold">Mal kabul kaydı bulunamadı.</p>
                      <p className="text-xs text-zinc-500 mt-1">
                        Tedarikçiden gelen ürünlerin terazi tartımı ile mal kabulünü yapabilirsiniz.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Yeni Tedarik Siparişi Modalı */}
      {isOrderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden animate-in zoom-in-95 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex-shrink-0">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Boxes className="w-5 h-5 text-amber-500" />
                Yeni Tedarik Siparişi Oluştur
              </h2>
              <button
                onClick={() => setIsOrderModalOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="p-6 space-y-4 overflow-y-auto flex-1">
              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {errorMessage}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Tedarikçi (Toptancı) *
                  </label>
                  <select
                    value={orderSupplierId}
                    onChange={(e) => setOrderSupplierId(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-900 dark:text-zinc-100"
                  >
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} (Bakiye: {s.hasBalance.toFixed(2)} Has)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Teslim Alınacak Şube
                  </label>
                  <select
                    value={orderBranchId}
                    onChange={(e) => setOrderBranchId(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-900 dark:text-zinc-100"
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
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Beklenen Teslimat Tarihi
                </label>
                <input
                  type="date"
                  value={expectedDate}
                  onChange={(e) => setExpectedDate(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-zinc-100"
                />
              </div>

              {/* Sipariş Kalemleri */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Sipariş Kalemleri ({orderLines.length})
                  </span>
                  <button
                    type="button"
                    onClick={handleAddOrderLine}
                    className="text-xs font-bold text-amber-500 hover:text-amber-600 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Kalem Ekle
                  </button>
                </div>

                <div className="space-y-3">
                  {orderLines.map((line, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 grid grid-cols-12 gap-2 items-center"
                    >
                      <div className="col-span-3">
                        <select
                          value={line.productCategory}
                          onChange={(e) => {
                            const val = e.target.value;
                            setOrderLines((prev) =>
                              prev.map((l, i) => (i === idx ? { ...l, productCategory: val } : l))
                            );
                          }}
                          className="w-full px-2 py-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs"
                        >
                          {Object.entries(PRODUCT_CATEGORIES).map(([k, v]) => (
                            <option key={k} value={k}>
                              {v}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-span-3">
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
                          className="w-full px-2 py-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs"
                        />
                      </div>

                      <div className="col-span-2">
                        <select
                          value={line.carat}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setOrderLines((prev) =>
                              prev.map((l, i) => (i === idx ? { ...l, carat: val } : l))
                            );
                          }}
                          className="w-full px-2 py-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs"
                        >
                          <option value={24}>24K</option>
                          <option value={22}>22K</option>
                          <option value={18}>18K</option>
                          <option value={14}>14K</option>
                          <option value={8}>8K</option>
                        </select>
                      </div>

                      <div className="col-span-2">
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
                          className="w-full px-2 py-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs text-right font-mono"
                        />
                      </div>

                      <div className="col-span-2 flex items-center justify-end gap-1">
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
                          className="w-14 px-1.5 py-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs text-right font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveOrderLine(idx)}
                          className="p-1 rounded text-rose-500 hover:bg-rose-500/10"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Sipariş Notu
                </label>
                <textarea
                  rows={2}
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  placeholder="Örn: Hafta sonuna kadar vitrine yetiştirilecek..."
                  className="w-full px-3.5 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsOrderModalOpen(false)}
                  disabled={isLoading}
                  className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-medium text-zinc-700 dark:text-zinc-300"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-zinc-950 text-xs font-semibold shadow-md shadow-amber-500/20"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Siparişi Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mal Kabul Girişi Modalı */}
      {isReceiptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-3xl rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden animate-in zoom-in-95 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex-shrink-0">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Scale className="w-5 h-5 text-amber-500" />
                Mal Kabul ve Terazi Tartım Girişi
              </h2>
              <button
                onClick={() => setIsReceiptModalOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateReceipt} className="p-6 space-y-4 overflow-y-auto flex-1">
              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {errorMessage}
                </div>
              )}

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Bağlı Tedarik Siparişi (Opsiyonel)
                  </label>
                  <select
                    value={receiptPoId}
                    onChange={(e) => handleSelectPoForReceipt(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-900 dark:text-zinc-100"
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
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Tedarikçi (Toptancı) *
                  </label>
                  <select
                    value={receiptSupplierId}
                    onChange={(e) => setReceiptSupplierId(e.target.value)}
                    disabled={!!receiptPoId}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-900 dark:text-zinc-100 disabled:opacity-60"
                  >
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Kabul Edilen Şube *
                  </label>
                  <select
                    value={receiptBranchId}
                    onChange={(e) => setReceiptBranchId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-900 dark:text-zinc-100"
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
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Toptancının İrsaliye / Fatura No
                </label>
                <input
                  type="text"
                  placeholder="Örn: IRS-2026-98124"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-zinc-100"
                />
              </div>

              {/* Mal Kabul Kalemleri */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Gelen Kalemler & Terazi Tartımı ({receiptLines.length})
                  </span>
                  {!receiptPoId && (
                    <button
                      type="button"
                      onClick={handleAddReceiptLine}
                      className="text-xs font-bold text-amber-500 hover:text-amber-600 flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Kalem Ekle
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
                        className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 space-y-2"
                      >
                        <div className="grid grid-cols-12 gap-2 items-center">
                          <div className="col-span-4">
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
                              className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-medium"
                            />
                          </div>

                          <div className="col-span-2">
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
                              className="w-full px-2 py-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs"
                            >
                              <option value={24}>24K (995)</option>
                              <option value={22}>22K (916)</option>
                              <option value={18}>18K (750)</option>
                              <option value={14}>14K (585)</option>
                              <option value={8}>8K (333)</option>
                            </select>
                          </div>

                          <div className="col-span-3">
                            <div className="flex items-center gap-1">
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
                                className="w-full px-2 py-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-amber-500/40 text-xs text-right font-mono font-bold text-amber-600"
                              />
                              <span className="text-[10px] text-zinc-400 font-mono">gr</span>
                            </div>
                          </div>

                          <div className="col-span-2">
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
                              className="w-full px-2 py-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs text-right font-mono"
                            />
                          </div>

                          <div className="col-span-1 text-right">
                            <button
                              type="button"
                              onClick={() => setReceiptLines((prev) => prev.filter((_, i) => i !== idx))}
                              className="p-1 rounded text-rose-500 hover:bg-rose-500/10"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Canlı Fark ve Has Hesaplama Göstergesi */}
                        <div className="flex items-center justify-between text-[11px] pt-1 border-t border-zinc-100 dark:border-zinc-800/60 text-zinc-500">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-amber-600">
                              Has Karşılığı: {lineHas.toFixed(3)} Has
                            </span>
                            {line.laborCostPerGram > 0 && (
                              <span className="text-zinc-600 dark:text-zinc-400">
                                Toplam İşçilik: {(line.actualWeight * line.laborCostPerGram).toLocaleString('tr-TR')} ₺
                              </span>
                            )}
                          </div>
                          {lineVariance && (
                            <div className="flex items-center gap-1 font-medium">
                              {lineVariance.isExcess ? (
                                <span className="text-emerald-600 flex items-center gap-0.5">
                                  <TrendingUp className="w-3 h-3" />
                                  {lineVariance.statusText}
                                </span>
                              ) : (
                                <span className="text-amber-600 flex items-center gap-0.5">
                                  <TrendingDown className="w-3 h-3" />
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
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Mal Kabul Notu
                </label>
                <textarea
                  rows={2}
                  value={receiptNotes}
                  onChange={(e) => setReceiptNotes(e.target.value)}
                  placeholder="Kabul ile ilgili ek gözlemler veya fatura notu..."
                  className="w-full px-3.5 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsReceiptModalOpen(false)}
                  disabled={isLoading}
                  className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-medium text-zinc-700 dark:text-zinc-300"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={isLoading || receiptLines.length === 0}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold shadow-md shadow-emerald-500/20 disabled:opacity-50"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
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

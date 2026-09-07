'use client';

import React, { useState, useMemo } from 'react';
import {
  Wrench,
  Plus,
  Search,
  Filter,
  Printer,
  MessageCircle,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Scale,
  Building2,
  ShieldCheck,
  Flame,
  Check,
  XCircle,
  Eye,
  Calendar,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import ScaleButton from '@/components/ScaleButton';
import {
  SERVICE_ORDER_STATUS,
  SERVICE_STATUS_LABELS,
  SERVICE_COMMON_ISSUES,
  SERVICE_WARRANTY_MONTH_OPTIONS,
  SERVICE_DEFAULTS,
  ServiceOrderStatus,
} from '@/constants/service';
import {
  checkServiceOverdue,
  formatServiceWhatsAppNotification,
} from '@/lib/service/service-engine';

interface ServiceOrder {
  id: string;
  serviceNumber: string;
  customerId?: string | null;
  customerName: string;
  customerPhone: string;
  itemDescription: string;
  barcode?: string | null;
  carat?: number | null;
  intakeWeight: number;
  targetWeight?: number | null;
  actualWeight?: number | null;
  issueDescription: string;
  estimatedCostTl: number;
  finalCostTl: number;
  isCustomerApproved: boolean;
  customerApprovalDate?: string | null;
  workshopJobId?: string | null;
  workshopJob?: { id: string; jobNo: string; workshopName: string } | null;
  status: string;
  promisedDate: string;
  deliveredAt?: string | null;
  warrantyMonths: number;
  warrantyExpiresAt?: string | null;
  technicianNotes?: string | null;
  createdAt: string;
  updatedAt: string;
  customer?: { id: string; name: string; phone?: string | null } | null;
  branch?: { id: string; name: string; code: string } | null;
  events: Array<{ id: string; fromStatus?: string | null; toStatus: string; action: string; notes?: string | null; createdAt: string }>;
}

interface ServicesClientProps {
  initialOrders: ServiceOrder[];
  customers: Array<{ id: string; name: string; phone?: string | null }>;
  branches: Array<{ id: string; name: string; code: string }>;
  workshopJobs: Array<{ id: string; jobNo: string; workshopName: string; status: string }>;
}

export default function ServicesClient({
  initialOrders,
  customers,
  branches,
  workshopJobs,
}: ServicesClientProps) {
  const [orders, setVouchers] = useState<ServiceOrder[]>(initialOrders);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [branchFilter, setBranchFilter] = useState('ALL');
  const [overdueOnly, setOverdueOnly] = useState(false);

  // Modallar
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [selectedOrderForPrint, setSelectedOrderForPrint] = useState<ServiceOrder | null>(null);
  const [actionOrder, setActionOrder] = useState<ServiceOrder | null>(null);
  const [actionType, setActionType] = useState<'QUOTE' | 'APPROVE' | 'SEND_TO_WORKSHOP' | 'MARK_READY' | 'DELIVER' | 'CANCEL' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Yeni Servis Formu
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [barcode, setBarcode] = useState('');
  const [carat, setCarat] = useState<number>(14);
  const [intakeWeight, setIntakeWeight] = useState<number>(0);
  const [targetWeight, setTargetWeight] = useState<number>(0);
  const [issueDescription, setIssueDescription] = useState('');
  const [estimatedCostTl, setEstimatedCostTl] = useState<number>(0);
  const [promisedDate, setPromisedDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().split('T')[0];
  });
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [technicianNotes, setTechnicianNotes] = useState('');

  // Eylem Formu Değerleri
  const [actionCost, setActionCost] = useState<number>(0);
  const [actionWeight, setActionWeight] = useState<number>(0);
  const [actionWorkshopId, setActionWorkshopId] = useState<string>('');
  const [actionWarrantyMonths, setActionWarrantyMonths] = useState<number>(6);
  const [actionNotes, setActionNotes] = useState<string>('');

  // KPI'lar
  const kpis = useMemo(() => {
    const totalCount = orders.length;
    const inWorkshopCount = orders.filter((o) => o.status === SERVICE_ORDER_STATUS.IN_WORKSHOP).length;
    const overdueCount = orders.filter((o) => {
      const overdue = checkServiceOverdue(o.promisedDate, o.deliveredAt);
      return overdue.isOverdue && o.status !== SERVICE_ORDER_STATUS.DELIVERED && o.status !== SERVICE_ORDER_STATUS.CANCELLED;
    }).length;
    const deliveredCount = orders.filter((o) => o.status === SERVICE_ORDER_STATUS.DELIVERED).length;

    return {
      totalCount,
      inWorkshopCount,
      overdueCount,
      deliveredCount,
    };
  }, [orders]);

  // Filtrelenmiş Siparişler
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchesSearch =
        !searchQuery ||
        o.serviceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.customerPhone.includes(searchQuery) ||
        o.itemDescription.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (o.barcode && o.barcode.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus = statusFilter === 'ALL' || o.status === statusFilter;
      const matchesBranch = branchFilter === 'ALL' || o.branch?.id === branchFilter;

      const isOverdue = checkServiceOverdue(o.promisedDate, o.deliveredAt).isOverdue;
      const matchesOverdue = !overdueOnly || (isOverdue && o.status !== SERVICE_ORDER_STATUS.DELIVERED && o.status !== SERVICE_ORDER_STATUS.CANCELLED);

      return matchesSearch && matchesStatus && matchesBranch && matchesOverdue;
    });
  }, [orders, searchQuery, statusFilter, branchFilter, overdueOnly]);

  const handleCustomerSelect = (custId: string) => {
    setSelectedCustomerId(custId);
    const found = customers.find((c) => c.id === custId);
    if (found) {
      setCustomerName(found.name);
      setCustomerPhone(found.phone || '');
    }
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !customerPhone.trim()) {
      alert('Lütfen müşteri adı ve telefon numarası giriniz.');
      return;
    }
    if (!itemDescription.trim() || !issueDescription.trim()) {
      alert('Lütfen ürün açıklaması ve arıza/yapılacak işlemi belirtiniz.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/service-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: selectedCustomerId || null,
          customerName,
          customerPhone,
          itemDescription,
          barcode: barcode || null,
          carat,
          intakeWeight,
          targetWeight: targetWeight || null,
          issueDescription,
          estimatedCostTl,
          branchId: selectedBranchId || null,
          promisedDate: new Date(promisedDate).toISOString(),
          technicianNotes,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Servis kaydı açılamadı.');
      }

      const created = await res.json();
      setVouchers([created, ...orders]);
      setIsNewModalOpen(false);

      // Reset
      setCustomerName('');
      setCustomerPhone('');
      setItemDescription('');
      setBarcode('');
      setIntakeWeight(0);
      setTargetWeight(0);
      setIssueDescription('');
      setEstimatedCostTl(0);
      setTechnicianNotes('');

      alert(`Servis kaydı ${created.serviceNumber} başarıyla oluşturuldu!`);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openActionModal = (order: ServiceOrder, type: typeof actionType) => {
    setActionOrder(order);
    setActionType(type);
    setActionCost(order.finalCostTl || order.estimatedCostTl || 0);
    setActionWeight(order.actualWeight || order.intakeWeight || 0);
    setActionWorkshopId(order.workshopJobId || '');
    setActionWarrantyMonths(order.warrantyMonths || 6);
    setActionNotes('');
  };

  const handleExecuteAction = async () => {
    if (!actionOrder || !actionType) return;
    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/service-orders/${actionOrder.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: actionType,
          estimatedCostTl: actionCost,
          finalCostTl: actionCost,
          actualWeight: actionWeight,
          workshopJobId: actionWorkshopId || null,
          warrantyMonths: actionWarrantyMonths,
          notes: actionNotes,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'İşlem başarısız.');
      }

      const updated = await res.json();
      setVouchers(orders.map((o) => (o.id === updated.id ? updated : o)));
      setActionOrder(null);
      setActionType(null);
      alert('İşlem başarıyla güncellendi!');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Üst Başlık & Butonlar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2.5">
            <Wrench className="h-7 w-7 text-amber-500" />
            Servis, Tamir & Garanti Yönetimi
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
            Müşteri takılarının teslim alımı, tartımı, fiyat onayı, atölye iş emri ve garanti takibi.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsNewModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white font-medium shadow-md hover:from-amber-600 hover:to-amber-700 transition"
          >
            <Plus className="h-4 w-4" />
            Yeni Servis Kabulü Aç
          </button>
        </div>
      </div>

      {/* KPI Kartları */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
              Toplam Servis Kaydı
            </span>
            <Wrench className="h-5 w-5 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-2">
            {kpis.totalCount} Adet
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
              Atölyede / İşlemde
            </span>
            <Flame className="h-5 w-5 text-orange-500" />
          </div>
          <div className="text-2xl font-bold text-orange-600 dark:text-orange-400 mt-2">
            {kpis.inWorkshopCount} İş Emri
          </div>
        </div>

        <div
          onClick={() => setOverdueOnly(!overdueOnly)}
          className={`p-5 rounded-2xl border shadow-sm cursor-pointer transition ${
            overdueOnly
              ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-400 ring-2 ring-rose-500'
              : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-rose-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
              Geciken İşler (SLA Alarmı)
            </span>
            <Clock className={`h-5 w-5 ${kpis.overdueCount > 0 ? 'text-rose-500 animate-pulse' : 'text-zinc-400'}`} />
          </div>
          <div className={`text-2xl font-bold mt-2 ${kpis.overdueCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-zinc-900 dark:text-zinc-100'}`}>
            {kpis.overdueCount} Gecikme {overdueOnly && '(Filtrelendi)'}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
              Garantili Teslimatlar
            </span>
            <ShieldCheck className="h-5 w-5 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">
            {kpis.deliveredCount} Adet
          </div>
        </div>
      </div>

      {/* Arama & Filtreler */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Takip No, Müşteri, Telefon veya Ürün ile ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3.5 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="ALL">Tüm Durumlar</option>
            {Object.entries(SERVICE_STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          {branches.length > 0 && (
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="px-3.5 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="ALL">Tüm Şubeler</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Siparişler Tablosu */}
      <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              <tr>
                <th className="py-3.5 px-4">Takip No & Tarih</th>
                <th className="py-3.5 px-4">Müşteri</th>
                <th className="py-3.5 px-4">Ürün & Gramaj</th>
                <th className="py-3.5 px-4">İşlem / Şikayet</th>
                <th className="py-3.5 px-4">Maliyet (₺)</th>
                <th className="py-3.5 px-4">Müşteri Onayı</th>
                <th className="py-3.5 px-4">Termin / Durum</th>
                <th className="py-3.5 px-4 text-right">Eylemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-zinc-900 dark:text-zinc-100">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-zinc-500">
                    Kayıtlı servis iş emri bulunamadı.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const overdue = checkServiceOverdue(order.promisedDate, order.deliveredAt);
                  const isDelivered = order.status === SERVICE_ORDER_STATUS.DELIVERED;
                  const isCancelled = order.status === SERVICE_ORDER_STATUS.CANCELLED;

                  return (
                    <tr key={order.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                          {order.serviceNumber}
                        </div>
                        <div className="text-xs text-zinc-600 dark:text-zinc-400">
                          {new Date(order.createdAt).toLocaleDateString('tr-TR')}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-zinc-900 dark:text-zinc-100">
                          {order.customerName}
                        </div>
                        <div className="text-xs text-zinc-600 dark:text-zinc-400">
                          {order.customerPhone}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium">{order.itemDescription}</div>
                        <div className="text-xs text-zinc-600 dark:text-zinc-400 font-mono">
                          Ön: {order.intakeWeight.toFixed(2)} gr {order.actualWeight ? `| Son: ${order.actualWeight.toFixed(2)} gr` : ''}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="text-xs font-medium text-zinc-800 dark:text-zinc-200 max-w-[200px] truncate" title={order.issueDescription}>
                          {order.issueDescription}
                        </div>
                        {order.workshopJob && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 mt-0.5">
                            <Flame className="h-3 w-3" /> {order.workshopJob.workshopName} ({order.workshopJob.jobNo})
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-zinc-900 dark:text-zinc-100">
                        ₺{(order.finalCostTl || order.estimatedCostTl).toLocaleString('tr-TR')}
                      </td>
                      <td className="py-3.5 px-4">
                        {order.isCustomerApproved ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                            <Check className="h-3 w-3" /> Onaylandı
                          </span>
                        ) : order.estimatedCostTl > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
                            <Clock className="h-3 w-3" /> Onay Bekliyor
                          </span>
                        ) : (
                          <span className="text-xs text-zinc-600 dark:text-zinc-400">Ücretsiz</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-medium">
                            {new Date(order.promisedDate).toLocaleDateString('tr-TR')}
                          </span>
                          {overdue.isOverdue && !isDelivered && !isCancelled && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
                              +{overdue.overdueDays}g Gecikti
                            </span>
                          )}
                        </div>
                        <div className="mt-1">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                              order.status === SERVICE_ORDER_STATUS.DELIVERED
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                                : order.status === SERVICE_ORDER_STATUS.READY
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300'
                                : order.status === SERVICE_ORDER_STATUS.IN_WORKSHOP
                                ? 'bg-orange-100 text-orange-800 dark:bg-orange-950/50 dark:text-orange-300'
                                : order.status === SERVICE_ORDER_STATUS.CANCELLED
                                ? 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300'
                            }`}
                          >
                            {SERVICE_STATUS_LABELS[order.status as ServiceOrderStatus] || order.status}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* WhatsApp Bildirimi */}
                          <a
                            href={formatServiceWhatsAppNotification({
                              customerName: order.customerName,
                              customerPhone: order.customerPhone,
                              serviceNumber: order.serviceNumber,
                              itemDescription: order.itemDescription,
                              status: order.status as ServiceOrderStatus,
                              finalCostTl: order.finalCostTl || order.estimatedCostTl,
                              warrantyMonths: order.warrantyMonths,
                            })}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Müşteriye WhatsApp Mesajı Gönder"
                            className="p-1.5 rounded-lg border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100"
                          >
                            <MessageCircle className="h-4 w-4" />
                          </a>

                          {/* Yazdır / Önizle */}
                          <button
                            onClick={() => setSelectedOrderForPrint(order)}
                            title="Servis Fişini Yazdır"
                            className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                          >
                            <Printer className="h-4 w-4" />
                          </button>

                          {/* Durum Geçişleri */}
                          {order.status === SERVICE_ORDER_STATUS.QUOTED && !order.isCustomerApproved && (
                            <button
                              onClick={() => openActionModal(order, 'APPROVE')}
                              title="Müşteri Onayı Al"
                              className="px-2 py-1 rounded-lg text-xs font-semibold bg-amber-500 text-white hover:bg-amber-600"
                            >
                              Onay Al
                            </button>
                          )}

                          {(order.status === SERVICE_ORDER_STATUS.APPROVED || order.status === SERVICE_ORDER_STATUS.RECEIVED) && (
                            <button
                              onClick={() => openActionModal(order, 'SEND_TO_WORKSHOP')}
                              title="Atölyeye Sevk Et"
                              className="px-2 py-1 rounded-lg text-xs font-semibold bg-orange-500 text-white hover:bg-orange-600"
                            >
                              Atölyeye Ver
                            </button>
                          )}

                          {order.status === SERVICE_ORDER_STATUS.IN_WORKSHOP && (
                            <button
                              onClick={() => openActionModal(order, 'MARK_READY')}
                              title="Hazır Olarak İşaretle"
                              className="px-2 py-1 rounded-lg text-xs font-semibold bg-blue-500 text-white hover:bg-blue-600"
                            >
                              Hazır
                            </button>
                          )}

                          {order.status === SERVICE_ORDER_STATUS.READY && (
                            <button
                              onClick={() => openActionModal(order, 'DELIVER')}
                              title="Müşteriye Teslim Et"
                              className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700"
                            >
                              Teslim Et
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* YENİ SERVİS KABUL MODALI */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wrench className="h-5 w-5 text-amber-500" />
                <h3 className="font-bold text-zinc-900 dark:text-zinc-100">
                  Yeni Servis / Tamir Kabul Kaydı
                </h3>
              </div>
              <button
                onClick={() => setIsNewModalOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Müşteri Seçimi / Girişi */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-1">
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Kayıtlı Müşteri Seç
                  </label>
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => handleCustomerSelect(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-xs"
                  >
                    <option value="">Yeni / Kayıtsız Müşteri</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-1">
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Müşteri Adı-Soyadı *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ad Soyad"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-xs"
                  />
                </div>
                <div className="sm:col-span-1">
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Telefon Numarası *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="0532..."
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-xs"
                  />
                </div>
              </div>

              {/* Ürün Bilgileri ve Teraziden Okuma */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Ürün Tanımı *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Örn: 14K Tektaş Pırlanta Yüzük"
                    value={itemDescription}
                    onChange={(e) => setItemDescription(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Ayar
                  </label>
                  <select
                    value={carat}
                    onChange={(e) => setCarat(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-xs"
                  >
                    <option value={8}>8K (333)</option>
                    <option value={14}>14K (585)</option>
                    <option value={18}>18K (750)</option>
                    <option value={22}>22K (916)</option>
                    <option value={24}>24K (995)</option>
                  </select>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      Ön Tartım (gr) *
                    </label>
                    <ScaleButton
                      size="sm"
                      onWeightReceived={(w: number) => setIntakeWeight(w)}
                    />
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={intakeWeight}
                    onChange={(e) => setIntakeWeight(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-xs font-mono font-bold text-amber-600"
                  />
                </div>
              </div>

              {/* Hızlı Şikayet / Arıza Seçimi */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Arıza / Yapılacak İşlem Açıklaması *
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {SERVICE_COMMON_ISSUES.map((issue) => (
                    <button
                      key={issue}
                      type="button"
                      onClick={() => setIssueDescription(issueDescription ? `${issueDescription}, ${issue}` : issue)}
                      className="px-2.5 py-1 rounded-lg text-[11px] bg-zinc-100 dark:bg-zinc-800 hover:bg-amber-100 dark:hover:bg-amber-950/40 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 transition"
                    >
                      + {issue}
                    </button>
                  ))}
                </div>
                <textarea
                  required
                  rows={2}
                  placeholder="Detaylı arıza veya işlem talebi..."
                  value={issueDescription}
                  onChange={(e) => setIssueDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-xs"
                />
              </div>

              {/* Maliyet & Termin */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Tahmini Maliyet (₺)
                  </label>
                  <input
                    type="number"
                    step="1"
                    value={estimatedCostTl}
                    onChange={(e) => setEstimatedCostTl(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-xs font-mono font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Vaat Edilen Tarih
                  </label>
                  <input
                    type="date"
                    required
                    value={promisedDate}
                    onChange={(e) => setPromisedDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Şube
                  </label>
                  <select
                    value={selectedBranchId}
                    onChange={(e) => setSelectedBranchId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-xs"
                  >
                    <option value="">Merkez Şube</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl text-xs font-medium bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow hover:from-amber-600 hover:to-amber-700 disabled:opacity-50"
                >
                  {isSubmitting ? 'Kaydediliyor...' : 'Servis Kabul Kaydını Aç'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DURUM GEÇİŞ / EYLEM MODALI */}
      {actionOrder && actionType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl p-6">
            <h3 className="font-bold text-zinc-900 dark:text-zinc-100 mb-2 flex items-center gap-2">
              <Wrench className="h-5 w-5 text-amber-500" />
              {actionType === 'APPROVE' && 'Müşteri Fiyat Onayı Al'}
              {actionType === 'SEND_TO_WORKSHOP' && 'Atölyeye Sevk Et'}
              {actionType === 'MARK_READY' && 'Hazır Olarak Tamamla'}
              {actionType === 'DELIVER' && 'Müşteriye Teslim Et'}
            </h3>
            <p className="text-xs text-zinc-500 mb-4">
              <strong>{actionOrder.serviceNumber}</strong> — {actionOrder.itemDescription} ({actionOrder.customerName})
            </p>

            <div className="space-y-3 text-xs">
              {actionType === 'APPROVE' && (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                  <span className="font-semibold block mb-1">Müşteri Teklifi Onayladı mı?</span>
                  <p className="text-zinc-600 dark:text-zinc-400 text-[11px]">
                    Müşteri ₺{actionCost.toLocaleString('tr-TR')} tutarındaki bakım maliyetini onaylamıştır.
                  </p>
                </div>
              )}

              {actionType === 'SEND_TO_WORKSHOP' && (
                <div>
                  <label className="block font-semibold mb-1">Bağlanacak Atölye / Dökümcü</label>
                  <select
                    value={actionWorkshopId}
                    onChange={(e) => setActionWorkshopId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-xs"
                  >
                    <option value="">Bağımsız Atölye / Seçilmedi</option>
                    {workshopJobs.map((w) => (
                      <option key={w.id} value={w.id}>{w.workshopName} ({w.jobNo})</option>
                    ))}
                  </select>
                </div>
              )}

              {actionType === 'DELIVER' && (
                <>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-semibold">Çıkış / Teslim Ağırlığı (gr)</label>
                      <ScaleButton
                        size="sm"
                        onWeightReceived={(w: number) => setActionWeight(w)}
                      />
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      value={actionWeight}
                      onChange={(e) => setActionWeight(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Tahsil Edilen Tutar (₺)</label>
                    <input
                      type="number"
                      value={actionCost}
                      onChange={(e) => setActionCost(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 font-mono font-bold text-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Mağaza Garanti Süresi</label>
                    <select
                      value={actionWarrantyMonths}
                      onChange={(e) => setActionWarrantyMonths(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700"
                    >
                      {SERVICE_WARRANTY_MONTH_OPTIONS.map((m) => (
                        <option key={m} value={m}>{m} Ay Mağaza Garantisi</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              <div>
                <label className="block font-semibold mb-1">Not / Açıklama</label>
                <input
                  type="text"
                  placeholder="İşlem notu..."
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2.5 mt-5">
              <button
                type="button"
                onClick={() => {
                  setActionOrder(null);
                  setActionType(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-medium border border-zinc-200 dark:border-zinc-700"
              >
                Vazgeç
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleExecuteAction}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white shadow disabled:opacity-50"
              >
                {isSubmitting ? 'İşleniyor...' : 'Onayla'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MATBU A4 SERVİS VE GARANTİ FİŞİ YAZDIRMA MODALI */}
      {selectedOrderForPrint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-3xl max-h-[95vh] flex flex-col rounded-2xl bg-white dark:bg-zinc-900 shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between print:hidden">
              <h3 className="font-bold text-zinc-900 dark:text-zinc-100">
                Servis & Garanti Fişi (A4)
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 text-white font-medium hover:bg-amber-600 transition"
                >
                  <Printer className="h-4 w-4" /> Yazdır
                </button>
                <button
                  onClick={() => setSelectedOrderForPrint(null)}
                  className="p-2 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-8 overflow-y-auto bg-white text-zinc-900 print:p-0">
              <div className="border border-zinc-300 p-6 rounded-lg space-y-6">
                <div className="flex justify-between items-start border-b border-zinc-300 pb-4">
                  <div>
                    <h2 className="text-xl font-bold tracking-wider">
                      KUYUMCU SERVİS & GARANTİ BELGESİ
                    </h2>
                    <p className="text-xs text-zinc-600 mt-1">
                      Müşteri Takı Bakım, Onarım ve Emanet Teslim Tutanağı
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-mono font-bold text-amber-700">
                      {selectedOrderForPrint.serviceNumber}
                    </div>
                    <div className="text-xs text-zinc-600">
                      Tarih: {new Date(selectedOrderForPrint.createdAt).toLocaleDateString('tr-TR')}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6 text-xs">
                  <div className="border border-zinc-200 p-3 rounded">
                    <span className="font-bold block text-zinc-800 mb-1">MÜŞTERİ BİLGİLERİ</span>
                    <div>Adı Soyadı: <strong>{selectedOrderForPrint.customerName}</strong></div>
                    <div>Telefon: <strong>{selectedOrderForPrint.customerPhone}</strong></div>
                  </div>
                  <div className="border border-zinc-200 p-3 rounded">
                    <span className="font-bold block text-zinc-800 mb-1">SERVİS & TERMİN BİLGİLERİ</span>
                    <div>Şube: {selectedOrderForPrint.branch?.name || 'Merkez Şube'}</div>
                    <div>Vaat Edilen Tarih: <strong>{new Date(selectedOrderForPrint.promisedDate).toLocaleDateString('tr-TR')}</strong></div>
                    <div>Garanti: <strong>{selectedOrderForPrint.warrantyMonths} Ay</strong></div>
                  </div>
                </div>

                <table className="w-full text-xs text-left border-collapse border border-zinc-300">
                  <thead className="bg-zinc-100">
                    <tr>
                      <th className="border border-zinc-300 p-2">Ürün Tanımı</th>
                      <th className="border border-zinc-300 p-2">Ayar</th>
                      <th className="border border-zinc-300 p-2 text-right">Ön Tartım (gr)</th>
                      <th className="border border-zinc-300 p-2 text-right">Son Tartım (gr)</th>
                      <th className="border border-zinc-300 p-2 text-right">Tutar (₺)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-zinc-300 p-2 font-medium">{selectedOrderForPrint.itemDescription}</td>
                      <td className="border border-zinc-300 p-2">{selectedOrderForPrint.carat ? `${selectedOrderForPrint.carat}K` : '-'}</td>
                      <td className="border border-zinc-300 p-2 text-right font-mono">{selectedOrderForPrint.intakeWeight.toFixed(2)}</td>
                      <td className="border border-zinc-300 p-2 text-right font-mono">{selectedOrderForPrint.actualWeight ? selectedOrderForPrint.actualWeight.toFixed(2) : '-'}</td>
                      <td className="border border-zinc-300 p-2 text-right font-mono font-bold">₺{(selectedOrderForPrint.finalCostTl || selectedOrderForPrint.estimatedCostTl).toLocaleString('tr-TR')}</td>
                    </tr>
                  </tbody>
                </table>

                <div className="border border-zinc-200 p-3 rounded text-xs space-y-1">
                  <span className="font-bold text-zinc-800">YAPILAN İŞLEM / ŞİKAYET:</span>
                  <p>{selectedOrderForPrint.issueDescription}</p>
                </div>

                <div className="text-[11px] text-zinc-500 border-t border-zinc-200 pt-3">
                  <strong>Garanti Taahhüdü:</strong> Yapılan kaynak, mıhlama ve montaj işçiliği teslim tarihinden itibaren {selectedOrderForPrint.warrantyMonths} ay süreyle mağazamızın garantisi altındadır. Kullanıcı kaynaklı darbe veya kimyasal temas garanti kapsamı dışındadır.
                </div>

                <div className="grid grid-cols-2 gap-8 pt-8 border-t border-zinc-300 text-center text-xs">
                  <div>
                    <div className="font-bold mb-8">MÜŞTERİ İMZASI</div>
                    <div className="text-zinc-400">Ürünü eksiksiz teslim aldım/ettim.</div>
                  </div>
                  <div>
                    <div className="font-bold mb-8">MAĞAZA YETKİLİSİ</div>
                    <div className="text-zinc-400">Kaşe / İmza</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

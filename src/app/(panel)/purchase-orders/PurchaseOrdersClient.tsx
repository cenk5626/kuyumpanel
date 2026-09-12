'use client';

import React, { useState, useMemo } from 'react';
import {
  ShoppingBag,
  Plus,
  Search,
  Filter,
  MessageCircle,
  Clock,
  CheckCircle2,
  AlertCircle,
  Truck,
  Trash2,
  ExternalLink,
  Printer,
  ChevronRight,
  Send,
  X,
} from 'lucide-react';
import {
  PURCHASE_ORDER_STATUS,
  PURCHASE_ORDER_STATUS_LABELS,
  PurchaseOrderStatus,
} from '@/constants/purchase-order';
import {
  formatPurchaseOrderWhatsAppMessage,
  normalizePhoneNumber,
  buildWhatsAppIntentUrl,
} from '@/lib/purchase-order/whatsapp-order';

interface OrderLine {
  id?: string;
  productCategory: string;
  description: string;
  carat: number;
  orderedWeight: number;
  orderedQuantity: number;
  laborCostPerGram: number;
  notes?: string | null;
}

interface PurchaseOrder {
  id: string;
  orderNumber: string;
  orderDate: string;
  expectedDeliveryDate?: string | null;
  status: string;
  totalEstimatedWeight: number;
  totalEstimatedHas: number;
  totalEstimatedTl: number;
  notes?: string | null;
  sentAt?: string | null;
  receivedAt?: string | null;
  cancelledAt?: string | null;
  supplier: {
    id: string;
    name: string;
    phone?: string | null;
    hasBalance: number;
    tlBalance: number;
  };
  lines: OrderLine[];
  messages: Array<{
    id: string;
    provider: string;
    recipientPhone: string;
    status: string;
    sentAt: string;
  }>;
}

interface Props {
  initialOrders: PurchaseOrder[];
  suppliers: Array<{ id: string; name: string; phone?: string | null; hasBalance: number; tlBalance: number }>;
  branches: Array<{ id: string; name: string; code: string }>;
}

export default function PurchaseOrdersClient({
  initialOrders,
  suppliers,
  branches,
}: Props) {
  const [orders, setOrders] = useState<PurchaseOrder[]>(initialOrders);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [supplierFilter, setSupplierFilter] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');

  // Modallar
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedOrderForWhatsApp, setSelectedOrderForWhatsApp] = useState<PurchaseOrder | null>(null);
  const [selectedOrderForDetail, setSelectedOrderForDetail] = useState<PurchaseOrder | null>(null);

  // Form State
  const [newSupplierId, setNewSupplierId] = useState('');
  const [newExpectedDate, setNewExpectedDate] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [lines, setLines] = useState<OrderLine[]>([
    {
      productCategory: 'BILEZIK',
      description: '22K Ajda Bilezik',
      carat: 22,
      orderedWeight: 20,
      orderedQuantity: 1,
      laborCostPerGram: 25,
      notes: '',
    },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);
  const [forceResend, setForceResend] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Filtreleme
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (statusFilter !== 'ALL' && o.status !== statusFilter) return false;
      if (supplierFilter !== 'ALL' && o.supplier.id !== supplierFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const matchNo = o.orderNumber.toLowerCase().includes(q);
        const matchSupp = o.supplier.name.toLowerCase().includes(q);
        if (!matchNo && !matchSupp) return false;
      }
      return true;
    });
  }, [orders, statusFilter, supplierFilter, search]);

  // Yeni satır ekle
  const handleAddLine = () => {
    setLines((prev) => [
      ...prev,
      {
        productCategory: 'BILEZIK',
        description: '',
        carat: 22,
        orderedWeight: 0,
        orderedQuantity: 1,
        laborCostPerGram: 0,
        notes: '',
      },
    ]);
  };

  // Satır güncelle
  const handleLineChange = (index: number, field: keyof OrderLine, value: any) => {
    setLines((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  // Satır sil
  const handleRemoveLine = (index: number) => {
    if (lines.length <= 1) return;
    setLines((prev) => prev.filter((_, i) => i !== index));
  };

  // Yeni Sipariş Kaydet
  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/purchase-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierId: newSupplierId,
          expectedDeliveryDate: newExpectedDate || null,
          notes: newNotes || null,
          lines,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Sipariş oluşturulamadı.');

      setOrders((prev) => [data.order, ...prev]);
      setIsCreateModalOpen(false);
      setActionSuccess(`${data.order.orderNumber} nolu toptancı siparişi taslak olarak kaydedildi.`);
      // Formu sıfırla
      setNewSupplierId('');
      setNewExpectedDate('');
      setNewNotes('');
      setLines([
        {
          productCategory: 'BILEZIK',
          description: '22K Ajda Bilezik',
          carat: 22,
          orderedWeight: 20,
          orderedQuantity: 1,
          laborCostPerGram: 25,
          notes: '',
        },
      ]);
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // WhatsApp Gönderim Aksiyonu
  const handleSendWhatsApp = async (order: PurchaseOrder) => {
    setIsSendingWhatsApp(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/purchase-orders/${order.id}/send-whatsapp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          forceResend,
          resendReason: forceResend ? 'Kullanıcı onayıyla tekrar iletim' : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.alreadySent) {
          setForceResend(true);
        }
        throw new Error(data.error || 'WhatsApp mesajı oluşturulamadı.');
      }

      // Sipariş durumunu yerel state'te güncelle
      setOrders((prev) =>
        prev.map((o) =>
          o.id === order.id
            ? {
                ...o,
                status: PURCHASE_ORDER_STATUS.SENT_TO_SUPPLIER,
                sentAt: data.sentAt,
                messages: [
                  {
                    id: data.messageId,
                    provider: data.provider,
                    recipientPhone: data.recipientPhone,
                    status: 'SENT',
                    sentAt: data.sentAt,
                  },
                  ...o.messages,
                ],
              }
            : o
        )
      );

      // Web Intent ise pencereyi aç
      if (data.webIntentUrl) {
        window.open(data.webIntentUrl, '_blank');
      }

      setSelectedOrderForWhatsApp(null);
      setForceResend(false);
      setActionSuccess(`${order.orderNumber} nolu sipariş WhatsApp ile iletildi.`);
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setIsSendingWhatsApp(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Üst Başlık */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900/80 p-5 rounded-2xl border border-slate-200 dark:border-amber-500/20 shadow-sm backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              Toptancı Sipariş Takibi
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Toptancı siparişleri oluşturma, durum takibi ve tek tıkla WhatsApp sipariş fişi iletimi
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-sm transition-all shadow-md active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Yeni Toptancı Siparişi</span>
        </button>
      </div>

      {actionSuccess && (
        <div className="p-4 rounded-xl text-sm font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center justify-between">
          <span>{actionSuccess}</span>
          <button onClick={() => setActionSuccess(null)} className="text-xs">✕</button>
        </div>
      )}

      {actionError && (
        <div className="p-4 rounded-xl text-sm font-medium bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30 flex items-center justify-between">
          <span>{actionError}</span>
          <button onClick={() => setActionError(null)} className="text-xs">✕</button>
        </div>
      )}

      {/* Filtreler */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Sipariş no veya toptancı adı..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-11 pl-9 pr-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
          />
        </div>

        <div>
          <select
            value={supplierFilter}
            onChange={(e) => setSupplierFilter(e.target.value)}
            className="w-full h-11 px-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
          >
            <option value="ALL">Tüm Toptancılar</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full h-11 px-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
          >
            <option value="ALL">Tüm Durumlar</option>
            {Object.entries(PURCHASE_ORDER_STATUS_LABELS).map(([k, label]) => (
              <option key={k} value={k}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Sipariş Listesi */}
      <div className="bg-white dark:bg-slate-900/80 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 text-xs uppercase font-semibold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-5 py-3.5">Sipariş No & Tarih</th>
                <th className="px-5 py-3.5">Toptancı</th>
                <th className="px-5 py-3.5 text-center">Durum</th>
                <th className="px-5 py-3.5 text-right">Tahmini Gramaj / Has</th>
                <th className="px-5 py-3.5 text-center">İletim</th>
                <th className="px-5 py-3.5 text-right">Eylemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-slate-400">
                    Kayıtlı toptancı siparişi bulunamadı.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="font-bold text-slate-900 dark:text-slate-100">{order.orderNumber}</div>
                      <div className="text-xs text-slate-400">
                        {new Date(order.orderDate).toLocaleDateString('tr-TR')}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="font-medium text-slate-900 dark:text-slate-100">{order.supplier.name}</div>
                      <div className="text-xs text-slate-500">{order.supplier.phone || 'Telefon Yok'}</div>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                        {PURCHASE_ORDER_STATUS_LABELS[order.status as PurchaseOrderStatus] || order.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="font-bold text-slate-900 dark:text-slate-100">
                        ~{order.totalEstimatedWeight.toFixed(2)} gr
                      </div>
                      <div className="text-xs text-amber-600 dark:text-amber-400">
                        {order.totalEstimatedHas.toFixed(2)} gr Has
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      {order.sentAt ? (
                        <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{new Date(order.sentAt).toLocaleDateString('tr-TR')}</span>
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400 flex items-center justify-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Gönderilmedi</span>
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setSelectedOrderForWhatsApp(order);
                            setForceResend(false);
                            setActionError(null);
                          }}
                          className="px-3 py-1.5 min-h-[36px] rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition-all flex items-center gap-1 shadow-sm active:scale-95"
                          title="WhatsApp ile Sipariş Gönder"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">WhatsApp</span>
                        </button>

                        <button
                          onClick={() => setSelectedOrderForDetail(order)}
                          className="px-3 py-1.5 min-h-[36px] rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium transition-all"
                        >
                          Detay
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Yeni Sipariş Modalı */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-3xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-8">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-amber-500" />
                <span>Yeni Toptancı Siparişi Düzenle</span>
              </h2>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1 block">Toptancı Seçimi *</label>
                  <select
                    required
                    value={newSupplierId}
                    onChange={(e) => setNewSupplierId(e.target.value)}
                    className="w-full h-11 px-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="">-- Toptancı Seçiniz --</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.phone || 'Tel yok'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1 block">Termin / İstenen Teslim Tarihi</label>
                  <input
                    type="date"
                    value={newExpectedDate}
                    onChange={(e) => setNewExpectedDate(e.target.value)}
                    className="w-full h-11 px-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Kalemler Tablosu */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Sipariş Edilecek Kalemler
                  </span>
                  <button
                    type="button"
                    onClick={handleAddLine}
                    className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Kalem Ekle</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {lines.map((line, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 grid grid-cols-1 sm:grid-cols-12 gap-2 items-center"
                    >
                      <div className="sm:col-span-4">
                        <input
                          type="text"
                          required
                          placeholder="Ürün açıklaması (örn: 22K Ajda)"
                          value={line.description}
                          onChange={(e) => handleLineChange(idx, 'description', e.target.value)}
                          className="w-full h-9 px-2.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <select
                          value={line.carat}
                          onChange={(e) => handleLineChange(idx, 'carat', Number(e.target.value))}
                          className="w-full h-9 px-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs"
                        >
                          <option value={24}>24K (Has)</option>
                          <option value={22}>22K (916)</option>
                          <option value={18}>18K (750)</option>
                          <option value={14}>14K (585)</option>
                          <option value={8}>8K (333)</option>
                        </select>
                      </div>

                      <div className="sm:col-span-2">
                        <input
                          type="number"
                          step="0.01"
                          required
                          placeholder="Gram (gr)"
                          value={line.orderedWeight || ''}
                          onChange={(e) => handleLineChange(idx, 'orderedWeight', Number(e.target.value))}
                          className="w-full h-9 px-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs"
                        />
                      </div>

                      <div className="sm:col-span-1">
                        <input
                          type="number"
                          min="1"
                          required
                          placeholder="Adet"
                          value={line.orderedQuantity || ''}
                          onChange={(e) => handleLineChange(idx, 'orderedQuantity', Number(e.target.value))}
                          className="w-full h-9 px-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <input
                          type="number"
                          step="0.5"
                          placeholder="İşçilik (TL/gr)"
                          value={line.laborCostPerGram || ''}
                          onChange={(e) => handleLineChange(idx, 'laborCostPerGram', Number(e.target.value))}
                          className="w-full h-9 px-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs"
                        />
                      </div>

                      <div className="sm:col-span-1 flex justify-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveLine(idx)}
                          disabled={lines.length <= 1}
                          className="text-slate-400 hover:text-rose-500 disabled:opacity-30"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1 block">Genel Sipariş Notu</label>
                <textarea
                  rows={2}
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="İmalat notu, özel ölçü veya aciliyet bilgisi..."
                  className="w-full p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2.5 min-h-[44px] rounded-xl text-slate-600 dark:text-slate-300 font-medium text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 min-h-[44px] rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-sm transition-all shadow-md active:scale-95 disabled:opacity-50"
                >
                  {isSubmitting ? 'Kaydediliyor...' : 'Siparişi Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* WhatsApp Gönderim Modalı */}
      {selectedOrderForWhatsApp && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-emerald-500" />
                <span>WhatsApp Sipariş Fişi İlet</span>
              </h3>
              <button
                onClick={() => setSelectedOrderForWhatsApp(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Sipariş No:</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">{selectedOrderForWhatsApp.orderNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Toptancı:</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">{selectedOrderForWhatsApp.supplier.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Alıcı Telefon:</span>
                <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400">
                  {selectedOrderForWhatsApp.supplier.phone || 'Kayıtlı telefon yok!'}
                </span>
              </div>
            </div>

            {selectedOrderForWhatsApp.sentAt && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>
                  Bu sipariş daha önce {new Date(selectedOrderForWhatsApp.sentAt).toLocaleString('tr-TR')} tarihinde gönderilmiştir. Tekrar göndermek istiyor musunuz?
                </span>
              </div>
            )}

            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-500">Mesaj Önizlemesi:</span>
              <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-950 font-mono text-[11px] text-slate-700 dark:text-slate-300 max-h-48 overflow-y-auto whitespace-pre-wrap border border-slate-200 dark:border-slate-800">
                {formatPurchaseOrderWhatsAppMessage({
                  orderNumber: selectedOrderForWhatsApp.orderNumber,
                  orderDate: selectedOrderForWhatsApp.orderDate,
                  expectedDeliveryDate: selectedOrderForWhatsApp.expectedDeliveryDate,
                  supplierName: selectedOrderForWhatsApp.supplier.name,
                  dealerName: 'Kuyumcu Mağazası',
                  totalEstimatedWeight: selectedOrderForWhatsApp.totalEstimatedWeight,
                  totalEstimatedHas: selectedOrderForWhatsApp.totalEstimatedHas,
                  notes: selectedOrderForWhatsApp.notes,
                  lines: selectedOrderForWhatsApp.lines,
                })}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setSelectedOrderForWhatsApp(null)}
                className="px-4 py-2 min-h-[44px] rounded-xl text-slate-600 dark:text-slate-300 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={() => handleSendWhatsApp(selectedOrderForWhatsApp)}
                disabled={isSendingWhatsApp || !selectedOrderForWhatsApp.supplier.phone}
                className="px-5 py-2 min-h-[44px] rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm transition-all shadow-md active:scale-95 disabled:opacity-50 flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                <span>{isSendingWhatsApp ? 'İletiliyor...' : 'Onayla ve WhatsApp ile İlet'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sipariş Detay Modalı */}
      {selectedOrderForDetail && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Sipariş Detayı: {selectedOrderForDetail.orderNumber}
              </h3>
              <button onClick={() => setSelectedOrderForDetail(null)} className="text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-500 block">Toptancı</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">{selectedOrderForDetail.supplier.name}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Tarih</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">
                    {new Date(selectedOrderForDetail.orderDate).toLocaleDateString('tr-TR')}
                  </span>
                </div>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-bold">
                    <tr>
                      <th className="p-2">Açıklama</th>
                      <th className="p-2 text-center">Ayar</th>
                      <th className="p-2 text-right">Adet</th>
                      <th className="p-2 text-right">Gram</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {selectedOrderForDetail.lines.map((l, i) => (
                      <tr key={i}>
                        <td className="p-2 font-medium">{l.description}</td>
                        <td className="p-2 text-center">{l.carat}K</td>
                        <td className="p-2 text-right">{l.orderedQuantity}</td>
                        <td className="p-2 text-right font-bold">{l.orderedWeight.toFixed(2)} gr</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {selectedOrderForDetail.notes && (
                <div className="text-xs p-2.5 rounded bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                  <strong>Not:</strong> {selectedOrderForDetail.notes}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedOrderForDetail(null)}
                className="px-4 py-2 min-h-[44px] rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-sm font-medium"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

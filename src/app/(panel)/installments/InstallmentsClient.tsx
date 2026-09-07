'use client';

import React, { useState } from 'react';
import {
  CalendarClock,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  MessageCircle,
  Printer,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Banknote,
  DollarSign,
  User,
  X,
  Calendar,
  FileCheck,
  Send,
} from 'lucide-react';
import { THEME } from '@/constants/theme';
import { ROUTES } from '@/constants/routes';
import {
  INSTALLMENT_STATUS,
  INSTALLMENT_STATUS_LABELS,
  INSTALLMENT_LIMITS,
  INSTALLMENT_PERIODS,
  INSTALLMENT_DEFAULTS,
} from '@/constants/installment';
import { PAYMENT_METHODS } from '@/constants/kasa';

interface InstallmentItem {
  id: string;
  planId: string;
  installmentNo: number;
  dueDate: string;
  amount: number;
  paidAmount: number;
  status: string;
  paidDate?: string | null;
  paymentMethod?: string | null;
  senetNo?: string | null;
  notes?: string | null;
}

interface InstallmentPlanRecord {
  id: string;
  planNumber: string;
  dealerId: string;
  customerId: string;
  customer: {
    id: string;
    name: string;
    phone?: string | null;
    tcNo?: string | null;
    address?: string | null;
  };
  totalAmount: number;
  downPayment: number;
  remainingAmount: number;
  installmentCount: number;
  status: string;
  notes?: string | null;
  items: InstallmentItem[];
  createdAt: string;
}

interface CustomerOption {
  id: string;
  name: string;
  phone?: string | null;
  tcNo?: string | null;
  address?: string | null;
}

interface InstallmentsClientProps {
  initialPlans: InstallmentPlanRecord[];
  customers: CustomerOption[];
}

export default function InstallmentsClient({
  initialPlans,
  customers,
}: InstallmentsClientProps) {
  const [plans, setPlans] = useState<InstallmentPlanRecord[]>(initialPlans);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [expandedPlanId, setExpandedPlanId] = useState<string | null>(
    initialPlans[0]?.id || null
  );

  // Modallar
  const [isNewPlanModalOpen, setIsNewPlanModalOpen] = useState(false);
  const [payModalItem, setPayModalItem] = useState<{
    plan: InstallmentPlanRecord;
    item: InstallmentItem;
  } | null>(null);
  const [printSenetItem, setPrintSenetItem] = useState<{
    plan: InstallmentPlanRecord;
    item: InstallmentItem;
  } | null>(null);

  // Tahsilat Form State
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<string>(PAYMENT_METHODS.CASH);
  const [isPaying, setIsPaying] = useState(false);

  // Yeni Plan Form State
  const [newCustomerId, setNewCustomerId] = useState('');
  const [newTotalAmount, setNewTotalAmount] = useState<number>(30000);
  const [newDownPayment, setNewDownPayment] = useState<number>(5000);
  const [newInstallmentCount, setNewInstallmentCount] = useState<number>(6);
  const [newFirstDueDate, setNewFirstDueDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [newNotes, setNewNotes] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Filtreleme
  const filteredPlans = plans.filter((p) => {
    const matchesSearch =
      p.customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.planNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.customer.phone && p.customer.phone.includes(searchQuery));

    const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // KPI Hesaplamaları
  const totalSalesAmount = plans.reduce((s, p) => s + p.totalAmount, 0);
  const totalPaidAmount = plans.reduce((s, p) => {
    const itemsPaid = p.items.reduce((is, it) => is + (it.paidAmount || 0), 0);
    return s + p.downPayment + itemsPaid;
  }, 0);
  const totalRemainingDebt = Math.max(0, totalSalesAmount - totalPaidAmount);

  // Gecikmedeki senet sayısı (vadesi geçmiş ve henüz tam ödenmemiş)
  const today = new Date();
  let overdueItemsCount = 0;
  for (const p of plans) {
    for (const it of p.items) {
      if (new Date(it.dueDate) < today && it.status !== INSTALLMENT_STATUS.PAID) {
        overdueItemsCount++;
      }
    }
  }

  // Tahsilat Açma
  const openPayModal = (plan: InstallmentPlanRecord, item: InstallmentItem) => {
    setPayModalItem({ plan, item });
    setPayAmount(Number((item.amount - item.paidAmount).toFixed(2)));
    setPayMethod(PAYMENT_METHODS.CASH);
  };

  // Tahsilatı Gerçekleştir
  const handleExecutePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payModalItem || payAmount <= 0) return;

    setIsPaying(true);
    try {
      const res = await fetch(`${ROUTES.API_INSTALLMENTS}/${payModalItem.plan.id}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: payModalItem.item.id,
          amount: payAmount,
          paymentMethod: payMethod,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Ödeme kaydedilemedi.');
      }

      const resData = await res.json();
      // State'i güncelle
      setPlans((prev) =>
        prev.map((p) => {
          if (p.id !== payModalItem.plan.id) return p;
          const updatedItems = p.items.map((it) =>
            it.id === payModalItem.item.id ? resData.item : it
          );
          const updatedRemaining =
            resData.planRemainingAmount !== undefined
              ? resData.planRemainingAmount
              : Math.max(0, Number((p.remainingAmount - payAmount).toFixed(2)));
          return {
            ...p,
            remainingAmount: updatedRemaining,
            status: resData.planCompleted ? INSTALLMENT_STATUS.PAID : p.status,
            items: updatedItems,
          };
        })
      );

      setPayModalItem(null);
    } catch (err: any) {
      alert(err.message || 'Tahsilat hatası.');
    } finally {
      setIsPaying(false);
    }
  };

  // WhatsApp Vade Hatırlatma Linki
  const handleSendWhatsApp = (plan: InstallmentPlanRecord, item: InstallmentItem) => {
    const rawPhone = plan.customer.phone || '';
    const cleanPhone = rawPhone.replace(/\D/g, '');
    if (!cleanPhone) {
      alert('Müşteriye ait telefon numarası bulunamadı.');
      return;
    }

    const dueDateFormatted = new Date(item.dueDate).toLocaleDateString('tr-TR');
    const remainingAmount = Number((item.amount - item.paidAmount).toFixed(2));
    const message = `Sayın ${plan.customer.name}, KuyumPanel Mücevherat'tan tanzim olunan ${item.senetNo || plan.planNumber} nolu, ${remainingAmount.toLocaleString('tr-TR')} TL tutarlı taksitinizin son ödeme vadesi ${dueDateFormatted}'dir. Bilgilerinize sunar, hayırlı günler dileriz.`;

    const targetPhone = cleanPhone.startsWith('90')
      ? cleanPhone
      : cleanPhone.startsWith('0')
      ? '9' + cleanPhone
      : '90' + cleanPhone;

    const url = `https://wa.me/${targetPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  // Yeni Plan Kaydet
  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerId) {
      alert('Lütfen bir müşteri seçiniz.');
      return;
    }

    setIsCreating(true);
    try {
      const res = await fetch(ROUTES.API_INSTALLMENTS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: newCustomerId,
          totalAmount: newTotalAmount,
          downPayment: newDownPayment,
          installmentCount: newInstallmentCount,
          firstDueDate: newFirstDueDate,
          notes: newNotes,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Plan oluşturulamadı.');
      }

      const created = await res.json();
      setPlans((prev) => [created, ...prev]);
      setIsNewPlanModalOpen(false);
      setExpandedPlanId(created.id);
    } catch (err: any) {
      alert(err.message || 'Hata oluştu.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-[1920px] mx-auto space-y-6">
      {/* Başlık & Üst Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-amber-500/20 pb-5">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <CalendarClock className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Taksitli Satış, Senet & Vade Hatırlatıcı
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Türk Ticaret Kanunu (TTK) uyumlu matbu senetler, WhatsApp otomatik vade bildirimleri ve taksit tahsilatı.
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsNewPlanModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-950 font-bold rounded-xl shadow-lg shadow-amber-500/20 active:scale-95 transition-all text-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Yeni Taksit Planı Oluştur</span>
        </button>
      </div>

      {/* KPI İstatistik Kartları */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-amber-500/20 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold mb-1">
            <span>Toplam Taksitli Satış</span>
            <Banknote className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono">
            {totalSalesAmount.toLocaleString('tr-TR', { maximumFractionDigits: 2 })} ₺
          </div>
          <div className="text-[10px] text-slate-400 mt-1">{plans.length} Plan Açıldı</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-amber-500/20 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold mb-1">
            <span>Tahsil Edilen Tutar</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
            {totalPaidAmount.toLocaleString('tr-TR', { maximumFractionDigits: 2 })} ₺
          </div>
          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 font-semibold">Peşinat + Taksitler</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-amber-500/20 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold mb-1">
            <span>Kalan Açık Senet Alacağı</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">
            {totalRemainingDebt.toLocaleString('tr-TR', { maximumFractionDigits: 2 })} ₺
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Ödenmesi Beklenen</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-amber-500/20 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold mb-1">
            <span>Gecikmedeki Senetler</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400 font-mono">
            {overdueItemsCount} Adet
          </div>
          <div className="text-[10px] text-rose-600 dark:text-rose-400 mt-1 font-semibold">Vadesi Geçen Taksitler</div>
        </div>
      </div>

      {/* Arama & Filtreleme */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-amber-500/20">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Müşteri adı veya plan no ara..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="ALL">Tüm Durumlar</option>
            <option value={INSTALLMENT_STATUS.PENDING}>Açık / Devam Eden</option>
            <option value={INSTALLMENT_STATUS.PAID}>Tamamen Ödenen</option>
          </select>
        </div>
      </div>

      {/* Taksit Planları Listesi (Genişletilebilir Accordion) */}
      <div className="space-y-4">
        {filteredPlans.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-amber-500/20 p-12 text-center text-slate-400 text-xs">
            Kayıtlı taksit planı bulunamadı.
          </div>
        ) : (
          filteredPlans.map((plan) => {
            const isExpanded = expandedPlanId === plan.id;
            const paidSum = plan.items.reduce((s, it) => s + (it.paidAmount || 0), 0) + plan.downPayment;
            const progressPercent = Math.min(100, Math.round((paidSum / plan.totalAmount) * 100));

            return (
              <div
                key={plan.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-amber-500/20 shadow-sm overflow-hidden"
              >
                {/* Plan Başlık Satırı */}
                <div
                  onClick={() => setExpandedPlanId(isExpanded ? null : plan.id)}
                  className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-850/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-slate-900 dark:text-white text-base">
                          {plan.customer.name}
                        </span>
                        <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                          {plan.planNumber}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                        <span>Tel: {plan.customer.phone || 'Girilmedi'}</span>
                        <span>•</span>
                        <span>{plan.installmentCount} Taksit</span>
                        <span>•</span>
                        <span>Oluşturulma: {new Date(plan.createdAt).toLocaleDateString('tr-TR')}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-6">
                    <div className="text-right font-mono">
                      <span className="text-[10px] text-slate-400 block uppercase">Kalan / Toplam Tutar</span>
                      <div className="text-sm font-extrabold text-slate-900 dark:text-white">
                        <span className="text-amber-600 dark:text-amber-400">
                          {(plan.totalAmount - paidSum).toLocaleString('tr-TR')} ₺
                        </span>
                        <span className="text-slate-400 text-xs"> / {plan.totalAmount.toLocaleString('tr-TR')} ₺</span>
                      </div>
                    </div>

                    <div className="w-28 hidden sm:block">
                      <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                        <span>Tahsilat</span>
                        <span className="font-bold">{progressPercent}%</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>

                    <div className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white">
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                  </div>
                </div>

                {/* Genişletilmiş Taksit Kalemleri & Senet Tablosu */}
                {isExpanded && (
                  <div className="border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 p-4 sm:p-6 space-y-4">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
                      <span>Senet & Taksit Ödeme Takvimi</span>
                      <span>Peşinat: {plan.downPayment.toLocaleString('tr-TR')} ₺</span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800 font-bold uppercase text-[10px]">
                          <tr>
                            <th className="p-2.5">Taksit No</th>
                            <th className="p-2.5">Matbu Senet No</th>
                            <th className="p-2.5">Vade Tarihi</th>
                            <th className="p-2.5 text-right">Taksit Tutarı</th>
                            <th className="p-2.5 text-right">Tahsil Edilen</th>
                            <th className="p-2.5 text-center">Durum</th>
                            <th className="p-2.5 text-right">İşlemler</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                          {plan.items.map((item) => {
                            const isPastDue = new Date(item.dueDate) < today && item.status !== INSTALLMENT_STATUS.PAID;
                            const isPaid = item.status === INSTALLMENT_STATUS.PAID;

                            return (
                              <tr
                                key={item.id}
                                className={`hover:bg-amber-500/5 transition-colors ${
                                  isPastDue ? 'bg-rose-500/5' : ''
                                }`}
                              >
                                <td className="p-2.5 font-bold font-mono">
                                  #{item.installmentNo}
                                </td>
                                <td className="p-2.5 font-mono text-amber-600 dark:text-amber-400 font-bold">
                                  {item.senetNo || '-'}
                                </td>
                                <td className="p-2.5 font-mono">
                                  <span className={isPastDue ? 'text-rose-600 dark:text-rose-400 font-bold' : ''}>
                                    {new Date(item.dueDate).toLocaleDateString('tr-TR')}
                                  </span>
                                  {isPastDue && (
                                    <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-rose-500/10 text-rose-600 border border-rose-500/20">
                                      Gecikmede
                                    </span>
                                  )}
                                </td>
                                <td className="p-2.5 text-right font-mono font-bold text-slate-900 dark:text-white">
                                  {item.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                                </td>
                                <td className="p-2.5 text-right font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                                  {item.paidAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                                </td>
                                <td className="p-2.5 text-center">
                                  <span
                                    className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold ${
                                      isPaid
                                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                        : isPastDue
                                        ? 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                                        : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                                    }`}
                                  >
                                    {isPaid
                                      ? 'Ödendi'
                                      : isPastDue
                                      ? 'Vadesi Geçti'
                                      : 'Vadesi Bekliyor'}
                                  </span>
                                </td>
                                <td className="p-2.5 text-right space-x-1.5">
                                  {/* Matbu Senet Yazdır */}
                                  <button
                                    onClick={() => setPrintSenetItem({ plan, item })}
                                    className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-amber-500 hover:bg-amber-500/10 transition-colors"
                                    title="Matbu Bono (Senet) Yazdır"
                                  >
                                    <Printer className="w-3.5 h-3.5" />
                                  </button>

                                  {/* WhatsApp Hatırlatıcı */}
                                  {!isPaid && (
                                    <button
                                      onClick={() => handleSendWhatsApp(plan, item)}
                                      className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 transition-colors"
                                      title="Tek Tıkla WhatsApp Vade Hatırlatıcı Gönder"
                                    >
                                      <MessageCircle className="w-3.5 h-3.5" />
                                    </button>
                                  )}

                                  {/* Tahsilat Butonu */}
                                  {!isPaid && (
                                    <button
                                      onClick={() => openPayModal(plan, item)}
                                      className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-[11px] shadow-sm transition-all"
                                    >
                                      Tahsil Et
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* MODAL 1: YENİ TAKSİT PLANI OLUŞTUR */}
      {isNewPlanModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/70 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-amber-500/30 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden my-6">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50">
              <div className="flex items-center gap-2.5">
                <CalendarClock className="w-5 h-5 text-amber-500" />
                <h3 className="font-extrabold text-slate-900 dark:text-white text-base sm:text-lg">
                  Yeni Taksitli Satış & Senet Planı
                </h3>
              </div>
              <button
                onClick={() => setIsNewPlanModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePlan} className="p-4 sm:p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Müşteri Seçimi *
                </label>
                <select
                  required
                  value={newCustomerId}
                  onChange={(e) => setNewCustomerId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white"
                >
                  <option value="">Müşteri Seçiniz</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.phone ? `(${c.phone})` : ''} - TCKN: {c.tcNo || 'Yok'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Toplam Satış Tutarı (TL) *
                  </label>
                  <input
                    type="number"
                    step="100"
                    required
                    value={newTotalAmount}
                    onChange={(e) => setNewTotalAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Alınan Peşinat (TL)
                  </label>
                  <input
                    type="number"
                    step="100"
                    value={newDownPayment}
                    onChange={(e) => setNewDownPayment(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Taksit Sayısı (2 - 24)
                  </label>
                  <input
                    type="number"
                    min={2}
                    max={24}
                    value={newInstallmentCount}
                    onChange={(e) => setNewInstallmentCount(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    İlk Taksit Vade Tarihi
                  </label>
                  <input
                    type="date"
                    required
                    value={newFirstDueDate}
                    onChange={(e) => setNewFirstDueDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              {/* Taksit Özeti Önizleme */}
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-xs font-mono space-y-1 text-slate-700 dark:text-slate-300">
                <div className="flex justify-between">
                  <span>Taksitlendirilen Kalan Tutar:</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400">
                    {(newTotalAmount - newDownPayment).toLocaleString('tr-TR')} ₺
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Aylık Taksit Tutarı ({newInstallmentCount} Taksit):</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {newInstallmentCount > 0
                      ? ((newTotalAmount - newDownPayment) / newInstallmentCount).toFixed(2)
                      : 0}{' '}
                    ₺ / Ay
                  </span>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  İşlem Notu (Opsiyonel)
                </label>
                <input
                  type="text"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Örn: 22K Burma Bilezik için senet yapıldı"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewPlanModalOpen(false)}
                  className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-5 py-2 text-xs sm:text-sm font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl shadow-lg shadow-amber-500/20 disabled:opacity-50"
                >
                  {isCreating ? 'Oluşturuluyor...' : 'Planı & Senetleri Oluştur'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: TAKSİT TAHSİLATI YAP */}
      {payModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-amber-500/30 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Banknote className="w-5 h-5 text-emerald-500" />
                <h3 className="font-extrabold text-slate-900 dark:text-white text-sm sm:text-base">
                  Taksit Tahsilatı ({payModalItem.item.senetNo})
                </h3>
              </div>
              <button
                onClick={() => setPayModalItem(null)}
                className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExecutePayment} className="p-5 space-y-4">
              <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs space-y-1">
                <p>
                  <strong>Müşteri:</strong> {payModalItem.plan.customer.name}
                </p>
                <p>
                  <strong>Taksit No:</strong> #{payModalItem.item.installmentNo}
                </p>
                <p>
                  <strong>Kalan Tutar:</strong>{' '}
                  <span className="font-bold text-amber-600 dark:text-amber-400">
                    {(payModalItem.item.amount - payModalItem.item.paidAmount).toLocaleString('tr-TR')} ₺
                  </span>
                </p>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Tahsil Edilen Tutar (TL)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white font-mono font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Tahsilat Yöntemi
                </label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white"
                >
                  <option value={PAYMENT_METHODS.CASH}>Nakit Para</option>
                  <option value={PAYMENT_METHODS.CARD}>POS / Kredi Kartı</option>
                  <option value={PAYMENT_METHODS.BANK}>Banka Transferi (Havale/FAST)</option>
                  <option value={PAYMENT_METHODS.HAS}>Has Altın</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPayModalItem(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={isPaying}
                  className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-lg shadow-emerald-600/20 disabled:opacity-50"
                >
                  {isPaying ? 'İşleniyor...' : 'Tahsilatı Onayla'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: TÜRK TİCARET KANUNU (TTK) UYUMLU MATBU SENET (BONO) */}
      {printSenetItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/70 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white text-slate-900 rounded-2xl w-full max-w-3xl shadow-2xl my-6 overflow-hidden print:m-0 print:p-0 print:border-none print:shadow-none">
            {/* Toolbar */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between print:hidden">
              <span className="font-bold text-sm flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-amber-400" />
                Matbu Senet (Bono) Baskı Önizleme (TTK Uyumlu)
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-lg flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" /> Yazdır
                </button>
                <button
                  onClick={() => setPrintSenetItem(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Matbu Senet Gövdesi */}
            <div className="p-8 sm:p-12 space-y-6 bg-amber-50/30 border-4 border-double border-slate-900 font-serif leading-relaxed text-xs">
              {/* Senet Üst Başlığı */}
              <div className="flex justify-between items-center border-b-2 border-slate-900 pb-3 font-sans">
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">SENET (BONO) NO</span>
                  <span className="font-mono font-black text-sm text-slate-900">
                    {printSenetItem.item.senetNo || 'SNT-2026-0001'}
                  </span>
                </div>
                <div className="text-center">
                  <span className="text-xl font-black tracking-widest uppercase border-b-2 border-slate-900 px-4">
                    BONO
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">TUTAR</span>
                  <span className="font-mono font-black text-base text-slate-900">
                    {printSenetItem.item.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL
                  </span>
                </div>
              </div>

              {/* Vade ve Tanzim Tarihi */}
              <div className="grid grid-cols-2 gap-4 border border-slate-300 p-3 bg-white font-sans text-xs">
                <div>
                  <span className="text-slate-500 text-[10px] block">VADE TARİHİ:</span>
                  <span className="font-bold font-mono">
                    {new Date(printSenetItem.item.dueDate).toLocaleDateString('tr-TR')}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block">TANZİM TARİHİ & YERİ:</span>
                  <span className="font-bold font-mono">
                    {new Date(printSenetItem.plan.createdAt).toLocaleDateString('tr-TR')} / {INSTALLMENT_DEFAULTS.CITY}
                  </span>
                </div>
              </div>

              {/* Bono Hukuki Metni */}
              <div className="p-4 bg-white border border-slate-300 rounded text-justify text-xs leading-6">
                İşbu emrühavaleme tanzim olunan bonodur. Vadesi{' '}
                <strong>{new Date(printSenetItem.item.dueDate).toLocaleDateString('tr-TR')}</strong> tarihinde,{' '}
                <strong>KUYUMPANEL MÜCEVHERAT</strong> emrühavalesine yukarıda yazılı yalnız{' '}
                <strong>
                  {printSenetItem.item.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} Türk Lirası
                </strong>{' '}
                ödeyeceğim. Vadesinde tediyesinde temerrüt vaki olduğu takdirde, Türk Ticaret Kanunu hükümleri
                uyarınca müteakip bonoların muacceliyet kesbedeceğini, ihtilaf halinde İstanbul Mahkemeleri ve İcra
                Dairelerinin salahiyetini şimdiden kabul eylerim. Bedeli malen / altın takı mukabilinde ahzolunmuştur.
              </div>

              {/* Borçlu ve İmza Alanı */}
              <div className="grid grid-cols-2 gap-6 pt-4 font-sans text-xs">
                <div className="border border-slate-300 p-3 bg-white rounded space-y-1">
                  <span className="font-bold text-[10px] text-slate-400 uppercase block">ÖDEYECEK (BORÇLU):</span>
                  <p className="font-bold text-slate-900">{printSenetItem.plan.customer.name}</p>
                  <p className="text-slate-600 font-mono text-[11px]">
                    TCKN: {printSenetItem.plan.customer.tcNo || 'Belirtilmedi'}
                  </p>
                  <p className="text-slate-600 text-[11px]">
                    Adres: {printSenetItem.plan.customer.address || 'İstanbul'}
                  </p>
                  <p className="text-slate-600 text-[11px]">Tel: {printSenetItem.plan.customer.phone || '-'}</p>
                </div>

                <div className="border border-slate-300 p-3 bg-white rounded flex flex-col justify-between items-center text-center">
                  <span className="font-bold text-[10px] text-slate-400 uppercase">BORÇLU İMZASI:</span>
                  <div className="w-full border-b border-dashed border-slate-400 my-8" />
                  <span className="text-[10px] text-slate-400">(Islak İmza)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

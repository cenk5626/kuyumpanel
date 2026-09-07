'use client';

import React, { useState } from 'react';
import {
  ShieldCheck,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Plus,
  Filter,
  Eye,
  Check,
  X,
  User,
  ArrowRight,
  Info,
} from 'lucide-react';
import {
  APPROVAL_REQUEST_TYPE,
  APPROVAL_REQUEST_TYPE_LABELS,
  APPROVAL_STATUS,
  APPROVAL_STATUS_LABELS,
  APPROVAL_UNITS,
  APPROVAL_ROLES,
  ApprovalRequestType,
  ApprovalStatus,
  ApprovalUnit,
} from '@/constants/approval';

interface Step {
  id: string;
  stepLevel: number;
  requiredRole: string;
  status: string;
  approverId?: string | null;
  approverName?: string | null;
  approverEmail?: string | null;
  note?: string | null;
  actionAt?: string | null;
}

interface ApprovalItem {
  id: string;
  requestType: ApprovalRequestType;
  status: ApprovalStatus;
  requiredLevel: number;
  currentLevel: number;
  title: string;
  description?: string | null;
  amount?: number | null;
  unit?: string | null;
  payload?: string | null;
  requesterId: string;
  requesterName: string;
  requesterEmail: string;
  rejectionReason?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
  steps: Step[];
}

interface ApprovalsClientProps {
  initialApprovals: ApprovalItem[];
  currentActor: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

export default function ApprovalsClient({
  initialApprovals,
  currentActor,
}: ApprovalsClientProps) {
  const [approvals, setApprovals] = useState<ApprovalItem[]>(initialApprovals);
  const [activeTab, setActiveTab] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');
  const [selectedType, setSelectedType] = useState<string>('ALL');

  // Modal State for Action (Approve / Reject)
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [actionTarget, setActionTarget] = useState<ApprovalItem | null>(null);
  const [actionType, setActionType] = useState<'APPROVE' | 'REJECT'>('APPROVE');
  const [actionNote, setActionNote] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Modal State for New Request
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [newRequestType, setNewRequestType] = useState<ApprovalRequestType>(
    APPROVAL_REQUEST_TYPE.HIGH_DISCOUNT
  );
  const [newTitle, setNewTitle] = useState('');
  const [newAmount, setNewAmount] = useState<string>('');
  const [newUnit, setNewUnit] = useState<ApprovalUnit>(APPROVAL_UNITS.PERCENT);
  const [newDescription, setNewDescription] = useState('');
  const [newLoading, setNewLoading] = useState(false);
  const [newError, setNewError] = useState<string | null>(null);

  // KPI Calculations
  const pendingCount = approvals.filter((a) => a.status === APPROVAL_STATUS.PENDING).length;
  const approvedCount = approvals.filter((a) => a.status === APPROVAL_STATUS.APPROVED).length;
  const rejectedCount = approvals.filter((a) => a.status === APPROVAL_STATUS.REJECTED).length;

  // Filtered List
  const filteredApprovals = approvals.filter((item) => {
    if (activeTab !== 'ALL' && item.status !== activeTab) return false;
    if (selectedType !== 'ALL' && item.requestType !== selectedType) return false;
    return true;
  });

  const openActionModal = (item: ApprovalItem, type: 'APPROVE' | 'REJECT') => {
    setActionTarget(item);
    setActionType(type);
    setActionNote('');
    setActionError(null);
    setActionModalOpen(true);
  };

  const handleExecuteAction = async () => {
    if (!actionTarget) return;

    if (actionType === 'REJECT' && !actionNote.trim()) {
      setActionError('Ret işlemi için lütfen bir gerekçe giriniz.');
      return;
    }

    setActionLoading(true);
    setActionError(null);

    try {
      const res = await fetch(`/api/approvals/${actionTarget.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: actionType,
          note: actionNote,
          rejectionReason: actionType === 'REJECT' ? actionNote : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'İşlem gerçekleştirilemedi.');
      }

      // Update state
      setApprovals((prev) =>
        prev.map((it) => (it.id === actionTarget.id ? data.approval : it))
      );
      setActionModalOpen(false);
    } catch (err: any) {
      setActionError(err.message || 'İşlem sırasında hata oluştu.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      setNewError('Lütfen talep başlığını giriniz.');
      return;
    }

    setNewLoading(true);
    setNewError(null);

    try {
      const res = await fetch('/api/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestType: newRequestType,
          title: newTitle,
          amount: newAmount ? parseFloat(newAmount) : undefined,
          unit: newUnit,
          description: newDescription,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Talep oluşturulamadı.');
      }

      setApprovals((prev) => [data.approval, ...prev]);
      setNewModalOpen(false);
      setNewTitle('');
      setNewAmount('');
      setNewDescription('');
    } catch (err: any) {
      setNewError(err.message || 'Bir hata meydana geldi.');
    } finally {
      setNewLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header & New Request Button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
                Çok Seviyeli Onay ve Denetim Akışı
              </h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
                Dört-Göz Prensibi, Limit Üzeri İskonto ve Yüksek Tutarlı İşlem Kontrolü
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => setNewModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-zinc-950 font-semibold rounded-xl text-sm transition-all shadow-md shadow-amber-500/10 active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Yeni Onay Talebi
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Bekleyen Talepler</span>
            <Clock className="w-5 h-5 text-amber-500" />
          </div>
          <p className="text-3xl font-bold text-zinc-900 dark:text-white mt-2">{pendingCount}</p>
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 font-medium">İnceleme ve Karar Bekliyor</p>
        </div>

        <div className="p-5 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Onaylananlar</span>
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="text-3xl font-bold text-zinc-900 dark:text-white mt-2">{approvedCount}</p>
          <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 font-medium">Yürürlüğe Girdi</p>
        </div>

        <div className="p-5 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Reddedilenler</span>
            <XCircle className="w-5 h-5 text-rose-500" />
          </div>
          <p className="text-3xl font-bold text-zinc-900 dark:text-white mt-2">{rejectedCount}</p>
          <p className="text-xs text-rose-600 dark:text-rose-400 mt-1 font-medium">Gerekçeli Reddedildi</p>
        </div>

        <div className="p-5 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent rounded-2xl border border-amber-500/20 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-amber-800 dark:text-amber-300">4-Göz Güvenliği</span>
            <ShieldCheck className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <p className="text-xl font-bold text-zinc-900 dark:text-white mt-2">Aktif & Denetimli</p>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
            Personel kendi talebini onaylayamaz
          </p>
        </div>
      </div>

      {/* Tabs & Type Filter */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 bg-white dark:bg-zinc-900 p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setActiveTab('PENDING')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === 'PENDING'
                ? 'bg-amber-500 text-zinc-950 shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            Bekleyenler ({pendingCount})
          </button>
          <button
            onClick={() => setActiveTab('APPROVED')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === 'APPROVED'
                ? 'bg-amber-500 text-zinc-950 shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            Onaylananlar ({approvedCount})
          </button>
          <button
            onClick={() => setActiveTab('REJECTED')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === 'REJECTED'
                ? 'bg-amber-500 text-zinc-950 shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            Reddedilenler ({rejectedCount})
          </button>
          <button
            onClick={() => setActiveTab('ALL')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === 'ALL'
                ? 'bg-amber-500 text-zinc-950 shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            Tümü ({approvals.length})
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-zinc-400" />
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
          >
            <option value="ALL">Tüm İşlem Türleri</option>
            {Object.entries(APPROVAL_REQUEST_TYPE).map(([key, val]) => (
              <option key={key} value={val}>
                {APPROVAL_REQUEST_TYPE_LABELS[val as ApprovalRequestType]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Approvals Table / Card List */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
        {filteredApprovals.length === 0 ? (
          <div className="p-12 text-center">
            <ShieldCheck className="w-12 h-12 mx-auto text-zinc-400 dark:text-zinc-600 mb-3" />
            <h3 className="text-base font-semibold text-zinc-800 dark:text-zinc-200">
              Kayıt Bulunamadı
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              Seçilen kriterlere uygun onay talebi mevcut değil.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                  <th className="py-3.5 px-4">Talep No & Tür</th>
                  <th className="py-3.5 px-4">Başlık / Detay</th>
                  <th className="py-3.5 px-4">Miktar / Tutar</th>
                  <th className="py-3.5 px-4">Talep Eden</th>
                  <th className="py-3.5 px-4">Kademe İlerlemesi</th>
                  <th className="py-3.5 px-4">Durum</th>
                  <th className="py-3.5 px-4 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-sm">
                {filteredApprovals.map((item) => {
                  const isRequester =
                    item.requesterEmail.toLowerCase() === currentActor.email.toLowerCase() ||
                    item.requesterId === currentActor.id;

                  const canApprove =
                    item.status === APPROVAL_STATUS.PENDING &&
                    !isRequester &&
                    (item.currentLevel === 2
                      ? currentActor.role === APPROVAL_ROLES.SUPER_ADMIN
                      : currentActor.role === APPROVAL_ROLES.ADMIN ||
                        currentActor.role === APPROVAL_ROLES.SUPER_ADMIN);

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50 transition-colors"
                    >
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className="font-mono text-xs font-bold text-amber-600 dark:text-amber-400">
                          #{item.id.slice(-6).toUpperCase()}
                        </span>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                          {APPROVAL_REQUEST_TYPE_LABELS[item.requestType] || item.requestType}
                        </p>
                      </td>

                      <td className="py-4 px-4 max-w-xs">
                        <p className="font-medium text-zinc-900 dark:text-white truncate">
                          {item.title}
                        </p>
                        {item.description && (
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-1 mt-0.5">
                            {item.description}
                          </p>
                        )}
                        {item.rejectionReason && (
                          <div className="mt-1 flex items-center gap-1 text-xs text-rose-600 dark:text-rose-400 font-medium">
                            <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                            <span>Ret: {item.rejectionReason}</span>
                          </div>
                        )}
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap font-medium text-zinc-900 dark:text-white">
                        {item.amount !== null && item.amount !== undefined ? (
                          <>
                            {item.amount.toLocaleString('tr-TR')}{' '}
                            <span className="text-xs text-zinc-500 font-normal">
                              {item.unit === 'PERCENT' ? '%' : item.unit}
                            </span>
                          </>
                        ) : (
                          <span className="text-zinc-400 text-xs">-</span>
                        )}
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap text-xs">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-zinc-400" />
                          <span className="font-medium text-zinc-800 dark:text-zinc-200">
                            {item.requesterName}
                          </span>
                        </div>
                        <span className="text-zinc-400 text-[11px] block mt-0.5">
                          {new Date(item.createdAt).toLocaleDateString('tr-TR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {item.steps.map((st) => (
                            <span
                              key={st.id}
                              className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                                st.status === APPROVAL_STATUS.APPROVED
                                  ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                                  : st.status === APPROVAL_STATUS.REJECTED
                                  ? 'bg-rose-500/10 text-rose-600 border-rose-500/20'
                                  : st.stepLevel === item.currentLevel
                                  ? 'bg-amber-500/10 text-amber-600 border-amber-500/20 animate-pulse'
                                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 border-zinc-200 dark:border-zinc-700'
                              }`}
                            >
                              K{st.stepLevel}: {st.requiredRole}
                            </span>
                          ))}
                        </div>
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                            item.status === APPROVAL_STATUS.APPROVED
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : item.status === APPROVAL_STATUS.REJECTED
                              ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                              : item.status === APPROVAL_STATUS.CANCELLED
                              ? 'bg-zinc-500/10 text-zinc-500'
                              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                          }`}
                        >
                          {item.status === APPROVAL_STATUS.APPROVED && <CheckCircle2 className="w-3 h-3" />}
                          {item.status === APPROVAL_STATUS.REJECTED && <XCircle className="w-3 h-3" />}
                          {item.status === APPROVAL_STATUS.PENDING && <Clock className="w-3 h-3" />}
                          {APPROVAL_STATUS_LABELS[item.status]}
                        </span>
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap text-right">
                        {item.status === APPROVAL_STATUS.PENDING ? (
                          isRequester ? (
                            <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-1 rounded-md">
                              Kendi Talebiniz (4-Göz)
                            </span>
                          ) : canApprove ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => openActionModal(item, 'APPROVE')}
                                className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium transition-all"
                              >
                                <Check className="w-3.5 h-3.5" />
                                Onayla
                              </button>
                              <button
                                onClick={() => openActionModal(item, 'REJECT')}
                                className="flex items-center gap-1 px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-medium transition-all"
                              >
                                <X className="w-3.5 h-3.5" />
                                Reddet
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-zinc-400">Yetki Yetersiz</span>
                          )
                        ) : (
                          <span className="text-xs text-zinc-400 font-mono">
                            {item.resolvedAt
                              ? new Date(item.resolvedAt).toLocaleDateString('tr-TR')
                              : '-'}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Action Modal (Approve or Reject) */}
      {actionModalOpen && actionTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-md p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className={`p-2 rounded-xl ${
                    actionType === 'APPROVE'
                      ? 'bg-emerald-500/10 text-emerald-600'
                      : 'bg-rose-500/10 text-rose-600'
                  }`}
                >
                  {actionType === 'APPROVE' ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    <XCircle className="w-5 h-5" />
                  )}
                </div>
                <h3 className="font-bold text-zinc-900 dark:text-white">
                  {actionType === 'APPROVE' ? 'Onay Kararı Ver' : 'Talebi Reddet'}
                </h3>
              </div>
              <button
                onClick={() => setActionModalOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl space-y-1 text-xs text-zinc-600 dark:text-zinc-300">
              <p>
                <strong className="text-zinc-900 dark:text-white">Başlık:</strong>{' '}
                {actionTarget.title}
              </p>
              <p>
                <strong className="text-zinc-900 dark:text-white">Talep Eden:</strong>{' '}
                {actionTarget.requesterName} ({actionTarget.requesterEmail})
              </p>
              {actionTarget.amount !== null && (
                <p>
                  <strong className="text-zinc-900 dark:text-white">Tutar/Miktar:</strong>{' '}
                  {actionTarget.amount} {actionTarget.unit}
                </p>
              )}
            </div>

            {actionError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                {actionType === 'APPROVE' ? 'Onay Notu (İsteğe Bağlı)' : 'Ret Gerekçesi (Zorunlu)'}
              </label>
              <textarea
                value={actionNote}
                onChange={(e) => setActionNote(e.target.value)}
                placeholder={
                  actionType === 'APPROVE'
                    ? 'Varsa ek açıklama veya şartlarınızı yazınız...'
                    : 'Lütfen ret nedenini açıkça belirtiniz...'
                }
                rows={3}
                className="w-full text-xs p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActionModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={handleExecuteAction}
                disabled={actionLoading}
                className={`px-4 py-2 text-xs font-semibold text-white rounded-xl transition-all shadow-sm ${
                  actionType === 'APPROVE'
                    ? 'bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400'
                    : 'bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400'
                }`}
              >
                {actionLoading ? 'İşleniyor...' : actionType === 'APPROVE' ? 'Onayla' : 'Reddet'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Request Modal */}
      {newModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <form
            onSubmit={handleCreateRequest}
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-lg p-6 shadow-xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-zinc-900 dark:text-white">
                  Yeni Onay Talebi Başlat
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setNewModalOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {newError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{newError}</span>
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Talep Türü
                </label>
                <select
                  value={newRequestType}
                  onChange={(e) => {
                    const val = e.target.value as ApprovalRequestType;
                    setNewRequestType(val);
                    if (val === APPROVAL_REQUEST_TYPE.HIGH_DISCOUNT) {
                      setNewUnit(APPROVAL_UNITS.PERCENT);
                    } else if (val === APPROVAL_REQUEST_TYPE.CASH_OUTFLOW) {
                      setNewUnit(APPROVAL_UNITS.TL);
                    }
                  }}
                  className="w-full p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                >
                  {Object.entries(APPROVAL_REQUEST_TYPE).map(([k, val]) => (
                    <option key={k} value={val}>
                      {APPROVAL_REQUEST_TYPE_LABELS[val as ApprovalRequestType]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Talep Başlığı / Özeti
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Örn: Müşteri Ahmet Bey için %18 Özel İskonto"
                  className="w-full p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Miktar / Değer
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value)}
                    placeholder="Örn: 18 veya 75000"
                    className="w-full p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Birim
                  </label>
                  <select
                    value={newUnit}
                    onChange={(e) => setNewUnit(e.target.value as ApprovalUnit)}
                    className="w-full p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    <option value={APPROVAL_UNITS.PERCENT}>Yüzde (%)</option>
                    <option value={APPROVAL_UNITS.TL}>Türk Lirası (₺)</option>
                    <option value={APPROVAL_UNITS.HAS_GR}>Gram Has Altın (gr)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Açıklama / Gerekçe
                </label>
                <textarea
                  rows={3}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Neden bu onay talep ediliyor? Detayları belirtiniz..."
                  className="w-full p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-800 dark:text-amber-300 text-[11px] flex items-start gap-2">
                <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>
                  Talebiniz kaydedildikten sonra tanımlı kademelere (Şube Müdürü / Şirket Sahibi)
                  sırasıyla iletilir. Dört-Göz prensibi gereği kendi talebinizi onaylayamazsınız.
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setNewModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl"
              >
                Vazgeç
              </button>
              <button
                type="submit"
                disabled={newLoading}
                className="px-4 py-2 text-xs font-semibold text-zinc-950 bg-amber-500 hover:bg-amber-600 rounded-xl transition-all shadow-sm disabled:opacity-50"
              >
                {newLoading ? 'Oluşturuluyor...' : 'Onaya Gönder'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

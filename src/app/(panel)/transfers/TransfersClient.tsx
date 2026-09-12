'use client';

import React, { useState } from 'react';
import {
  ArrowRightLeft,
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
  Scan,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import {
  TRANSFER_STATUS,
  TRANSFER_STATUS_LABELS,
  TransferStatus,
  TRANSFER_LIMITS,
} from '@/constants/branch';
import { THEME } from '@/constants/theme';
import PageHeader from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import LuxuryTabs from '@/components/LuxuryTabs';
import TransferPrintModal from './TransferPrintModal';

interface TransferLine {
  id: string;
  productItemId?: string | null;
  productTitle: string;
  barcode?: string | null;
  quantity: number;
  weight?: number | null;
  carat?: number | null;
  receivedQuantity?: number | null;
  notes?: string | null;
}

interface TransferItem {
  id: string;
  transferNumber: string;
  dealerId: string;
  fromBranchId: string;
  toBranchId: string;
  status: string;
  requestedBy: string;
  approvedBy?: string | null;
  shippedAt?: string | null;
  receivedAt?: string | null;
  notes?: string | null;
  discrepancyNotes?: string | null;
  createdAt: string;
  updatedAt: string;
  fromBranch: { id: string; name: string; code: string; phone?: string | null };
  toBranch: { id: string; name: string; code: string; phone?: string | null };
  lines: TransferLine[];
}

interface Branch {
  id: string;
  name: string;
  code: string;
  isDefault: boolean;
}

interface ProductItem {
  id: string;
  barcode: string;
  title: string;
  weight?: number | null;
  carat?: number | null;
  branchId?: string | null;
}

interface TransfersClientProps {
  initialTransfers: TransferItem[];
  branches: Branch[];
  availableItems: ProductItem[];
  currentUserRole: string;
  defaultBranchId?: string;
}

export default function TransfersClient({
  initialTransfers,
  branches,
  availableItems,
  defaultBranchId,
}: TransfersClientProps) {
  const [transfers, setTransfers] = useState<TransferItem[]>(initialTransfers);
  const [activeTab, setActiveTab] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedTransferId, setExpandedTransferId] = useState<string | null>(null);
  const [printTransfer, setPrintTransfer] = useState<TransferItem | null>(null);

  // Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isReceivingModalOpen, setIsReceivingModalOpen] = useState(false);
  const [selectedTransferForAction, setSelectedTransferForAction] = useState<TransferItem | null>(null);
  const [actionDiscrepancyNotes, setActionDiscrepancyNotes] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // New Transfer Form
  const [fromBranchId, setFromBranchId] = useState(defaultBranchId || branches[0]?.id || '');
  const [toBranchId, setToBranchId] = useState(branches.find((b) => b.id !== defaultBranchId)?.id || '');
  const [transferNotes, setTransferNotes] = useState('');
  const [selectedLines, setSelectedLines] = useState<
    {
      productItemId?: string;
      barcode: string;
      productTitle: string;
      quantity: number;
      weight: number;
      carat: number;
      notes?: string;
    }[]
  >([]);
  const [barcodeInput, setBarcodeInput] = useState('');

  // Status Filter Tabs
  const tabs = [
    { id: 'ALL', label: 'Tüm Transferler', count: transfers.length },
    { id: TRANSFER_STATUS.DRAFT, label: 'Taslak', count: transfers.filter((t) => t.status === TRANSFER_STATUS.DRAFT).length },
    { id: TRANSFER_STATUS.APPROVED, label: 'Onaylanan', count: transfers.filter((t) => t.status === TRANSFER_STATUS.APPROVED).length },
    { id: TRANSFER_STATUS.SHIPPED, label: 'Yolda (Sevk)', count: transfers.filter((t) => t.status === TRANSFER_STATUS.SHIPPED).length },
    { id: TRANSFER_STATUS.RECEIVED, label: 'Teslim Alınan', count: transfers.filter((t) => t.status === TRANSFER_STATUS.RECEIVED).length },
    { id: 'CANCELLED_OR_REJECTED', label: 'İptal / Red', count: transfers.filter((t) => t.status === TRANSFER_STATUS.CANCELLED || t.status === TRANSFER_STATUS.REJECTED).length },
  ];

  const filteredTransfers = transfers.filter((t) => {
    if (activeTab === 'CANCELLED_OR_REJECTED') {
      if (t.status !== TRANSFER_STATUS.CANCELLED && t.status !== TRANSFER_STATUS.REJECTED) return false;
    } else if (activeTab !== 'ALL' && t.status !== activeTab) {
      return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchesNum = t.transferNumber.toLowerCase().includes(q);
      const matchesFrom = t.fromBranch.name.toLowerCase().includes(q) || t.fromBranch.code.toLowerCase().includes(q);
      const matchesTo = t.toBranch.name.toLowerCase().includes(q) || t.toBranch.code.toLowerCase().includes(q);
      const matchesBarcode = t.lines.some((l) => (l.barcode ? l.barcode.toLowerCase().includes(q) : false) || l.productTitle.toLowerCase().includes(q));
      return matchesNum || matchesFrom || matchesTo || matchesBarcode;
    }

    return true;
  });

  // KPI calculations
  const pendingApprovalCount = transfers.filter((t) => t.status === TRANSFER_STATUS.DRAFT).length;
  const inTransitCount = transfers.filter((t) => t.status === TRANSFER_STATUS.SHIPPED).length;
  const completedCount = transfers.filter((t) => t.status === TRANSFER_STATUS.RECEIVED).length;
  const totalCount = transfers.length;

  const handleAddBarcode = (barcodeToFind: string) => {
    const trimmed = barcodeToFind.trim();
    if (!trimmed) return;

    if (selectedLines.some((l) => l.barcode.toLowerCase() === trimmed.toLowerCase())) {
      setErrorMessage('Bu ürün zaten transfer listesine eklendi.');
      return;
    }

    const matched = availableItems.find(
      (item) => item.barcode.toLowerCase() === trimmed.toLowerCase()
    );

    if (matched) {
      setSelectedLines((prev) => [
        ...prev,
        {
          productItemId: matched.id,
          barcode: matched.barcode,
          productTitle: matched.title,
          quantity: 1,
          weight: Number(matched.weight || 0),
          carat: Number(matched.carat || 14),
        },
      ]);
      setBarcodeInput('');
      setErrorMessage(null);
    } else {
      setSelectedLines((prev) => [
        ...prev,
        {
          barcode: trimmed,
          productTitle: `Ürün (${trimmed})`,
          quantity: 1,
          weight: 0,
          carat: 14,
        },
      ]);
      setBarcodeInput('');
      setErrorMessage(null);
    }
  };

  const handleRemoveLine = (idx: number) => {
    setSelectedLines((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleCreateTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      if (fromBranchId === toBranchId) {
        throw new Error('Çıkış ve varış şubesi aynı olamaz.');
      }

      if (selectedLines.length === 0) {
        throw new Error('Lütfen transfer edilecek en az bir ürün ekleyin.');
      }

      const res = await fetch('/api/transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromBranchId,
          toBranchId,
          notes: transferNotes,
          lines: selectedLines,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Transfer oluşturulamadı.');
      }

      setTransfers((prev) => [data.transfer, ...prev]);
      setIsCreateModalOpen(false);
      setSelectedLines([]);
      setTransferNotes('');
      setSuccessMessage(`${data.transfer.transferNumber} transferi başarıyla oluşturuldu.`);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusAction = async (
    transferId: string,
    action: 'APPROVE' | 'SHIP' | 'RECEIVE' | 'CANCEL' | 'REJECT',
    discrepancyNotes?: string
  ) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/transfers/${transferId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, discrepancyNotes }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'İşlem gerçekleştirilemedi.');
      }

      setTransfers((prev) =>
        prev.map((t) => (t.id === transferId ? { ...t, ...data.transfer } : t))
      );

      setIsReceivingModalOpen(false);
      setSelectedTransferForAction(null);
      setActionDiscrepancyNotes('');
      setSuccessMessage(`Transfer durumu güncellendi: ${data.transfer.status}`);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTransfer = async (transfer: TransferItem) => {
    if (transfer.status !== TRANSFER_STATUS.DRAFT) {
      alert('Yalnızca taslak durumundaki transferler silinebilir.');
      return;
    }

    if (!confirm(`${transfer.transferNumber} numaralı taslak transferi silmek istediğinize emin misiniz?`)) {
      return;
    }

    try {
      setIsLoading(true);
      const res = await fetch(`/api/transfers/${transfer.id}`, { method: 'DELETE' });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Silinemedi.');

      setTransfers((prev) => prev.filter((t) => t.id !== transfer.id));
      setSuccessMessage('Transfer başarıyla silindi.');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Üst Başlık & Aksiyon Butonu */}
      <PageHeader
        title="Şubeler Arası Transfer"
        subtitle="Şubeler arasında kontrollü, barkodlu ürün ve stok transferi takip sistemi"
        icon={ArrowRightLeft}
        badges={[
          { label: `${pendingApprovalCount} Onay Bekliyor`, variant: pendingApprovalCount > 0 ? 'warning' : 'neutral' },
          { label: `${inTransitCount} Yolda`, variant: inTransitCount > 0 ? 'info' : 'neutral' },
        ]}
        actions={
          <button
            onClick={() => {
              setIsCreateModalOpen(true);
              setErrorMessage(null);
            }}
            className={`${THEME.BTN_PRIMARY} min-h-[44px] flex items-center justify-center gap-2`}
          >
            <Plus className="w-4 h-4" />
            <span>Yeni Transfer Başlat</span>
          </button>
        }
      />

      {/* Başarı Bildirimi */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          {successMessage}
        </div>
      )}

      {/* KPI Kartları */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Onay Bekleyen"
          value={pendingApprovalCount}
          subtitle="Taslak transfer sayısı"
          icon={Clock}
          iconColor="gold"
        />
        <StatCard
          title="Yoldaki Sevkiyat"
          value={inTransitCount}
          subtitle="Teslimat bekleyen ürünler"
          icon={Truck}
          iconColor="purple"
        />
        <StatCard
          title="Tamamlanan"
          value={completedCount}
          subtitle="Başarıyla teslim alınanlar"
          icon={PackageCheck}
          iconColor="emerald"
        />
        <StatCard
          title="Toplam Transfer"
          value={totalCount}
          subtitle="Tüm şube hareketleri"
          icon={ArrowRightLeft}
          iconColor="blue"
        />
      </div>

      {/* Filtre Sekmeleri & Arama */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <LuxuryTabs
          tabs={tabs}
          activeTab={activeTab}
          onChange={setActiveTab}
        />

        <div className="relative w-full md:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder="No, şube, barkod ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-10 pr-4 min-h-[44px] ${THEME.INPUT}`}
          />
        </div>
      </div>

      {/* Transfer Listesi Tablosu */}
      <div className={THEME.TABLE.CONTAINER}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className={THEME.TABLE.HEADER}>
              <tr>
                <th className={THEME.TABLE.TH}>Transfer No</th>
                <th className={THEME.TABLE.TH}>Çıkış (Kaynak)</th>
                <th className={THEME.TABLE.TH}>Varış (Hedef)</th>
                <th className={`${THEME.TABLE.TH} text-center`}>Kalem / Adet</th>
                <th className={`${THEME.TABLE.TH} text-right`}>Toplam Gram</th>
                <th className={THEME.TABLE.TH}>Durum</th>
                <th className={THEME.TABLE.TH}>Tarih</th>
                <th className={`${THEME.TABLE.TH} text-right`}>İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredTransfers.map((tr) => {
                const isExpanded = expandedTransferId === tr.id;
                const statusMeta =
                  TRANSFER_STATUS_LABELS[tr.status as TransferStatus] || {
                    label: tr.status,
                    color: 'text-slate-500',
                    bg: 'bg-slate-500/10',
                  };
                const totalWeight = tr.lines.reduce((acc, l) => acc + (l.weight || 0), 0);
                const totalQty = tr.lines.reduce((acc, l) => acc + (l.quantity || 1), 0);

                return (
                  <React.Fragment key={tr.id}>
                    <tr className={THEME.TABLE.ROW}>
                      <td className={`${THEME.TABLE.TD} font-mono font-bold text-slate-900 dark:text-slate-100`}>
                        {tr.transferNumber}
                      </td>
                      <td className={`${THEME.TABLE.TD} font-medium text-slate-800 dark:text-slate-200`}>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 mr-1.5 border border-slate-200 dark:border-slate-700">
                          {tr.fromBranch.code}
                        </span>
                        {tr.fromBranch.name}
                      </td>
                      <td className={`${THEME.TABLE.TD} font-medium text-slate-800 dark:text-slate-200`}>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 mr-1.5 border border-slate-200 dark:border-slate-700">
                          {tr.toBranch.code}
                        </span>
                        {tr.toBranch.name}
                      </td>
                      <td className={`${THEME.TABLE.TD} text-center font-semibold text-slate-700 dark:text-slate-300`}>
                        {tr.lines.length} Kalem / {totalQty} Adet
                      </td>
                      <td className={`${THEME.TABLE.TD} text-right font-mono font-bold text-slate-900 dark:text-slate-100`}>
                        {totalWeight.toFixed(2)} gr
                      </td>
                      <td className={THEME.TABLE.TD}>
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold ${statusMeta.color} ${statusMeta.bg}`}
                        >
                          {statusMeta.label}
                        </span>
                      </td>
                      <td className={`${THEME.TABLE.TD} text-slate-500 dark:text-slate-400`}>
                        {new Date(tr.createdAt).toLocaleDateString('tr-TR')}
                      </td>
                      <td className={`${THEME.TABLE.TD} text-right`}>
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Durum İlerletme Butonları */}
                          {tr.status === TRANSFER_STATUS.DRAFT && (
                            <>
                              <button
                                onClick={() => handleStatusAction(tr.id, 'APPROVE')}
                                className="min-h-[36px] px-3 py-1.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500 hover:text-white font-semibold transition-colors flex items-center justify-center text-xs"
                                title="Transferi Onayla"
                              >
                                Onayla
                              </button>
                              <button
                                onClick={() => handleDeleteTransfer(tr)}
                                className="min-h-[36px] min-w-[36px] p-2 rounded-xl text-rose-500 hover:bg-rose-500/10 transition-colors flex items-center justify-center"
                                title="Taslağı Sil"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}

                          {tr.status === TRANSFER_STATUS.APPROVED && (
                            <button
                              onClick={() => handleStatusAction(tr.id, 'SHIP')}
                              className="min-h-[36px] px-3 py-1.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500 hover:text-white font-semibold transition-colors flex items-center justify-center gap-1 text-xs"
                              title="Ürünleri Sevk Et"
                            >
                              <Truck className="w-3.5 h-3.5" />
                              Sevk Et
                            </button>
                          )}

                          {tr.status === TRANSFER_STATUS.SHIPPED && (
                            <>
                              <button
                                onClick={() => {
                                  setSelectedTransferForAction(tr);
                                  setIsReceivingModalOpen(true);
                                }}
                                className="min-h-[36px] px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white font-semibold transition-colors flex items-center justify-center gap-1 text-xs"
                                title="Teslim Al ve Stoğa Geçir"
                              >
                                <PackageCheck className="w-3.5 h-3.5" />
                                Teslim Al
                              </button>
                              <button
                                onClick={() => handleStatusAction(tr.id, 'REJECT')}
                                className="min-h-[36px] px-2.5 py-1.5 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500 hover:text-white text-[11px] font-semibold transition-colors flex items-center justify-center"
                                title="Reddet ve Geri Gönder"
                              >
                                Reddet
                              </button>
                            </>
                          )}

                          {/* Sevk İrsaliyesi Yazdır */}
                          <button
                            onClick={() => setPrintTransfer(tr)}
                            className="min-h-[36px] min-w-[36px] p-2 rounded-xl text-slate-500 hover:text-amber-500 hover:bg-amber-500/10 transition-colors flex items-center justify-center"
                            title="Sevk İrsaliyesi Yazdır"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          {/* Genişlet / Detay */}
                          <button
                            onClick={() =>
                              setExpandedTransferId(isExpanded ? null : tr.id)
                            }
                            className="min-h-[36px] min-w-[36px] p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors flex items-center justify-center"
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Genişletilmiş Detay Satırı */}
                    {isExpanded && (
                      <tr className="bg-slate-50/80 dark:bg-slate-950/40">
                        <td colSpan={8} className="p-4">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                              <div>
                                <span className="font-semibold text-slate-800 dark:text-slate-200">
                                  Talep Eden:
                                </span>{' '}
                                {tr.requestedBy}
                                {tr.approvedBy && (
                                  <span className="ml-3">
                                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                                      Onaylayan:
                                    </span>{' '}
                                    {tr.approvedBy}
                                  </span>
                                )}
                              </div>
                              {tr.notes && (
                                <div className="italic">
                                  <span className="font-semibold not-italic">Not:</span> {tr.notes}
                                </div>
                              )}
                            </div>

                            {tr.discrepancyNotes && (
                              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                                <span>
                                  <strong>Teslimat Mutabakat Farkı / Açıklama:</strong>{' '}
                                  {tr.discrepancyNotes}
                                </span>
                              </div>
                            )}

                            {/* Kalemler Tablosu */}
                            <div className="border border-slate-200 dark:border-amber-500/20 rounded-xl overflow-hidden">
                              <table className="w-full text-left text-xs">
                                <thead className="bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 font-semibold">
                                  <tr>
                                    <th className="py-2 px-3">Barkod</th>
                                    <th className="py-2 px-3">Ürün Tanımı</th>
                                    <th className="py-2 px-3 text-center">Ayar</th>
                                    <th className="py-2 px-3 text-right">Gramaj</th>
                                    <th className="py-2 px-3 text-center">Miktar</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                  {tr.lines.map((line) => (
                                    <tr key={line.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                      <td className="py-2 px-3 font-mono font-bold text-slate-900 dark:text-slate-100">
                                        {line.barcode}
                                      </td>
                                      <td className="py-2 px-3 text-slate-700 dark:text-slate-300">
                                        {line.productTitle}
                                      </td>
                                      <td className="py-2 px-3 text-center text-slate-500">
                                        {line.carat ? `${line.carat}K` : '-'}
                                      </td>
                                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                                        {Number(line.weight || 0).toFixed(2)} gr
                                      </td>
                                      <td className="py-2 px-3 text-center text-slate-700 dark:text-slate-300">
                                        {line.quantity} Adet
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

              {filteredTransfers.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400 dark:text-slate-500">
                    <ArrowRightLeft className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
                    <p className="text-base font-semibold text-slate-700 dark:text-slate-300">Transfer kaydı bulunamadı.</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Yeni bir transfer talebi başlatarak ürünleri şubeler arasında sevk edebilirsiniz.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Yeni Transfer Oluşturma Modalı */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-amber-500/20 shadow-2xl overflow-hidden animate-in zoom-in-95 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-amber-500/20 flex-shrink-0">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-amber-500" />
                Yeni Şubeler Arası Transfer Talebi
              </h2>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="min-h-[44px] min-w-[44px] p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTransfer} className="p-6 space-y-4 overflow-y-auto flex-1">
              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {errorMessage}
                </div>
              )}

              {/* Kaynak ve Hedef Şube */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Çıkış Şubesi (Kaynak) *
                  </label>
                  <select
                    value={fromBranchId}
                    onChange={(e) => setFromBranchId(e.target.value)}
                    className={`w-full ${THEME.INPUT}`}
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Varış Şubesi (Hedef) *
                  </label>
                  <select
                    value={toBranchId}
                    onChange={(e) => setToBranchId(e.target.value)}
                    className={`w-full ${THEME.INPUT}`}
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id} disabled={b.id === fromBranchId}>
                        {b.name} ({b.code}) {b.id === fromBranchId ? '(Aynı Şube Seçilemez)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Barkod Okutma & Ekleme */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-amber-500/20 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Scan className="w-4 h-4 text-amber-500" />
                    Barkod ile Ürün Ekle
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Mevcut Stoktan veya Manuel Barkod
                  </span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Barkod okutun veya yazıp Enter'a basın..."
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddBarcode(barcodeInput);
                      }
                    }}
                    className={`flex-1 min-h-[44px] font-mono ${THEME.INPUT}`}
                  />
                  <button
                    type="button"
                    onClick={() => handleAddBarcode(barcodeInput)}
                    className="min-h-[44px] px-4 rounded-xl bg-slate-800 dark:bg-slate-700 text-slate-100 text-xs font-semibold hover:bg-slate-700 dark:hover:bg-slate-600 transition-colors"
                  >
                    Ekle
                  </button>
                </div>
              </div>

              {/* Eklenen Kalemler Tablosu */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Transfer Edilecek Ürünler ({selectedLines.length})
                  </span>
                  {selectedLines.length > 0 && (
                    <span className="text-xs font-mono font-bold text-amber-500">
                      Toplam: {selectedLines.reduce((acc, l) => acc + l.weight, 0).toFixed(2)} gr
                    </span>
                  )}
                </div>

                {selectedLines.length === 0 ? (
                  <div className="py-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-slate-400 text-xs">
                    Henüz transfer kalemi eklenmedi. Yukarıdaki barkod alanından okutunuz.
                  </div>
                ) : (
                  <div className="max-h-48 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-100 dark:divide-slate-800">
                    {selectedLines.map((line, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2.5 text-xs hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      >
                        <div>
                          <span className="font-mono font-bold text-slate-900 dark:text-slate-100 mr-2">
                            {line.barcode}
                          </span>
                          <span className="text-slate-700 dark:text-slate-300">{line.productTitle}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                            {line.weight.toFixed(2)} gr
                          </span>
                          <span className="text-slate-500">{line.carat}K</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveLine(idx)}
                            className="min-h-[44px] min-w-[44px] p-1 rounded hover:text-rose-500 transition-colors flex items-center justify-center"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Transfer Notu */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Sevk Açıklaması / Notu
                </label>
                <textarea
                  rows={2}
                  maxLength={TRANSFER_LIMITS.MAX_NOTES_LENGTH}
                  value={transferNotes}
                  onChange={(e) => setTransferNotes(e.target.value)}
                  placeholder="Örn: Vitrin yenileme için 14K bilezik transferi..."
                  className={`w-full resize-none ${THEME.INPUT}`}
                />
              </div>

              {/* Butonlar */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  disabled={isLoading}
                  className={`${THEME.BTN_SECONDARY} min-h-[44px]`}
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={isLoading || selectedLines.length === 0}
                  className={`${THEME.BTN_PRIMARY} min-h-[44px] flex items-center gap-2`}
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Transfer Talebi Oluştur
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Teslim Alma & Mutabakat Modalı */}
      {isReceivingModalOpen && selectedTransferForAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-amber-500/20 shadow-2xl p-6 animate-in zoom-in-95 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <PackageCheck className="w-5 h-5 text-emerald-500" />
              Sevkiyatı Teslim Al
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              <strong>{selectedTransferForAction.transferNumber}</strong> nolu transfer kapsamındaki{' '}
              {selectedTransferForAction.lines.length} adet ürün, hedef şubenin (
              {selectedTransferForAction.toBranch.name}) aktif stoğuna geçirilecektir.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Eksik / Hasar / Sayım Farkı Notu (Varsa)
              </label>
              <textarea
                rows={3}
                value={actionDiscrepancyNotes}
                onChange={(e) => setActionDiscrepancyNotes(e.target.value)}
                placeholder="Örn: Tüm ürünler eksiksiz teslim alındı..."
                className={`w-full resize-none ${THEME.INPUT}`}
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsReceivingModalOpen(false);
                  setSelectedTransferForAction(null);
                }}
                className={`${THEME.BTN_SECONDARY} min-h-[44px]`}
              >
                Vazgeç
              </button>
              <button
                type="button"
                disabled={isLoading}
                onClick={() =>
                  handleStatusAction(
                    selectedTransferForAction.id,
                    'RECEIVE',
                    actionDiscrepancyNotes
                  )
                }
                className="min-h-[44px] inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white text-xs font-semibold shadow-md shadow-emerald-500/20 transition-all disabled:opacity-50"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Teslimatı Onayla ve Stoğa Al
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Matbu Sevk İrsaliyesi Yazdırma Modalı */}
      {printTransfer && (
        <TransferPrintModal
          transfer={printTransfer}
          onClose={() => setPrintTransfer(null)}
        />
      )}
    </div>
  );
}

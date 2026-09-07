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
  FileText,
  AlertCircle,
} from 'lucide-react';
import {
  TRANSFER_STATUS,
  TRANSFER_STATUS_LABELS,
  TransferStatus,
  TRANSFER_LIMITS,
} from '@/constants/branch';
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
    { id: 'ALL', label: 'Tüm Transferler' },
    { id: TRANSFER_STATUS.DRAFT, label: 'Taslak' },
    { id: TRANSFER_STATUS.APPROVED, label: 'Onaylanan' },
    { id: TRANSFER_STATUS.SHIPPED, label: 'Yolda (Sevk)' },
    { id: TRANSFER_STATUS.RECEIVED, label: 'Teslim Alınan' },
    { id: 'CANCELLED_OR_REJECTED', label: 'İptal / Red' },
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
      // Barkod bulunamadıysa serbest giriş imkanı sun
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <ArrowRightLeft className="w-7 h-7 text-amber-500" />
            Şubeler Arası Transfer
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Şubeler arasında kontrollü, barkodlu ürün ve stok transferi takip sistemi
          </p>
        </div>
        <button
          onClick={() => {
            setIsCreateModalOpen(true);
            setErrorMessage(null);
          }}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-zinc-950 font-semibold shadow-lg shadow-amber-500/20 transition-all text-sm"
        >
          <Plus className="w-4 h-4" />
          Yeni Transfer Başlat
        </button>
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
              Onay Bekleyen
            </span>
            <Clock className="w-5 h-5 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-2">
            {pendingApprovalCount}
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Taslak transfer sayısı</p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Yoldaki Sevkiyat
            </span>
            <Truck className="w-5 h-5 text-purple-500" />
          </div>
          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-2">{inTransitCount}</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Teslimat bekleyen ürünler</p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Tamamlanan
            </span>
            <PackageCheck className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-2">{completedCount}</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Başarıyla teslim alınanlar</p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Toplam Transfer
            </span>
            <ArrowRightLeft className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-2">{totalCount}</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Tüm şube hareketleri</p>
        </div>
      </div>

      {/* Filtre Sekmeleri & Arama */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/10'
                  : 'bg-zinc-100 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            placeholder="No, şube, barkod ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
          />
        </div>
      </div>

      {/* Transfer Listesi Tablosu */}
      <div className="overflow-hidden rounded-2xl bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/60 text-zinc-500 dark:text-zinc-400 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Transfer No</th>
                <th className="py-3 px-4">Çıkış (Kaynak)</th>
                <th className="py-3 px-4">Varış (Hedef)</th>
                <th className="py-3 px-4 text-center">Kalem / Adet</th>
                <th className="py-3 px-4 text-right">Toplam Gram</th>
                <th className="py-3 px-4">Durum</th>
                <th className="py-3 px-4">Tarih</th>
                <th className="py-3 px-4 text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {filteredTransfers.map((tr) => {
                const isExpanded = expandedTransferId === tr.id;
                const statusMeta =
                  TRANSFER_STATUS_LABELS[tr.status as TransferStatus] || {
                    label: tr.status,
                    color: 'text-zinc-500',
                    bg: 'bg-zinc-500/10',
                  };
                const totalWeight = tr.lines.reduce((acc, l) => acc + (l.weight || 0), 0);
                const totalQty = tr.lines.reduce((acc, l) => acc + (l.quantity || 1), 0);

                return (
                  <React.Fragment key={tr.id}>
                    <tr className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-zinc-900 dark:text-zinc-100">
                        {tr.transferNumber}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-zinc-800 dark:text-zinc-200">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 mr-1.5 border border-zinc-200 dark:border-zinc-700">
                          {tr.fromBranch.code}
                        </span>
                        {tr.fromBranch.name}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-zinc-800 dark:text-zinc-200">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 mr-1.5 border border-zinc-200 dark:border-zinc-700">
                          {tr.toBranch.code}
                        </span>
                        {tr.toBranch.name}
                      </td>
                      <td className="py-3.5 px-4 text-center font-semibold text-zinc-700 dark:text-zinc-300">
                        {tr.lines.length} Kalem / {totalQty} Adet
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-zinc-900 dark:text-zinc-100">
                        {totalWeight.toFixed(2)} gr
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold ${statusMeta.color} ${statusMeta.bg}`}
                        >
                          {statusMeta.label}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-zinc-500 dark:text-zinc-400">
                        {new Date(tr.createdAt).toLocaleDateString('tr-TR')}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Durum İlerletme Butonları */}
                          {tr.status === TRANSFER_STATUS.DRAFT && (
                            <>
                              <button
                                onClick={() => handleStatusAction(tr.id, 'APPROVE')}
                                className="px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-600 hover:bg-blue-500 hover:text-white font-semibold transition-colors"
                                title="Transferi Onayla"
                              >
                                Onayla
                              </button>
                              <button
                                onClick={() => handleDeleteTransfer(tr)}
                                className="p-1 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors"
                                title="Taslağı Sil"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}

                          {tr.status === TRANSFER_STATUS.APPROVED && (
                            <button
                              onClick={() => handleStatusAction(tr.id, 'SHIP')}
                              className="px-2.5 py-1 rounded-lg bg-purple-500/10 text-purple-600 hover:bg-purple-500 hover:text-white font-semibold transition-colors flex items-center gap-1"
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
                                className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white font-semibold transition-colors flex items-center gap-1"
                                title="Teslim Al ve Stoğa Geçir"
                              >
                                <PackageCheck className="w-3.5 h-3.5" />
                                Teslim Al
                              </button>
                              <button
                                onClick={() => handleStatusAction(tr.id, 'REJECT')}
                                className="px-2 py-1 rounded-lg bg-rose-500/10 text-rose-600 hover:bg-rose-500 hover:text-white text-[11px] font-semibold transition-colors"
                                title="Reddet ve Geri Gönder"
                              >
                                Reddet
                              </button>
                            </>
                          )}

                          {/* Sevk İrsaliyesi Yazdır */}
                          <button
                            onClick={() => setPrintTransfer(tr)}
                            className="p-1.5 rounded-lg text-zinc-500 hover:text-amber-500 hover:bg-amber-500/10 transition-colors"
                            title="Sevk İrsaliyesi Yazdır"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          {/* Genişlet / Detay */}
                          <button
                            onClick={() =>
                              setExpandedTransferId(isExpanded ? null : tr.id)
                            }
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
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
                      <tr className="bg-zinc-50/80 dark:bg-zinc-950/40">
                        <td colSpan={8} className="p-4">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                              <div>
                                <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                                  Talep Eden:
                                </span>{' '}
                                {tr.requestedBy}
                                {tr.approvedBy && (
                                  <span className="ml-3">
                                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">
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
                            <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                              <table className="w-full text-left text-xs">
                                <thead className="bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 font-semibold">
                                  <tr>
                                    <th className="py-2 px-3">Barkod</th>
                                    <th className="py-2 px-3">Ürün Tanımı</th>
                                    <th className="py-2 px-3 text-center">Ayar</th>
                                    <th className="py-2 px-3 text-right">Gramaj</th>
                                    <th className="py-2 px-3 text-center">Miktar</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                                  {tr.lines.map((line) => (
                                    <tr key={line.id}>
                                      <td className="py-2 px-3 font-mono font-bold text-zinc-900 dark:text-zinc-100">
                                        {line.barcode}
                                      </td>
                                      <td className="py-2 px-3 text-zinc-700 dark:text-zinc-300">
                                        {line.productTitle}
                                      </td>
                                      <td className="py-2 px-3 text-center text-zinc-500">
                                        {line.carat ? `${line.carat}K` : '-'}
                                      </td>
                                      <td className="py-2 px-3 text-right font-mono font-bold text-zinc-900 dark:text-zinc-100">
                                        {Number(line.weight || 0).toFixed(2)} gr
                                      </td>
                                      <td className="py-2 px-3 text-center text-zinc-700 dark:text-zinc-300">
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
                  <td colSpan={8} className="py-16 text-center text-zinc-400">
                    <ArrowRightLeft className="w-12 h-12 mx-auto text-zinc-300 dark:text-zinc-700 mb-3" />
                    <p className="text-base font-semibold">Transfer kaydı bulunamadı.</p>
                    <p className="text-xs text-zinc-500 mt-1">
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
          <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden animate-in zoom-in-95 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex-shrink-0">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-amber-500" />
                Yeni Şubeler Arası Transfer Talebi
              </h2>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
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
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Çıkış Şubesi (Kaynak) *
                  </label>
                  <select
                    value={fromBranchId}
                    onChange={(e) => setFromBranchId(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-900 dark:text-zinc-100"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Varış Şubesi (Hedef) *
                  </label>
                  <select
                    value={toBranchId}
                    onChange={(e) => setToBranchId(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-900 dark:text-zinc-100"
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
              <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                    <Scan className="w-4 h-4 text-amber-500" />
                    Barkod ile Ürün Ekle
                  </span>
                  <span className="text-[11px] text-zinc-400">
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
                    className="flex-1 px-3.5 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddBarcode(barcodeInput)}
                    className="px-4 py-2 rounded-xl bg-zinc-800 dark:bg-zinc-700 text-zinc-100 text-xs font-semibold hover:bg-zinc-700 dark:hover:bg-zinc-600 transition-colors"
                  >
                    Ekle
                  </button>
                </div>
              </div>

              {/* Eklenen Kalemler Tablosu */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Transfer Edilecek Ürünler ({selectedLines.length})
                  </span>
                  {selectedLines.length > 0 && (
                    <span className="text-xs font-mono font-bold text-amber-500">
                      Toplam: {selectedLines.reduce((acc, l) => acc + l.weight, 0).toFixed(2)} gr
                    </span>
                  )}
                </div>

                {selectedLines.length === 0 ? (
                  <div className="py-8 text-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-400 text-xs">
                    Henüz transfer kalemi eklenmedi. Yukarıdaki barkod alanından okutunuz.
                  </div>
                ) : (
                  <div className="max-h-48 overflow-y-auto border border-zinc-200 dark:border-zinc-800 rounded-xl divide-y divide-zinc-100 dark:divide-zinc-800">
                    {selectedLines.map((line, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2.5 text-xs hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                      >
                        <div>
                          <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100 mr-2">
                            {line.barcode}
                          </span>
                          <span className="text-zinc-700 dark:text-zinc-300">{line.productTitle}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
                            {line.weight.toFixed(2)} gr
                          </span>
                          <span className="text-zinc-500">{line.carat}K</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveLine(idx)}
                            className="p-1 rounded hover:text-rose-500 transition-colors"
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
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Sevk Açıklaması / Notu
                </label>
                <textarea
                  rows={2}
                  maxLength={TRANSFER_LIMITS.MAX_NOTES_LENGTH}
                  value={transferNotes}
                  onChange={(e) => setTransferNotes(e.target.value)}
                  placeholder="Örn: Vitrin yenileme için 14K bilezik transferi..."
                  className="w-full px-3.5 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 resize-none"
                />
              </div>

              {/* Butonlar */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  disabled={isLoading}
                  className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={isLoading || selectedLines.length === 0}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-zinc-950 text-xs font-semibold shadow-md shadow-amber-500/20 transition-all disabled:opacity-50"
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
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl p-6 animate-in zoom-in-95 space-y-4">
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <PackageCheck className="w-5 h-5 text-emerald-500" />
              Sevkiyatı Teslim Al
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              <strong>{selectedTransferForAction.transferNumber}</strong> nolu transfer kapsamındaki{' '}
              {selectedTransferForAction.lines.length} adet ürün, hedef şubenin (
              {selectedTransferForAction.toBranch.name}) aktif stoğuna geçirilecektir.
            </p>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Eksik / Hasar / Sayım Farkı Notu (Varsa)
              </label>
              <textarea
                rows={3}
                value={actionDiscrepancyNotes}
                onChange={(e) => setActionDiscrepancyNotes(e.target.value)}
                placeholder="Örn: Tüm ürünler eksiksiz teslim alındı..."
                className="w-full px-3.5 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsReceivingModalOpen(false);
                  setSelectedTransferForAction(null);
                }}
                className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-medium text-zinc-700 dark:text-zinc-300"
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
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold shadow-md shadow-emerald-500/20 transition-all disabled:opacity-50"
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

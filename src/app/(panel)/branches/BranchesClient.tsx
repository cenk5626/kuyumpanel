'use client';

import React, { useState } from 'react';
import {
  GitFork,
  Plus,
  Search,
  Building2,
  Phone,
  MapPin,
  Package,
  ArrowRightLeft,
  CheckCircle2,
  Edit2,
  Trash2,
  Star,
  Loader2,
  AlertTriangle,
  X,
} from 'lucide-react';
import { TRANSFER_LIMITS } from '@/constants/branch';
import { THEME } from '@/constants/theme';
import PageHeader from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import LuxuryTabs from '@/components/LuxuryTabs';

interface BranchWithCounts {
  id: string;
  dealerId: string;
  name: string;
  code: string;
  address?: string | null;
  phone?: string | null;
  isActive: boolean;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    users: number;
    stocks: number;
    productItems: number;
    transfersFrom: number;
    transfersTo: number;
  };
}

interface BranchesClientProps {
  initialBranches: BranchWithCounts[];
  currentUserRole: string;
  dealerId: string;
}

export default function BranchesClient({
  initialBranches,
}: BranchesClientProps) {
  const [branches, setBranches] = useState<BranchWithCounts[]>(initialBranches);
  const [searchQuery, setSearchQuery] = useState('');
  const [tabFilter, setTabFilter] = useState<'ALL' | 'ACTIVE' | 'DEFAULT' | 'PASSIVE'>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<BranchWithCounts | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    phone: '',
    address: '',
    isDefault: false,
    isActive: true,
  });

  const filteredBranches = branches.filter((b) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      b.name.toLowerCase().includes(q) ||
      b.code.toLowerCase().includes(q) ||
      (b.address && b.address.toLowerCase().includes(q)) ||
      (b.phone && b.phone.includes(q));

    let matchesTab = true;
    if (tabFilter === 'ACTIVE') matchesTab = b.isActive;
    else if (tabFilter === 'DEFAULT') matchesTab = b.isDefault;
    else if (tabFilter === 'PASSIVE') matchesTab = !b.isActive;

    return matchesSearch && matchesTab;
  });

  const totalBranches = branches.length;
  const activeBranches = branches.filter((b) => b.isActive).length;
  const totalTransfers = branches.reduce(
    (acc, b) => acc + (b._count?.transfersFrom || 0) + (b._count?.transfersTo || 0),
    0
  );
  const totalStockPoints = branches.reduce((acc, b) => acc + (b._count?.stocks || 0), 0);

  const openAddModal = () => {
    setEditingBranch(null);
    setFormData({
      code: '',
      name: '',
      phone: '',
      address: '',
      isDefault: false,
      isActive: true,
    });
    setErrorMessage(null);
    setIsModalOpen(true);
  };

  const openEditModal = (branch: BranchWithCounts) => {
    setEditingBranch(branch);
    setFormData({
      code: branch.code,
      name: branch.name,
      phone: branch.phone || '',
      address: branch.address || '',
      isDefault: branch.isDefault,
      isActive: branch.isActive,
    });
    setErrorMessage(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingBranch(null);
    setErrorMessage(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      if (!formData.name.trim() || formData.name.trim().length < TRANSFER_LIMITS.MIN_NAME_LENGTH) {
        throw new Error(`Şube adı en az ${TRANSFER_LIMITS.MIN_NAME_LENGTH} karakter olmalıdır.`);
      }

      if (!editingBranch && (!formData.code.trim() || formData.code.trim().length < TRANSFER_LIMITS.MIN_CODE_LENGTH)) {
        throw new Error(`Şube kodu en az ${TRANSFER_LIMITS.MIN_CODE_LENGTH} karakter olmalıdır.`);
      }

      const method = editingBranch ? 'PUT' : 'POST';
      const payload = editingBranch
        ? { id: editingBranch.id, ...formData }
        : formData;

      const res = await fetch('/api/branches', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Şube kaydedilemedi.');
      }

      if (editingBranch) {
        setBranches((prev) =>
          prev.map((b) => {
            if (b.id === editingBranch.id) {
              return { ...b, ...data.branch };
            }
            if (data.branch.isDefault) {
              return { ...b, isDefault: false };
            }
            return b;
          })
        );
        setSuccessMessage('Şube bilgileri başarıyla güncellendi.');
      } else {
        setBranches((prev) => [
          data.branch,
          ...prev.map((b) => (data.branch.isDefault ? { ...b, isDefault: false } : b)),
        ]);
        setSuccessMessage('Yeni şube başarıyla eklendi.');
      }

      closeModal();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (branch: BranchWithCounts) => {
    if (branch.isDefault) {
      alert('Varsayılan merkez şube silinemez!');
      return;
    }

    if ((branch._count?.stocks || 0) > 0 || (branch._count?.productItems || 0) > 0) {
      alert('Bu şubeye atanmış aktif stok veya takı ürünleri bulunmaktadır. Önce bunları transfer ediniz.');
      return;
    }

    if (!confirm(`"${branch.name}" şubesini silmek istediğinize emin misiniz?`)) {
      return;
    }

    try {
      setIsLoading(true);
      const res = await fetch(`/api/branches?id=${branch.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Şube silinemedi.');
      }

      setBranches((prev) => prev.filter((b) => b.id !== branch.id));
      setSuccessMessage('Şube başarıyla silindi.');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Üst Bilgi ve Aksiyonlar */}
      <PageHeader
        title="Şube Yönetimi"
        subtitle="Çok şubeli işletme yönetimi, lokasyon bazlı envanter ve kasa organizasyonu"
        icon={GitFork}
        badges={[
          { label: `${totalBranches} Lokasyon`, variant: 'gold' },
          { label: `${activeBranches} Aktif`, variant: 'success' },
        ]}
        actions={
          <button
            onClick={openAddModal}
            className={`${THEME.BTN_PRIMARY} min-h-[44px] flex items-center justify-center gap-2`}
          >
            <Plus className="w-4 h-4" />
            <span>Yeni Şube Ekle</span>
          </button>
        }
      />

      {/* Başarı / Bildirim Mesajı */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          {successMessage}
        </div>
      )}

      {/* KPI İstatistik Kartları */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Toplam Şube"
          value={totalBranches}
          subtitle={`${activeBranches} aktif lokasyon`}
          icon={Building2}
          iconColor="gold"
        />
        <StatCard
          title="Aktif Şube Oranı"
          value={`%${totalBranches > 0 ? Math.round((activeBranches / totalBranches) * 100) : 0}`}
          subtitle="Hizmet veren birimler"
          icon={CheckCircle2}
          iconColor="emerald"
        />
        <StatCard
          title="Stok Noktaları"
          value={totalStockPoints}
          subtitle="Şubelerde ayrışmış stok kalemi"
          icon={Package}
          iconColor="blue"
        />
        <StatCard
          title="Transfer Trafiği"
          value={totalTransfers}
          subtitle="Şubeler arası hareket sayısı"
          icon={ArrowRightLeft}
          iconColor="purple"
        />
      </div>

      {/* LuxuryTabs Segment Kontrolü */}
      <LuxuryTabs
        tabs={[
          { id: 'ALL', label: 'Tüm Şubeler', count: branches.length },
          { id: 'ACTIVE', label: 'Aktif Lokasyonlar', count: branches.filter((b) => b.isActive).length },
          { id: 'DEFAULT', label: 'Merkez Şube', count: branches.filter((b) => b.isDefault).length },
          { id: 'PASSIVE', label: 'Pasif Lokasyonlar', count: branches.filter((b) => !b.isActive).length },
        ]}
        activeTab={tabFilter}
        onChange={setTabFilter}
      />

      {/* Arama ve Filtre */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder="Şube adı, kodu, telefon veya adrese göre ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-10 pr-4 min-h-[44px] ${THEME.INPUT}`}
          />
        </div>
      </div>

      {/* Şube Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredBranches.map((branch) => (
          <div
            key={branch.id}
            className={`p-5 rounded-2xl bg-white dark:bg-slate-900 border transition-all ${
              branch.isDefault
                ? 'border-amber-500/40 shadow-lg shadow-amber-500/5 ring-1 ring-amber-500/20'
                : 'border-slate-200 dark:border-amber-500/20 hover:border-amber-500/40'
            }`}
          >
            {/* Kart Üst Alanı */}
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    {branch.code}
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    {branch.name}
                  </h3>
                </div>
                {branch.isDefault && (
                  <div className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    <Star className="w-3 h-3 fill-amber-500" />
                    Varsayılan Merkez Şube
                  </div>
                )}
              </div>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  branch.isActive
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                    : 'bg-slate-500/10 text-slate-500 dark:text-slate-400 border border-slate-500/20'
                }`}
              >
                {branch.isActive ? 'Aktif' : 'Pasif'}
              </span>
            </div>

            {/* İletişim Bilgileri */}
            <div className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400 my-4">
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 flex-shrink-0" />
                <span>{branch.phone || 'Telefon belirtilmemiş'}</span>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 flex-shrink-0 mt-0.5" />
                <span className="line-clamp-2">{branch.address || 'Adres belirtilmemiş'}</span>
              </div>
            </div>

            {/* Metrikler */}
            <div className="grid grid-cols-4 gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800/60 my-4 text-center">
              <div>
                <span className="text-[10px] text-slate-400 uppercase block font-medium">Personel</span>
                <span className="text-sm font-bold font-mono text-slate-800 dark:text-slate-200">
                  {branch._count?.users || 0}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase block font-medium">Stok</span>
                <span className="text-sm font-bold font-mono text-slate-800 dark:text-slate-200">
                  {branch._count?.stocks || 0}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase block font-medium">Mücevher</span>
                <span className="text-sm font-bold font-mono text-slate-800 dark:text-slate-200">
                  {branch._count?.productItems || 0}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase block font-medium">Transfer</span>
                <span className="text-sm font-bold font-mono text-slate-800 dark:text-slate-200">
                  {(branch._count?.transfersFrom || 0) + (branch._count?.transfersTo || 0)}
                </span>
              </div>
            </div>

            {/* Alt İşlemler */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => openEditModal(branch)}
                className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl text-slate-500 hover:text-amber-500 hover:bg-amber-500/10 transition-colors flex items-center justify-center"
                title="Şubeyi Düzenle"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              {!branch.isDefault && (
                <button
                  onClick={() => handleDelete(branch)}
                  className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 transition-colors flex items-center justify-center"
                  title="Şubeyi Sil"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}

        {filteredBranches.length === 0 && (
          <div className="col-span-full py-16 text-center text-slate-400 dark:text-slate-500">
            <Building2 className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
            <p className="text-base font-semibold text-slate-700 dark:text-slate-300">Aradığınız kriterlere uygun şube bulunamadı.</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Farklı bir arama terimi deneyebilir veya yeni şube ekleyebilirsiniz.</p>
          </div>
        )}
      </div>

      {/* Şube Ekleme / Düzenleme Modalı */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-amber-500/20 shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-amber-500/20">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <GitFork className="w-5 h-5 text-amber-500" />
                {editingBranch ? 'Şube Bilgilerini Düzenle' : 'Yeni Şube Tanımla'}
              </h2>
              <button
                onClick={closeModal}
                className="min-h-[44px] min-w-[44px] p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  {errorMessage}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Şube Kodu *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={TRANSFER_LIMITS.MAX_CODE_LENGTH}
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="Örn: KDY, MRKZ"
                    disabled={!!editingBranch}
                    className={`w-full font-mono uppercase ${THEME.INPUT} disabled:opacity-60`}
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Kısa ve benzersiz kod</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Şube Adı *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={TRANSFER_LIMITS.MAX_NAME_LENGTH}
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Örn: Kadıköy Çarşı Şubesi"
                    className={`w-full ${THEME.INPUT}`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Telefon
                </label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="0216 123 45 67"
                  className={`w-full ${THEME.INPUT}`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Adres
                </label>
                <textarea
                  rows={2}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Şubenin açık adresi..."
                  className={`w-full resize-none ${THEME.INPUT}`}
                />
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isDefault}
                    onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                    className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500/20"
                  />
                  <div>
                    <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
                      Varsayılan Şube Olarak Belirle
                    </span>
                    <p className="text-[11px] text-slate-400">
                      Yeni kullanıcı ve stoklar otomatik olarak bu şubeye atanır.
                    </p>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500/20"
                  />
                  <div>
                    <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
                      Şube Aktif
                    </span>
                    <p className="text-[11px] text-slate-400">
                      Pasif şubelerde satış ve transfer işlemleri kısıtlanır.
                    </p>
                  </div>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={isLoading}
                  className={`${THEME.BTN_SECONDARY} min-h-[44px]`}
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`${THEME.BTN_PRIMARY} min-h-[44px] flex items-center gap-2`}
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {editingBranch ? 'Güncelle' : 'Şubeyi Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

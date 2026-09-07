'use client';

import React, { useState } from 'react';
import {
  GitFork,
  Plus,
  Search,
  Building2,
  Phone,
  MapPin,
  Users,
  Package,
  Gem,
  ArrowRightLeft,
  CheckCircle2,
  XCircle,
  Edit2,
  Trash2,
  Star,
  Loader2,
  AlertTriangle,
  X,
} from 'lucide-react';
import { BRANCH_DEFAULTS, TRANSFER_LIMITS } from '@/constants/branch';

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
  currentUserRole,
}: BranchesClientProps) {
  const [branches, setBranches] = useState<BranchWithCounts[]>(initialBranches);
  const [searchQuery, setSearchQuery] = useState('');
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
    return (
      b.name.toLowerCase().includes(q) ||
      b.code.toLowerCase().includes(q) ||
      (b.address && b.address.toLowerCase().includes(q)) ||
      (b.phone && b.phone.includes(q))
    );
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <GitFork className="w-7 h-7 text-amber-500" />
            Şube Yönetimi
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Çok şubeli işletme yönetimi, lokasyon bazlı envanter ve kasa organizasyonu
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-zinc-950 font-semibold shadow-lg shadow-amber-500/20 transition-all text-sm"
        >
          <Plus className="w-4 h-4" />
          Yeni Şube Ekle
        </button>
      </div>

      {/* Başarı / Bildirim Mesajı */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          {successMessage}
        </div>
      )}

      {/* KPI İstatistik Kartları */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Toplam Şube
            </span>
            <Building2 className="w-5 h-5 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-2">{totalBranches}</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            {activeBranches} aktif lokasyon
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Aktif Şube Oranı
            </span>
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-2">
            %{totalBranches > 0 ? Math.round((activeBranches / totalBranches) * 100) : 0}
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Hizmet veren birimler</p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Stok Noktaları
            </span>
            <Package className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-2">{totalStockPoints}</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Şubelerde ayrışmış stok kalemi</p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Transfer Trafiği
            </span>
            <ArrowRightLeft className="w-5 h-5 text-purple-500" />
          </div>
          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-2">{totalTransfers}</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Şubeler arası hareket sayısı</p>
        </div>
      </div>

      {/* Arama ve Filtre */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Şube adı, kodu, telefon veya adrese göre ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
          />
        </div>
      </div>

      {/* Şube Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredBranches.map((branch) => (
          <div
            key={branch.id}
            className={`p-5 rounded-2xl bg-white dark:bg-zinc-900/80 border transition-all ${
              branch.isDefault
                ? 'border-amber-500/40 shadow-lg shadow-amber-500/5 ring-1 ring-amber-500/20'
                : 'border-zinc-200 dark:border-zinc-800/80 hover:border-zinc-300 dark:hover:border-zinc-700'
            }`}
          >
            {/* Kart Üst Alanı */}
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                    {branch.code}
                  </span>
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                    {branch.name}
                  </h3>
                </div>
                {branch.isDefault && (
                  <div className="inline-flex items-center gap-1.5 mt-2 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    <Star className="w-3 h-3 fill-amber-500" />
                    Varsayılan Merkez Şube
                  </div>
                )}
              </div>
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  branch.isActive
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                    : 'bg-zinc-500/10 text-zinc-500 dark:text-zinc-400 border border-zinc-500/20'
                }`}
              >
                {branch.isActive ? 'Aktif' : 'Pasif'}
              </span>
            </div>

            {/* İletişim Bilgileri */}
            <div className="space-y-1.5 text-xs text-zinc-500 dark:text-zinc-400 my-4">
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
                <span>{branch.phone || 'Telefon belirtilmemiş'}</span>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0 mt-0.5" />
                <span className="line-clamp-2">{branch.address || 'Adres belirtilmemiş'}</span>
              </div>
            </div>

            {/* Metrikler */}
            <div className="grid grid-cols-4 gap-2 p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200/60 dark:border-zinc-800/60 my-4 text-center">
              <div>
                <span className="text-[10px] text-zinc-400 uppercase block font-medium">Personel</span>
                <span className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                  {branch._count?.users || 0}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-400 uppercase block font-medium">Stok</span>
                <span className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                  {branch._count?.stocks || 0}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-400 uppercase block font-medium">Mücevher</span>
                <span className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                  {branch._count?.productItems || 0}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-400 uppercase block font-medium">Transfer</span>
                <span className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                  {(branch._count?.transfersFrom || 0) + (branch._count?.transfersTo || 0)}
                </span>
              </div>
            </div>

            {/* Alt İşlemler */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <button
                onClick={() => openEditModal(branch)}
                className="p-2 rounded-lg text-zinc-500 hover:text-amber-500 hover:bg-amber-500/10 transition-colors"
                title="Şubeyi Düzenle"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              {!branch.isDefault && (
                <button
                  onClick={() => handleDelete(branch)}
                  className="p-2 rounded-lg text-zinc-500 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                  title="Şubeyi Sil"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}

        {filteredBranches.length === 0 && (
          <div className="col-span-full py-16 text-center text-zinc-400">
            <Building2 className="w-12 h-12 mx-auto text-zinc-300 dark:text-zinc-700 mb-3" />
            <p className="text-base font-semibold">Aradığınız kriterlere uygun şube bulunamadı.</p>
            <p className="text-xs text-zinc-500 mt-1">Farklı bir arama terimi deneyebilir veya yeni şube ekleyebilirsiniz.</p>
          </div>
        )}
      </div>

      {/* Şube Ekleme / Düzenleme Modalı */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <GitFork className="w-5 h-5 text-amber-500" />
                {editingBranch ? 'Şube Bilgilerini Düzenle' : 'Yeni Şube Tanımla'}
              </h2>
              <button
                onClick={closeModal}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
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
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
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
                    className="w-full px-3.5 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-sm font-mono uppercase text-zinc-900 dark:text-zinc-100 disabled:opacity-60"
                  />
                  <span className="text-[10px] text-zinc-400 mt-0.5 block">Kısa ve benzersiz kod</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Şube Adı *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={TRANSFER_LIMITS.MAX_NAME_LENGTH}
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Örn: Kadıköy Çarşı Şubesi"
                    className="w-full px-3.5 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-900 dark:text-zinc-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Telefon
                </label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="0216 123 45 67"
                  className="w-full px-3.5 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-900 dark:text-zinc-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Adres
                </label>
                <textarea
                  rows={2}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Şubenin açık adresi..."
                  className="w-full px-3.5 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-900 dark:text-zinc-100 resize-none"
                />
              </div>

              <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isDefault}
                    onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                    className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500/20"
                  />
                  <div>
                    <span className="text-xs font-medium text-zinc-800 dark:text-zinc-200">
                      Varsayılan Şube Olarak Belirle
                    </span>
                    <p className="text-[11px] text-zinc-400">
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
                    <span className="text-xs font-medium text-zinc-800 dark:text-zinc-200">
                      Şube Aktif
                    </span>
                    <p className="text-[11px] text-zinc-400">
                      Pasif şubelerde satış ve transfer işlemleri kısıtlanır.
                    </p>
                  </div>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={isLoading}
                  className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-zinc-950 text-xs font-semibold shadow-md shadow-amber-500/20 transition-all disabled:opacity-50"
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

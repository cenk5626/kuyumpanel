'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Search,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Unlock,
  Check,
  RotateCcw,
  Sparkles,
  Zap,
  AlertTriangle,
  LayoutDashboard,
  Activity,
  Package,
  ArrowLeftRight,
  ScanBarcode,
  BellRing,
  UserCheck,
  HeartHandshake,
  MessageSquareShare,
  BadgePercent,
  Building,
  TrendingUp,
  Landmark,
  ReceiptText,
  FileText,
  CalendarClock,
  Truck,
  Boxes,
  Flame,
  Wrench,
  GitFork,
  ArrowRightLeft,
  ClipboardCheck,
  Radio,
  LineChart,
  Globe,
  FileSpreadsheet,
  Bot,
  Settings,
  History,
  Users,
} from 'lucide-react';
import {
  SYSTEM_PAGES,
  PAGE_CATEGORIES,
  PAGE_CATEGORY_KEYS,
  PageCategoryKey,
  SystemPageMeta,
  PERMISSION_PRESETS,
  PermissionPresetKey,
  ALL_PAGE_IDS,
  ACTION_PERMISSIONS,
  ALL_ACTION_IDS,
  ActionPermissionMeta,
} from '@/constants/page-permissions';
import { USER_ROLES } from '@/constants/roles';

// Dinamik Lucide ikon eşleme haritası
const ICON_MAP: Record<string, React.ComponentType<{ className?: string; size?: number }>> = {
  LayoutDashboard,
  Activity,
  Package,
  ArrowLeftRight,
  ScanBarcode,
  BellRing,
  UserCheck,
  HeartHandshake,
  MessageSquareShare,
  BadgePercent,
  Building,
  TrendingUp,
  Landmark,
  ReceiptText,
  FileText,
  CalendarClock,
  Truck,
  Boxes,
  Flame,
  Wrench,
  GitFork,
  ArrowRightLeft,
  ClipboardCheck,
  Radio,
  LineChart,
  ShieldCheck,
  Globe,
  ShieldAlert,
  FileSpreadsheet,
  Bot,
  Settings,
  History,
  Users,
  Zap,
};

export interface ModalUser {
  id: string;
  name: string;
  email: string;
  role: string;
  permissions?: string;
  dealerId?: string | null;
  dealerName?: string;
}

interface UserPermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: ModalUser | null;
  onSave: (userId: string, newPermissions: string[]) => Promise<void>;
  isCurrentUserSuperAdmin: boolean;
}

type MainTab = 'pages' | 'actions';

const RISK_BADGE_MAP: Record<string, string> = {
  CRITICAL: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
  HIGH: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  MEDIUM: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  LOW: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
};

const RISK_LABEL_MAP: Record<string, string> = {
  CRITICAL: 'Kritik Risk',
  HIGH: 'Yüksek Yetki',
  MEDIUM: 'Standart Yetki',
  LOW: 'Düşük Risk',
};

export default function UserPermissionsModal({
  isOpen,
  onClose,
  user,
  onSave,
  isCurrentUserSuperAdmin,
}: UserPermissionsModalProps) {
  const [activeMainTab, setActiveMainTab] = useState<MainTab>('pages');
  const [selectedPageIds, setSelectedPageIds] = useState<string[]>([]);
  const [initialPageIds, setInitialPageIds] = useState<string[]>([]);
  const [selectedActionIds, setSelectedActionIds] = useState<string[]>([]);
  const [initialActionIds, setInitialActionIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('ALL');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const isTargetSuperAdmin = user?.role === USER_ROLES.SUPER_ADMIN;

  // Modal açıldığında kullanıcının mevcut yetkilerini yükle
  useEffect(() => {
    if (user && isOpen) {
      let rawPerms: string[] = [];
      if (user.permissions) {
        try {
          rawPerms = typeof user.permissions === 'string' ? JSON.parse(user.permissions) : user.permissions;
        } catch {
          rawPerms = [...ALL_PAGE_IDS, ...ALL_ACTION_IDS];
        }
      } else {
        rawPerms = [...ALL_PAGE_IDS, ...ALL_ACTION_IDS];
      }

      // Sayfa izinleri ve aksiyon izinlerini ayrıştır
      const pagePerms = rawPerms.filter((p) => ALL_PAGE_IDS.includes(p) || !p.startsWith('action:'));
      const actionPerms = rawPerms.filter((p) => p.startsWith('action:'));

      setSelectedPageIds(pagePerms.length > 0 ? pagePerms : ALL_PAGE_IDS);
      setInitialPageIds(pagePerms.length > 0 ? pagePerms : ALL_PAGE_IDS);
      setSelectedActionIds(actionPerms);
      setInitialActionIds(actionPerms);

      setSearchQuery('');
      setActiveCategoryFilter('ALL');
      setActiveMainTab('pages');
      setErrorMessage('');
      setSaveSuccess(false);
    }
  }, [user, isOpen]);

  // Sayfa yetkisini tek tıkla aç/kapat
  const togglePagePermission = (pageId: string) => {
    if (isTargetSuperAdmin) return;

    setSelectedPageIds((prev) =>
      prev.includes(pageId) ? prev.filter((id) => id !== pageId) : [...prev, pageId]
    );
  };

  // Özel aksiyon yetkisini tek tıkla aç/kapat
  const toggleActionPermission = (actionId: string) => {
    if (isTargetSuperAdmin) return;

    setSelectedActionIds((prev) =>
      prev.includes(actionId) ? prev.filter((id) => id !== actionId) : [...prev, actionId]
    );
  };

  // Kategori bazlı toplu yetki aç / kapat
  const toggleCategoryPermissions = (categoryKey: PageCategoryKey) => {
    if (isTargetSuperAdmin) return;

    const categoryPageIds = SYSTEM_PAGES.filter((p) => p.category === categoryKey).map((p) => p.id);
    const allSelected = categoryPageIds.every((id) => selectedPageIds.includes(id));

    if (allSelected) {
      // Kategoridekileri kaldır
      setSelectedPageIds((prev) => prev.filter((id) => !categoryPageIds.includes(id)));
    } else {
      // Kategoridekileri ekle
      const newPerms = Array.from(new Set([...selectedPageIds, ...categoryPageIds]));
      setSelectedPageIds(newPerms);
    }
  };

  // Hızlı şablon uygula
  const applyPreset = (presetKey: PermissionPresetKey) => {
    if (isTargetSuperAdmin) return;
    const preset = PERMISSION_PRESETS[presetKey];
    if (preset) {
      setSelectedPageIds([...preset.pages]);
    }
  };

  // Değişiklikleri kaydet
  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setErrorMessage('');
    try {
      const combinedPermissions = [...selectedPageIds, ...selectedActionIds];
      await onSave(user.id, combinedPermissions);
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 700);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Yetkiler kaydedilirken bir hata oluştu.');
    } finally {
      setSaving(false);
    }
  };

  // Filtrelenmiş sayfalar
  const filteredPages = useMemo(() => {
    return SYSTEM_PAGES.filter((page) => {
      const matchesSearch =
        searchQuery.trim() === '' ||
        page.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        page.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        page.id.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory =
        activeCategoryFilter === 'ALL' || page.category === activeCategoryFilter;

      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, activeCategoryFilter]);

  // Filtrelenmiş aksiyonlar
  const filteredActions = useMemo(() => {
    return ACTION_PERMISSIONS.filter((action) => {
      if (searchQuery.trim() === '') return true;
      return (
        action.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        action.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        action.category.toLowerCase().includes(searchQuery.toLowerCase())
      );
    });
  }, [searchQuery]);

  // Kategori istatistikleri
  const categoryStats = useMemo(() => {
    const stats: Record<string, { total: number; selected: number }> = {};
    Object.keys(PAGE_CATEGORIES).forEach((catKey) => {
      const catPages = SYSTEM_PAGES.filter((p) => p.category === catKey);
      const selectedCount = catPages.filter((p) => selectedPageIds.includes(p.id)).length;
      stats[catKey] = {
        total: catPages.length,
        selected: selectedCount,
      };
    });
    return stats;
  }, [selectedPageIds]);

  const hasChanges = useMemo(() => {
    const pagesChanged =
      selectedPageIds.length !== initialPageIds.length ||
      !selectedPageIds.every((id) => initialPageIds.includes(id));

    const actionsChanged =
      selectedActionIds.length !== initialActionIds.length ||
      !selectedActionIds.every((id) => initialActionIds.includes(id));

    return pagesChanged || actionsChanged;
  }, [selectedPageIds, initialPageIds, selectedActionIds, initialActionIds]);

  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.2 }}
        className="relative w-full max-w-5xl bg-slate-900 border border-slate-700/60 dark:border-amber-500/20 rounded-2xl shadow-2xl shadow-black/80 flex flex-col max-h-[90vh] overflow-hidden"
      >
        {/* MODAL HEADER */}
        <div className="px-6 py-5 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-amber-500/20 to-yellow-500/30 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
              <ShieldCheck size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                  Kullanıcı Yetkilendirme & İzin Yönetimi
                </h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  {user.name}
                </span>
                {user.dealerName && (
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-slate-800 text-slate-300 border border-slate-700">
                    {user.dealerName}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
                <span>{user.email}</span>
                <span>•</span>
                <span className="text-amber-300/80 font-semibold">{user.role}</span>
                <span>•</span>
                <span className="text-slate-300">
                  <strong className="text-amber-400">{selectedPageIds.length}</strong> / {SYSTEM_PAGES.length} Sayfa
                </span>
                <span>•</span>
                <span className="text-slate-300">
                  <strong className="text-emerald-400">{selectedActionIds.length}</strong> / {ACTION_PERMISSIONS.length} Özel İşlem Yetkisi
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-xl transition-colors"
              title="Kapat"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* ANA SEKMELER: SAYFA YETKİLERİ VS ÖZEL İŞLEM YETKİLERİ */}
        <div className="px-6 pt-3 bg-slate-950/40 border-b border-slate-800/60 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setActiveMainTab('pages')}
            className={`pb-2.5 px-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-all ${
              activeMainTab === 'pages'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <LayoutDashboard size={14} />
            <span>Sayfa Erişim Yetkileri ({selectedPageIds.length}/{SYSTEM_PAGES.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMainTab('actions')}
            className={`pb-2.5 px-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-all ${
              activeMainTab === 'actions'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap size={14} className="text-emerald-400" />
            <span>Kritik İşlem & Güvenlik Yetkileri ({selectedActionIds.length}/{ACTION_PERMISSIONS.length})</span>
          </button>
        </div>

        {/* TOP CONTROLS & PRESETS (SEKMEYE GÖRE DEĞİŞİR) */}
        <div className="px-6 py-3 border-b border-slate-800/80 bg-slate-900/90 space-y-2.5">
          {activeMainTab === 'pages' ? (
            <>
              {/* Hızlı Şablon Butonları */}
              <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
                <div className="flex items-center gap-1.5 text-slate-400 font-semibold">
                  <Sparkles size={14} className="text-amber-400" />
                  <span>Sayfa Şablonları:</span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    disabled={isTargetSuperAdmin}
                    onClick={() => applyPreset('FULL')}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-amber-500/20 text-slate-300 hover:text-amber-300 border border-slate-700 hover:border-amber-500/30 font-medium transition-all"
                  >
                    Tümünü Seç ({SYSTEM_PAGES.length})
                  </button>
                  <button
                    type="button"
                    disabled={isTargetSuperAdmin}
                    onClick={() => setSelectedPageIds([])}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 border border-slate-700 hover:border-rose-500/30 font-medium transition-all"
                  >
                    Tümünü Kaldır (0)
                  </button>
                  <button
                    type="button"
                    disabled={isTargetSuperAdmin}
                    onClick={() => applyPreset('CASHIER')}
                    className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 font-medium transition-all"
                  >
                    Kasiyer / Tezgahtar
                  </button>
                  <button
                    type="button"
                    disabled={isTargetSuperAdmin}
                    onClick={() => applyPreset('ACCOUNTING')}
                    className="px-2.5 py-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 font-medium transition-all"
                  >
                    Ön Muhasebe & Kasa
                  </button>
                  <button
                    type="button"
                    disabled={isTargetSuperAdmin}
                    onClick={() => applyPreset('WORKSHOP')}
                    className="px-2.5 py-1 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/20 font-medium transition-all"
                  >
                    Atölye & Stok
                  </button>
                  <button
                    type="button"
                    disabled={isTargetSuperAdmin}
                    onClick={() => applyPreset('STORE_MANAGER')}
                    className="px-2.5 py-1 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/20 font-medium transition-all"
                  >
                    Mağaza Müdürü
                  </button>
                  {hasChanges && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPageIds(initialPageIds);
                        setSelectedActionIds(initialActionIds);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 text-amber-400 border border-amber-500/30 font-medium flex items-center gap-1 hover:bg-slate-700 transition-all"
                      title="İlk yetkilere geri döndür"
                    >
                      <RotateCcw size={12} /> Sıfırla
                    </button>
                  )}
                </div>
              </div>

              {/* Arama & Kategori Filtreleri */}
              <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
                <div className="relative flex-1 min-w-[200px]">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Sayfa adı, modül veya rota ara..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-950/80 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/60 transition-colors"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setActiveCategoryFilter('ALL')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                      activeCategoryFilter === 'ALL'
                        ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    Tümü ({SYSTEM_PAGES.length})
                  </button>

                  {Object.entries(PAGE_CATEGORIES).map(([catKey, catMeta]) => {
                    const stats = categoryStats[catKey];
                    const isActive = activeCategoryFilter === catKey;
                    return (
                      <button
                        key={catKey}
                        type="button"
                        onClick={() => setActiveCategoryFilter(catKey)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                          isActive
                            ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                            : 'bg-slate-800/80 text-slate-400 hover:text-white'
                        }`}
                      >
                        <span>{catMeta.title.split(' ')[0]}</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                            isActive
                              ? 'bg-black/20 text-black'
                              : stats.selected > 0
                              ? 'bg-amber-500/20 text-amber-300'
                              : 'bg-slate-700 text-slate-400'
                          }`}
                        >
                          {stats.selected}/{stats.total}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            /* AKSİYON İZİNLERİ ÜST KONTROLLERİ */
            <div className="flex items-center justify-between gap-3 flex-wrap text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-medium">
                  Kritik operasyonel işlemleri personel bazında açıp kapatabilirsiniz:
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isTargetSuperAdmin}
                  onClick={() => setSelectedActionIds([...ALL_ACTION_IDS])}
                  className="px-3 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 font-semibold transition-all"
                >
                  Tüm İşlem Yetkilerini Ver
                </button>
                <button
                  type="button"
                  disabled={isTargetSuperAdmin}
                  onClick={() => setSelectedActionIds([])}
                  className="px-3 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 font-semibold transition-all"
                >
                  Tüm İşlem Yetkilerini Kaldır
                </button>
              </div>
            </div>
          )}
        </div>

        {/* SUPER ADMIN BİLGİLENDİRME UYARISI */}
        {isTargetSuperAdmin && (
          <div className="mx-6 mt-3 p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs flex items-center gap-2.5">
            <Lock size={16} className="text-amber-400 flex-shrink-0" />
            <span>
              <strong>Süper Yönetici Hesabı:</strong> Bu rol sistem mimarisi gereği her zaman tüm sayfalara ve kritik işlemlere tam erişim yetkisine sahiptir.
            </span>
          </div>
        )}

        {/* İÇERİK BÖLÜMÜ (SEKMEYE GÖRE DEĞİŞİR) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeMainTab === 'pages' ? (
            /* 1. SAYFA ERİŞİM KARTLARI */
            filteredPages.length === 0 ? (
              <div className="py-16 text-center text-slate-500">
                <p className="text-sm font-semibold">Arama kriterine uygun sayfa bulunamadı.</p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setActiveCategoryFilter('ALL');
                  }}
                  className="mt-2 text-xs text-amber-400 hover:underline"
                >
                  Filtreleri Temizle
                </button>
              </div>
            ) : (
              Object.entries(PAGE_CATEGORIES).map(([catKey, catMeta]) => {
                const pagesInThisCat = filteredPages.filter((p) => p.category === catKey);
                if (pagesInThisCat.length === 0) return null;

                const allCatSelected = pagesInThisCat.every((p) => selectedPageIds.includes(p.id));

                return (
                  <div key={catKey} className="space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${catMeta.badgeClass}`}>
                          {catMeta.title}
                        </span>
                        <span className="text-xs text-slate-500">
                          ({categoryStats[catKey]?.selected} / {categoryStats[catKey]?.total} Yetkili)
                        </span>
                      </div>

                      {!isTargetSuperAdmin && (
                        <button
                          type="button"
                          onClick={() => toggleCategoryPermissions(catKey as PageCategoryKey)}
                          className={`text-xs font-semibold px-2.5 py-1 rounded-lg border transition-all ${
                            allCatSelected
                              ? 'bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20'
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20'
                          }`}
                        >
                          {allCatSelected ? 'Kategorideki Yetkileri Kaldır' : 'Kategoriye Toplu Yetki Ver'}
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {pagesInThisCat.map((page) => {
                        const isAllowed = selectedPageIds.includes(page.id);
                        const Icon = ICON_MAP[page.icon] || ShieldCheck;

                        return (
                          <div
                            key={page.id}
                            className={`relative p-3.5 rounded-xl border transition-all duration-200 flex flex-col justify-between select-none ${
                              isAllowed
                                ? 'bg-slate-900/90 border-amber-500/40 shadow-sm shadow-amber-500/5 ring-1 ring-amber-500/20'
                                : 'bg-slate-950/50 border-slate-800/80 opacity-75 hover:opacity-100 hover:border-slate-700'
                            }`}
                          >
                            <div>
                              <div className="flex items-start gap-3">
                                <div
                                  className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                                    isAllowed
                                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                                  }`}
                                >
                                  <Icon size={18} />
                                </div>

                                <div className="flex-1 min-w-0">
                                  <h4 className="text-xs font-bold text-white truncate" title={page.name}>
                                    {page.name}
                                  </h4>
                                  <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5 leading-snug">
                                    {page.description}
                                  </p>
                                </div>
                              </div>
                            </div>

                            <div className="mt-3 pt-2.5 border-t border-slate-800/70 flex items-center justify-between gap-2">
                              <span className="text-[10px] font-mono text-slate-500">
                                /{page.id}
                              </span>

                              <button
                                type="button"
                                disabled={isTargetSuperAdmin}
                                onClick={() => togglePagePermission(page.id)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm ${
                                  isAllowed
                                    ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-black hover:from-amber-400 hover:to-yellow-400 shadow-amber-500/20'
                                    : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 border border-slate-700'
                                } ${isTargetSuperAdmin ? 'cursor-not-allowed opacity-60' : 'cursor-pointer active:scale-95'}`}
                                title={isAllowed ? 'Yetkiyi Kaldır' : 'Erişim İzni Ver'}
                              >
                                {isAllowed ? (
                                  <>
                                    <Check size={13} className="text-black stroke-[3]" />
                                    <span>Yetki Açık</span>
                                  </>
                                ) : (
                                  <>
                                    <Lock size={12} className="text-slate-400" />
                                    <span>Yetki Ver</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )
          ) : (
            /* 2. ÖZEL İŞLEM & GÜVENLİK YETKİLERİ KARTLARI */
            <div className="space-y-4">
              <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center gap-3 text-xs text-slate-300">
                <AlertTriangle size={18} className="text-amber-400 flex-shrink-0" />
                <span>
                  Bu izinler sayfa erişiminden bağımsız olarak kullanıcının yapabileceği <strong>yüksek yetkili kritik operasyonları</strong> belirler. Örneğin bir personele Stok sayfası açık olsa bile <strong>Stok Silme</strong> izni verilmediğinde silme butonu gizlenir veya engellenir.
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {filteredActions.map((action) => {
                  const isAllowed = selectedActionIds.includes(action.id);
                  const Icon = ICON_MAP[action.icon] || ShieldCheck;
                  const riskBadge = RISK_BADGE_MAP[action.riskLevel] || RISK_BADGE_MAP.MEDIUM;
                  const riskLabel = RISK_LABEL_MAP[action.riskLevel] || action.riskLevel;

                  return (
                    <div
                      key={action.id}
                      className={`relative p-4 rounded-xl border transition-all duration-200 flex flex-col justify-between ${
                        isAllowed
                          ? 'bg-slate-900/95 border-emerald-500/40 shadow-sm shadow-emerald-500/5 ring-1 ring-emerald-500/20'
                          : 'bg-slate-950/60 border-slate-800/80 opacity-80 hover:opacity-100 hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div
                              className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                                isAllowed
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  : 'bg-slate-800 text-slate-400 border border-slate-700'
                              }`}
                            >
                              <Icon size={20} />
                            </div>

                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="text-xs font-bold text-white">
                                  {action.name}
                                </h4>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${riskBadge}`}>
                                  {riskLabel}
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-500 font-semibold block mt-0.5">
                                {action.category}
                              </span>
                              <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                                {action.description}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* AKSİYON BUTONU */}
                      <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                        <span className="text-[10px] font-mono text-slate-500">
                          {action.id}
                        </span>

                        <button
                          type="button"
                          disabled={isTargetSuperAdmin}
                          onClick={() => toggleActionPermission(action.id)}
                          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm ${
                            isAllowed
                              ? 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-emerald-500/20'
                              : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 border border-slate-700'
                          } ${isTargetSuperAdmin ? 'cursor-not-allowed opacity-60' : 'cursor-pointer active:scale-95'}`}
                          title={isAllowed ? 'İşlem Yetkisini Kaldır' : 'İşlem Yetkisi Ver'}
                        >
                          {isAllowed ? (
                            <>
                              <Check size={13} className="text-black stroke-[3]" />
                              <span>İzin Verildi</span>
                            </>
                          ) : (
                            <>
                              <Lock size={12} className="text-slate-400" />
                              <span>Yetki Ver</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* HATA VEYA BAŞARI MESAJI */}
        {errorMessage && (
          <div className="mx-6 mb-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs">
            {errorMessage}
          </div>
        )}

        {/* MODAL FOOTER */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between gap-4 flex-wrap">
          <div className="text-xs text-slate-400">
            {hasChanges ? (
              <span className="text-amber-400 font-semibold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                Kaydedilmemiş değişiklikler var ({selectedPageIds.length} sayfa, {selectedActionIds.length} işlem izni seçili)
              </span>
            ) : (
              <span>Değişiklik yapılmadı ({selectedPageIds.length} sayfa, {selectedActionIds.length} işlem aktif)</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all"
            >
              Kapat
            </button>

            <button
              type="button"
              disabled={saving || !hasChanges || isTargetSuperAdmin}
              onClick={handleSave}
              className={`px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                saveSuccess
                  ? 'bg-emerald-500 text-black'
                  : hasChanges && !isTargetSuperAdmin
                  ? 'bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-400 hover:to-yellow-400 text-black shadow-lg shadow-amber-500/20 cursor-pointer active:scale-95'
                  : 'bg-slate-800 text-slate-500 border border-slate-700/50 cursor-not-allowed'
              }`}
            >
              {saving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  <span>Yetkiler Kaydediliyor...</span>
                </>
              ) : saveSuccess ? (
                <>
                  <Check size={14} className="stroke-[3]" />
                  <span>Başarıyla Kaydedildi!</span>
                </>
              ) : (
                <>
                  <ShieldCheck size={14} />
                  <span>Yetkileri Kaydet</span>
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

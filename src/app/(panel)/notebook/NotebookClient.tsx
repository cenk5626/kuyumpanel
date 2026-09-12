'use client';

import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Plus,
  Search,
  Pin,
  Clock,
  Lock,
  Building2,
  Users,
  Archive,
  Trash2,
  Tag,
  AlertCircle,
  Calendar,
  CheckCircle2,
  Wrench,
  Flame,
  DollarSign,
  User,
} from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import { THEME } from '@/constants/theme';
import {
  NOTEBOOK_CATEGORY,
  NOTEBOOK_CATEGORY_LABELS,
  NOTEBOOK_VISIBILITY,
  NOTEBOOK_VISIBILITY_LABELS,
  NotebookCategory,
  NotebookVisibility,
} from '@/constants/notebook';

interface NotebookEntry {
  id: string;
  category: string;
  title: string;
  content: string;
  visibility: string;
  linkedCustomerId?: string | null;
  linkedCustomer?: { id: string; name: string; phone?: string | null } | null;
  linkedSupplierId?: string | null;
  linkedSupplier?: { id: string; name: string } | null;
  linkedServiceOrderId?: string | null;
  linkedServiceOrder?: { id: string; serviceNumber: string; customerName: string } | null;
  reminderAt?: string | null;
  isPinned: boolean;
  status: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface Props {
  initialEntries: NotebookEntry[];
  customers: Array<{ id: string; name: string }>;
  suppliers: Array<{ id: string; name: string }>;
  branches: Array<{ id: string; name: string; code: string }>;
}

export default function NotebookClient({
  initialEntries,
  customers,
  suppliers,
  branches,
}: Props) {
  const [entries, setEntries] = useState<NotebookEntry[]>(initialEntries);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedVisibility, setSelectedVisibility] = useState<string>('ALL');
  const [pinnedOnly, setPinnedOnly] = useState(false);

  // Modal State
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<NotebookCategory>(NOTEBOOK_CATEGORY.GENERAL);
  const [visibility, setVisibility] = useState<NotebookVisibility>(NOTEBOOK_VISIBILITY.DEALER);
  const [linkedCustomerId, setLinkedCustomerId] = useState('');
  const [linkedSupplierId, setLinkedSupplierId] = useState('');
  const [reminderAt, setReminderAt] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // KPIs
  const kpis = useMemo(() => {
    const total = entries.length;
    const pinned = entries.filter((e) => e.isPinned).length;
    const now = new Date();
    const upcomingReminders = entries.filter((e) => e.reminderAt && new Date(e.reminderAt) > now).length;
    const privateNotes = entries.filter((e) => e.visibility === NOTEBOOK_VISIBILITY.PRIVATE).length;

    return { total, pinned, upcomingReminders, privateNotes };
  }, [entries]);

  // Filtreleme
  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !searchQuery ||
        entry.title.toLowerCase().includes(q) ||
        entry.content.toLowerCase().includes(q) ||
        (entry.linkedCustomer?.name && entry.linkedCustomer.name.toLowerCase().includes(q)) ||
        (entry.linkedSupplier?.name && entry.linkedSupplier.name.toLowerCase().includes(q));

      const matchesCategory = selectedCategory === 'ALL' || entry.category === selectedCategory;
      const matchesVisibility = selectedVisibility === 'ALL' || entry.visibility === selectedVisibility;
      const matchesPinned = !pinnedOnly || entry.isPinned;

      return matchesSearch && matchesCategory && matchesVisibility && matchesPinned;
    });
  }, [entries, searchQuery, selectedCategory, selectedVisibility, pinnedOnly]);

  const handleCreateEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setNotification({ text: 'Lütfen başlık ve not içeriği giriniz.', type: 'error' });
      return;
    }

    try {
      setIsSubmitting(true);
      setNotification(null);

      const res = await fetch('/api/notebook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          category,
          visibility,
          linkedCustomerId: linkedCustomerId || null,
          linkedSupplierId: linkedSupplierId || null,
          reminderAt: reminderAt ? new Date(reminderAt).toISOString() : null,
          isPinned,
          branchId: selectedBranchId || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Not kaydedilemedi.');

      setEntries((prev) => [data.entry, ...prev]);
      setIsNewModalOpen(false);
      setNotification({ text: 'Not defterine başarıyla eklendi.', type: 'success' });

      // Reset
      setTitle('');
      setContent('');
      setCategory(NOTEBOOK_CATEGORY.GENERAL);
      setVisibility(NOTEBOOK_VISIBILITY.DEALER);
      setLinkedCustomerId('');
      setLinkedSupplierId('');
      setReminderAt('');
      setIsPinned(false);
    } catch (err: any) {
      setNotification({ text: err.message, type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTogglePin = async (id: string, currentPinned: boolean) => {
    try {
      const res = await fetch(`/api/notebook/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPinned: !currentPinned }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Sabitleme güncellenemedi.');

      setEntries((prev) =>
        prev
          .map((e) => (e.id === id ? { ...e, isPinned: !currentPinned } : e))
          .sort((a, b) => (b.isPinned === a.isPinned ? 0 : b.isPinned ? 1 : -1))
      );
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleArchive = async (id: string) => {
    if (!confirm('Bu notu arşivlemek istediğinize emin misiniz?')) return;
    try {
      const res = await fetch(`/api/notebook/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Not arşivlenemedi.');

      setEntries((prev) => prev.filter((e) => e.id !== id));
      setNotification({ text: 'Not arşive kaldırıldı.', type: 'success' });
    } catch (err: any) {
      alert(err.message);
    }
  };

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case NOTEBOOK_CATEGORY.CUSTOMER:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-900';
      case NOTEBOOK_CATEGORY.SUPPLIER:
        return 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-900';
      case NOTEBOOK_CATEGORY.WORKSHOP:
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-900';
      case NOTEBOOK_CATEGORY.SERVICE:
        return 'bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300 border-orange-200 dark:border-orange-900';
      case NOTEBOOK_CATEGORY.PRICE:
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900';
      case NOTEBOOK_CATEGORY.REMINDER:
        return 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-900';
      case NOTEBOOK_CATEGORY.PRIVATE:
        return 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700';
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800/80 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Üst Başlık & Butonlar */}
      <PageHeader
        title="Kuyumcu Defteri & Operasyonel Notlar"
        subtitle="Özel sipariş talepleri, toptancı randevuları, atölye takibi, ajanda ve hatırlatıcılar."
        icon={BookOpen}
        badges={[
          { label: `${kpis.total} Not`, variant: 'gold' },
          { label: `${kpis.pinned} Sabitlenmiş`, variant: 'info' },
          ...(kpis.upcomingReminders > 0 ? [{ label: `${kpis.upcomingReminders} Ajanda`, variant: 'warning' as const }] : []),
        ]}
        actions={
          <button
            onClick={() => setIsNewModalOpen(true)}
            className={`${THEME.BTN_PRIMARY} min-h-[44px] flex items-center justify-center gap-2`}
          >
            <Plus className="h-4 w-4" />
            <span>Yeni Not Yaz</span>
          </button>
        }
      />

      {/* KPI Kartları */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Toplam Defter Notu"
          value={`${kpis.total} Not`}
          subtitle="Tüm operasyonel kayıtlar"
          icon={BookOpen}
          iconColor="gold"
        />
        <div
          onClick={() => setPinnedOnly(!pinnedOnly)}
          className={`cursor-pointer transition-all rounded-2xl ${
            pinnedOnly ? 'ring-2 ring-amber-500 scale-[1.02]' : ''
          }`}
        >
          <StatCard
            title="Sabitlenmiş Notlar"
            value={`${kpis.pinned} Sabit ${pinnedOnly ? '(Filtrelendi)' : ''}`}
            subtitle="Hızlı erişim iğneleri"
            icon={Pin}
            iconColor="gold"
          />
        </div>
        <StatCard
          title="Yaklaşan Hatırlatıcılar"
          value={`${kpis.upcomingReminders} Ajanda`}
          subtitle="Vadesi gelen notlar"
          icon={Clock}
          iconColor={kpis.upcomingReminders > 0 ? 'rose' : 'emerald'}
        />
        <StatCard
          title="Gizli / Kişisel Notlarım"
          value={`${kpis.privateNotes} Kayıt`}
          subtitle="Yalnızca size özel"
          icon={Lock}
          iconColor="purple"
        />
      </div>

      {/* Filtre Çubuğu */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Başlık, not içeriği, müşteri veya toptancı ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 placeholder-slate-400"
            />
          </div>
          <div className="flex items-center gap-2">
            <select
              value={selectedVisibility}
              onChange={(e) => setSelectedVisibility(e.target.value)}
              className="px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="ALL">Tüm Görünürlükler</option>
              {Object.entries(NOTEBOOK_VISIBILITY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Kategori Hapları */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              selectedCategory === 'ALL'
                ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Tümü ({entries.length})
          </button>
          {Object.entries(NOTEBOOK_CATEGORY_LABELS).map(([catKey, label]) => {
            const count = entries.filter((e) => e.category === catKey).length;
            const isSelected = selectedCategory === catKey;
            return (
              <button
                key={catKey}
                onClick={() => setSelectedCategory(catKey)}
                className={`min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                  isSelected
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Not Kartları Izgarası */}
      {filteredEntries.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500">
          <BookOpen className="h-10 w-10 mx-auto mb-3 text-slate-300 dark:text-slate-700" />
          <p className="font-semibold text-slate-700 dark:text-slate-300">Kayıtlı not bulunamadı.</p>
          <p className="text-xs text-slate-500 mt-1">Filtreleri temizleyebilir veya yeni bir not yazabilirsiniz.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEntries.map((entry) => {
            const hasReminder = Boolean(entry.reminderAt);
            const reminderDate = entry.reminderAt ? new Date(entry.reminderAt) : null;
            const isReminderDue = reminderDate ? reminderDate.getTime() <= Date.now() : false;

            return (
              <div
                key={entry.id}
                className={`relative flex flex-col justify-between p-5 rounded-2xl border transition shadow-sm hover:shadow-md ${
                  entry.isPinned
                    ? 'bg-gradient-to-b from-amber-50/50 to-white dark:from-amber-950/20 dark:to-slate-900 border-amber-300 dark:border-amber-800/80 ring-1 ring-amber-400/30'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div>
                  {/* Kart Üst Barı: Kategori, Görünürlük & Pin Butonu */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-1.5">
                      <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${getCategoryColor(entry.category)}`}>
                        {NOTEBOOK_CATEGORY_LABELS[entry.category as NotebookCategory] || entry.category}
                      </span>
                      {entry.visibility === NOTEBOOK_VISIBILITY.PRIVATE && (
                        <span className="p-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400" title="Sadece Ben (Gizli)">
                          <Lock className="h-3 w-3" />
                        </span>
                      )}
                      {entry.visibility === NOTEBOOK_VISIBILITY.BRANCH && (
                        <span className="p-1 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400" title="Şube Personeli">
                          <Building2 className="h-3 w-3" />
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => handleTogglePin(entry.id, entry.isPinned)}
                      className={`p-1.5 rounded-lg transition ${
                        entry.isPinned
                          ? 'text-amber-500 hover:bg-amber-100 dark:hover:bg-amber-950/40'
                          : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                      title={entry.isPinned ? 'Sabitlemeyi Kaldır' : 'Başa Sabitle'}
                    >
                      <Pin className={`h-4 w-4 ${entry.isPinned ? 'fill-amber-500' : ''}`} />
                    </button>
                  </div>

                  {/* Başlık & İçerik */}
                  <h3 className="font-bold text-slate-900 dark:text-white text-base mb-1.5 leading-snug">
                    {entry.title}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                    {entry.content}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
                  {/* İlişkili Kayıt Etiketleri */}
                  {(entry.linkedCustomer || entry.linkedSupplier || entry.linkedServiceOrder) && (
                    <div className="flex flex-wrap gap-1.5 text-[11px]">
                      {entry.linkedCustomer && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300">
                          <User className="h-3 w-3" /> {entry.linkedCustomer.name}
                        </span>
                      )}
                      {entry.linkedSupplier && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300">
                          <Building2 className="h-3 w-3" /> {entry.linkedSupplier.name}
                        </span>
                      )}
                      {entry.linkedServiceOrder && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300">
                          <Wrench className="h-3 w-3" /> {entry.linkedServiceOrder.serviceNumber}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Hatırlatıcı Rozeti */}
                  {hasReminder && reminderDate && (
                    <div
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold ${
                        isReminderDue
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                      }`}
                    >
                      <Clock className="h-3.5 w-3.5" />
                      <span>
                        {isReminderDue ? 'Süresi Geldi: ' : 'Hatırlatma: '}
                        {reminderDate.toLocaleString('tr-TR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  )}

                  {/* Alt Bilgi: Tarih & Arşivleme Butonu */}
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                    <span>
                      {new Date(entry.createdAt).toLocaleDateString('tr-TR')} · {entry.createdBy}
                    </span>
                    <button
                      onClick={() => handleArchive(entry.id)}
                      title="Arşive Kaldır"
                      className="p-1 rounded hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    >
                      <Archive className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* YENİ NOT YAZMA MODALI */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-amber-500" />
                <h3 className="font-bold text-slate-900 dark:text-white">
                  Yeni Defter Notu Yaz
                </h3>
              </div>
              <button onClick={() => setIsNewModalOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateEntry} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Not Başlığı *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Örn: Ayşe Hanım Özel 3'lü Trabzon Hasır Siparişi"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Kategori</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as NotebookCategory)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    {Object.entries(NOTEBOOK_CATEGORY_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Görünürlük</label>
                  <select
                    value={visibility}
                    onChange={(e) => setVisibility(e.target.value as NotebookVisibility)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    {Object.entries(NOTEBOOK_VISIBILITY_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Not İçeriği *</label>
                <textarea
                  rows={4}
                  required
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Özel istekler, ölçüler, anlaşılan fiyat veya kritik detaylar..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">İlişkili Müşteri (Opsiyonel)</label>
                  <select
                    value={linkedCustomerId}
                    onChange={(e) => setLinkedCustomerId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="">Seçilmedi</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">İlişkili Toptancı (Opsiyonel)</label>
                  <select
                    value={linkedSupplierId}
                    onChange={(e) => setLinkedSupplierId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="">Seçilmedi</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Hatırlatıcı Tarihi & Saati</label>
                  <input
                    type="datetime-local"
                    value={reminderAt}
                    onChange={(e) => setReminderAt(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div className="flex items-center gap-2 pt-5">
                  <input
                    type="checkbox"
                    id="isPinnedCheck"
                    checked={isPinned}
                    onChange={(e) => setIsPinned(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                  />
                  <label htmlFor="isPinnedCheck" className="font-semibold text-slate-800 dark:text-slate-200 cursor-pointer">
                    Başa Sabitle (Öncelikli Not)
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="min-h-[44px] px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-950 shadow-md shadow-amber-500/20 disabled:opacity-50"
                >
                  {isSubmitting ? 'Kaydediliyor...' : 'Notu Deftere Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

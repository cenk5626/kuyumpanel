'use client';

import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  Plus,
  Search,
  Eye,
  Trash2,
  Copy,
  Check,
  Clock,
  AlertTriangle,
  Lock,
  UserCheck,
  FileText,
  Building2,
  Calendar,
} from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import { THEME } from '@/constants/theme';
import {
  IDENTITY_PURPOSE,
  IDENTITY_PURPOSE_LABELS,
  IDENTITY_STATUS,
  IDENTITY_STATUS_LABELS,
  RETENTION_PERIOD_YEARS,
  IdentityPurpose,
  IdentityStatus,
} from '@/constants/identity-vault';

interface IdentityRecord {
  id: string;
  customerId?: string | null;
  customer?: { id: string; name: string; phone?: string | null } | null;
  firstName: string;
  lastName: string;
  maskedTcNo: string;
  purpose: string;
  legalBasisOrConsentReference?: string | null;
  collectedAt: string;
  retentionUntil: string;
  status: string;
  createdAt: string;
}

interface CustomerOption {
  id: string;
  name: string;
  phone?: string | null;
}

interface Props {
  initialIdentities: IdentityRecord[];
  customers: CustomerOption[];
}

export default function IdentityVaultClient({ initialIdentities, customers }: Props) {
  const [identities, setIdentities] = useState<IdentityRecord[]>(initialIdentities);
  const [searchQuery, setSearchQuery] = useState('');
  const [purposeFilter, setPurposeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modallar
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [revealTarget, setRevealTarget] = useState<IdentityRecord | null>(null);
  const [revealReason, setRevealReason] = useState('Resmi Fatura Düzenleme / MASAK Kontrolü');
  const [revealedTcNo, setRevealedTcNo] = useState<string | null>(null);
  const [isRevealing, setIsRevealing] = useState(false);
  const [copied, setCopied] = useState(false);

  // Form State
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [rawTcNo, setRawTcNo] = useState('');
  const [purpose, setPurpose] = useState<IdentityPurpose>(IDENTITY_PURPOSE.GENEL);
  const [retentionYears, setRetentionYears] = useState<number>(RETENTION_PERIOD_YEARS.MASAK_LEGAL);
  const [legalBasis, setLegalBasis] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // TCKN İstemci Algoritma Kontrolü
  const tcknValidation = useMemo(() => {
    const cleaned = rawTcNo.trim();
    if (!cleaned) return { isValid: false, message: '' };
    if (cleaned.length !== 11) return { isValid: false, message: '11 haneli olmalıdır.' };
    if (!/^\d{11}$/.test(cleaned)) return { isValid: false, message: 'Yalnızca rakamlardan oluşmalıdır.' };
    if (cleaned[0] === '0') return { isValid: false, message: 'İlk hane 0 olamaz.' };

    const digits = cleaned.split('').map(Number);
    const sumOdd = digits[0] + digits[2] + digits[4] + digits[6] + digits[8];
    const sumEven = digits[1] + digits[3] + digits[5] + digits[7];
    const tenthExpected = (((sumOdd * 7) - sumEven) % 10 + 10) % 10;
    if (digits[9] !== tenthExpected) return { isValid: false, message: '10. kontrol hanesi geçersiz.' };

    const sumFirst10 = digits.slice(0, 10).reduce((a, b) => a + b, 0);
    if (digits[10] !== (sumFirst10 % 10)) return { isValid: false, message: '11. kontrol hanesi geçersiz.' };

    return { isValid: true, message: 'Geçerli T.C. Kimlik No' };
  }, [rawTcNo]);

  // KPIs
  const kpis = useMemo(() => {
    const total = identities.length;
    const active = identities.filter((i) => i.status === IDENTITY_STATUS.ACTIVE).length;
    const masakAML = identities.filter((i) => i.purpose === IDENTITY_PURPOSE.MASAK_AML || i.purpose === IDENTITY_PURPOSE.YUKSEK_TUTARLI_ISLEM).length;
    const now = new Date();
    const expiringSoon = identities.filter((i) => {
      const exp = new Date(i.retentionUntil);
      const diffDays = (exp.getTime() - now.getTime()) / (1000 * 3600 * 24);
      return diffDays <= 30 && i.status === IDENTITY_STATUS.ACTIVE;
    }).length;

    return { total, active, masakAML, expiringSoon };
  }, [identities]);

  // Filtreleme
  const filteredIdentities = useMemo(() => {
    return identities.filter((item) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !searchQuery ||
        item.firstName.toLowerCase().includes(q) ||
        item.lastName.toLowerCase().includes(q) ||
        item.maskedTcNo.includes(q) ||
        (item.customer?.name && item.customer.name.toLowerCase().includes(q));

      const matchesPurpose = purposeFilter === 'ALL' || item.purpose === purposeFilter;
      const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;

      return matchesSearch && matchesPurpose && matchesStatus;
    });
  }, [identities, searchQuery, purposeFilter, statusFilter]);

  const handleCustomerChange = (customerId: string) => {
    setSelectedCustomerId(customerId);
    const found = customers.find((c) => c.id === customerId);
    if (found) {
      const parts = found.name.trim().split(' ');
      if (parts.length > 1) {
        setLastName(parts.pop() || '');
        setFirstName(parts.join(' '));
      } else {
        setFirstName(found.name);
        setLastName('');
      }
    }
  };

  const handleCreateIdentity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tcknValidation.isValid) {
      setNotification({ text: 'Lütfen geçerli bir T.C. Kimlik Numarası giriniz.', type: 'error' });
      return;
    }

    try {
      setIsSubmitting(true);
      setNotification(null);

      const res = await fetch('/api/customer-identities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: selectedCustomerId || null,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          tcNo: rawTcNo.trim(),
          purpose,
          legalBasisOrConsentReference: legalBasis.trim() || null,
          retentionYears,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Kimlik kaydedilemedi.');

      setIdentities((prev) => [data.identity, ...prev]);
      setIsAddModalOpen(false);
      setNotification({ text: `${firstName} ${lastName} kimlik kaydı AES-256 ile şifrelenerek kaydedildi.`, type: 'success' });

      // Reset
      setFirstName('');
      setLastName('');
      setRawTcNo('');
      setLegalBasis('');
      setSelectedCustomerId('');
    } catch (err: any) {
      setNotification({ text: err.message, type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenRevealModal = (item: IdentityRecord) => {
    setRevealTarget(item);
    setRevealReason('Resmi Fatura Düzenleme / MASAK Kontrolü');
    setRevealedTcNo(null);
    setCopied(false);
  };

  const handleExecuteReveal = async () => {
    if (!revealTarget) return;
    try {
      setIsRevealing(true);
      const res = await fetch(`/api/customer-identities/${revealTarget.id}/reveal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: revealReason }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Kimlik numarası çözülemedi.');

      setRevealedTcNo(data.plainTcNo);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsRevealing(false);
    }
  };

  const handleCopyTcNo = () => {
    if (!revealedTcNo) return;
    navigator.clipboard.writeText(revealedTcNo);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDeleteIdentity = async (id: string, name: string) => {
    if (!confirm(`${name} isimli müşteriye ait kimlik kaydı imha edilecek ve silinecektir. Onaylıyor musunuz?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/customer-identities/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Kayıt silinemedi.');

      setIdentities((prev) => prev.filter((item) => item.id !== id));
      setNotification({ text: `${name} kimlik kaydı başarıyla imha edildi.`, type: 'success' });
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Başlık ve Butonlar */}
      <PageHeader
        title="Müşteri Kimlik Havuzu (TCKN Vault)"
        subtitle="KVKK ve MASAK uyumlu AES-256-GCM şifreli TCKN kasası, gerekçeli açma ve denetim kayıtları."
        icon={ShieldCheck}
        badges={[
          { label: `${kpis.total} Kayıt`, variant: 'gold' },
          { label: `${kpis.active} Aktif & Geçerli`, variant: 'success' },
          ...(kpis.expiringSoon > 0 ? [{ label: `${kpis.expiringSoon} Süre Uyarısı`, variant: 'warning' as const }] : []),
        ]}
        actions={
          <button
            onClick={() => setIsAddModalOpen(true)}
            className={`${THEME.BTN_PRIMARY} min-h-[44px] flex items-center justify-center gap-2`}
          >
            <Plus className="h-4 w-4" />
            <span>Yeni Kimlik Kaydı Ekle</span>
          </button>
        }
      />

      {/* Bildirim */}
      {notification && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-sm ${
            notification.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
              : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200'
          }`}
        >
          <span>{notification.text}</span>
          <button onClick={() => setNotification(null)} className="text-xs font-bold underline ml-4">
            Kapat
          </button>
        </div>
      )}

      {/* KPI Kartları */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Toplam Kimlik Kaydı"
          value={`${kpis.total} Adet`}
          subtitle="Şifrelenmiş kimlik kasası"
          icon={Lock}
          iconColor="gold"
        />
        <StatCard
          title="Aktif & Geçerli"
          value={`${kpis.active} Kayıt`}
          subtitle="Doğrulanmış TCKN kaydı"
          icon={UserCheck}
          iconColor="emerald"
        />
        <StatCard
          title="MASAK & AML Kapsamında"
          value={`${kpis.masakAML} Dosya`}
          subtitle="Yasal mevzuat uyumlu"
          icon={ShieldCheck}
          iconColor="blue"
        />
        <StatCard
          title="Saklama Süresi Uyarısı"
          value={`${kpis.expiringSoon} Uyarı`}
          subtitle={kpis.expiringSoon > 0 ? 'Yakında imha edilecek' : 'Süreler güncel'}
          icon={Clock}
          iconColor={kpis.expiringSoon > 0 ? 'rose' : 'emerald'}
        />
      </div>

      {/* Arama & Filtreler */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder="Ad, Soyad, Maskeli TC veya Müşteri ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-10 pr-4 min-h-[44px] ${THEME.INPUT}`}
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            value={purposeFilter}
            onChange={(e) => setPurposeFilter(e.target.value)}
            className={`min-h-[44px] ${THEME.INPUT}`}
          >
            <option value="ALL">Tüm Amaçlar</option>
            {Object.entries(IDENTITY_PURPOSE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={`min-h-[44px] ${THEME.INPUT}`}
          >
            <option value="ALL">Tüm Durumlar</option>
            {Object.entries(IDENTITY_STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Kimlikler Tablosu */}
      <div className={THEME.TABLE.CONTAINER}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className={THEME.TABLE.HEADER}>
              <tr>
                <th className={THEME.TABLE.TH}>Ad Soyad</th>
                <th className={THEME.TABLE.TH}>Maskeli T.C. Kimlik No</th>
                <th className={THEME.TABLE.TH}>İlişkili Müşteri</th>
                <th className={THEME.TABLE.TH}>Saklama Amacı</th>
                <th className={THEME.TABLE.TH}>Saklama Bitişi</th>
                <th className={THEME.TABLE.TH}>Durum</th>
                <th className={`${THEME.TABLE.TH} text-right`}>İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80 text-slate-900 dark:text-white">
              {filteredIdentities.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    Kayıtlı kimlik bilgisi bulunamadı.
                  </td>
                </tr>
              ) : (
                filteredIdentities.map((item) => {
                  const retentionDate = new Date(item.retentionUntil);
                  const isExpired = retentionDate.getTime() < Date.now();

                  return (
                    <tr key={item.id} className={THEME.TABLE.BODY_ROW}>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {item.firstName} {item.lastName}
                        </div>
                        {item.legalBasisOrConsentReference && (
                          <div className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[200px]">
                            {item.legalBasisOrConsentReference}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold tracking-wider text-amber-600 dark:text-amber-400">
                        {item.maskedTcNo}
                      </td>
                      <td className="py-3.5 px-4">
                        {item.customer ? (
                          <div>
                            <span className="font-medium text-xs text-slate-800 dark:text-slate-200 block">
                              {item.customer.name}
                            </span>
                            {item.customer.phone && (
                              <span className="text-[11px] text-slate-500">{item.customer.phone}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">Bağımsız Kayıt</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {IDENTITY_PURPOSE_LABELS[item.purpose as IdentityPurpose] || item.purpose}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="text-xs">
                          {retentionDate.toLocaleDateString('tr-TR')}
                        </div>
                        {isExpired && (
                          <span className="text-[10px] text-rose-600 font-bold block">Süresi Doldu</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            item.status === IDENTITY_STATUS.ACTIVE
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                              : item.status === IDENTITY_STATUS.EXPIRED
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                          }`}
                        >
                          {IDENTITY_STATUS_LABELS[item.status as IdentityStatus] || item.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenRevealModal(item)}
                            title="Yetkili TCKN Aç (Gerekçeli)"
                            className="min-h-[36px] min-w-[36px] p-1.5 rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 hover:bg-amber-100 transition flex items-center justify-center"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteIdentity(item.id, `${item.firstName} ${item.lastName}`)}
                            title="Kimlik Kaydını İmha Et"
                            className="min-h-[36px] min-w-[36px] p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-rose-600 hover:border-rose-300 transition flex items-center justify-center"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
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

      {/* GEREKÇELİ TCKN AÇMA MODALI */}
      {revealTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6">
            <div className="flex items-center gap-2 mb-3">
              <Lock className="h-5 w-5 text-amber-500" />
              <h3 className="font-bold text-slate-900 dark:text-white">
                T.C. Kimlik Numarası Açma (Audit)
              </h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 mb-4">
              <strong>{revealTarget.firstName} {revealTarget.lastName}</strong> ({revealTarget.maskedTcNo}) kişisine ait kimlik numarası çözülecektir. KVKK gereği işlem denetim günlüğüne kaydedilir.
            </p>

            {!revealedTcNo ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Görüntüleme Gerekçesi *
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={revealReason}
                    onChange={(e) => setRevealReason(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder="Örn: Resmi Fatura Düzenleme / MASAK Kontrolü"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setRevealTarget(null)}
                    className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    Vazgeç
                  </button>
                  <button
                    type="button"
                    disabled={isRevealing || !revealReason.trim()}
                    onClick={handleExecuteReveal}
                    className="min-h-[44px] px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-950 shadow-md shadow-amber-500/20 disabled:opacity-50"
                  >
                    {isRevealing ? 'Şifre Çözülüyor...' : 'Şifreyi Çöz ve Göster'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-amber-500/10 dark:bg-amber-950/40 border border-amber-300/80 dark:border-amber-800 text-center">
                  <span className="text-xs text-slate-500 block mb-1">Açık T.C. Kimlik Numarası</span>
                  <span className="text-2xl font-mono font-bold tracking-widest text-amber-700 dark:text-amber-400">
                    {revealedTcNo}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <button
                    onClick={handleCopyTcNo}
                    className="min-h-[44px] flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold shadow hover:opacity-90 transition"
                  >
                    {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                    {copied ? 'Kopyalandı!' : 'Panoya Kopyala'}
                  </button>
                  <button
                    onClick={() => setRevealTarget(null)}
                    className="min-h-[44px] px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    Kapat
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* YENİ KİMLİK KAYIT MODALI */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-amber-500" />
                <h3 className="font-bold text-slate-900 dark:text-white">
                  Yeni Müşteri Kimlik Kaydı Ekle
                </h3>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateIdentity} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Müşteri Seç (Opsiyonel)</label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => handleCustomerChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">Bağımsız Kayıt / Müşteri Yok</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} ({c.phone || 'No tel'})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Adı *</label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Müşteri Adı"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Soyadı *</label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Müşteri Soyadı"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">T.C. Kimlik Numarası (11 Hane) *</label>
                  {rawTcNo && (
                    <span className={`text-[11px] font-medium ${tcknValidation.isValid ? 'text-emerald-600' : 'text-rose-500'}`}>
                      {tcknValidation.message}
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  maxLength={11}
                  required
                  value={rawTcNo}
                  onChange={(e) => setRawTcNo(e.target.value.replace(/\D/g, ''))}
                  placeholder="11 Haneli TCKN"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 font-mono text-sm tracking-wider text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Kayıt Amacı</label>
                  <select
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value as IdentityPurpose)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    {Object.entries(IDENTITY_PURPOSE_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Saklama Süresi</label>
                  <select
                    value={retentionYears}
                    onChange={(e) => setRetentionYears(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value={RETENTION_PERIOD_YEARS.MASAK_LEGAL}>10 Yıl (MASAK & Resmi Mevzuat)</option>
                    <option value={RETENTION_PERIOD_YEARS.STANDARD}>5 Yıl (Standart Ticari Süre)</option>
                    <option value={RETENTION_PERIOD_YEARS.SHORT}>1 Yıl (Kısa Süreli / Geçici)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Yasal Dayanak / Onay Referansı (Opsiyonel)</label>
                <input
                  type="text"
                  value={legalBasis}
                  onChange={(e) => setLegalBasis(e.target.value)}
                  placeholder="Örn: 2026/04 Fatura No veya Açık Rıza Formu #104"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !tcknValidation.isValid}
                  className="min-h-[44px] px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-950 shadow-md shadow-amber-500/20 disabled:opacity-50"
                >
                  {isSubmitting ? 'Kaydediliyor...' : 'Havuza Güvenli Ekle (AES-256)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

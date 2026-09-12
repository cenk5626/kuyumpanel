'use client';

import React, { useState } from 'react';
import {
  CreditCard,
  Plus,
  Copy,
  Eye,
  CheckCircle2,
  AlertCircle,
  Star,
  Trash2,
  ShieldAlert,
  Building2,
  X,
  Check,
} from 'lucide-react';
import { TURKISH_BANKS, BANK_ACCOUNT_CURRENCY } from '@/constants/bank-account';
import { validateTurkishIban } from '@/lib/banking/iban-utils';

interface Account {
  id: string;
  bankName: string;
  accountHolderName: string;
  currency: string;
  maskedIban: string;
  isActive: boolean;
  isDefault: boolean;
  note?: string | null;
  branchId?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Props {
  initialAccounts: Account[];
  branches: Array<{ id: string; name: string; code: string }>;
}

export default function BankAccountsClient({ initialAccounts, branches }: Props) {
  const [accounts, setAccounts] = useState<Account[]>(initialAccounts);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [revealModalAccount, setRevealModalAccount] = useState<Account | null>(null);
  const [revealReason, setRevealReason] = useState('Müşteri Havalesi / Tahsilat Bilgisi');
  const [revealedIban, setRevealedIban] = useState<string | null>(null);
  const [isRevealing, setIsRevealing] = useState(false);

  // Form State
  const [selectedBank, setSelectedBank] = useState<string>(TURKISH_BANKS[0].name);
  const [accountHolder, setAccountHolder] = useState('');
  const [rawIban, setRawIban] = useState('TR');
  const [currency, setCurrency] = useState('TRY');
  const [isDefault, setIsDefault] = useState(false);
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Anlık IBAN Doğrulaması
  const ibanValidation = validateTurkishIban(rawIban);

  // Yeni Hesap Ekle
  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ibanValidation.isValid) {
      setNotification({ text: ibanValidation.error || 'Geçersiz IBAN.', type: 'error' });
      return;
    }

    setIsSubmitting(true);
    setNotification(null);

    try {
      const res = await fetch('/api/business-bank-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bankName: selectedBank,
          accountHolderName: accountHolder,
          iban: rawIban,
          currency,
          isDefault,
          note,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Banka hesabı kaydedilemedi.');

      setAccounts((prev) => {
        let updated = isDefault ? prev.map((a) => (a.currency === currency ? { ...a, isDefault: false } : a)) : [...prev];
        return [data.account, ...updated];
      });

      setIsAddModalOpen(false);
      setNotification({ text: `${selectedBank} hesabı başarıyla kaydedildi.`, type: 'success' });
      setRawIban('TR');
      setAccountHolder('');
      setNote('');
    } catch (err: any) {
      setNotification({ text: err.message, type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // IBAN Kopyalama (ve Audit Kaydı)
  const handleCopyIban = async (account: Account, plainText?: string) => {
    const textToCopy = plainText || account.maskedIban;
    navigator.clipboard.writeText(textToCopy);

    setNotification({ text: `${account.bankName} IBAN panoya kopyalandı.`, type: 'success' });

    // Arka planda denetim kaydı oluştur
    fetch(`/api/business-bank-accounts/${account.id}/copy-audit`, {
      method: 'POST',
    }).catch(() => {});
  };

  // IBAN Tam Metin Açma (Audit Loglu)
  const handleRevealIban = async () => {
    if (!revealModalAccount) return;
    setIsRevealing(true);
    try {
      const res = await fetch(`/api/business-bank-accounts/${revealModalAccount.id}/reveal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: revealReason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'IBAN çözülemedi.');

      setRevealedIban(data.formattedIban || data.plainIban);
    } catch (err: any) {
      setNotification({ text: err.message, type: 'error' });
      setRevealModalAccount(null);
    } finally {
      setIsRevealing(false);
    }
  };

  // Varsayılan Yap
  const handleSetDefault = async (account: Account) => {
    try {
      const res = await fetch(`/api/business-bank-accounts/${account.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isDefault: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Varsayılan yapılamadı.');

      setAccounts((prev) =>
        prev.map((a) => {
          if (a.currency === account.currency) {
            return { ...a, isDefault: a.id === account.id };
          }
          return a;
        })
      );
      setNotification({ text: `${account.bankName} varsayılan ${account.currency} hesabı yapıldı.`, type: 'success' });
    } catch (err: any) {
      setNotification({ text: err.message, type: 'error' });
    }
  };

  // Sil
  const handleDelete = async (account: Account) => {
    if (!confirm(`${account.bankName} (${account.maskedIban}) hesabını silmek istediğinize emin misiniz?`)) return;

    try {
      const res = await fetch(`/api/business-bank-accounts/${account.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Hesap silinemedi.');
      }

      setAccounts((prev) => prev.filter((a) => a.id !== account.id));
      setNotification({ text: `${account.bankName} hesabı silindi.`, type: 'success' });
    } catch (err: any) {
      setNotification({ text: err.message, type: 'error' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Üst Başlık */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900/80 p-5 rounded-2xl border border-slate-200 dark:border-amber-500/20 shadow-sm backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              İşletme Banka Hesapları & IBAN Yönetimi
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Şifreli ve denetlenebilir işletme IBAN havuzu, tek tıkla kopyalama ve denetim logu
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-sm transition-all shadow-md active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Yeni Banka Hesabı Ekle</span>
        </button>
      </div>

      {notification && (
        <div
          className={`p-4 rounded-xl text-sm font-medium border flex items-center justify-between ${
            notification.type === 'success'
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
              : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
          }`}
        >
          <span>{notification.text}</span>
          <button onClick={() => setNotification(null)} className="text-xs opacity-70 hover:opacity-100">✕</button>
        </div>
      )}

      {/* Hesap Kartları Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {accounts.length === 0 ? (
          <div className="col-span-full bg-white dark:bg-slate-900/60 p-12 text-center rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-400">
            Henüz kayıtlı bir işletme banka hesabı bulunmuyor.
          </div>
        ) : (
          accounts.map((account) => {
            const bankMeta = TURKISH_BANKS.find((b) => b.name === account.bankName);
            const brandColor = bankMeta?.color || '#3b82f6';

            return (
              <div
                key={account.id}
                className="relative rounded-2xl p-5 border transition-all duration-300 shadow-sm bg-white dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-4 hover:shadow-md"
              >
                {/* Üst Kısım: Banka Adı & Rozetler */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: brandColor }}
                      />
                      <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                        {account.bankName}
                      </h3>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {account.accountHolderName}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {account.isDefault && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1">
                        <Star className="w-3 h-3 fill-amber-500" />
                        <span>Varsayılan</span>
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {account.currency}
                    </span>
                  </div>
                </div>

                {/* Orta Kısım: Maskeli IBAN & Hızlı Kopyala */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-200 tracking-wider">
                    {account.maskedIban}
                  </div>
                  <button
                    onClick={() => handleCopyIban(account)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-amber-500/10 transition-all"
                    title="Maskeli IBAN'ı Kopyala"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>

                {account.note && (
                  <p className="text-[11px] text-slate-400 italic">
                    Not: {account.note}
                  </p>
                )}

                {/* Alt Aksiyon Butonları */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <button
                    onClick={() => {
                      setRevealModalAccount(account);
                      setRevealedIban(null);
                    }}
                    className="flex items-center gap-1 text-amber-600 dark:text-amber-400 hover:underline font-semibold"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>IBAN'ı Gör</span>
                  </button>

                  <div className="flex items-center gap-2">
                    {!account.isDefault && (
                      <button
                        onClick={() => handleSetDefault(account)}
                        className="text-slate-400 hover:text-amber-500 text-[11px]"
                      >
                        Varsayılan Yap
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(account)}
                      className="p-1 text-slate-400 hover:text-rose-500 transition-colors"
                      title="Hesabı Sil"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Yeni Hesap Ekleme Modalı */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-amber-500" />
                <span>Yeni İşletme Banka Hesabı Ekle</span>
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddAccount} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1 block">Banka Seçimi *</label>
                <select
                  value={selectedBank}
                  onChange={(e) => setSelectedBank(e.target.value)}
                  className="w-full h-11 px-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  {TURKISH_BANKS.map((b) => (
                    <option key={b.code} value={b.name}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1 block">Hesap Sahibi / Unvan *</label>
                <input
                  type="text"
                  required
                  placeholder="Örn: Kuyumculuk Tic. Ltd. Şti."
                  value={accountHolder}
                  onChange={(e) => setAccountHolder(e.target.value)}
                  className="w-full h-11 px-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1 block">
                  IBAN Numarası (TR...) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="TR00 0000 0000 0000 0000 0000 00"
                  value={rawIban}
                  onChange={(e) => setRawIban(e.target.value.toUpperCase())}
                  className={`w-full h-11 px-3 rounded-lg bg-slate-50 dark:bg-slate-800 border font-mono text-sm focus:outline-none focus:ring-2 ${
                    rawIban.length >= 26
                      ? ibanValidation.isValid
                        ? 'border-emerald-500 focus:ring-emerald-500/50'
                        : 'border-rose-500 focus:ring-rose-500/50'
                      : 'border-slate-200 dark:border-slate-700 focus:ring-amber-500/50'
                  }`}
                />
                <div className="flex justify-between mt-1 text-[11px]">
                  <span className={ibanValidation.isValid ? 'text-emerald-500' : 'text-rose-500'}>
                    {rawIban.length >= 26 && (ibanValidation.isValid ? '✓ Geçerli TR IBAN' : ibanValidation.error)}
                  </span>
                  <span className="text-slate-400">{rawIban.replace(/\s+/g, '').length}/26 karakter</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1 block">Para Birimi</label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full h-11 px-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
                  >
                    {Object.values(BANK_ACCOUNT_CURRENCY).map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center pt-6">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={isDefault}
                      onChange={(e) => setIsDefault(e.target.checked)}
                      className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500"
                    />
                    <span>Varsayılan Hesap</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1 block">Hesap Notu</label>
                <input
                  type="text"
                  placeholder="Örn: Ana tahsilat hesabı, FAST uyumlu"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full h-11 px-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 min-h-[44px] rounded-xl text-slate-600 dark:text-slate-300 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !ibanValidation.isValid}
                  className="px-5 py-2 min-h-[44px] rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-sm transition-all shadow-md active:scale-95 disabled:opacity-50"
                >
                  {isSubmitting ? 'Kaydediliyor...' : 'Hesabı Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* IBAN Tam Metin Gösterme Modalı (Audit Loglu) */}
      {revealModalAccount && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-500" />
                <span>Güvenli IBAN Görüntüleme</span>
              </h3>
              <button onClick={() => setRevealModalAccount(null)} className="text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Hassas finansal veri güvenliği gereği bu işlem kayıt altına alınır (AuditLog). Lütfen görüntüleme gerekçesini belirtiniz.
            </p>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 block">Görüntüleme Gerekçesi</label>
              <input
                type="text"
                value={revealReason}
                onChange={(e) => setRevealReason(e.target.value)}
                placeholder="Örn: Müşteriye IBAN paylaşımı"
                className="w-full h-10 px-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
              />
            </div>

            {revealedIban ? (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-2">
                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 block">
                  Açık IBAN Numarası:
                </span>
                <div className="font-mono text-sm font-bold text-slate-900 dark:text-slate-100 break-all select-all">
                  {revealedIban}
                </div>
                <button
                  onClick={() => handleCopyIban(revealModalAccount, revealedIban.replace(/\s+/g, ''))}
                  className="w-full py-2 mt-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Tam IBAN'ı Kopyala</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleRevealIban}
                disabled={isRevealing}
                className="w-full py-2.5 min-h-[44px] rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs transition-all flex items-center justify-center gap-2"
              >
                <Eye className="w-4 h-4" />
                <span>{isRevealing ? 'Çözülüyor...' : 'Şifreyi Çöz & Görüntüle'}</span>
              </button>
            )}

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setRevealModalAccount(null)}
                className="px-4 py-2 text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
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

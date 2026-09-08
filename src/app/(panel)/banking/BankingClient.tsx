'use client';

import React, { useState } from 'react';
import {
  Landmark,
  CreditCard,
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertCircle,
  Coins,
  Search,
  X,
  Calculator,
  Building2,
} from 'lucide-react';
import {
  BANK_ACCOUNT_TYPE,
  BANK_INTEGRATION_TYPE,
  BANK_MATCH_STATUS,
  POS_SETTLEMENT_STATUS,
  BANKING_DEFAULTS,
} from '@/constants/banking';
import { calculatePosSettlement } from '@/lib/banking/banking-engine';

interface BankAccountItem {
  id: string;
  bankName: string;
  accountName: string;
  accountType: string;
  currency: string;
  iban: string;
  balance: number;
  integrationType: string;
  lastSyncedAt: string | null;
  isActive: boolean;
  posCount: number;
  txCount: number;
}

interface PosTerminalItem {
  id: string;
  name: string;
  terminalId: string;
  merchantId: string | null;
  bankAccountId: string;
  bankName: string;
  accountName: string;
  commissionRate: number;
  blockingDays: number;
  isActive: boolean;
}

interface PosSettlementItem {
  id: string;
  posTerminalName: string;
  terminalId: string;
  bankName: string;
  settlementDate: string;
  maturityDate: string;
  grossAmount: number;
  commissionAmount: number;
  netAmount: number;
  status: string;
}

interface BankTransactionItem {
  id: string;
  bankName: string;
  accountName: string;
  amount: number;
  direction: string;
  type: string;
  description: string;
  senderReceiverName: string | null;
  matchStatus: string;
  transactionDate: string;
}

interface Props {
  initialAccounts: BankAccountItem[];
  initialPosTerminals: PosTerminalItem[];
  initialSettlements: PosSettlementItem[];
  initialTransactions: BankTransactionItem[];
  initialStats: {
    totalTlBalance: number;
    totalGoldBalanceGr: number;
    blockedSettlementTL: number;
    unmatchedCount: number;
  };
}

export default function BankingClient({
  initialAccounts,
  initialPosTerminals,
  initialSettlements,
  initialTransactions,
  initialStats,
}: Props) {
  const [accounts, setAccounts] = useState<BankAccountItem[]>(initialAccounts);
  const [posTerminals, setPosTerminals] = useState<PosTerminalItem[]>(initialPosTerminals);
  const [settlements, setSettlements] = useState<PosSettlementItem[]>(initialSettlements);
  const [transactions, setTransactions] = useState<BankTransactionItem[]>(initialTransactions);
  const [stats, setStats] = useState(initialStats);

  const [activeTab, setActiveTab] = useState<'accounts' | 'pos' | 'transactions' | 'calculator'>('accounts');
  const [syncingAccountId, setSyncingAccountId] = useState<string | null>(null);

  // Yeni Hesap Modal
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [newBankName, setNewBankName] = useState('');
  const [newAccountName, setNewAccountName] = useState('');
  const [newAccountType, setNewAccountType] = useState<string>(BANK_ACCOUNT_TYPE.VADESIZ_TL);
  const [newCurrency, setNewCurrency] = useState('TL');
  const [newIban, setNewIban] = useState('');
  const [newBalance, setNewBalance] = useState('');
  const [isSubmittingAccount, setIsSubmittingAccount] = useState(false);

  // Yeni POS Modal
  const [isPosModalOpen, setIsPosModalOpen] = useState(false);
  const [newPosName, setNewPosName] = useState('');
  const [newTerminalId, setNewTerminalId] = useState('');
  const [newMerchantId, setNewMerchantId] = useState('');
  const [newPosBankId, setNewPosBankId] = useState(accounts[0]?.id || '');
  const [newCommissionRate, setNewCommissionRate] = useState('1.90');
  const [newBlockingDays, setNewBlockingDays] = useState('1');
  const [isSubmittingPos, setIsSubmittingPos] = useState(false);

  // Yeni Takas Modal
  const [isSettlementModalOpen, setIsSettlementModalOpen] = useState(false);
  const [settlementPosId, setSettlementPosId] = useState(posTerminals[0]?.id || '');
  const [settlementGross, setSettlementGross] = useState('');
  const [isSubmittingSettlement, setIsSubmittingSettlement] = useState(false);

  // Simülatör State
  const [simGross, setSimGross] = useState('100000');
  const [simRate, setSimRate] = useState('1.90');
  const [simDays, setSimDays] = useState('1');

  // Açık Bankacılık Senkronizasyonu
  const handleSyncAccount = async (accId: string) => {
    setSyncingAccountId(accId);
    try {
      const res = await fetch('/api/banking/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bankAccountId: accId }),
      });
      const data = await res.json();
      if (data.success) {
        setAccounts((prev) =>
          prev.map((a) => (a.id === accId ? { ...a, lastSyncedAt: data.lastSyncedAt } : a))
        );
      } else {
        alert(data.error || 'Senkronizasyon başarısız');
      }
    } catch (e: any) {
      alert(e.message || 'Hata oluştu');
    } finally {
      setSyncingAccountId(null);
    }
  };

  // Yeni Banka Hesabı Kaydet
  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingAccount(true);
    try {
      const res = await fetch('/api/banking/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bankName: newBankName,
          accountName: newAccountName,
          accountType: newAccountType,
          currency: newAccountType === BANK_ACCOUNT_TYPE.ALTIN_HESABI ? 'HAS' : newCurrency,
          iban: newIban,
          balance: parseFloat(newBalance) || 0,
        }),
      });
      const data = await res.json();
      if (data.success && data.account) {
        setAccounts((prev) => [...prev, { ...data.account, posCount: 0, txCount: 0 }]);
        setIsAccountModalOpen(false);
        setNewBankName('');
        setNewAccountName('');
        setNewIban('');
        setNewBalance('');
      } else {
        alert(data.error || 'Hesap oluşturulamadı');
      }
    } catch (e: any) {
      alert(e.message || 'Hata oluştu');
    } finally {
      setIsSubmittingAccount(false);
    }
  };

  // Yeni POS Terminali Kaydet
  const handleCreatePos = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingPos(true);
    try {
      const res = await fetch('/api/banking/pos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newPosName,
          terminalId: newTerminalId,
          merchantId: newMerchantId,
          bankAccountId: newPosBankId,
          commissionRate: parseFloat(newCommissionRate) || BANKING_DEFAULTS.DEFAULT_COMMISSION_RATE,
          blockingDays: parseInt(newBlockingDays, 10) || BANKING_DEFAULTS.DEFAULT_BLOCKING_DAYS,
        }),
      });
      const data = await res.json();
      if (data.success && data.posTerminal) {
        const bank = accounts.find((a) => a.id === newPosBankId);
        setPosTerminals((prev) => [
          ...prev,
          {
            ...data.posTerminal,
            bankName: bank?.bankName || 'Banka',
            accountName: bank?.accountName || 'Hesap',
          },
        ]);
        setIsPosModalOpen(false);
        setNewPosName('');
        setNewTerminalId('');
      } else {
        alert(data.error || 'POS eklenemedi');
      }
    } catch (e: any) {
      alert(e.message || 'Hata oluştu');
    } finally {
      setIsSubmittingPos(false);
    }
  };

  // Yeni Takas Kaydı Ekle
  const handleCreateSettlement = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingSettlement(true);
    try {
      const res = await fetch('/api/banking/settlements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          posTerminalId: settlementPosId,
          grossAmount: parseFloat(settlementGross) || 0,
        }),
      });
      const data = await res.json();
      if (data.success && data.settlement) {
        const pos = posTerminals.find((p) => p.id === settlementPosId);
        setSettlements((prev) => [
          {
            ...data.settlement,
            posTerminalName: pos?.name || 'POS',
            terminalId: pos?.terminalId || 'TID',
            bankName: pos?.bankName || 'Banka',
          },
          ...prev,
        ]);
        setIsSettlementModalOpen(false);
        setSettlementGross('');
      } else {
        alert(data.error || 'Takas kaydı oluşturulamadı');
      }
    } catch (e: any) {
      alert(e.message || 'Hata oluştu');
    } finally {
      setIsSubmittingSettlement(false);
    }
  };

  // Simülasyon Hesabı
  const simCalc = calculatePosSettlement(
    parseFloat(simGross) || 0,
    parseFloat(simRate) || 0,
    parseInt(simDays, 10) || 0
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-amber-600 via-yellow-600 to-amber-700 dark:from-amber-400 dark:via-yellow-400 dark:to-amber-500 bg-clip-text text-transparent flex items-center gap-3">
            <Landmark className="w-8 h-8 text-amber-600 dark:text-amber-400" />
            Banka, POS & Açık Bankacılık Mutabakatı
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Vadesiz & Altın Depo Hesapları, POS Komisyon ve Valör Takas Takibi, Otomatik Dekont Eşleştirme
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsSettlementModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 rounded-xl font-medium transition-all text-sm"
          >
            <CreditCard className="w-4 h-4" />
            Gün Sonu POS Takası Ekle
          </button>

          <button
            onClick={() => setIsAccountModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-medium shadow-lg shadow-amber-600/20 transition-all text-sm"
          >
            <Plus className="w-4 h-4" />
            Yeni Banka Hesabı
          </button>
        </div>
      </div>

      {/* KPI Kartları */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Banka Nakit Varlığı (TL)
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <Landmark className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
            ₺{stats.totalTlBalance.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Tüm banka vadesiz TL hesapları</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Bankadaki Altın Depo
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Coins className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 text-2xl sm:text-3xl font-extrabold text-amber-600 dark:text-amber-400">
            {stats.totalGoldBalanceGr.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} gr
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Banka altın hesapları (Has karşılığı)</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              Blokede Bekleyen POS
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 text-2xl sm:text-3xl font-extrabold text-blue-600 dark:text-blue-400">
            ₺{stats.blockedSettlementTL.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Valör vadesinde hesaba geçecek net tutar</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Eşleşmemiş Dekont
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
            {stats.unmatchedCount}
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Satış eşleştirmesi bekleyen hareket</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('accounts')}
          className={`px-5 py-3 font-semibold text-sm border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'accounts'
              ? 'border-amber-600 text-amber-600 dark:border-amber-400 dark:text-amber-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Building2 className="w-4 h-4" />
          Banka & Altın Hesapları ({accounts.length})
        </button>

        <button
          onClick={() => setActiveTab('pos')}
          className={`px-5 py-3 font-semibold text-sm border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'pos'
              ? 'border-amber-600 text-amber-600 dark:border-amber-400 dark:text-amber-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          POS Cihazları & Valör Takasları ({settlements.length})
        </button>

        <button
          onClick={() => setActiveTab('transactions')}
          className={`px-5 py-3 font-semibold text-sm border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'transactions'
              ? 'border-amber-600 text-amber-600 dark:border-amber-400 dark:text-amber-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <ArrowDownLeft className="w-4 h-4" />
          Hesap Hareketleri & Eşleştirme ({transactions.length})
        </button>

        <button
          onClick={() => setActiveTab('calculator')}
          className={`px-5 py-3 font-semibold text-sm border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'calculator'
              ? 'border-amber-600 text-amber-600 dark:border-amber-400 dark:text-amber-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Calculator className="w-4 h-4" />
          Valör & Komisyon Hesaplayıcı
        </button>
      </div>

      {/* TAB 1: BANKA & ALTIN HESAPLARI */}
      {activeTab === 'accounts' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {accounts.map((acc) => (
            <div
              key={acc.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm hover:border-amber-500/50 transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold text-sm">
                    {acc.currency === 'HAS' ? <Coins className="w-5 h-5" /> : <Landmark className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-base">{acc.bankName}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{acc.accountName}</p>
                  </div>
                </div>

                <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                  acc.accountType === BANK_ACCOUNT_TYPE.ALTIN_HESABI
                    ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                }`}>
                  {acc.accountType === BANK_ACCOUNT_TYPE.ALTIN_HESABI ? 'ALTIN DEPO' : 'VADESİZ'}
                </span>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl space-y-1 font-mono text-xs">
                <span className="text-slate-400 block text-[10px]">IBAN:</span>
                <span className="text-slate-700 dark:text-slate-300 font-semibold truncate block">
                  {acc.iban}
                </span>
              </div>

              <div className="border-t border-slate-100 dark:border-slate-800 pt-3 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 block">Güncel Bakiye</span>
                  <span className="text-xl font-extrabold text-slate-900 dark:text-white">
                    {acc.currency === 'HAS' ? (
                      `${acc.balance.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} gr Has`
                    ) : (
                      `₺${acc.balance.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`
                    )}
                  </span>
                </div>

                <button
                  disabled={syncingAccountId === acc.id}
                  onClick={() => handleSyncAccount(acc.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-amber-500/10 hover:text-amber-600 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400 transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncingAccountId === acc.id ? 'animate-spin' : ''}`} />
                  {syncingAccountId === acc.id ? 'Senkronize...' : 'Açık Bankacılık'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 2: POS CİHAZLARI & VALÖR TAKASLARI */}
      {activeTab === 'pos' && (
        <div className="space-y-6">
          {/* POS Cihazları Kartları */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-amber-600" />
                Tanımlı POS Terminalleri
              </h3>
              <button
                onClick={() => setIsPosModalOpen(true)}
                className="flex items-center gap-1 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 rounded-lg text-xs font-semibold"
              >
                <Plus className="w-3.5 h-3.5" />
                Yeni POS Terminali
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {posTerminals.map((pos) => (
                <div key={pos.id} className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-900 dark:text-white">{pos.name}</span>
                    <span className="text-xs px-2 py-0.5 bg-emerald-500/10 text-emerald-600 rounded-full font-semibold">Aktif</span>
                  </div>
                  <p className="text-xs text-slate-500">TID: <span className="font-mono">{pos.terminalId}</span> • {pos.bankName}</p>
                  <div className="border-t border-slate-100 dark:border-slate-800 pt-2 flex items-center justify-between text-xs">
                    <span className="text-slate-400">Komisyon: %{pos.commissionRate.toFixed(2)}</span>
                    <span className="text-slate-400">Valör: {pos.blockingDays} Gün</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Valör Takas Tablosu */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Gün Sonu POS Takas & Valör Bakiye Tablosu
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">POS / Banka</th>
                    <th className="px-4 py-3">Çekim Tarihi</th>
                    <th className="px-4 py-3">Valör Vadesi</th>
                    <th className="px-4 py-3">Brüt Tutar</th>
                    <th className="px-4 py-3">Komisyon</th>
                    <th className="px-4 py-3">Net Hesaba Geçecek</th>
                    <th className="px-4 py-3">Durum</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {settlements.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                        Henüz takas kaydı bulunmuyor.
                      </td>
                    </tr>
                  ) : (
                    settlements.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-900 dark:text-white">{s.posTerminalName}</div>
                          <div className="text-xs text-slate-400">{s.bankName}</div>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">
                          {new Date(s.settlementDate).toLocaleDateString('tr-TR')}
                        </td>
                        <td className="px-4 py-3 text-xs font-semibold text-slate-700 dark:text-slate-300">
                          {new Date(s.maturityDate).toLocaleDateString('tr-TR')}
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                          ₺{s.grossAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-rose-600 dark:text-rose-400 text-xs">
                          -₺{s.commissionAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 font-bold text-emerald-600 dark:text-emerald-400">
                          ₺{s.netAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            s.status === POS_SETTLEMENT_STATUS.BLOCKED
                              ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                              : 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                          }`}>
                            {s.status === POS_SETTLEMENT_STATUS.BLOCKED ? 'BLOKEDE' : 'HESABA GEÇTİ'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: HESAP HAREKETLERİ & EŞLEŞTİRME */}
      {activeTab === 'transactions' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
              Banka Hesap Hareketleri & Dekont Eşleştirme
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Tarih</th>
                  <th className="px-4 py-3">Banka</th>
                  <th className="px-4 py-3">Açıklama / Gönderen</th>
                  <th className="px-4 py-3">Tutar</th>
                  <th className="px-4 py-3">Yön</th>
                  <th className="px-4 py-3">Mutabakat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                      Banka hareketi bulunamadı.
                    </td>
                  </tr>
                ) : (
                  transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {new Date(tx.transactionDate).toLocaleDateString('tr-TR')}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-slate-900 dark:text-white">{tx.bankName}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-slate-800 dark:text-slate-200">{tx.description}</div>
                        {tx.senderReceiverName && (
                          <div className="text-xs text-slate-400">{tx.senderReceiverName}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                        ₺{tx.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold ${
                          tx.direction === 'INFLOW' ? 'text-emerald-600' : 'text-rose-600'
                        }`}>
                          {tx.direction === 'INFLOW' ? (
                            <ArrowDownLeft className="w-3.5 h-3.5" />
                          ) : (
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          )}
                          {tx.direction === 'INFLOW' ? 'Giriş' : 'Çıkış'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          tx.matchStatus === BANK_MATCH_STATUS.MATCHED
                            ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                        }`}>
                          {tx.matchStatus === BANK_MATCH_STATUS.MATCHED ? 'EŞLEŞTİ' : 'BEKLİYOR'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: VALÖR & KOMİSYON SİMÜLATÖRÜ */}
      {activeTab === 'calculator' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
            <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <Calculator className="w-5 h-5 text-amber-600" />
              POS Komisyon ve Valör Net Tutar Simülatörü
            </h3>

            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  POS Çekim Tutarı (TL)
                </label>
                <input
                  type="number"
                  value={simGross}
                  onChange={(e) => setSimGross(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Komisyon Oranı (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={simRate}
                    onChange={(e) => setSimRate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Valör Gün Sayısı
                  </label>
                  <input
                    type="number"
                    value={simDays}
                    onChange={(e) => setSimDays(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-amber-500/10 via-yellow-500/5 to-transparent p-6 rounded-2xl border border-amber-500/20 space-y-4">
            <h4 className="font-bold text-base text-slate-900 dark:text-white">Hesaplama Özeti</h4>

            <div className="space-y-3 pt-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Brüt POS Cirosu:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  ₺{simCalc.grossAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex items-center justify-between text-rose-600">
                <span>Banka Komisyon Kesintisi (%{simCalc.commissionRate}):</span>
                <span className="font-bold">
                  -₺{simCalc.commissionAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="border-t border-amber-500/20 pt-3 flex items-center justify-between text-base font-extrabold text-emerald-600">
                <span>Net Hesaba Geçecek:</span>
                <span>₺{simCalc.netAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                <span>Valör Vade / Hesaba Geçiş Tarihi:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {simCalc.maturityDate.toLocaleDateString('tr-TR')}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: YENİ BANKA HESABI */}
      {isAccountModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateAccount}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Landmark className="w-5 h-5 text-amber-600" />
                Yeni Banka / Altın Depo Hesabı
              </h3>
              <button type="button" onClick={() => setIsAccountModalOpen(false)} className="text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-semibold mb-1">Banka Adı *</label>
                <input
                  type="text"
                  required
                  placeholder="Örn: Garanti BBVA"
                  value={newBankName}
                  onChange={(e) => setNewBankName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Hesap Adı / Tanımı *</label>
                <input
                  type="text"
                  required
                  placeholder="Örn: Ana Şube Vadesiz TL"
                  value={newAccountName}
                  onChange={(e) => setNewAccountName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">Hesap Türü</label>
                  <select
                    value={newAccountType}
                    onChange={(e) => setNewAccountType(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  >
                    <option value={BANK_ACCOUNT_TYPE.VADESIZ_TL}>Vadesiz TL</option>
                    <option value={BANK_ACCOUNT_TYPE.ALTIN_HESABI}>Altın Depo Hesabı (Has)</option>
                    <option value={BANK_ACCOUNT_TYPE.VADESIZ_USD}>Vadesiz USD</option>
                    <option value={BANK_ACCOUNT_TYPE.VADESIZ_EUR}>Vadesiz EUR</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Açılış Bakiyesi</label>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={newBalance}
                    onChange={(e) => setNewBalance(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">IBAN *</label>
                <input
                  type="text"
                  required
                  placeholder="TR00 0000 0000 0000 0000 0000 00"
                  value={newIban}
                  onChange={(e) => setNewIban(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-xs"
                />
              </div>
            </div>

            <div className="border-t border-slate-100 dark:border-slate-800 pt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAccountModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-500"
              >
                İptal
              </button>
              <button
                type="submit"
                disabled={isSubmittingAccount}
                className="px-5 py-2 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-xl"
              >
                {isSubmittingAccount ? 'Kaydediliyor...' : 'Hesabı Kaydet'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: YENİ POS TERMİNALİ */}
      {isPosModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleCreatePos}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-amber-600" />
                Yeni POS Terminali Tanımla
              </h3>
              <button type="button" onClick={() => setIsPosModalOpen(false)} className="text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-semibold mb-1">Cihaz Adı / Tanımı *</label>
                <input
                  type="text"
                  required
                  placeholder="Örn: Garanti Yazar Kasa POS"
                  value={newPosName}
                  onChange={(e) => setNewPosName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">Terminal ID (TID) *</label>
                  <input
                    type="text"
                    required
                    placeholder="Örn: 94827104"
                    value={newTerminalId}
                    onChange={(e) => setNewTerminalId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Üye İşyeri No (MID)</label>
                  <input
                    type="text"
                    placeholder="Örn: 000184729"
                    value={newMerchantId}
                    onChange={(e) => setNewMerchantId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Bağlı Banka Hesabı *</label>
                <select
                  value={newPosBankId}
                  onChange={(e) => setNewPosBankId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.bankName} - {a.accountName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">Komisyon Oranı (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newCommissionRate}
                    onChange={(e) => setNewCommissionRate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Valör / Bloke (Gün)</label>
                  <input
                    type="number"
                    value={newBlockingDays}
                    onChange={(e) => setNewBlockingDays(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 dark:border-slate-800 pt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsPosModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-500"
              >
                İptal
              </button>
              <button
                type="submit"
                disabled={isSubmittingPos}
                className="px-5 py-2 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-xl"
              >
                {isSubmittingPos ? 'Ekleniyor...' : 'POS Kaydet'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: GÜN SONU POS TAKASI */}
      {isSettlementModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateSettlement}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-amber-600" />
                Gün Sonu POS Takası Ekle
              </h3>
              <button type="button" onClick={() => setIsSettlementModalOpen(false)} className="text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-semibold mb-1">POS Cihazı *</label>
                <select
                  value={settlementPosId}
                  onChange={(e) => setSettlementPosId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                >
                  {posTerminals.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.bankName} - TID: {p.terminalId})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Günlük Brüt Çekim Tutarı (TL) *</label>
                <input
                  type="number"
                  required
                  placeholder="0.00"
                  value={settlementGross}
                  onChange={(e) => setSettlementGross(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                />
              </div>
            </div>

            <div className="border-t border-slate-100 dark:border-slate-800 pt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsSettlementModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-500"
              >
                İptal
              </button>
              <button
                type="submit"
                disabled={isSubmittingSettlement}
                className="px-5 py-2 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-xl"
              >
                {isSubmittingSettlement ? 'Hesaplanıyor...' : 'Takası Kaydet'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

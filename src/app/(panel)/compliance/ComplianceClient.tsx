'use client';

import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  FileText,
  Search,
  CheckCircle2,
  Copy,
  Plus,
  RefreshCw,
  Clock,
  Eye,
  Send,
  X,
  Sliders,
  UserCheck,
} from 'lucide-react';
import {
  AML_RISK_LEVEL,
  COMPLIANCE_CASE_STATUS,
  AML_TRIGGER_TYPE,
  MASAK_DEFAULTS,
} from '@/constants/compliance';
import { assessTransactionCompliance } from '@/lib/compliance/aml-engine';

interface ComplianceCaseItem {
  id: string;
  caseNumber: string;
  customerId: string | null;
  customerName: string;
  customerTcNo: string | null;
  customerPhone: string | null;
  riskLevel: string;
  status: string;
  triggerType: string;
  detectedAmount: number;
  description: string;
  investigationNotes: string | null;
  sarDraft: string | null;
  reportedToMasakAt: string | null;
  reportedBy: string | null;
  reviewedBy: string | null;
  createdAt: string;
}

interface AmlRuleItem {
  id: string;
  ruleCode: string;
  name: string;
  thresholdAmount: number;
  timeWindowHours: number;
  riskLevel: string;
  isActive: boolean;
  description: string | null;
}

interface Props {
  initialCases: ComplianceCaseItem[];
  initialRules: AmlRuleItem[];
  initialStats: {
    totalCases: number;
    openCases: number;
    reportedCount: number;
    structuringCount: number;
  };
}

export default function ComplianceClient({
  initialCases,
  initialRules,
  initialStats,
}: Props) {
  const [cases, setCases] = useState<ComplianceCaseItem[]>(initialCases);
  const [rules, setRules] = useState<AmlRuleItem[]>(initialRules);
  const [activeTab, setActiveTab] = useState<'cases' | 'simulator' | 'rules'>('cases');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Detay / SAR Modal State
  const [selectedCase, setSelectedCase] = useState<ComplianceCaseItem | null>(null);
  const [investigationNoteInput, setInvestigationNoteInput] = useState<string>('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false);
  const [copyFeedback, setCopyFeedback] = useState<boolean>(false);

  // Yeni Vaka Modal State
  const [isNewCaseModalOpen, setIsNewCaseModalOpen] = useState<boolean>(false);
  const [newCustomerName, setNewCustomerName] = useState<string>('');
  const [newCustomerTcNo, setNewCustomerTcNo] = useState<string>('');
  const [newCustomerPhone, setNewCustomerPhone] = useState<string>('');
  const [newAmount, setNewAmount] = useState<string>('');
  const [newTriggerType, setNewTriggerType] = useState<string>(AML_TRIGGER_TYPE.MANUAL_SUSPICION);
  const [newRiskLevel, setNewRiskLevel] = useState<string>(AML_RISK_LEVEL.HIGH);
  const [newDescription, setNewDescription] = useState<string>('');
  const [isSubmittingNewCase, setIsSubmittingNewCase] = useState<boolean>(false);

  // Canlı Simülatör State
  const [simAmount, setSimAmount] = useState<string>('190000');
  const [simIsCash, setSimIsCash] = useState<boolean>(true);
  const [simTcNo, setSimTcNo] = useState<string>('');
  const [simIsPep, setSimIsPep] = useState<boolean>(false);
  const [simPastCash24h, setSimPastCash24h] = useState<string>('0');

  // Filtrelenmiş vakalar
  const filteredCases = cases.filter((c) => {
    if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchName = c.customerName.toLowerCase().includes(term);
      const matchNo = c.caseNumber.toLowerCase().includes(term);
      const matchTc = c.customerTcNo ? c.customerTcNo.includes(term) : false;
      return matchName || matchNo || matchTc;
    }
    return true;
  });

  // Risk rozeti stili
  const getRiskBadge = (level: string) => {
    switch (level) {
      case AML_RISK_LEVEL.CRITICAL:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            <ShieldAlert className="w-3 h-3" /> KRİTİK
          </span>
        );
      case AML_RISK_LEVEL.HIGH:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <AlertTriangle className="w-3 h-3" /> YÜKSEK
          </span>
        );
      case AML_RISK_LEVEL.MEDIUM:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            ORTA
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            DÜŞÜK
          </span>
        );
    }
  };

  // Durum rozeti stili
  const getStatusBadge = (status: string) => {
    switch (status) {
      case COMPLIANCE_CASE_STATUS.REPORTED_TO_MASAK:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
            <Send className="w-3 h-3" /> MASAK'A BİLDİRİLDİ
          </span>
        );
      case COMPLIANCE_CASE_STATUS.UNDER_REVIEW:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            <Clock className="w-3 h-3" /> İNCELEMEDE
          </span>
        );
      case COMPLIANCE_CASE_STATUS.DISMISSED:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20">
            <CheckCircle2 className="w-3 h-3" /> KAPATILDI
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            AÇIK
          </span>
        );
    }
  };

  // Tetikleyici Başlığı
  const getTriggerLabel = (type: string) => {
    switch (type) {
      case AML_TRIGGER_TYPE.KYC_THRESHOLD_EXCEEDED:
        return '185.000 TL Kimlik Eşiği';
      case AML_TRIGGER_TYPE.SMURFING_DETECTED:
        return 'Parçalama (Smurfing)';
      case AML_TRIGGER_TYPE.PEP_TRANSACTION:
        return 'Siyasi Nüfuz (PEP)';
      default:
        return 'Manuel Bildirim';
    }
  };

  // Vaka Durumu Güncelle
  const handleUpdateCaseStatus = async (newStatus: string) => {
    if (!selectedCase) return;
    setIsUpdatingStatus(true);
    try {
      const res = await fetch(`/api/compliance/cases/${selectedCase.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          investigationNotes: investigationNoteInput,
        }),
      });
      const data = await res.json();
      if (data.success && data.case) {
        setCases((prev) =>
          prev.map((c) => (c.id === selectedCase.id ? { ...c, ...data.case } : c))
        );
        setSelectedCase((prev) => (prev ? { ...prev, ...data.case } : null));
      } else {
        alert(data.error || 'Vaka güncellenemedi');
      }
    } catch (err: any) {
      alert(err.message || 'Hata oluştu');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Yeni Vaka Oluştur
  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerName || !newDescription) {
      alert('Lütfen müşteri adı ve açıklama giriniz.');
      return;
    }

    setIsSubmittingNewCase(true);
    try {
      const res = await fetch('/api/compliance/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: newCustomerName,
          customerTcNo: newCustomerTcNo,
          customerPhone: newCustomerPhone,
          detectedAmount: parseFloat(newAmount) || 0,
          triggerType: newTriggerType,
          riskLevel: newRiskLevel,
          description: newDescription,
        }),
      });
      const data = await res.json();
      if (data.success && data.case) {
        setCases((prev) => [data.case, ...prev]);
        setIsNewCaseModalOpen(false);
        // Formu temizle
        setNewCustomerName('');
        setNewCustomerTcNo('');
        setNewCustomerPhone('');
        setNewAmount('');
        setNewDescription('');
      } else {
        alert(data.error || 'Vaka oluşturulamadı');
      }
    } catch (err: any) {
      alert(err.message || 'Hata oluştu');
    } finally {
      setIsSubmittingNewCase(false);
    }
  };

  // ŞİB Taslağını Panoya Kopyala
  const copySarDraft = () => {
    if (selectedCase?.sarDraft) {
      navigator.clipboard.writeText(selectedCase.sarDraft);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    }
  };

  // Canlı Simülasyon Hesabı
  const pastCashAmount = parseFloat(simPastCash24h) || 0;
  const recentTxList = pastCashAmount > 0 ? [
    {
      amountTL: pastCashAmount,
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 saat önce
      isCash: true,
    }
  ] : [];

  const simResult = assessTransactionCompliance({
    amountTL: parseFloat(simAmount) || 0,
    isCash: simIsCash,
    customerTcNo: simTcNo,
    customerIsPep: simIsPep,
    recentTransactions: recentTxList,
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-amber-600 via-yellow-600 to-amber-700 dark:from-amber-400 dark:via-yellow-400 dark:to-amber-500 bg-clip-text text-transparent flex items-center gap-3">
            <ShieldAlert className="w-8 h-8 text-amber-600 dark:text-amber-400" />
            MASAK & AML Uyum Yönetimi
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            5549 Sayılı Kanun Kapsamında Kimlik Tespiti Eşiği, Parçalama (Smurfing) Takibi ve Şüpheli İşlem Bildirimi (ŞİB)
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsNewCaseModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-medium shadow-lg shadow-amber-600/20 transition-all text-sm"
          >
            <Plus className="w-4 h-4" />
            Şüpheli İşlem Bildir
          </button>
        </div>
      </div>

      {/* KPI İstatistik Kartları */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Toplam MASAK Vakası
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
            {cases.length}
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Kayıtlı tüm şüpheli işlemler</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Açık / İncelemede
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 text-2xl sm:text-3xl font-extrabold text-amber-600 dark:text-amber-400">
            {cases.filter((c) => c.status === COMPLIANCE_CASE_STATUS.OPEN || c.status === COMPLIANCE_CASE_STATUS.UNDER_REVIEW).length}
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">İnceleme bekleyen vakalar</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-purple-600 dark:text-purple-400">
              MASAK'a Bildirilen (ŞİB)
            </span>
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Send className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 text-2xl sm:text-3xl font-extrabold text-purple-600 dark:text-purple-400">
            {cases.filter((c) => c.status === COMPLIANCE_CASE_STATUS.REPORTED_TO_MASAK).length}
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Resmi ŞİB raporlanan</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400">
              Parçalama (Smurfing)
            </span>
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 text-2xl sm:text-3xl font-extrabold text-rose-600 dark:text-rose-400">
            {cases.filter((c) => c.triggerType === AML_TRIGGER_TYPE.SMURFING_DETECTED).length}
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Bölünmüş nakit işlemleri</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('cases')}
          className={`px-5 py-3 font-semibold text-sm border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'cases'
              ? 'border-amber-600 text-amber-600 dark:border-amber-400 dark:text-amber-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <FileText className="w-4 h-4" />
          Vakalar & ŞİB Havuzu ({cases.length})
        </button>

        <button
          onClick={() => setActiveTab('simulator')}
          className={`px-5 py-3 font-semibold text-sm border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'simulator'
              ? 'border-amber-600 text-amber-600 dark:border-amber-400 dark:text-amber-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          Canlı AML Risk Denetleyicisi
        </button>

        <button
          onClick={() => setActiveTab('rules')}
          className={`px-5 py-3 font-semibold text-sm border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'rules'
              ? 'border-amber-600 text-amber-600 dark:border-amber-400 dark:text-amber-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Sliders className="w-4 h-4" />
          MASAK Eşik Kuralları ({rules.length})
        </button>
      </div>

      {/* TAB 1: VAKALAR & ŞİB HAVUZU */}
      {activeTab === 'cases' && (
        <div className="space-y-4">
          {/* Filtre ve Arama */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Vaka no, müşteri adı veya TCKN ara..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs text-slate-500 dark:text-slate-400">Durum:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:border-amber-500"
              >
                <option value="ALL">Tümü</option>
                <option value={COMPLIANCE_CASE_STATUS.OPEN}>Açık</option>
                <option value={COMPLIANCE_CASE_STATUS.UNDER_REVIEW}>İncelemede</option>
                <option value={COMPLIANCE_CASE_STATUS.REPORTED_TO_MASAK}>MASAK'a Bildirildi</option>
                <option value={COMPLIANCE_CASE_STATUS.DISMISSED}>Kapatıldı</option>
              </select>
            </div>
          </div>

          {/* Vaka Tablosu */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3.5">Vaka No</th>
                    <th className="px-4 py-3.5">Müşteri / TCKN</th>
                    <th className="px-4 py-3.5">Tetikleyen Neden</th>
                    <th className="px-4 py-3.5">Tutar</th>
                    <th className="px-4 py-3.5">Risk</th>
                    <th className="px-4 py-3.5">Durum</th>
                    <th className="px-4 py-3.5">Tarih</th>
                    <th className="px-4 py-3.5 text-right">İşlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredCases.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                        Kayıtlı uyum vakası bulunamadı.
                      </td>
                    </tr>
                  ) : (
                    filteredCases.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                          {c.caseNumber}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-900 dark:text-white">{c.customerName}</div>
                          <div className="text-xs text-slate-400">
                            {c.customerTcNo || 'TCKN Belirtilmedi'}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-medium text-slate-700 dark:text-slate-300">
                            {getTriggerLabel(c.triggerType)}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                          ₺{c.detectedAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3">{getRiskBadge(c.riskLevel)}</td>
                        <td className="px-4 py-3">{getStatusBadge(c.status)}</td>
                        <td className="px-4 py-3 text-xs text-slate-500">
                          {new Date(c.createdAt).toLocaleDateString('tr-TR')}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => {
                              setSelectedCase(c);
                              setInvestigationNoteInput(c.investigationNotes || '');
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-lg text-xs font-semibold transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            İncele & ŞİB
                          </button>
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

      {/* TAB 2: CANLI AML RİSK DENETLEYİCİSİ */}
      {activeTab === 'simulator' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Sol Kolon: Simülasyon Girdileri */}
          <div className="lg:col-span-6 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              Canlı İşlem Risk ve Eşik Değerlendirmesi
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Kasadaki veya POS satış ekranındaki bir işlemin MASAK 5549 mevzuatına takılıp takılmayacağını anında test edin.
            </p>

            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  İşlem Tutarı (TL)
                </label>
                <input
                  type="number"
                  value={simAmount}
                  onChange={(e) => setSimAmount(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="simCashCheck"
                  checked={simIsCash}
                  onChange={(e) => setSimIsCash(e.target.checked)}
                  className="w-4 h-4 text-amber-600 rounded border-slate-300"
                />
                <label htmlFor="simCashCheck" className="text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                  Nakit Ödeme / Tahsilat (Nakit alım-satım yasal kimlik eşiğine tabidir)
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Müşteri TCKN / Pasaport No (Opsiyonel)
                </label>
                <input
                  type="text"
                  maxLength={11}
                  value={simTcNo}
                  onChange={(e) => setSimTcNo(e.target.value)}
                  placeholder="11 haneli TCKN..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="simPepCheck"
                  checked={simIsPep}
                  onChange={(e) => setSimIsPep(e.target.checked)}
                  className="w-4 h-4 text-amber-600 rounded border-slate-300"
                />
                <label htmlFor="simPepCheck" className="text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                  Müşteri PEP (Siyasi Nüfuz Sahibi Kişi / Üst Düzey Bürokrat)
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Müşterinin Son 24 Saatteki Önceki Nakit İşlemleri (TL)
                </label>
                <input
                  type="number"
                  value={simPastCash24h}
                  onChange={(e) => setSimPastCash24h(e.target.value)}
                  placeholder="Örn: 120000"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:border-amber-500"
                />
                <span className="text-[11px] text-slate-400">
                  Parçalama (smurfing) denetimi için son 24 saatteki nakit toplamı kıyaslanır.
                </span>
              </div>
            </div>
          </div>

          {/* Sağ Kolon: Değerlendirme Sonuç Kartı */}
          <div className="lg:col-span-6 space-y-4">
            <div className={`p-6 rounded-2xl border ${
              simResult.isFlagged
                ? 'bg-rose-50/60 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50'
                : 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {simResult.isFlagged ? (
                    <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center">
                      <ShieldAlert className="w-7 h-7" />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                      <ShieldCheck className="w-7 h-7" />
                    </div>
                  )}
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      {simResult.isFlagged ? 'DİKKAT: ŞÜPHELİ / EŞİK AŞIMI' : 'İŞLEM UYGUN (EŞİK ALTI)'}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {simResult.isFlagged
                        ? 'Yasal kimlik tespiti veya MASAK bildirim kaydı gereklidir.'
                        : 'Mevcut verilerle herhangi bir MASAK veya AML engeli tespit edilmedi.'}
                    </p>
                  </div>
                </div>

                <div>{getRiskBadge(simResult.riskLevel)}</div>
              </div>

              {/* Kontrol Matrisi */}
              <div className="mt-6 space-y-2 border-t border-slate-200/60 dark:border-slate-800 pt-4">
                <div className="flex items-center justify-between text-xs py-1">
                  <span className="text-slate-600 dark:text-slate-400">185.000 TL Yasal Kimlik Eşiği:</span>
                  <span className="font-semibold">
                    {simResult.kycRequired ? 'ZORUNLU (Eşik Üstü)' : 'Standart'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs py-1">
                  <span className="text-slate-600 dark:text-slate-400">Parçalama (Smurfing) Riski:</span>
                  <span className={`font-semibold ${simResult.structuringDetected ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {simResult.structuringDetected ? 'TESPİT EDİLDİ' : 'Tespit Edilmedi'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs py-1">
                  <span className="text-slate-600 dark:text-slate-400">PEP (Siyasi Nüfuz) Uyarısı:</span>
                  <span className={`font-semibold ${simResult.pepAlert ? 'text-amber-600' : 'text-slate-600 dark:text-slate-400'}`}>
                    {simResult.pepAlert ? 'YÜKSEK TUTARLI PEP' : 'Yok'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs py-1 border-t border-slate-200/40 dark:border-slate-800/60 pt-2 font-semibold">
                  <span className="text-slate-700 dark:text-slate-300">24 Saatlik Kümülatif Nakit Hacim:</span>
                  <span className="text-slate-900 dark:text-white">
                    ₺{simResult.total24hCashVolume.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Uyarı Mesajları */}
              {simResult.messages.length > 0 && (
                <div className="mt-4 p-3 bg-white/80 dark:bg-slate-900/80 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">Sistem Uyarıları:</span>
                  {simResult.messages.map((m, idx) => (
                    <p key={idx} className="text-xs text-rose-600 dark:text-rose-400">
                      • {m}
                    </p>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: MASAK EŞİK KURALLARI */}
      {activeTab === 'rules' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sliders className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              Yasal Uyum & Risk Eşik Kuralları
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              5549 Sayılı Kanun ve MASAK Genel Tebliğlerine göre sistemde çalışan otomatik kurallar.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                    {rule.ruleCode}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                    rule.isActive ? 'bg-emerald-500/10 text-emerald-600' : 'bg-slate-500/10 text-slate-500'
                  }`}>
                    {rule.isActive ? 'AKTİF' : 'PASİF'}
                  </span>
                </div>

                <h3 className="font-bold text-slate-900 dark:text-white text-sm">{rule.name}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">{rule.description}</p>

                <div className="border-t border-slate-200 dark:border-slate-700/50 pt-2 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Eşik Tutarı:</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    ₺{rule.thresholdAmount.toLocaleString('tr-TR')}
                  </span>
                </div>

                {rule.timeWindowHours > 0 && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Zaman Penceresi:</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {rule.timeWindowHours} Saat
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: VAKA DETAY & ŞİB TASLAĞI */}
      {selectedCase && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                    {selectedCase.caseNumber}
                  </h3>
                  {getRiskBadge(selectedCase.riskLevel)}
                  {getStatusBadge(selectedCase.status)}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Müşteri: {selectedCase.customerName} ({selectedCase.customerTcNo || 'TCKN Yok'})
                </p>
              </div>

              <button
                onClick={() => setSelectedCase(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* MASAK ŞİB Taslağı Metin Alanı */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-amber-600" />
                  Resmi MASAK Şüpheli İşlem Bildirimi (ŞİB) Taslağı
                </label>
                <button
                  onClick={copySarDraft}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-lg transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                  {copyFeedback ? 'Kopyalandı!' : 'Metni Kopyala'}
                </button>
              </div>

              <pre className="p-4 bg-slate-950 text-emerald-400 font-mono text-xs rounded-xl overflow-x-auto max-h-60 border border-slate-800 whitespace-pre-wrap leading-relaxed">
                {selectedCase.sarDraft}
              </pre>
            </div>

            {/* İnceleme Notu */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Uyum Sorumlusu İnceleme Notu
              </label>
              <textarea
                rows={3}
                value={investigationNoteInput}
                onChange={(e) => setInvestigationNoteInput(e.target.value)}
                placeholder="İnceleme detayları, müşteri ile yapılan görüşme veya alınan belgeler..."
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Durum Değiştirme Butonları */}
            <div className="border-t border-slate-100 dark:border-slate-800 pt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  disabled={isUpdatingStatus}
                  onClick={() => handleUpdateCaseStatus(COMPLIANCE_CASE_STATUS.UNDER_REVIEW)}
                  className="px-3.5 py-2 text-xs font-semibold bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 rounded-xl transition-colors"
                >
                  İncelemeye Al
                </button>
                <button
                  disabled={isUpdatingStatus}
                  onClick={() => handleUpdateCaseStatus(COMPLIANCE_CASE_STATUS.DISMISSED)}
                  className="px-3.5 py-2 text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 rounded-xl transition-colors"
                >
                  Kapat / Reddet
                </button>
              </div>

              <button
                disabled={isUpdatingStatus}
                onClick={() => handleUpdateCaseStatus(COMPLIANCE_CASE_STATUS.REPORTED_TO_MASAK)}
                className="flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-lg shadow-purple-600/20 transition-all"
              >
                <Send className="w-3.5 h-3.5" />
                MASAK'a Bildirildi Olarak Kaydet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: YENİ ŞÜPHELİ İŞLEM BİLDİR */}
      {isNewCaseModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateCase}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-600" />
                Manuel Şüpheli İşlem Bildirimi
              </h3>
              <button
                type="button"
                onClick={() => setIsNewCaseModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-semibold mb-1">Müşteri Adı Soyadı *</label>
                <input
                  type="text"
                  required
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  placeholder="Örn: Ahmet Yılmaz"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">TCKN / Pasaport</label>
                  <input
                    type="text"
                    maxLength={11}
                    value={newCustomerTcNo}
                    onChange={(e) => setNewCustomerTcNo(e.target.value)}
                    placeholder="11 haneli TCKN"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Telefon</label>
                  <input
                    type="text"
                    value={newCustomerPhone}
                    onChange={(e) => setNewCustomerPhone(e.target.value)}
                    placeholder="05xxxxxxxxx"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">İşlem Tutarı (TL)</label>
                  <input
                    type="number"
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Risk Seviyesi</label>
                  <select
                    value={newRiskLevel}
                    onChange={(e) => setNewRiskLevel(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-amber-500"
                  >
                    <option value={AML_RISK_LEVEL.LOW}>Düşük</option>
                    <option value={AML_RISK_LEVEL.MEDIUM}>Orta</option>
                    <option value={AML_RISK_LEVEL.HIGH}>Yüksek</option>
                    <option value={AML_RISK_LEVEL.CRITICAL}>Kritik</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Şüphe Türü</label>
                <select
                  value={newTriggerType}
                  onChange={(e) => setNewTriggerType(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-amber-500"
                >
                  <option value={AML_TRIGGER_TYPE.MANUAL_SUSPICION}>Personel Şüpheli İşlem Beyanı</option>
                  <option value={AML_TRIGGER_TYPE.KYC_THRESHOLD_EXCEEDED}>Kimlik Vermekten İmtina / Eşik Aşımı</option>
                  <option value={AML_TRIGGER_TYPE.SMURFING_DETECTED}>Parçalama (Smurfing) Şüphesi</option>
                  <option value={AML_TRIGGER_TYPE.PEP_TRANSACTION}>PEP Yüksek Tutarlı İşlem</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Olay Açıklaması & Şüphe Gerekçesi *</label>
                <textarea
                  rows={3}
                  required
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Müşterinin şüpheli davranışı, kaynağı belirsiz nakit, mutat harici işlem..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="border-t border-slate-100 dark:border-slate-800 pt-3 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsNewCaseModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800"
              >
                İptal
              </button>
              <button
                type="submit"
                disabled={isSubmittingNewCase}
                className="px-5 py-2 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-lg shadow-amber-600/20"
              >
                {isSubmittingNewCase ? 'Kaydediliyor...' : 'Vakayı Kaydet'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

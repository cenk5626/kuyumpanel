'use client';

import React, { useState } from 'react';
import {
  Flame,
  Plus,
  Scale,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Hammer,
  Layers,
  Coins,
  ShieldCheck,
  Percent,
  X,
  Calendar,
  Sparkles,
  UserCheck,
  TrendingDown,
  Gift,
  ArrowRight,
  Award,
  Zap,
  Cpu,
} from 'lucide-react';
import { THEME } from '@/constants/theme';
import { ROUTES } from '@/constants/routes';
import {
  WORKSHOP_JOB_STATUS,
  WORKSHOP_STATUS_LABELS,
  WORKSHOP_ACTIONS,
  CARAT_MILYEM_MAP,
  getMilyemForCarat,
  SUPPORTED_SCRAP_CARATS,
  WORKSHOP_LIMITS,
  CUSTOMER_DEPOSIT_ACTIONS,
  CUSTOMER_DEPOSIT_STATUS,
  CUSTOMER_DEPOSIT_STATUS_LABELS,
} from '@/constants/workshop';
import ScaleButton from '@/components/ScaleButton';
import { calculateTakozMilyem, calculateWorkshopLoss } from '@/lib/workshop/takoz-calculator';

interface WorkshopJobRecord {
  id: string;
  jobNo: string;
  dealerId: string;
  workshopName: string;
  description: string;
  status: string;
  givenWeight: number;
  givenPureWeight: number;
  givenCaratBreakdown?: string | null;
  givenTargetMilyem?: number | null;
  receivedFinishedWeight: number;
  receivedScrapWeight: number;
  receivedTotalWeight: number;
  lossWeight: number;
  lossPercent: number;
  targetLossPercent: number;
  isExcessiveLoss: boolean;
  laborCost: number;
  laborPaymentMethod?: string | null;
  deliveryDate?: string | null;
  completedDate?: string | null;
  notes?: string | null;
  createdAt: string;
}

interface ScrapItem {
  id: string;
  carat: number;
  weight: number;
  pureWeight: number;
  notes?: string | null;
}

interface CustomerDepositRecord {
  id: string;
  customerId: string;
  customer: {
    id: string;
    name: string;
    phone?: string | null;
    loyaltyPoints: number;
    emanetGold: number;
  };
  type: string;
  itemDescription: string;
  weight: number;
  carat?: number | null;
  pureGoldWeight: number;
  status: string;
  notes?: string | null;
  createdAt: string;
}

interface CustomerOption {
  id: string;
  name: string;
  phone?: string | null;
  loyaltyPoints: number;
  emanetGold: number;
}

interface WorkshopClientProps {
  initialJobs: WorkshopJobRecord[];
  initialScrap: ScrapItem[];
  initialDeposits: CustomerDepositRecord[];
  customers: CustomerOption[];
}

export default function WorkshopClient({
  initialJobs,
  initialScrap,
  initialDeposits,
  customers,
}: WorkshopClientProps) {
  const [activeTab, setActiveTab] = useState<'workshop' | 'scrap' | 'takoz' | 'emanet'>('workshop');
  const [jobs, setJobs] = useState<WorkshopJobRecord[]>(initialJobs);
  const [scrap, setScrap] = useState<ScrapItem[]>(initialScrap);
  const [deposits, setDeposits] = useState<CustomerDepositRecord[]>(initialDeposits);

  // Modallar
  const [isNewJobModalOpen, setIsNewJobModalOpen] = useState(false);
  const [completeJobModal, setCompleteJobModal] = useState<WorkshopJobRecord | null>(null);
  const [scrapEditModal, setScrapEditModal] = useState<ScrapItem | null>(null);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [customerList, setCustomerList] = useState<CustomerOption[]>(customers);
  const [isLoyaltyModalOpen, setIsLoyaltyModalOpen] = useState(false);
  const [loyaltyCustomerId, setLoyaltyCustomerId] = useState<string>(customers[0]?.id || '');
  const [loyaltyPoints, setLoyaltyPoints] = useState<number>(50);
  const [loyaltyIsDeduct, setLoyaltyIsDeduct] = useState<boolean>(false);
  const [loyaltyReason, setLoyaltyReason] = useState<string>('Mağaza Alışverişi');
  const [isSubmittingLoyalty, setIsSubmittingLoyalty] = useState(false);

  // Yeni İş Emri Form State
  const [jobWorkshopName, setJobWorkshopName] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [jobGivenWeight, setJobGivenWeight] = useState<number>(50.0);
  const [jobGivenCarat, setJobGivenCarat] = useState<number>(24);
  const [jobLaborCost, setJobLaborCost] = useState<number>(2500);
  const [jobTargetLossPercent, setJobTargetLossPercent] = useState<number>(3.5);
  const [jobDeliveryDate, setJobDeliveryDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [isSubmittingJob, setIsSubmittingJob] = useState(false);

  // İş Emri Kapatma Form State
  const [recvFinishedWeight, setRecvFinishedWeight] = useState<number>(0);
  const [recvScrapWeight, setRecvScrapWeight] = useState<number>(0);
  const [recvScrapCarat, setRecvScrapCarat] = useState<number>(14);
  const [isClosingJob, setIsClosingJob] = useState(false);

  // Hurda Sandığı Güncelleme Form State
  const [scrapWeightChange, setScrapWeightChange] = useState<number>(0);
  const [isUpdatingScrap, setIsUpdatingScrap] = useState(false);

  // Pota Takoz Hesaplayıcı State
  const [takozBatches, setTakozBatches] = useState<Record<number, number>>({
    22: 40.0,
    14: 60.0,
    18: 0,
    8: 0,
    24: 0,
  });
  const [takozTargetMilyem, setTakozTargetMilyem] = useState<number>(0.585); // Varsayılan 14K

  // Emanet Form State
  const [depCustomerId, setDepCustomerId] = useState('');
  const [depItemDesc, setDepItemDesc] = useState('');
  const [depWeight, setDepWeight] = useState<number>(20.0);
  const [depCarat, setDepCarat] = useState<number>(22);
  const [isSavingDeposit, setIsSavingDeposit] = useState(false);

  // KPI Toplamları
  const totalScrapGross = scrap.reduce((s, it) => s + (it.weight || 0), 0);
  const totalScrapPure = scrap.reduce((s, it) => s + (it.pureWeight || 0), 0);
  const activeJobs = jobs.filter((j) => j.status === WORKSHOP_JOB_STATUS.IN_PRODUCTION);
  const activeJobsWeight = activeJobs.reduce((s, j) => s + (j.givenWeight || 0), 0);
  const totalEmanetGold = deposits
    .filter((d) => d.status === CUSTOMER_DEPOSIT_STATUS.ACTIVE)
    .reduce((s, d) => s + (d.pureGoldWeight || 0), 0);

  // 1. Yeni İş Emri Gönderimi
  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobWorkshopName.trim() || !jobDescription.trim()) return;

    setIsSubmittingJob(true);
    try {
      const milyem = getMilyemForCarat(jobGivenCarat);
      const pureWeight = Number((jobGivenWeight * milyem).toFixed(3));

      const res = await fetch(ROUTES.API_WORKSHOP, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: WORKSHOP_ACTIONS.CREATE_JOB,
          workshopName: jobWorkshopName.trim(),
          description: jobDescription.trim(),
          givenWeight: jobGivenWeight,
          givenPureWeight: pureWeight,
          givenCaratBreakdown: JSON.stringify([{ carat: jobGivenCarat, weight: jobGivenWeight }]),
          targetLossPercent: jobTargetLossPercent,
          laborCost: jobLaborCost,
          deliveryDate: jobDeliveryDate,
        }),
      });

      if (!res.ok) throw new Error('İş emri oluşturulamadı.');
      const newJob = await res.json();
      setJobs((prev) => [newJob, ...prev]);
      setIsNewJobModalOpen(false);
      setJobWorkshopName('');
      setJobDescription('');
    } catch (err: any) {
      alert(err.message || 'Hata oluştu.');
    } finally {
      setIsSubmittingJob(false);
    }
  };

  // 2. İş Emri Kapatma & Ramat Hesabı
  const handleCompleteJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completeJobModal) return;

    setIsClosingJob(true);
    try {
      const res = await fetch(ROUTES.API_WORKSHOP, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: WORKSHOP_ACTIONS.COMPLETE_JOB,
          jobId: completeJobModal.id,
          receivedFinishedWeight: recvFinishedWeight,
          receivedScrapWeight: recvScrapWeight,
          scrapCarat: recvScrapCarat,
        }),
      });

      if (!res.ok) throw new Error('İş emri kapatılamadı.');
      const updated = await res.json();
      setJobs((prev) => prev.map((j) => (j.id === updated.id ? updated : j)));

      // Sandığa eklenen astar hurda varsa state'i de anında güncelle
      if (recvScrapWeight > 0) {
        const scrapMilyem = getMilyemForCarat(recvScrapCarat);
        const scrapPure = Number((recvScrapWeight * scrapMilyem).toFixed(4));
        setScrap((prev) =>
          prev.map((s) =>
            s.carat === recvScrapCarat
              ? {
                  ...s,
                  weight: Number((s.weight + recvScrapWeight).toFixed(4)),
                  pureWeight: Number((s.pureWeight + scrapPure).toFixed(4)),
                }
              : s
          )
        );
      }

      setCompleteJobModal(null);
    } catch (err: any) {
      alert(err.message || 'Hata oluştu.');
    } finally {
      setIsClosingJob(false);
    }
  };

  // 3. Hurda Sandığı Güncelleme
  const handleUpdateScrapWeight = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scrapEditModal) return;

    setIsUpdatingScrap(true);
    try {
      const res = await fetch('/api/workshop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: WORKSHOP_ACTIONS.UPDATE_SCRAP,
          carat: scrapEditModal.carat,
          weightChange: scrapWeightChange,
        }),
      });

      if (!res.ok) throw new Error('Hurda güncellenemedi.');
      const updatedItem = await res.json();
      setScrap((prev) =>
        prev.map((s) => (s.carat === updatedItem.carat ? updatedItem : s))
      );
      setScrapEditModal(null);
      setScrapWeightChange(0);
    } catch (err: any) {
      alert(err.message || 'Hata oluştu.');
    } finally {
      setIsUpdatingScrap(false);
    }
  };

  // 4. Emanet Bırakma (Cetasoft)
  const handleSaveDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!depCustomerId || !depItemDesc) return;

    setIsSavingDeposit(true);
    try {
      const res = await fetch(ROUTES.API_CUSTOMER_DEPOSITS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: CUSTOMER_DEPOSIT_ACTIONS.DEPOSIT,
          customerId: depCustomerId,
          itemDescription: depItemDesc,
          weight: depWeight,
          carat: depCarat,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Emanet kaydedilemedi.');
      }
      const created = await res.json();
      setDeposits((prev) => [created, ...prev]);
      setCustomerList((prev) =>
        prev.map((c) =>
          c.id === depCustomerId
            ? { ...c, emanetGold: Number(((c.emanetGold || 0) + (created.pureGoldWeight || 0)).toFixed(4)) }
            : c
        )
      );
      setIsDepositModalOpen(false);
      setDepItemDesc('');
    } catch (err: any) {
      alert(err.message || 'Hata oluştu.');
    } finally {
      setIsSavingDeposit(false);
    }
  };

  // 5. Emanet İade Etme
  const handleWithdrawDeposit = async (depositId: string) => {
    if (!confirm('Emanet altın müşteriye teslim edilsin mi?')) return;

    try {
      const res = await fetch(ROUTES.API_CUSTOMER_DEPOSITS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: CUSTOMER_DEPOSIT_ACTIONS.WITHDRAW, depositId }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Emanet iade edilemedi.');
      }
      const targetDep = deposits.find((d) => d.id === depositId);
      setDeposits((prev) =>
        prev.map((d) => (d.id === depositId ? { ...d, status: CUSTOMER_DEPOSIT_STATUS.RETURNED } : d))
      );
      if (targetDep) {
        setCustomerList((prev) =>
          prev.map((c) =>
            c.id === targetDep.customerId
              ? { ...c, emanetGold: Math.max(0, Number(((c.emanetGold || 0) - (targetDep.pureGoldWeight || 0)).toFixed(4))) }
              : c
          )
        );
      }
    } catch (err: any) {
      alert(err.message || 'Hata oluştu.');
    }
  };

  // 6. Müşteri ParaPuan Güncelleme (Cetasoft Sadakat Sistemi)
  const handleSaveLoyalty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loyaltyCustomerId || loyaltyPoints <= 0) return;

    setIsSubmittingLoyalty(true);
    try {
      const res = await fetch(ROUTES.API_CUSTOMER_DEPOSITS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: CUSTOMER_DEPOSIT_ACTIONS.LOYALTY_POINT,
          customerId: loyaltyCustomerId,
          points: loyaltyPoints,
          isDeduct: loyaltyIsDeduct,
          reason: loyaltyReason,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'ParaPuan güncellenemedi.');
      }

      const updatedCustomer = await res.json();
      setCustomerList((prev) =>
        prev.map((c) => (c.id === updatedCustomer.id ? { ...c, loyaltyPoints: updatedCustomer.loyaltyPoints } : c))
      );
      setDeposits((prev) =>
        prev.map((d) =>
          d.customerId === updatedCustomer.id
            ? { ...d, customer: { ...d.customer, loyaltyPoints: updatedCustomer.loyaltyPoints } }
            : d
        )
      );
      setIsLoyaltyModalOpen(false);
      setLoyaltyPoints(50);
      setLoyaltyReason('Mağaza Alışverişi');
    } catch (err: any) {
      alert(err.message || 'ParaPuan işlem hatası.');
    } finally {
      setIsSubmittingLoyalty(false);
    }
  };

  // Pota Takoz Anlık Hesabı
  const takozItems = Object.entries(takozBatches).map(([caratStr, weight]) => ({
    carat: Number(caratStr),
    weight: Number(weight) || 0,
    milyem: CARAT_MILYEM_MAP[Number(caratStr)],
  }));
  const takozResult = calculateTakozMilyem(takozItems, takozTargetMilyem);

  // Kapatma modalındaki canlı fire hesabı
  const liveLoss = completeJobModal
    ? calculateWorkshopLoss(
        completeJobModal.givenWeight,
        recvFinishedWeight,
        recvScrapWeight,
        completeJobModal.targetLossPercent
      )
    : null;

  return (
    <div className="p-4 sm:p-6 max-w-[1920px] mx-auto space-y-6">
      {/* Üst Başlık */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-amber-500/20 pb-5">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <Flame className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Hurda Sandığı, Takoz & Atölye Ramat Takibi
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Pota eritme ağırlıklı ortalama milyem formülü, atölye fire limitleri ve Cetasoft karşılaştırmalı emanet kasası.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'workshop' && (
            <button
              onClick={() => setIsNewJobModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs sm:text-sm shadow-lg shadow-amber-500/20"
            >
              <Plus className="w-4 h-4" /> Yeni İş Emri Aç
            </button>
          )}
          {activeTab === 'emanet' && (
            <button
              onClick={() => setIsDepositModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs sm:text-sm shadow-lg shadow-amber-500/20"
            >
              <Plus className="w-4 h-4" /> Emanet Altın Al
            </button>
          )}
        </div>
      </div>

      {/* KPI İstatistik Kartları */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-amber-500/20 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold mb-1">
            <span>Sandıktaki Hurda</span>
            <Coins className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono">
            {totalScrapGross.toFixed(2)} gr
          </div>
          <div className="text-[10px] text-amber-600 dark:text-amber-400 mt-1 font-semibold">
            Has Karşılığı: {totalScrapPure.toFixed(3)} gr
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-amber-500/20 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold mb-1">
            <span>Atölyede Üretimde</span>
            <Hammer className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-blue-600 dark:text-blue-400 font-mono">
            {activeJobs.length} İş Emri
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Verilen: {activeJobsWeight.toFixed(2)} gr Altın</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-amber-500/20 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold mb-1">
            <span>Azami Fire Toleransı</span>
            <Percent className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-purple-600 dark:text-purple-400 font-mono">
            %{WORKSHOP_LIMITS.DEFAULT_MAX_FIRE_PERCENT}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">%{WORKSHOP_LIMITS.CRITICAL_FIRE_PERCENT} üstü kritik şüpheli</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-amber-500/20 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold mb-1">
            <span>Müşteri Emanet Kasası</span>
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
            {totalEmanetGold.toFixed(3)} gr Has
          </div>
          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 font-semibold">Cetasoft Entegrasyonu</div>
        </div>
      </div>

      {/* Tab Seçici */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-amber-500/20 rounded-2xl w-full sm:w-fit">
        <button
          onClick={() => setActiveTab('workshop')}
          className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'workshop'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Hammer className="w-4 h-4" /> Atölye İş Emirleri & Ramat ({jobs.length})
        </button>

        <button
          onClick={() => setActiveTab('scrap')}
          className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'scrap'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Layers className="w-4 h-4" /> Hurda Sandığı (Ayar Bazlı)
        </button>

        <button
          onClick={() => setActiveTab('takoz')}
          className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'takoz'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Flame className="w-4 h-4" /> Pota Takoz Hesaplayıcı
        </button>

        <button
          onClick={() => setActiveTab('emanet')}
          className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'emanet'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <UserCheck className="w-4 h-4" /> Emanet Altın Kasası ({deposits.length})
        </button>
      </div>

      {/* TAB 1: ATÖLYE İŞ EMİRLERİ & RAMAT (FİRE) */}
      {activeTab === 'workshop' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-amber-500/20 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 dark:bg-slate-950/80 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 font-bold uppercase text-[11px]">
                <tr>
                  <th className="py-3.5 px-4">İş Emri No</th>
                  <th className="py-3.5 px-4">Atölye / Model Tanımı</th>
                  <th className="py-3.5 px-4 text-right">Verilen Hurda/Has</th>
                  <th className="py-3.5 px-4 text-right">Teslim Alınan</th>
                  <th className="py-3.5 px-4 text-right">Ramat (Fire)</th>
                  <th className="py-3.5 px-4 text-right">Fire %</th>
                  <th className="py-3.5 px-4 text-center">Durum</th>
                  <th className="py-3.5 px-4 text-right">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-sans">
                {jobs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-10 text-slate-400 text-xs">
                      Henüz kayıtlı atölye iş emri bulunmuyor.
                    </td>
                  </tr>
                ) : (
                  jobs.map((job) => {
                    const isCompleted = job.status === WORKSHOP_JOB_STATUS.COMPLETED;

                    return (
                      <tr key={job.id} className="hover:bg-amber-500/5 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-amber-600 dark:text-amber-400">
                          {job.jobNo}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 dark:text-white">{job.workshopName}</div>
                          <div className="text-[11px] text-slate-400">{job.description}</div>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold">
                          {job.givenWeight.toFixed(2)} gr
                        </td>
                        <td className="py-3 px-4 text-right font-mono">
                          {isCompleted ? (
                            <div>
                              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                {job.receivedFinishedWeight.toFixed(2)} gr
                              </span>
                              <span className="text-[10px] text-slate-400 block">
                                (+ {job.receivedScrapWeight.toFixed(2)} astar)
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold">
                          {isCompleted ? (
                            <span className={job.isExcessiveLoss ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300'}>
                              {job.lossWeight.toFixed(3)} gr
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-mono">
                          {isCompleted ? (
                            <span
                              className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold ${
                                job.isExcessiveLoss
                                  ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                                  : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              }`}
                            >
                              %{job.lossPercent.toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold ${
                              isCompleted
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                            }`}
                          >
                            {WORKSHOP_STATUS_LABELS[job.status as keyof typeof WORKSHOP_STATUS_LABELS] || job.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {!isCompleted && (
                            <button
                              onClick={() => {
                                setCompleteJobModal(job);
                                setRecvFinishedWeight(Number((job.givenWeight * 0.85).toFixed(2)));
                                setRecvScrapWeight(Number((job.givenWeight * 0.12).toFixed(2)));
                              }}
                              className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-xs"
                            >
                              Ramat Kapat
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: HURDA SANDIĞI */}
      {activeTab === 'scrap' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {scrap.map((item) => {
            const milyem = CARAT_MILYEM_MAP[item.carat] || 0.995;

            return (
              <div
                key={item.id}
                className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-amber-500/20 shadow-sm space-y-4"
              >
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 font-extrabold text-sm">
                      {item.carat}K
                    </div>
                    <div>
                      <h4 className="font-extrabold text-slate-900 dark:text-white text-base">
                        {item.carat} Ayar Hurda Altın
                      </h4>
                      <p className="text-[11px] text-slate-400 font-mono">Milyem: {milyem}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setScrapEditModal(item);
                      setScrapWeightChange(0);
                    }}
                    className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-amber-500 text-xs font-semibold"
                  >
                    Giriş / Çıkış
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                  <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 block uppercase">Fiziksel Hurda</span>
                    <span className="text-lg font-black text-slate-900 dark:text-white">
                      {item.weight.toFixed(2)} gr
                    </span>
                  </div>

                  <div className="bg-amber-500/5 dark:bg-amber-500/10 p-3 rounded-xl border border-amber-500/20">
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 block uppercase">Has Karşılığı</span>
                    <span className="text-lg font-black text-amber-600 dark:text-amber-400">
                      {item.pureWeight.toFixed(3)} gr
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 3: POTA ERİTME TAKOZ HESAPLAYICI */}
      {activeTab === 'takoz' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Sol Kolon: Hurda Seçimi */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-amber-500/20 shadow-sm space-y-4">
            <h3 className="font-extrabold text-slate-900 dark:text-white text-base flex items-center gap-2">
              <Flame className="w-5 h-5 text-amber-500" />
              Potaya Atılacak Hurdalar (Eritme Külçesi / Takoz)
            </h3>
            <p className="text-xs text-slate-400">
              Farklı ayarlardaki hurda gramajlarını giriniz. Ağırlıklı ortalama formülü: Toplam Has / Toplam Gram.
            </p>

            <div className="space-y-3 pt-2">
              {[24, 22, 18, 14, 8].map((carat) => (
                <div
                  key={carat}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="font-extrabold text-amber-600 dark:text-amber-400 w-8">{carat}K</span>
                    <span className="text-slate-500 text-[11px] font-mono">({CARAT_MILYEM_MAP[carat]} Milyem)</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <ScaleButton
                      size="sm"
                      onWeightReceived={(w) =>
                        setTakozBatches((prev) => ({ ...prev, [carat]: w }))
                      }
                    />
                    <input
                      type="number"
                      step="0.01"
                      value={takozBatches[carat] || 0}
                      onChange={(e) =>
                        setTakozBatches((prev) => ({
                          ...prev,
                          [carat]: Number(e.target.value),
                        }))
                      }
                      className="w-24 px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white font-mono text-right font-bold"
                    />
                    <span className="text-slate-400 font-mono">gr</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Hedef Takoz Milyemi
              </label>
              <div className="flex items-center gap-2">
                <select
                  value={takozTargetMilyem}
                  onChange={(e) => setTakozTargetMilyem(Number(e.target.value))}
                  className="px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white font-mono font-bold"
                >
                  <option value={0.585}>14 Ayar (0.585 Milyem)</option>
                  <option value={0.750}>18 Ayar (0.750 Milyem)</option>
                  <option value={0.916}>22 Ayar (0.916 Milyem)</option>
                  <option value={0.995}>24 Ayar Has (0.995 Milyem)</option>
                </select>
                <span className="text-xs text-slate-400">İstenen nihai döküm saflığı</span>
              </div>
            </div>
          </div>

          {/* Sağ Kolon: Hesaplama ve Ayar Dengeleme Sonuç Kartı */}
          <div className="lg:col-span-5 bg-gradient-to-br from-amber-500/10 via-slate-900 to-slate-950 p-5 sm:p-6 rounded-2xl border border-amber-500/30 shadow-xl space-y-5 text-white">
            <h3 className="font-extrabold text-amber-400 text-base flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              Pota Eritme & Milyem Raporu
            </h3>

            <div className="space-y-3 font-mono text-xs">
              <div className="flex justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="text-slate-400">Toplam Hurda Gramajı:</span>
                <span className="font-bold text-sm text-white">{takozResult.totalWeight} gr</span>
              </div>

              <div className="flex justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="text-slate-400">İçindeki Toplam Has Altın:</span>
                <span className="font-bold text-sm text-amber-400">{takozResult.totalPureWeight} gr Has</span>
              </div>

              <div className="flex justify-between p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
                <span className="text-amber-300">Ağırlıklı Ortalama Milyem:</span>
                <span className="font-black text-base text-amber-400">{takozResult.averageMilyem}</span>
              </div>

              <div className="flex justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="text-slate-400">Yaklaşık Karat Eşdeğeri:</span>
                <span className="font-bold text-sm text-white">{takozResult.equivalentCarat}K</span>
              </div>
            </div>

            {/* Hedefe Ulaştırma Reçetesi */}
            <div className="p-4 rounded-xl bg-slate-950/80 border border-amber-500/40 space-y-2 text-xs">
              <span className="font-extrabold text-amber-300 block uppercase tracking-wider text-[11px]">
                🎯 Hedef Milyem Reçetesi ({takozTargetMilyem}):
              </span>

              {takozResult.pureGoldToAdd && takozResult.pureGoldToAdd > 0 ? (
                <div className="text-emerald-300 space-y-1">
                  <p>Milyemi hedefe yükseltmek için potaya eklenmesi gereken:</p>
                  <p className="text-base font-black font-mono text-emerald-400">
                    + {takozResult.pureGoldToAdd} gr 24K Has Altın
                  </p>
                  <p className="text-[10px] text-slate-400">Nihai Takoz Ağırlığı: {takozResult.finalWeight} gr</p>
                </div>
              ) : takozResult.alloyToAdd && takozResult.alloyToAdd > 0 ? (
                <div className="text-blue-300 space-y-1">
                  <p>Milyemi hedefe düşürmek için potaya eklenmesi gereken:</p>
                  <p className="text-base font-black font-mono text-blue-400">
                    + {takozResult.alloyToAdd} gr Bakır/Gümüş Alaşım
                  </p>
                  <p className="text-[10px] text-slate-400">Nihai Takoz Ağırlığı: {takozResult.finalWeight} gr</p>
                </div>
              ) : (
                <p className="text-emerald-400 font-bold">Mevcut pota tam olarak hedef ayardadır.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: EMANET ALTIN KASASI & CETASOFT KARŞILAŞTIRMASI */}
      {activeTab === 'emanet' && (
        <div className="space-y-6">
          {/* Cetasoft vs KuyumPanel Karşılaştırma & Mimari Analiz Kartı */}
          <div className="p-5 bg-gradient-to-br from-slate-900 via-slate-950 to-amber-950/40 rounded-2xl border border-amber-500/30 text-white shadow-xl relative overflow-hidden">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <Cpu className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
                    Cetasoft İncelemesi & KuyumPanel Mimari Üstünlüğü
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      Bulut ERP vs Eski Desktop
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Geleneksel masaüstü (Delphi/WinForms) kuyumcu yazılımlarındaki kasma ve hantallığa karşı yeni nesil mimari.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-red-500/20 space-y-2">
                <div className="flex items-center gap-2 text-red-400 font-bold">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Cetasoft (Eski Masaüstü Mimarisi)</span>
                </div>
                <ul className="space-y-1.5 text-slate-400 text-[11px] list-disc list-inside">
                  <li>Delphi / WinForms tek çekirdek mimarisi sebebiyle yoğun veri girişinde donma ve kasma.</li>
                  <li>Hassas terazi ve etiket yazıcılar için yerel DLL ve karmaşık COM port sürücü zorunluluğu.</li>
                  <li>Yerel Access/Firebird DB çökmelerinde veri kaybı riski ve şubeler arası kopukluk.</li>
                </ul>
              </div>

              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                <div className="flex items-center gap-2 text-amber-400 font-bold">
                  <Zap className="w-4 h-4" />
                  <span>KuyumPanel (Next.js 16 & Web Serial Cloud)</span>
                </div>
                <ul className="space-y-1.5 text-slate-300 text-[11px] list-disc list-inside">
                  <li>60 FPS akıcı Turbopack motoru ve anlık reaktif UI ile sıfır takılma, tablet & dokunmatik POS uyumu.</li>
                  <li>Sürücüsüz Web Serial API ile doğrudan Chrome/Edge üzerinden RS232 terazilere tek tıkla bağlantı.</li>
                  <li>Emanet Altın Kasası ve Müşteri ParaPuan sadakat sistemi entegre bulut veritabanında güvende.</li>
                </ul>
              </div>
            </div>
          </div>

          {/* 1. Müşteri Emanet Altın Kasası */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-amber-500/20 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-slate-900 dark:text-white text-base flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-500" />
                  Müşteri Emanet Altın Kasası
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Müşterilerin kuyumcu kasasına emanet bıraktığı ziynet ve has altınlar.
                </p>
              </div>
              <button
                onClick={() => setIsDepositModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md shadow-emerald-600/20"
              >
                <Plus className="w-3.5 h-3.5" /> Emanet Altın Al
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-50 dark:bg-slate-950/80 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 font-bold uppercase text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Tarih</th>
                    <th className="py-3 px-4">Müşteri</th>
                    <th className="py-3 px-4">Emanet Eşya / Ziynet Tanımı</th>
                    <th className="py-3 px-4 text-center">Ayar</th>
                    <th className="py-3 px-4 text-right">Gramaj</th>
                    <th className="py-3 px-4 text-right">Has Karşılığı</th>
                    <th className="py-3 px-4 text-center">Durum</th>
                    <th className="py-3 px-4 text-right">İşlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-sans">
                  {deposits.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-slate-400 text-xs">
                        Kayıtlı emanet bulunmuyor.
                      </td>
                    </tr>
                  ) : (
                    deposits.map((dep) => (
                      <tr key={dep.id} className="hover:bg-amber-500/5 transition-colors">
                        <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                          {new Date(dep.createdAt).toLocaleDateString('tr-TR')}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                          {dep.customer?.name}
                        </td>
                        <td className="py-3 px-4 font-medium">{dep.itemDescription}</td>
                        <td className="py-3 px-4 text-center font-mono">{dep.carat ? `${dep.carat}K` : '-'}</td>
                        <td className="py-3 px-4 text-right font-mono font-bold">{dep.weight.toFixed(2)} gr</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-amber-600 dark:text-amber-400">
                          {dep.pureGoldWeight.toFixed(3)} gr Has
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold ${
                              dep.status === CUSTOMER_DEPOSIT_STATUS.ACTIVE
                                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                            }`}
                          >
                            {dep.status === CUSTOMER_DEPOSIT_STATUS.ACTIVE
                              ? CUSTOMER_DEPOSIT_STATUS_LABELS.ACTIVE
                              : CUSTOMER_DEPOSIT_STATUS_LABELS.RETURNED}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {dep.status === CUSTOMER_DEPOSIT_STATUS.ACTIVE && (
                            <button
                              onClick={() => handleWithdrawDeposit(dep.id)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs"
                            >
                              İade Et
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 2. Müşteri ParaPuan / Sadakat Kartı Yönetimi (Cetasoft Özelliği) */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-amber-500/20 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-slate-900 dark:text-white text-base flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-500" />
                  Müşteri ParaPuan & Sadakat Sistemi
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Alışverişlerde müşterilere tanımlanan sadakat ParaPuanları ve harcama bakiyeleri.
                </p>
              </div>
              <button
                onClick={() => {
                  setLoyaltyCustomerId(customerList[0]?.id || '');
                  setIsLoyaltyModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs shadow-md shadow-amber-500/20"
              >
                <Gift className="w-3.5 h-3.5" /> Puan Ekle / Harca
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-50 dark:bg-slate-950/80 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 font-bold uppercase text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Müşteri Adı</th>
                    <th className="py-3 px-4">Telefon</th>
                    <th className="py-3 px-4 text-right">Emanet Altın (Has)</th>
                    <th className="py-3 px-4 text-right">Mevcut ParaPuan</th>
                    <th className="py-3 px-4 text-right">İşlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-sans">
                  {customerList.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-slate-400 text-xs">
                        Kayıtlı müşteri bulunmuyor.
                      </td>
                    </tr>
                  ) : (
                    customerList.map((c) => (
                      <tr key={c.id} className="hover:bg-amber-500/5 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                          {c.name}
                        </td>
                        <td className="py-3 px-4 text-slate-500 font-mono text-xs">
                          {c.phone || '-'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-amber-600 dark:text-amber-400">
                          {(c.emanetGold || 0).toFixed(3)} gr Has
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            {c.loyaltyPoints || 0} Puan
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => {
                              setLoyaltyCustomerId(c.id);
                              setIsLoyaltyModalOpen(true);
                            }}
                            className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30 rounded-lg font-bold text-xs"
                          >
                            Puan İşlemi
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

      {/* MODAL 1: YENİ İŞ EMRİ AÇ */}
      {isNewJobModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/70 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-amber-500/30 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden my-6">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-extrabold text-slate-900 dark:text-white text-base flex items-center gap-2">
                <Hammer className="w-5 h-5 text-amber-500" />
                Yeni Atölye İş Emri
              </h3>
              <button onClick={() => setIsNewJobModalOpen(false)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateJob} className="p-5 space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-500 uppercase block mb-1">Atölye / Dökümcü Firma *</label>
                <input
                  type="text"
                  required
                  placeholder="Örn: Usta Mücevherat, Altınışık Döküm"
                  value={jobWorkshopName}
                  onChange={(e) => setJobWorkshopName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white text-sm"
                />
              </div>

              <div>
                <label className="font-bold text-slate-500 uppercase block mb-1">Model / İş Emri Tanımı *</label>
                <input
                  type="text"
                  required
                  placeholder="Örn: 10 Adet 14K Baget Yüzük Üretimi"
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white text-sm"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="font-bold text-slate-500 uppercase block mb-1">Verilen Ayar</label>
                  <select
                    value={jobGivenCarat}
                    onChange={(e) => setJobGivenCarat(Number(e.target.value))}
                    className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white font-bold"
                  >
                    <option value={24}>24K Has (0.995)</option>
                    <option value={22}>22K (0.916)</option>
                    <option value={18}>18K (0.750)</option>
                    <option value={14}>14K (0.585)</option>
                    <option value={8}>8K (0.333)</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-500 uppercase">Verilen Gram (gr) *</label>
                    <ScaleButton
                      size="sm"
                      onWeightReceived={(w) => setJobGivenWeight(w)}
                    />
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={jobGivenWeight}
                    onChange={(e) => setJobGivenWeight(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-500 uppercase block mb-1">İşçilik Tutarı (TL)</label>
                  <input
                    type="number"
                    step="100"
                    value={jobLaborCost}
                    onChange={(e) => setJobLaborCost(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white font-mono"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-500 uppercase block mb-1">Fire Toleransı (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={jobTargetLossPercent}
                    onChange={(e) => setJobTargetLossPercent(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white font-mono"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-500 uppercase block mb-1">Termin Tarihi</label>
                  <input
                    type="date"
                    value={jobDeliveryDate}
                    onChange={(e) => setJobDeliveryDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewJobModalOpen(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingJob}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl"
                >
                  {isSubmittingJob ? 'Kaydediliyor...' : 'İş Emrini Başlat'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: İŞ EMRİ KAPAT & RAMAT HESAPLA */}
      {completeJobModal && liveLoss && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/70 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-amber-500/30 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden my-6">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                İş Emrini Kapat & Ramat Hesabı ({completeJobModal.jobNo})
              </h3>
              <button onClick={() => setCompleteJobModal(null)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCompleteJob} className="p-5 space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
                <p>
                  <strong>Atölyeye Verilen Altın:</strong> {completeJobModal.givenWeight} gr
                </p>
                <p>
                  <strong>Azami Fire Sınırı:</strong> %{completeJobModal.targetLossPercent}
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-500 uppercase">Teslim Alınan Mamul Takı (gr)</label>
                  <ScaleButton
                    size="sm"
                    onWeightReceived={(w) => setRecvFinishedWeight(w)}
                  />
                </div>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={recvFinishedWeight}
                  onChange={(e) => setRecvFinishedWeight(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white font-mono font-bold"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-500 uppercase">Teslim Alınan Astar (gr)</label>
                    <ScaleButton
                      size="sm"
                      onWeightReceived={(w) => setRecvScrapWeight(w)}
                    />
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    value={recvScrapWeight}
                    onChange={(e) => setRecvScrapWeight(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white font-mono"
                  />
                </div>

                <div className="col-span-1">
                  <label className="font-bold text-slate-500 uppercase block mb-1">Astar Ayarı</label>
                  <select
                    value={recvScrapCarat}
                    onChange={(e) => setRecvScrapCarat(Number(e.target.value))}
                    className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white font-bold"
                  >
                    <option value={14}>14K (0.585)</option>
                    <option value={18}>18K (0.750)</option>
                    <option value={22}>22K (0.916)</option>
                    <option value={24}>24K (0.995)</option>
                    <option value={8}>8K (0.333)</option>
                  </select>
                </div>
              </div>

              {/* Canlı Fire Hesap Raporu */}
              <div
                className={`p-3.5 rounded-xl border font-mono space-y-1 ${
                  liveLoss.isExcessiveLoss
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                    : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                }`}
              >
                <div className="flex justify-between">
                  <span>Gerçekleşen Ramat (Fire):</span>
                  <span className="font-bold text-sm">{liveLoss.lossWeight} gr</span>
                </div>
                <div className="flex justify-between">
                  <span>Fire Yüzdesi:</span>
                  <span className="font-bold text-sm">%{liveLoss.lossPercent}</span>
                </div>
                {liveLoss.isExcessiveLoss && (
                  <p className="text-[11px] font-bold text-rose-400 pt-1">
                    ⚠️ DİKKAT: %{completeJobModal.targetLossPercent} tolerans sınırı aşıldı (+{liveLoss.excessLossWeight} gr fazla kayıp)!
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCompleteJobModal(null)}
                  className="px-4 py-2 text-slate-400 hover:text-white"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={isClosingJob}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl"
                >
                  {isClosingJob ? 'Kapatılıyor...' : 'İş Emrini & Fireyi Onayla'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: HURDA SANDIĞI GİRİŞ / ÇIKIŞ */}
      {scrapEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-amber-500/30 rounded-2xl w-full max-w-sm shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                {scrapEditModal.carat}K Hurda Sandığı Hareketi
              </h3>
              <button onClick={() => setScrapEditModal(null)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateScrapWeight} className="space-y-4 text-xs">
              <p className="text-slate-400">
                Mevcut Gramaj: <strong className="text-white">{scrapEditModal.weight} gr</strong>
              </p>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-500 uppercase">Eklenecek / Çıkarılacak Gram (gr)</label>
                  <ScaleButton
                    size="sm"
                    onWeightReceived={(w) => setScrapWeightChange(w)}
                  />
                </div>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="Giriş için +, Çıkış için - yazın"
                  value={scrapWeightChange}
                  onChange={(e) => setScrapWeightChange(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white font-mono text-sm font-bold"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setScrapEditModal(null)}
                  className="px-4 py-2 text-slate-400 hover:text-white"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingScrap}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl"
                >
                  {isUpdatingScrap ? 'Kaydediliyor...' : 'Güncelle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: EMANET ALTIN ALMA (CETASOFT) */}
      {isDepositModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-amber-500/30 rounded-2xl w-full max-w-md shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-500" />
                Müşteri Emanet Altın Girişi
              </h3>
              <button onClick={() => setIsDepositModalOpen(false)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDeposit} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-500 uppercase block mb-1">Müşteri Seçimi *</label>
                <select
                  required
                  value={depCustomerId}
                  onChange={(e) => setDepCustomerId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white"
                >
                  <option value="">Müşteri Seçiniz</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.phone || 'Tel yok'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-500 uppercase block mb-1">Emanet Eşya Tanımı *</label>
                <input
                  type="text"
                  required
                  placeholder="Örn: 2 Adet 22K Burma Bilezik"
                  value={depItemDesc}
                  onChange={(e) => setDepItemDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-500 uppercase block mb-1">Ayar</label>
                  <select
                    value={depCarat}
                    onChange={(e) => setDepCarat(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white"
                  >
                    <option value={24}>24K Has (995)</option>
                    <option value={22}>22K (916)</option>
                    <option value={18}>18K (750)</option>
                    <option value={14}>14K (585)</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-500 uppercase">Gramaj (gr) *</label>
                    <ScaleButton
                      size="sm"
                      onWeightReceived={(w) => setDepWeight(w)}
                    />
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={depWeight}
                    onChange={(e) => setDepWeight(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white font-mono font-bold"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDepositModalOpen(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={isSavingDeposit}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl"
                >
                  {isSavingDeposit ? 'Kaydediliyor...' : 'Kasaya Emanet Al'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: MÜŞTERİ PARAPUAN İŞLEM MODALI (CETASOFT SADAKAT SİSTEMİ) */}
      {isLoyaltyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-amber-500/30 rounded-2xl w-full max-w-md shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-500" />
                Müşteri ParaPuan / Sadakat İşlemi
              </h3>
              <button onClick={() => setIsLoyaltyModalOpen(false)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveLoyalty} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-500 uppercase block mb-1">Müşteri Seçimi *</label>
                <select
                  required
                  value={loyaltyCustomerId}
                  onChange={(e) => setLoyaltyCustomerId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white"
                >
                  <option value="">Müşteri Seçiniz</option>
                  {customerList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} (Mevcut: {c.loyaltyPoints || 0} Puan)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-500 uppercase block mb-1">İşlem Türü *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setLoyaltyIsDeduct(false)}
                    className={`p-2.5 rounded-xl font-bold border transition-all ${
                      !loyaltyIsDeduct
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-400'
                        : 'border-slate-200 dark:border-slate-800 text-slate-400'
                    }`}
                  >
                    + Puan Ekle (Kazanım)
                  </button>
                  <button
                    type="button"
                    onClick={() => setLoyaltyIsDeduct(true)}
                    className={`p-2.5 rounded-xl font-bold border transition-all ${
                      loyaltyIsDeduct
                        ? 'bg-rose-500/15 border-rose-500/40 text-rose-600 dark:text-rose-400'
                        : 'border-slate-200 dark:border-slate-800 text-slate-400'
                    }`}
                  >
                    - Puan Harca (Düşüm)
                  </button>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-500 uppercase block mb-1">Puan Miktarı *</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={loyaltyPoints}
                  onChange={(e) => setLoyaltyPoints(Math.max(1, Number(e.target.value)))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white font-mono font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-500 uppercase block mb-1">Açıklama / Sebep</label>
                <input
                  type="text"
                  placeholder="Örn: 22K Bilezik Alışverişi Sadakat Bonusu"
                  value={loyaltyReason}
                  onChange={(e) => setLoyaltyReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsLoyaltyModalOpen(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingLoyalty}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl"
                >
                  {isSubmittingLoyalty ? 'İşleniyor...' : 'İşlemi Onayla'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

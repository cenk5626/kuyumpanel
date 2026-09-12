'use client';

import React, { useState } from 'react';
import {
  Users,
  MessageSquare,
  ShieldCheck,
  Send,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Phone,
  Tag,
  AlertCircle,
  FileCheck,
  Share2,
} from 'lucide-react';
import {
  CRM_CONSENT_STATUS,
  CRM_CONSENT_STATUS_LABELS,
  CRM_CONSENT_CHANNELS,
  CRM_CONSENT_CHANNEL_LABELS,
  CRM_CAMPAIGN_STATUS,
  CRM_CAMPAIGN_STATUS_LABELS,
  CRM_CAMPAIGN_TYPES,
  CRM_CAMPAIGN_TYPE_LABELS,
  CRM_SEGMENT_TYPES,
  CRM_SEGMENT_TYPE_LABELS,
  CRM_MESSAGE_VARIABLES,
  CRM_DEFAULTS,
} from '@/constants/crm';
import { THEME } from '@/constants/theme';
import PageHeader from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import LuxuryTabs from '@/components/LuxuryTabs';

interface CrmClientProps {
  initialCampaigns: any[];
  initialConsents: any[];
  initialSegments: any[];
  customers: any[];
  stats: {
    totalCustomers: number;
    optInCount: number;
    optOutCount: number;
    optInRatio: number;
    activeCampaignsCount: number;
  };
}

export default function CrmClient({
  initialCampaigns,
  initialConsents,
  initialSegments,
  customers,
  stats: initialStats,
}: CrmClientProps) {
  const [activeTab, setActiveTab] = useState<'campaigns' | 'consents' | 'segments'>('campaigns');
  const [campaigns, setCampaigns] = useState<any[]>(initialCampaigns);
  const [consents, setConsents] = useState<any[]>(initialConsents);
  const [segments, setSegments] = useState<any[]>(initialSegments);
  const [stats, setStats] = useState(initialStats);

  // Filtreler & Arama
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modallar
  const [showNewCampaignModal, setShowNewCampaignModal] = useState(false);
  const [showNewConsentModal, setShowNewConsentModal] = useState(false);
  const [showNewSegmentModal, setShowNewSegmentModal] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<any | null>(null);

  // Form State - Yeni Kampanya
  const [campaignTitle, setCampaignTitle] = useState('');
  const [campaignType, setCampaignType] = useState<string>(CRM_CAMPAIGN_TYPES.DISCOUNT_COUPON);
  const [selectedSegmentId, setSelectedSegmentId] = useState('');
  const [discountPercent, setDiscountPercent] = useState('15');
  const [templateText, setTemplateText] = useState(
    'Sayın {{ad}}, mağazamızda geçerli {{indirim}} indirim kuponunuz tanımlanmıştır! Mevcut ParaPuan bakiyeniz: {{puan}} TL. Keyifli alışverişler dileriz.'
  );
  const [isSubmittingCampaign, setIsSubmittingCampaign] = useState(false);

  // Form State - Yeni İzin
  const [consentCustomerId, setConsentCustomerId] = useState('');
  const [consentPhone, setConsentPhone] = useState('');
  const [consentStatus, setConsentStatus] = useState<string>(CRM_CONSENT_STATUS.OPT_IN);
  const [consentChannel, setConsentChannel] = useState<string>(CRM_CONSENT_CHANNELS.IN_STORE_FORM);
  const [consentNotes, setConsentNotes] = useState('');
  const [isSubmittingConsent, setIsSubmittingConsent] = useState(false);

  // Form State - Yeni Segment
  const [segmentName, setSegmentName] = useState('');
  const [segmentType, setSegmentType] = useState<string>(CRM_SEGMENT_TYPES.VIP);
  const [segmentMinSpend, setSegmentMinSpend] = useState('50000');
  const [segmentMaxRecency, setSegmentMaxRecency] = useState('');
  const [segmentDesc, setSegmentDesc] = useState('');
  const [isSubmittingSegment, setIsSubmittingSegment] = useState(false);

  // Canlı WhatsApp Şablon Önizlemesi
  const previewMessage = templateText
    .replaceAll('{{ad}}', 'Ahmet')
    .replaceAll('{{ad_soyad}}', 'Ahmet Yılmaz')
    .replaceAll('{{puan}}', '250')
    .replaceAll('{{indirim}}', `%${discountPercent || '15'}`)
    .replaceAll('{{magaza}}', 'Kuyumcumuz')
    .replaceAll('{{ret_metni}}', CRM_DEFAULTS.DEFAULT_OPT_OUT_TEXT);

  // Değişken ekleme yardımcısı
  const insertVariable = (variable: string) => {
    setTemplateText((prev) => `${prev} ${variable}`);
  };

  // Müşteri seçildiğinde otomatik telefon doldur
  const handleCustomerSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const custId = e.target.value;
    setConsentCustomerId(custId);
    const found = customers.find((c) => c.id === custId);
    if (found && found.phone) {
      setConsentPhone(found.phone);
    }
  };

  // Kampanya Kaydet
  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaignTitle.trim()) {
      alert('Lütfen kampanya başlığı giriniz.');
      return;
    }

    setIsSubmittingCampaign(true);
    try {
      const res = await fetch('/api/crm/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: campaignTitle,
          type: campaignType,
          messageTemplate: templateText,
          segmentId: selectedSegmentId || undefined,
          discountPercent,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Kampanya oluşturulamadı.');
      }

      setCampaigns((prev) => [data.campaign, ...prev]);
      setShowNewCampaignModal(false);
      setCampaignTitle('');
      alert(`Kampanya başarıyla oluşturuldu! Hedef kitle: ${data.stats.targetedCount} onaylı alıcı.`);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmittingCampaign(false);
    }
  };

  // İzin Kaydet
  const handleCreateConsent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consentCustomerId || !consentPhone) {
      alert('Lütfen müşteri ve telefon numarası seçiniz.');
      return;
    }

    setIsSubmittingConsent(true);
    try {
      const res = await fetch('/api/crm/consents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: consentCustomerId,
          phone: consentPhone,
          status: consentStatus,
          channel: consentChannel,
          notes: consentNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'İzin kaydedilemedi.');
      }

      // Consents listesini güncelle
      const updatedList = [data.consent, ...consents.filter((c) => c.id !== data.consent.id)];
      setConsents(updatedList);
      setShowNewConsentModal(false);
      setConsentCustomerId('');
      setConsentPhone('');
      setConsentNotes('');

      // İstatistikleri güncelle
      const optIn = updatedList.filter((c) => c.status === CRM_CONSENT_STATUS.OPT_IN).length;
      const optOut = updatedList.filter((c) => c.status === CRM_CONSENT_STATUS.OPT_OUT).length;
      setStats((prev) => ({
        ...prev,
        optInCount: optIn,
        optOutCount: optOut,
        optInRatio: prev.totalCustomers > 0 ? Math.round((optIn / prev.totalCustomers) * 100) : 0,
      }));
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmittingConsent(false);
    }
  };

  // Segment Kaydet
  const handleCreateSegment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!segmentName.trim()) {
      alert('Segment adı zorunludur.');
      return;
    }

    setIsSubmittingSegment(true);
    try {
      const res = await fetch('/api/crm/segments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: segmentName,
          type: segmentType,
          minSpendTl: segmentMinSpend,
          maxRecencyDays: segmentMaxRecency || undefined,
          description: segmentDesc,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Segment kaydedilemedi.');
      }

      setSegments((prev) => [data.segment, ...prev]);
      setShowNewSegmentModal(false);
      setSegmentName('');
      setSegmentDesc('');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmittingSegment(false);
    }
  };

  // Kampanya Detayını Aç & Alıcıları Çek
  const handleOpenCampaignDetails = async (campaignId: string) => {
    try {
      const res = await fetch(`/api/crm/campaigns/${campaignId}`);
      const data = await res.json();
      if (res.ok) {
        setSelectedCampaign(data.campaign);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Alıcıya WhatsApp Aç & Gönderildi İşaretle
  const handleSendWhatsAppToRecipient = async (recipient: any) => {
    window.open(recipient.whatsappUrl, '_blank');

    // Gönderildi durumuna al
    try {
      await fetch(`/api/crm/campaigns/${selectedCampaign.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientId: recipient.id,
          recipientStatus: 'SENT',
        }),
      });

      setSelectedCampaign((prev: any) => {
        if (!prev) return prev;
        return {
          ...prev,
          sentCount: (prev.sentCount || 0) + 1,
          recipients: prev.recipients.map((r: any) =>
            r.id === recipient.id ? { ...r, status: 'SENT', sentAt: new Date().toISOString() } : r
          ),
        };
      });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Üst Başlık ve Hızlı Eylemler */}
      <PageHeader
        icon={<MessageSquare className="w-6 h-6 text-amber-500" />}
        title="CRM & İzinli WhatsApp İletişimi"
        subtitle="ETK ve KVKK uyumlu ticari ileti yönetimi, müşteri segmentasyonu ve kişiselleştirilmiş WhatsApp kampanyaları."
        badges={[
          { label: `${stats.optInCount} İzinli Müşteri`, variant: 'success' },
          { label: `%${stats.optInRatio} İzin Oranı`, variant: 'gold' },
        ]}
        actions={
          <div className="flex items-center gap-2.5 flex-wrap w-full sm:w-auto">
            <button
              onClick={() => setShowNewConsentModal(true)}
              className={`${THEME.BTN_SECONDARY} min-h-[44px] flex items-center gap-1.5`}
            >
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              İzin / Onay Kaydet
            </button>
            <button
              onClick={() => setShowNewCampaignModal(true)}
              className={`${THEME.BTN_PRIMARY} min-h-[44px] flex items-center gap-1.5`}
            >
              <Plus className="w-4 h-4" />
              Yeni Kampanya
            </button>
          </div>
        }
      />

      {/* 4 KPI Kartı */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="İzinli Müşteri (Opt-In)"
          value={stats.optInCount}
          icon={ShieldCheck}
          iconColor="emerald"
          subtitle={`Toplam: ${stats.totalCustomers} Müşteri`}
        />
        <StatCard
          title="Opt-In İzin Oranı"
          value={`%${stats.optInRatio}`}
          icon={Sparkles}
          iconColor="gold"
          subtitle="İletişim İzni Verenler"
        />
        <StatCard
          title="Reddeden / Kara Liste"
          value={stats.optOutCount}
          icon={XCircle}
          iconColor="rose"
          subtitle="İletişim İzni Vermeyenler"
        />
        <StatCard
          title="Toplam Kampanya"
          value={campaigns.length}
          icon={Send}
          iconColor="blue"
          subtitle="Oluşturulan Kampanyalar"
        />
      </div>

      {/* Tab Başlıkları */}
      <LuxuryTabs<'campaigns' | 'consents' | 'segments'>
        tabs={[
          { id: 'campaigns', label: '1. Kampanyalar', icon: <MessageSquare className="w-4 h-4" />, count: campaigns.length },
          { id: 'consents', label: '2. ETK / KVKK İzin Kayıtları', icon: <ShieldCheck className="w-4 h-4" />, count: consents.length },
          { id: 'segments', label: '3. Hedef Kitle & Segmentler', icon: <Users className="w-4 h-4" />, count: segments.length },
        ]}
        activeTab={activeTab}
        onChange={(tab) => setActiveTab(tab)}
      />

      {/* 1. KAMPANYALAR SEKMESİ */}
      {activeTab === 'campaigns' && (
        <div className="space-y-4">
          {campaigns.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-slate-800/60 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-8">
              <MessageSquare className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <div className="text-base font-medium text-slate-800 dark:text-slate-200">
                Henüz Kampanya Oluşturulmadı
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1 mb-4">
                İzinli müşterilerinize WhatsApp üzerinden indirim, tebrik veya altın bülteni iletmek için yeni kampanya başlatın.
              </p>
              <button
                onClick={() => setShowNewCampaignModal(true)}
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-amber-500 hover:bg-amber-600 text-white shadow-sm"
              >
                İlk Kampanyayı Başlat
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {campaigns.map((camp) => (
                <div
                  key={camp.id}
                  className="bg-white dark:bg-slate-800/90 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm hover:border-amber-400/60 transition flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                        {CRM_CAMPAIGN_TYPE_LABELS[camp.type as keyof typeof CRM_CAMPAIGN_TYPE_LABELS] || camp.type}
                      </span>
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          camp.status === CRM_CAMPAIGN_STATUS.ACTIVE
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {CRM_CAMPAIGN_STATUS_LABELS[camp.status as keyof typeof CRM_CAMPAIGN_STATUS_LABELS] || camp.status}
                      </span>
                    </div>

                    <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base mb-1">
                      {camp.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-3">
                      {camp.messageTemplate}
                    </p>

                    <div className="flex items-center gap-4 text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-lg mb-4">
                      <div>
                        Hedef: <strong className="text-slate-900 dark:text-slate-100">{camp.targetCount}</strong>
                      </div>
                      <div>
                        İletilen: <strong className="text-emerald-600 dark:text-emerald-400">{camp.sentCount}</strong>
                      </div>
                      <div>
                        Segment: <strong>{camp.segment?.name || 'Tüm İzinliler'}</strong>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleOpenCampaignDetails(camp.id)}
                    className="w-full py-2 px-3 text-sm font-medium rounded-lg bg-slate-100 hover:bg-amber-50 hover:text-amber-700 dark:bg-slate-700/60 dark:hover:bg-amber-950/30 dark:hover:text-amber-300 text-slate-700 dark:text-slate-200 transition flex items-center justify-center gap-1.5"
                  >
                    Alıcılar & WhatsApp Gönderimi
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 2. ETK / KVKK İZİN YÖNETİMİ SEKMESİ */}
      {activeTab === 'consents' && (
        <div className="bg-white dark:bg-slate-800/90 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Müşteri veya telefon ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-sm px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
              >
                <option value="">Tüm İzin Durumları</option>
                <option value={CRM_CONSENT_STATUS.OPT_IN}>Yalnızca İzinliler (Opt-In)</option>
                <option value={CRM_CONSENT_STATUS.OPT_OUT}>Reddedenler (Opt-Out)</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 text-xs">
                  <th className="py-3 px-4">Müşteri</th>
                  <th className="py-3 px-4">Telefon</th>
                  <th className="py-3 px-4">Durum</th>
                  <th className="py-3 px-4">Onay Kanalı</th>
                  <th className="py-3 px-4">Tarih</th>
                  <th className="py-3 px-4">Açıklama</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {consents
                  .filter((c) => {
                    const matchesSearch =
                      !searchQuery ||
                      c.customer?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      c.phone.includes(searchQuery);
                    const matchesStatus = !statusFilter || c.status === statusFilter;
                    return matchesSearch && matchesStatus;
                  })
                  .map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-750/30">
                      <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">
                        {c.customer?.name}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300 font-mono text-xs">
                        {c.phone}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                            c.status === CRM_CONSENT_STATUS.OPT_IN
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                              : 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300'
                          }`}
                        >
                          {c.status === CRM_CONSENT_STATUS.OPT_IN ? (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5" />
                          )}
                          {CRM_CONSENT_STATUS_LABELS[c.status as keyof typeof CRM_CONSENT_STATUS_LABELS] || c.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-300">
                        {CRM_CONSENT_CHANNEL_LABELS[c.channel as keyof typeof CRM_CONSENT_CHANNEL_LABELS] || c.channel}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-500">
                        {new Date(c.consentDate).toLocaleDateString('tr-TR')}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-500 max-w-xs truncate">
                        {c.notes || '-'}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. HEDEF KİTLE & SEGMENTLER SEKMESİ */}
      {activeTab === 'segments' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setShowNewSegmentModal(true)}
              className="px-3.5 py-2 text-sm font-semibold rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 text-white dark:text-slate-900 transition flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Yeni Segment Tanımla
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {segments.map((seg) => (
              <div
                key={seg.id}
                className="bg-white dark:bg-slate-800/90 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300">
                    {CRM_SEGMENT_TYPE_LABELS[seg.type as keyof typeof CRM_SEGMENT_TYPE_LABELS] || seg.type}
                  </span>
                  <span className="text-xs text-slate-400">
                    {seg._count?.campaigns || 0} Kampanya
                  </span>
                </div>
                <h4 className="font-bold text-slate-900 dark:text-slate-100 text-base mb-1">
                  {seg.name}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                  {seg.description || 'Kriter bazlı otomatik segment.'}
                </p>

                <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1 bg-slate-50 dark:bg-slate-900/40 p-3 rounded-lg">
                  {seg.minSpendTl > 0 && <div>Min Harcama: ₺{seg.minSpendTl.toLocaleString('tr-TR')}</div>}
                  {seg.maxRecencyDays && <div>Son Alışveriş: En az {seg.maxRecencyDays} gün önce</div>}
                  {seg.minTransactions > 0 && <div>Min İşlem Sayısı: {seg.minTransactions} adet</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* YENİ KAMPANYA MODALI */}
      {showNewCampaignModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Send className="w-5 h-5 text-amber-500" />
                Yeni WhatsApp Kampanyası
              </h3>
              <button
                onClick={() => setShowNewCampaignModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCampaign} className="p-6 overflow-y-auto space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Kampanya Başlığı *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Örn: Anneler Günü %15 Pırlanta İndirimi"
                    value={campaignTitle}
                    onChange={(e) => setCampaignTitle(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Kampanya Türü
                  </label>
                  <select
                    value={campaignType}
                    onChange={(e) => setCampaignType(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                  >
                    {Object.entries(CRM_CAMPAIGN_TYPE_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Hedef Segment
                  </label>
                  <select
                    value={selectedSegmentId}
                    onChange={(e) => setSelectedSegmentId(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                  >
                    <option value="">Tüm İzinli Müşteriler (Opt-In Olanlar)</option>
                    {segments.map((seg) => (
                      <option key={seg.id} value={seg.id}>
                        {seg.name} ({CRM_SEGMENT_TYPE_LABELS[seg.type as keyof typeof CRM_SEGMENT_TYPE_LABELS] || seg.type})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    İndirim Oranı (%)
                  </label>
                  <input
                    type="number"
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              {/* Mesaj Şablonu ve Dinamik Değişken Butonları */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Mesaj Şablonu *
                  </label>
                  <span className="text-[11px] text-slate-400">Değişkenleri tıklayarak ekleyebilirsiniz</span>
                </div>

                <div className="flex flex-wrap gap-1.5 mb-2">
                  <button
                    type="button"
                    onClick={() => insertVariable(CRM_MESSAGE_VARIABLES.CUSTOMER_NAME)}
                    className="px-2 py-1 text-xs rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200"
                  >
                    + Ad ({'{{ad}}'})
                  </button>
                  <button
                    type="button"
                    onClick={() => insertVariable(CRM_MESSAGE_VARIABLES.POINTS_BALANCE)}
                    className="px-2 py-1 text-xs rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200"
                  >
                    + ParaPuan ({'{{puan}}'})
                  </button>
                  <button
                    type="button"
                    onClick={() => insertVariable(CRM_MESSAGE_VARIABLES.DISCOUNT_PERCENT)}
                    className="px-2 py-1 text-xs rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200"
                  >
                    + İndirim ({'{{indirim}}'})
                  </button>
                  <button
                    type="button"
                    onClick={() => insertVariable(CRM_MESSAGE_VARIABLES.STORE_NAME)}
                    className="px-2 py-1 text-xs rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200"
                  >
                    + Mağaza ({'{{magaza}}'})
                  </button>
                </div>

                <textarea
                  rows={4}
                  required
                  value={templateText}
                  onChange={(e) => setTemplateText(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans"
                />
              </div>

              {/* Canlı WhatsApp Balon Önizlemesi */}
              <div className="bg-slate-100 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1.5">
                  <Share2 className="w-3.5 h-3.5 text-emerald-500" />
                  Müşterinin Göreceği Canlı WhatsApp Mesajı:
                </div>
                <div className="bg-[#E7FFDB] dark:bg-[#005c4b] text-slate-900 dark:text-slate-100 p-3.5 rounded-lg rounded-tl-none shadow-sm text-sm whitespace-pre-wrap max-w-md border border-emerald-200 dark:border-emerald-800">
                  {previewMessage}
                </div>
              </div>

              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>ETK / KVKK Güvencesi:</strong> Yalnızca ticari elektronik ileti onayı (Opt-In) bulunan müşterilere gönderim yapılacaktır. Onayı olmayanlar otomatik elenir. Yasal ret metni mesaja zorunlu eklenir.
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewCampaignModal(false)}
                  className="px-4 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCampaign}
                  className="px-5 py-2 text-sm font-semibold rounded-lg bg-amber-500 hover:bg-amber-600 text-white shadow-sm disabled:opacity-50"
                >
                  {isSubmittingCampaign ? 'Hazırlanıyor...' : 'Kampanyayı Oluştur & Eşle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* YENİ İZİN MODALI */}
      {showNewConsentModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-700 shadow-2xl p-6">
            <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-500" />
              Ticari İleti İzni / Onay Kaydı
            </h3>

            <form onSubmit={handleCreateConsent} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Müşteri Seçimi *
                </label>
                <select
                  required
                  value={consentCustomerId}
                  onChange={handleCustomerSelect}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                >
                  <option value="">-- Müşteri Seçiniz --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.phone || 'Telefonsuz'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  İletişim Telefonu *
                </label>
                <input
                  type="text"
                  required
                  placeholder="05xxxxxxxxx"
                  value={consentPhone}
                  onChange={(e) => setConsentPhone(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    İzin Durumu
                  </label>
                  <select
                    value={consentStatus}
                    onChange={(e) => setConsentStatus(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                  >
                    <option value={CRM_CONSENT_STATUS.OPT_IN}>İzinli (Opt-In)</option>
                    <option value={CRM_CONSENT_STATUS.OPT_OUT}>Reddedildi (Opt-Out)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Onay Kanalı
                  </label>
                  <select
                    value={consentChannel}
                    onChange={(e) => setConsentChannel(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                  >
                    {Object.entries(CRM_CONSENT_CHANNEL_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Açıklama / Belge No
                </label>
                <input
                  type="text"
                  placeholder="Örn: Mağaza ıslak imzalı form alındı"
                  value={consentNotes}
                  onChange={(e) => setConsentNotes(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewConsentModal(false)}
                  className="px-4 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingConsent}
                  className="px-5 py-2 text-sm font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm disabled:opacity-50"
                >
                  {isSubmittingConsent ? 'Kaydediliyor...' : 'Onayı Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* YENİ SEGMENT MODALI */}
      {showNewSegmentModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-700 shadow-2xl p-6">
            <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-amber-500" />
              Yeni Müşteri Segmenti
            </h3>

            <form onSubmit={handleCreateSegment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Segment Adı *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Örn: Yüksek Cirolu VIP Müşteriler"
                  value={segmentName}
                  onChange={(e) => setSegmentName(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Segment Türü
                  </label>
                  <select
                    value={segmentType}
                    onChange={(e) => setSegmentType(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                  >
                    {Object.entries(CRM_SEGMENT_TYPE_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Min Harcama (TL)
                  </label>
                  <input
                    type="number"
                    value={segmentMinSpend}
                    onChange={(e) => setSegmentMinSpend(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Açıklama
                </label>
                <input
                  type="text"
                  placeholder="Örn: Yıllık 50.000 TL üzeri alışveriş yapanlar"
                  value={segmentDesc}
                  onChange={(e) => setSegmentDesc(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewSegmentModal(false)}
                  className="px-4 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingSegment}
                  className="px-5 py-2 text-sm font-semibold rounded-lg bg-amber-500 hover:bg-amber-600 text-white shadow-sm disabled:opacity-50"
                >
                  {isSubmittingSegment ? 'Kaydediliyor...' : 'Segmenti Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* KAMPANYA DETAYLARI & WHATSAPP GÖNDERİM MODALI */}
      {selectedCampaign && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-3xl w-full border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Send className="w-5 h-5 text-emerald-500" />
                  {selectedCampaign.title}
                </h3>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Toplam Onaylı Alıcı: <strong>{selectedCampaign.recipients?.length || 0}</strong> • Gönderilen:{' '}
                  <strong className="text-emerald-500">{selectedCampaign.sentCount || 0}</strong>
                </div>
              </div>
              <button
                onClick={() => setSelectedCampaign(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              <div className="text-xs text-slate-500">
                Aşağıdaki onaylı müşterilere tek tıkla WhatsApp Web üzerinden mesaj gönderebilirsiniz:
              </div>

              <div className="space-y-3">
                {selectedCampaign.recipients?.map((rec: any) => (
                  <div
                    key={rec.id}
                    className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-slate-900 dark:text-slate-100 text-sm">
                          {rec.customer?.name}
                        </strong>
                        <span className="text-xs font-mono text-slate-500">{rec.phone}</span>
                        {rec.status === 'SENT' ? (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                            Gönderildi
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                            Bekliyor
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2 max-w-lg">
                        {rec.personalizedMessage}
                      </p>
                    </div>

                    <button
                      onClick={() => handleSendWhatsAppToRecipient(rec)}
                      className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition ${
                        rec.status === 'SENT'
                          ? 'bg-slate-200 hover:bg-slate-300 text-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-200'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                      }`}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      {rec.status === 'SENT' ? 'Tekrar Gönder' : "WhatsApp'ta Aç"}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex justify-end">
              <button
                onClick={() => setSelectedCampaign(null)}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200"
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

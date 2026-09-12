'use client';

import React, { useState } from 'react';
import {
  Globe,
  ShoppingBag,
  TrendingUp,
  ShieldCheck,
  RefreshCw,
  Plus,
  Truck,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  ExternalLink,
  Percent,
  Check,
  X,
  Store,
} from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import LuxuryTabs from '@/components/LuxuryTabs';
import { THEME } from '@/constants/theme';
import {
  CHANNEL_TYPE,
  CHANNEL_TYPE_LABELS,
  EXTERNAL_ORDER_STATUS,
  EXTERNAL_ORDER_STATUS_LABELS,
  OMNICHANNEL_DEFAULTS,
  ChannelType,
  ExternalOrderStatus,
} from '@/constants/omnichannel';

interface SalesChannelItem {
  id: string;
  name: string;
  channelType: ChannelType;
  merchantId?: string | null;
  isActive: boolean;
  autoPriceSync: boolean;
  priceMarkupPercent: number;
  lastSyncAt?: string | null;
  orderCount: number;
}

interface ExternalOrderItem {
  id: string;
  channelId: string;
  channelName: string;
  orderNumber: string;
  customerName: string;
  customerPhone?: string | null;
  totalAmount: number;
  status: ExternalOrderStatus;
  itemsJson: string;
  cargoCompany?: string | null;
  trackingNumber?: string | null;
  orderedAt: string;
}

interface ChannelsClientProps {
  initialChannels: SalesChannelItem[];
  initialOrders: ExternalOrderItem[];
}

export default function ChannelsClient({
  initialChannels,
  initialOrders,
}: ChannelsClientProps) {
  const [channels, setChannels] = useState<SalesChannelItem[]>(initialChannels);
  const [orders, setOrders] = useState<ExternalOrderItem[]>(initialOrders);
  const [activeTab, setActiveTab] = useState<'ALL' | 'NEW' | 'PROCESSING' | 'SHIPPED' | 'CANCELLED'>('ALL');
  const [syncingId, setSyncingId] = useState<string | null>(null);

  // Modal State
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<ChannelType>(CHANNEL_TYPE.TRENDYOL);
  const [newMerchantId, setNewMerchantId] = useState('');
  const [newMarkup, setNewMarkup] = useState<number>(OMNICHANNEL_DEFAULTS.DEFAULT_MARKUP_PERCENT);
  const [newLoading, setNewLoading] = useState(false);

  // KPI Calculations
  const totalOrdersCount = orders.length;
  const totalRevenueTl = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const activeChannelsCount = channels.filter((c) => c.isActive).length;

  const filteredOrders = orders.filter((o) => {
    if (activeTab !== 'ALL' && o.status !== activeTab) return false;
    return true;
  });

  // Trigger sync
  const handleSyncChannel = async (id: string) => {
    setSyncingId(id);
    try {
      const res = await fetch(`/api/channels/${id}/sync`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Senkronizasyon başarısız.');
      }

      setChannels((prev) =>
        prev.map((c) =>
          c.id === id ? { ...c, lastSyncAt: new Date().toISOString() } : c
        )
      );
      alert(data.message || 'Senkronizasyon başarıyla tamamlandı!');
    } catch (err: any) {
      alert(err.message || 'Senkronizasyon sırasında hata oluştu.');
    } finally {
      setSyncingId(null);
    }
  };

  // Toggle active status
  const handleToggleActive = async (channel: SalesChannelItem) => {
    try {
      const res = await fetch(`/api/channels/${channel.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !channel.isActive }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setChannels((prev) =>
          prev.map((c) => (c.id === channel.id ? { ...c, isActive: !channel.isActive } : c))
        );
      }
    } catch (err) {
      // ignore
    }
  };

  // Create new channel
  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    setNewLoading(true);
    try {
      const res = await fetch('/api/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName,
          channelType: newType,
          merchantId: newMerchantId || undefined,
          priceMarkupPercent: newMarkup,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Kanal eklenemedi.');
      }

      setChannels((prev) => [
        ...prev,
        {
          id: data.channel.id,
          name: data.channel.name,
          channelType: data.channel.channelType,
          merchantId: data.channel.merchantId,
          isActive: data.channel.isActive,
          autoPriceSync: data.channel.autoPriceSync,
          priceMarkupPercent: data.channel.priceMarkupPercent,
          lastSyncAt: null,
          orderCount: 0,
        },
      ]);
      setNewModalOpen(false);
      setNewName('');
      setNewMerchantId('');
    } catch (err: any) {
      alert(err.message || 'Hata oluştu.');
    } finally {
      setNewLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Pazaryeri & E-Ticaret Entegrasyonu"
        subtitle="Trendyol, Hepsiburada, Shopify Otomatik Canlı Kur ve Çifte Satış (Oversell) Önleme"
        icon={Globe}
        badges={[
          { label: `${activeChannelsCount} Aktif Kanal`, variant: 'gold' },
          { label: 'Oversell Koruması Devrede', variant: 'success' },
        ]}
        actions={
          <button
            onClick={() => setNewModalOpen(true)}
            className={`${THEME.BTN_PRIMARY} min-h-[44px] flex items-center justify-center gap-2`}
          >
            <Plus className="w-4 h-4" />
            <span>Yeni Satış Kanalı Bağla</span>
          </button>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Entegre Kanallar"
          value={`${activeChannelsCount} / ${channels.length}`}
          subtitle="Aktif Satış Kanalı"
          icon={Store}
          iconColor="gold"
        />
        <StatCard
          title="İnternet Siparişleri"
          value={totalOrdersCount}
          subtitle="Toplam Alınan Sipariş"
          icon={ShoppingBag}
          iconColor="emerald"
        />
        <StatCard
          title="İnternet Cirosu"
          value={`${totalRevenueTl.toLocaleString('tr-TR')} ₺`}
          subtitle="Pazaryeri Satış Hacmi"
          icon={TrendingUp}
          iconColor="gold"
        />
        <StatCard
          title="Oversell Koruması"
          value="Sıfır Risk"
          subtitle="Mağaza stoğu biten ürün anında internette kapanır"
          icon={ShieldCheck}
          iconColor="emerald"
        />
      </div>

      {/* Channel Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {channels.length === 0 ? (
          <div className="col-span-full p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-amber-500/20 shadow-sm">
            <Globe className="w-10 h-10 mx-auto text-slate-400 mb-2" />
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Henüz bağlı e-ticaret satış kanalı bulunmuyor.
            </p>
          </div>
        ) : (
          channels.map((channel) => (
            <div
              key={channel.id}
              className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-amber-500/20 shadow-sm space-y-4 hover:border-amber-500/40 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-sm">
                    {channel.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                      {channel.name}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {CHANNEL_TYPE_LABELS[channel.channelType] || channel.channelType}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleToggleActive(channel)}
                  className={`min-h-[36px] px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                    channel.isActive
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                  }`}
                >
                  {channel.isActive ? 'Aktif' : 'Pasif'}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs py-2 border-y border-slate-100 dark:border-slate-800/60">
                <div>
                  <span className="text-slate-400 block">Komisyon Marjı:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    +%{channel.priceMarkupPercent}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Toplam Sipariş:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {channel.orderCount} adet
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400 block">Son Senkronizasyon:</span>
                  <span className="font-mono text-slate-600 dark:text-slate-300 text-[11px]">
                    {channel.lastSyncAt
                      ? new Date(channel.lastSyncAt).toLocaleString('tr-TR')
                      : 'Henüz yapılmadı'}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  onClick={() => handleSyncChannel(channel.id)}
                  disabled={syncingId === channel.id || !channel.isActive}
                  className="min-h-[36px] flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold rounded-xl text-xs transition-all disabled:opacity-50"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${syncingId === channel.id ? 'animate-spin' : ''}`}
                  />
                  Fiyat & Stok Senkronize Et
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Orders Section */}
      <div className="space-y-4">
        <LuxuryTabs
          tabs={[
            { id: 'ALL', label: 'Tüm Siparişler', count: orders.length },
            { id: 'NEW', label: 'Yeni Gelenler', count: orders.filter((o) => o.status === 'NEW').length },
            { id: 'PROCESSING', label: 'Hazırlananlar', count: orders.filter((o) => o.status === 'PROCESSING').length },
            { id: 'SHIPPED', label: 'Kargodakiler', count: orders.filter((o) => o.status === 'SHIPPED').length },
          ]}
          activeTab={activeTab}
          onChange={(t) => setActiveTab(t as any)}
        />

        {/* Orders Table */}
        <div className={THEME.TABLE.CONTAINER}>
          {filteredOrders.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-sm">
              Bu filtreye uygun internet siparişi bulunamadı.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className={THEME.TABLE.HEADER}>
                  <tr>
                    <th className={THEME.TABLE.TH}>Sipariş No</th>
                    <th className={THEME.TABLE.TH}>Pazaryeri</th>
                    <th className={THEME.TABLE.TH}>Müşteri</th>
                    <th className={THEME.TABLE.TH}>Tutar</th>
                    <th className={THEME.TABLE.TH}>Kargo & Takip</th>
                    <th className={THEME.TABLE.TH}>Durum</th>
                    <th className={THEME.TABLE.TH}>Tarih</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
                  {filteredOrders.map((order) => (
                    <tr
                      key={order.id}
                      className={THEME.TABLE.ROW}
                    >
                      <td className="py-4 px-4 whitespace-nowrap font-mono text-xs font-bold text-amber-600 dark:text-amber-400">
                        #{order.orderNumber}
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                          {order.channelName}
                        </span>
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap text-xs">
                        <p className="font-semibold text-slate-900 dark:text-white">
                          {order.customerName}
                        </p>
                        {order.customerPhone && (
                          <span className="text-slate-400 font-mono">
                            {order.customerPhone}
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap font-bold text-slate-900 dark:text-white text-xs font-mono">
                        {order.totalAmount.toLocaleString('tr-TR')} ₺
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap text-xs">
                        {order.trackingNumber ? (
                          <div className="flex items-center gap-1 font-mono text-emerald-600 dark:text-emerald-400">
                            <Truck className="w-3.5 h-3.5" />
                            <span>{order.trackingNumber}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">Kargo Bekleniyor</span>
                        )}
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                            order.status === EXTERNAL_ORDER_STATUS.SHIPPED
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : order.status === EXTERNAL_ORDER_STATUS.PROCESSING
                              ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                              : order.status === EXTERNAL_ORDER_STATUS.CANCELLED
                              ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                          }`}
                        >
                          {EXTERNAL_ORDER_STATUS_LABELS[order.status] || order.status}
                        </span>
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap text-xs text-slate-400 font-mono">
                        {new Date(order.orderedAt).toLocaleDateString('tr-TR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* New Channel Modal */}
      {newModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <form
            onSubmit={handleCreateChannel}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-amber-500/20 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600">
                  <Globe className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900 dark:text-white">
                  Yeni E-Ticaret Kanalı Bağla
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setNewModalOpen(false)}
                className="min-h-[44px] min-w-[44px] p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Kanal Platformu
                </label>
                <select
                  value={newType}
                  onChange={(e) => {
                    const val = e.target.value as ChannelType;
                    setNewType(val);
                    if (!newName) setNewName(CHANNEL_TYPE_LABELS[val]);
                  }}
                  className={`w-full ${THEME.INPUT}`}
                >
                  {Object.entries(CHANNEL_TYPE).map(([k, val]) => (
                    <option key={k} value={val} className="dark:bg-slate-900">
                      {CHANNEL_TYPE_LABELS[val as ChannelType]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Mağaza / Kanal Adı
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Örn: Trendyol Mağazam"
                  className={`w-full ${THEME.INPUT}`}
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Satıcı / Merchant ID
                </label>
                <input
                  type="text"
                  value={newMerchantId}
                  onChange={(e) => setNewMerchantId(e.target.value)}
                  placeholder="Örn: 104928"
                  className={`w-full ${THEME.INPUT}`}
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Komisyon Fiyat Farkı Marjı (%)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={newMarkup}
                  onChange={(e) => setNewMarkup(parseFloat(e.target.value) || 0)}
                  className={`w-full ${THEME.INPUT}`}
                />
                <span className="text-[11px] text-slate-400 block mt-1">
                  Mağaza fiyatının üzerine eklenecek pazaryeri komisyon oranı
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setNewModalOpen(false)}
                className={`${THEME.BTN_SECONDARY} min-h-[44px]`}
              >
                Vazgeç
              </button>
              <button
                type="submit"
                disabled={newLoading}
                className={`${THEME.BTN_PRIMARY} min-h-[44px]`}
              >
                {newLoading ? 'Bağlanıyor...' : 'Kanalı Kaydet'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

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
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Globe className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
                Pazaryeri & E-Ticaret Entegrasyonu
              </h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
                Trendyol, Hepsiburada, Shopify Otomatik Canlı Kur ve Çifte Satış (Oversell) Önleme
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => setNewModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-zinc-950 font-semibold rounded-xl text-sm transition-all shadow-md shadow-amber-500/10 active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Yeni Satış Kanalı Bağla
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Entegre Kanallar</span>
            <Store className="w-5 h-5 text-amber-500" />
          </div>
          <p className="text-3xl font-bold text-zinc-900 dark:text-white mt-2">
            {activeChannelsCount} / {channels.length}
          </p>
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 font-medium">Aktif Satış Kanalı</p>
        </div>

        <div className="p-5 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">İnternet Siparişleri</span>
            <ShoppingBag className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="text-3xl font-bold text-zinc-900 dark:text-white mt-2">
            {totalOrdersCount}
          </p>
          <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 font-medium">Toplam Alınan Sipariş</p>
        </div>

        <div className="p-5 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">İnternet Cirosu</span>
            <TrendingUp className="w-5 h-5 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-zinc-900 dark:text-white mt-2">
            {totalRevenueTl.toLocaleString('tr-TR')} ₺
          </p>
          <p className="text-xs text-zinc-500 mt-1">Pazaryeri Satış Hacmi</p>
        </div>

        <div className="p-5 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent rounded-2xl border border-emerald-500/20 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-emerald-800 dark:text-emerald-300">Oversell Koruması</span>
            <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="text-xl font-bold text-zinc-900 dark:text-white mt-2">Sıfır Risk</p>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
            Mağaza stoğu biten ürün anında internette kapanır
          </p>
        </div>
      </div>

      {/* Channel Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {channels.length === 0 ? (
          <div className="col-span-full p-8 text-center bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800">
            <Globe className="w-10 h-10 mx-auto text-zinc-400 mb-2" />
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Henüz bağlı e-ticaret satış kanalı bulunmuyor.
            </p>
          </div>
        ) : (
          channels.map((channel) => (
            <div
              key={channel.id}
              className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4 hover:border-amber-500/40 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-sm">
                    {channel.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-zinc-900 dark:text-white text-sm">
                      {channel.name}
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {CHANNEL_TYPE_LABELS[channel.channelType] || channel.channelType}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleToggleActive(channel)}
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
                    channel.isActive
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
                  }`}
                >
                  {channel.isActive ? 'Aktif' : 'Pasif'}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs py-2 border-y border-zinc-100 dark:border-zinc-800/60">
                <div>
                  <span className="text-zinc-400 block">Komisyon Marjı:</span>
                  <span className="font-bold text-zinc-800 dark:text-zinc-200">
                    +%{channel.priceMarkupPercent}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-400 block">Toplam Sipariş:</span>
                  <span className="font-bold text-zinc-800 dark:text-zinc-200">
                    {channel.orderCount} adet
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-zinc-400 block">Son Senkronizasyon:</span>
                  <span className="font-mono text-zinc-600 dark:text-zinc-300 text-[11px]">
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
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-zinc-950 font-semibold rounded-xl text-xs transition-all disabled:opacity-50"
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
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setActiveTab('ALL')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === 'ALL'
                  ? 'bg-amber-500 text-zinc-950'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              Tüm Siparişler ({orders.length})
            </button>
            <button
              onClick={() => setActiveTab('NEW')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === 'NEW'
                  ? 'bg-amber-500 text-zinc-950'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              Yeni Gelenler ({orders.filter((o) => o.status === 'NEW').length})
            </button>
            <button
              onClick={() => setActiveTab('PROCESSING')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === 'PROCESSING'
                  ? 'bg-amber-500 text-zinc-950'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              Hazırlananlar ({orders.filter((o) => o.status === 'PROCESSING').length})
            </button>
            <button
              onClick={() => setActiveTab('SHIPPED')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === 'SHIPPED'
                  ? 'bg-amber-500 text-zinc-950'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              Kargodakiler ({orders.filter((o) => o.status === 'SHIPPED').length})
            </button>
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
          {filteredOrders.length === 0 ? (
            <div className="p-12 text-center text-zinc-500 text-sm">
              Bu filtreye uygun internet siparişi bulunamadı.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                    <th className="py-3.5 px-4">Sipariş No</th>
                    <th className="py-3.5 px-4">Pazaryeri</th>
                    <th className="py-3.5 px-4">Müşteri</th>
                    <th className="py-3.5 px-4">Tutar</th>
                    <th className="py-3.5 px-4">Kargo & Takip</th>
                    <th className="py-3.5 px-4">Durum</th>
                    <th className="py-3.5 px-4">Tarih</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-sm">
                  {filteredOrders.map((order) => (
                    <tr
                      key={order.id}
                      className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50 transition-colors"
                    >
                      <td className="py-4 px-4 whitespace-nowrap font-mono text-xs font-bold text-amber-600 dark:text-amber-400">
                        #{order.orderNumber}
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-xs font-medium text-zinc-800 dark:text-zinc-200">
                          {order.channelName}
                        </span>
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap text-xs">
                        <p className="font-semibold text-zinc-900 dark:text-white">
                          {order.customerName}
                        </p>
                        {order.customerPhone && (
                          <span className="text-zinc-400 font-mono">
                            {order.customerPhone}
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap font-bold text-zinc-900 dark:text-white text-xs">
                        {order.totalAmount.toLocaleString('tr-TR')} ₺
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap text-xs">
                        {order.trackingNumber ? (
                          <div className="flex items-center gap-1 font-mono text-emerald-600 dark:text-emerald-400">
                            <Truck className="w-3.5 h-3.5" />
                            <span>{order.trackingNumber}</span>
                          </div>
                        ) : (
                          <span className="text-zinc-400">Kargo Bekleniyor</span>
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

                      <td className="py-4 px-4 whitespace-nowrap text-xs text-zinc-400 font-mono">
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
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-md p-6 shadow-xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600">
                  <Globe className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-zinc-900 dark:text-white">
                  Yeni E-Ticaret Kanalı Bağla
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setNewModalOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Kanal Platformu
                </label>
                <select
                  value={newType}
                  onChange={(e) => {
                    const val = e.target.value as ChannelType;
                    setNewType(val);
                    if (!newName) setNewName(CHANNEL_TYPE_LABELS[val]);
                  }}
                  className="w-full p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                >
                  {Object.entries(CHANNEL_TYPE).map(([k, val]) => (
                    <option key={k} value={val}>
                      {CHANNEL_TYPE_LABELS[val as ChannelType]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Mağaza / Kanal Adı
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Örn: Trendyol Mağazam"
                  className="w-full p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Satıcı / Merchant ID
                </label>
                <input
                  type="text"
                  value={newMerchantId}
                  onChange={(e) => setNewMerchantId(e.target.value)}
                  placeholder="Örn: 104928"
                  className="w-full p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Komisyon Fiyat Farkı Marjı (%)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={newMarkup}
                  onChange={(e) => setNewMarkup(parseFloat(e.target.value) || 0)}
                  className="w-full p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
                <span className="text-[11px] text-zinc-400 block mt-1">
                  Mağaza fiyatının üzerine eklenecek pazaryeri komisyon oranı
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setNewModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl"
              >
                Vazgeç
              </button>
              <button
                type="submit"
                disabled={newLoading}
                className="px-4 py-2 text-xs font-semibold text-zinc-950 bg-amber-500 hover:bg-amber-600 rounded-xl transition-all shadow-sm disabled:opacity-50"
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

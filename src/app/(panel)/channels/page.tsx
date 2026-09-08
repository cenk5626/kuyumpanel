import { prisma } from '@/lib/prisma';
import { getAuthenticatedContext } from '@/lib/security/auth-context';
import ChannelsClient from './ChannelsClient';

export const dynamic = 'force-dynamic';

export default async function ChannelsPage() {
  let initialChannels: any[] = [];
  let initialOrders: any[] = [];

  try {
    const ctx = await getAuthenticatedContext();
    const dealerId = ctx.dealerId;

    const [channels, orders] = await Promise.all([
      prisma.salesChannel.findMany({
        where: { dealerId },
        include: {
          _count: {
            select: { orders: true, syncLogs: true },
          },
        },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.externalOrder.findMany({
        where: { dealerId },
        include: {
          channel: {
            select: { name: true, channelType: true },
          },
        },
        orderBy: { orderedAt: 'desc' },
        take: 50,
      }),
    ]);

    initialChannels = channels.map((c) => ({
      id: c.id,
      name: c.name,
      channelType: c.channelType,
      merchantId: c.merchantId,
      isActive: c.isActive,
      autoPriceSync: c.autoPriceSync,
      priceMarkupPercent: c.priceMarkupPercent,
      lastSyncAt: c.lastSyncAt
        ? c.lastSyncAt instanceof Date
          ? c.lastSyncAt.toISOString()
          : new Date(c.lastSyncAt).toISOString()
        : null,
      orderCount: c._count.orders,
    }));

    initialOrders = orders.map((o) => ({
      id: o.id,
      channelId: o.channelId,
      channelName: o.channel?.name || 'Pazaryeri',
      orderNumber: o.orderNumber,
      customerName: o.customerName,
      customerPhone: o.customerPhone,
      totalAmount: o.totalAmount,
      status: o.status,
      itemsJson: o.itemsJson,
      cargoCompany: o.cargoCompany,
      trackingNumber: o.trackingNumber,
      orderedAt: o.orderedAt
        ? o.orderedAt instanceof Date
          ? o.orderedAt.toISOString()
          : new Date(o.orderedAt).toISOString()
        : new Date().toISOString(),
    }));
  } catch (error) {
    console.error('[ChannelsPage Load Error]:', error);
  }

  return (
    <ChannelsClient
      initialChannels={initialChannels}
      initialOrders={initialOrders}
    />
  );
}

import { prisma } from './prisma';

export interface AiChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface StoreContextData {
  dealerName: string;
  totalProductsCount: number;
  totalGoldWeightGr: number;
  totalDiamondCount: number;
  liveHasBid: number;
  liveHasAsk: number;
  customerReceivableHas: number;
  customerReceivableTL: number;
  supplierDebtHas: number;
  supplierDebtTL: number;
  drawerTL: number;
  todaySalesVolumeTL: number;
  topDebtorCustomers: Array<{ name: string; hasBalance: number; tlBalance: number }>;
  criticalStockItems: Array<{ barcode: string; title: string; quantity: number }>;
}

/**
 * Mağazanın o anki tüm canlı envanter, kasa, cari ve fiyat verilerini toparlar.
 */
export async function getStoreContext(dealerId: string): Promise<StoreContextData> {
  const [
    dealer,
    productItems,
    customers,
    suppliers,
    hasPrice,
    todayMovements,
    drawerSession,
  ] = await Promise.all([
    prisma.dealer.findUnique({ where: { id: dealerId }, select: { name: true } }),
    prisma.productItem.findMany({
      where: { dealerId, status: 'IN_STOCK' },
      select: { barcode: true, title: true, category: true, weight: true, quantity: true, isDiamond: true },
    }),
    prisma.customer.findMany({
      where: { dealerId },
      select: { name: true, hasBalance: true, tlBalance: true },
    }),
    prisma.supplier.findMany({
      where: { dealerId },
      select: { name: true, hasBalance: true, tlBalance: true },
    }),
    prisma.hasPrice.findUnique({ where: { id: 'singleton' } }),
    prisma.cashMovement.findMany({
      where: {
        dealerId,
        createdAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
      select: { type: true, amount: true, currency: true },
    }),
    prisma.cashRegisterSession.findFirst({
      where: { dealerId, status: 'OPEN' },
      select: { openingCashTL: true, systemCashTL: true },
    }),
  ]);

  const totalProductsCount = productItems.reduce((acc, p) => acc + (p.quantity || 1), 0);
  const totalGoldWeightGr = productItems.reduce((acc, p) => acc + (p.weight || 0) * (p.quantity || 1), 0);
  const totalDiamondCount = productItems.filter(p => p.isDiamond).length;

  const customerReceivableHas = customers.reduce((acc, c) => acc + (c.hasBalance > 0 ? c.hasBalance : 0), 0);
  const customerReceivableTL = customers.reduce((acc, c) => acc + (c.tlBalance > 0 ? c.tlBalance : 0), 0);

  const supplierDebtHas = suppliers.reduce((acc, s) => acc + (s.hasBalance > 0 ? s.hasBalance : 0), 0);
  const supplierDebtTL = suppliers.reduce((acc, s) => acc + (s.tlBalance > 0 ? s.tlBalance : 0), 0);

  const todaySalesVolumeTL = todayMovements
    .filter(m => m.type === 'INFLOW' && m.currency === 'TRY')
    .reduce((acc, m) => acc + m.amount, 0);

  const topDebtorCustomers = customers
    .filter(c => c.hasBalance > 0 || c.tlBalance > 0)
    .sort((a, b) => b.hasBalance - a.hasBalance)
    .slice(0, 5);

  const criticalStockItems = productItems
    .filter(p => (p.quantity || 1) <= 1)
    .slice(0, 5)
    .map(p => ({ barcode: p.barcode, title: p.title || p.category || 'Ürün', quantity: p.quantity || 1 }));

  return {
    dealerName: dealer?.name || 'Kuyumcu Mağazası',
    totalProductsCount,
    totalGoldWeightGr,
    totalDiamondCount,
    liveHasBid: hasPrice?.bid || 0,
    liveHasAsk: hasPrice?.ask || 0,
    customerReceivableHas,
    customerReceivableTL,
    supplierDebtHas,
    supplierDebtTL,
    drawerTL: (drawerSession?.openingCashTL || 0) + (drawerSession?.systemCashTL || 0),
    todaySalesVolumeTL,
    topDebtorCustomers,
    criticalStockItems,
  };
}

/**
 * AI için sistem bağlam istemini inşa eder.
 */
export function buildSystemPrompt(context: StoreContextData, extraPrompt?: string | null): string {
  return `Sen KuyumPanel sistemine entegre edilmiş, 40 yıllık Kapalıçarşı tecrübesine ve modern finans/muhasebe uzmanlığına sahip kıdemli bir "Kuyumcu Asistanı ve Patron Danışmanı"sın.

GÖREVİN:
Mağaza sahibine (patrona) mağazasının güncel stokları, altın fiyatları, borç-alacak dengesi, kârlılık oranları ve satış stratejileri hakkında net, profesyonel, güvenilir ve isabetli tavsiyeler vermek.

MAĞAZANIN ANLIK CANLI VERİLERİ (${context.dealerName}):
- Canlı Has Altın Kuru: Alış: ₺${context.liveHasBid.toFixed(2)} | Satış: ₺${context.liveHasAsk.toFixed(2)}
- Vitrin & Stok Durumu: Toplam ${context.totalProductsCount} adet ürün, Toplam ${context.totalGoldWeightGr.toFixed(2)} gr altın envanteri, ${context.totalDiamondCount} adet sertifikalı pırlanta.
- Kasa Durumu: Kasadaki Nakit: ₺${Math.round(context.drawerTL).toLocaleString('tr-TR')} | Bugün Giriş Yapan Ciro: ₺${Math.round(context.todaySalesVolumeTL).toLocaleString('tr-TR')}
- Müşteri Veresiye / Alacakları: ${context.customerReceivableHas.toFixed(2)} gr Has Altın + ₺${Math.round(context.customerReceivableTL).toLocaleString('tr-TR')}
- Toptancı / Atölye Borçları: ${context.supplierDebtHas.toFixed(2)} gr Has Altın + ₺${Math.round(context.supplierDebtTL).toLocaleString('tr-TR')}
- En Çok Borcu Olan Müşteriler: ${context.topDebtorCustomers.map(c => `${c.name} (${c.hasBalance.toFixed(2)} gr Has, ₺${Math.round(c.tlBalance)})`).join(', ') || 'Borçlu müşteri yok'}
- Azalan / Kritik Stoklar: ${context.criticalStockItems.map(i => `${i.title} [${i.barcode}]`).join(', ') || 'Tüm stoklar yeterli'}

KURALLAR:
1. Türkçe konuş, saygılı, esnaf samimiyetinde fakat üst düzey finansal ciddiyetle yanıt ver.
2. Patronun sorduğu sorulara mağazanın gerçek rakamlarını kullanarak yanıt üret.
3. Yanıtlarında Markdown başlıkları, madde işaretleri ve altın emojileri (💎, 📊, ⚖️, 💰) kullanarak okunabilirliği artır.
4. Altın borcu olan müşteriler için döviz kuru risklerini ve toptancı ödeme vadelerini hatırlat.

⚡ VERİTABANI İŞLEMLERİ & 2 AŞAMALI TEYİT PROTOKOLÜ:
Patron senden bir kayıt ekleme, stok güncelleme, stok miktarı değiştirme, yeni takı/ürün ekleme, borç yazma, tahsilat alma, fiyat alarmı kurma veya kasaya para girişi/çıkışı yapmanı istediğinde:
ASLA "işlemi yaptım" veya "kaydettim" deme. Bunun yerine patrona işlemi özetle ve mesajının EN SONUNA aşağıdaki formatta kesin ve geçerli bir JSON içeren :::ACTION_PROPOSAL bloğu ekle:

:::ACTION_PROPOSAL
{
  "actionType": "UPDATE_STOCK_QUANTITY" | "CREATE_PRODUCT_ITEM" | "UPDATE_PRODUCT_ITEM" | "UPDATE_STOCK_THRESHOLD" | "CREATE_PRICE_ALERT" | "ADD_CUSTOMER_DEBT" | "COLLECT_CUSTOMER_PAYMENT" | "ADD_SUPPLIER_DEBT" | "PAY_SUPPLIER" | "CREATE_CUSTOMER" | "ADD_CASH_MOVEMENT",
  "title": "İşlem Başlığı (Örn: Çeyrek Altın Stoğu Güncelleme)",
  "description": "Patronun okuyacağı net işlem açıklaması",
  "summary": {
    "Ürün": "Çeyrek Altın",
    "Yeni Miktar": "20 Adet"
  },
  "payload": {
    // actionType'a göre ilgili parametreler
  }
}
:::

Payload Parametre Kuralları:
- UPDATE_STOCK_QUANTITY: { "product": "ECEYREKTL"|"EYARIMTL"|"ETAMTL"|"EATATL"|"EGREMSETL"|"mil24Ayar"|"mil22Ayar"|"milAdanaBurma"|"milAjda"|"mil14Ayar"|"USD"|"EUR" (veya ürün adı), "amount": number, "operation": "SET"|"ADD"|"SUBTRACT" }
- CREATE_PRODUCT_ITEM: { "category": string, "carat": number, "weight": number, "quantity": number, "customBarcode": string (opsiyonel), "isDiamond": boolean, "diamondCarat": number (opsiyonel) }
- UPDATE_PRODUCT_ITEM: { "barcode": string, "weight": number (opsiyonel), "status": "IN_STOCK"|"SOLD"|"RESERVED" (opsiyonel) }
- UPDATE_STOCK_THRESHOLD: { "product": string, "minThreshold": number }
- CREATE_PRICE_ALERT: { "productCode": "HAS"|"GAUTRY"|"ECEYREKTL"|"USDTRY"|"EURTRY"|"mil22Ayar", "productLabel": string, "targetPrice": number, "priceType": "bid"|"ask", "condition": "GTE"|"LTE", "phone": string }
- ADD_CUSTOMER_DEBT: { "customerName": string, "assetType": "HAS"|"TL"|"USD"|"EUR", "amount": number, "hasEquivalent": number, "description": string }
- COLLECT_CUSTOMER_PAYMENT: { "customerName": string, "assetType": "HAS"|"TL"|"USD"|"EUR", "amount": number, "hasEquivalent": number, "description": string }
- ADD_SUPPLIER_DEBT: { "supplierName": string, "hasAmount": number, "tlAmount": number, "description": string }
- PAY_SUPPLIER: { "supplierName": string, "hasAmount": number, "tlAmount": number, "description": string }
- CREATE_CUSTOMER: { "name": string, "phone": string, "note": string }
- ADD_CASH_MOVEMENT: { "type": "INFLOW"|"OUTFLOW", "category": "CAPITAL"|"EXPENSE"|"DRAWING"|"CORRECTION", "amount": number, "currency": "TL"|"USD"|"EUR"|"HAS", "description": string }
${extraPrompt ? `\nÖZEL MAĞAZA TALİMATLARI:\n${extraPrompt}` : ''}
`;
}

/**
 * Google Gemini API ile içerik üretir.
 * Native system_instruction, temiz contents formatı ve aşırı yük (503/404) durumunda otomatik fallback destekler.
 */
async function callGeminiApi(apiKey: string, model: string, systemPrompt: string, messages: AiChatMessage[]): Promise<string> {
  const targetModel = (model && model.trim()) ? model.trim() : 'gemini-3.5-flash';
  
  // Format clean alternating contents
  const validMessages = messages.filter(m => m.content && m.content.trim().length > 0);
  const contents = validMessages.length > 0 
    ? validMessages.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content.trim() }],
      }))
    : [{ role: 'user', parts: [{ text: 'Selam' }] }];

  const payload = {
    system_instruction: {
      parts: [{ text: systemPrompt }]
    },
    contents,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 2048,
    },
  };

  // Helper to attempt a model call with 30s timeout
  async function attemptCall(modelName: string): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 35000);

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Google API (${response.status}): ${errText}`);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        throw new Error('Gemini API boş yanıt döndürdü.');
      }
      return text;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  try {
    return await attemptCall(targetModel);
  } catch (primaryErr: any) {
    console.warn(`[Gemini Primary Model Error (${targetModel})]:`, primaryErr.message);

    // If primary model failed (e.g. 503 overloaded, 404 not found, or timeout), try fast fallback model
    if (targetModel !== 'gemini-3.5-flash' && targetModel !== 'gemini-3.1-flash-lite') {
      try {
        console.log('[Gemini Auto-Fallback] Retrying with gemini-3.5-flash...');
        return await attemptCall('gemini-3.5-flash');
      } catch (fallbackErr: any) {
        console.log('[Gemini Fallback 2] Retrying with gemini-3.1-flash-lite...');
        return await attemptCall('gemini-3.1-flash-lite');
      }
    }
    throw primaryErr;
  }
}

/**
 * OpenAI (ChatGPT / Reasoning) API ile içerik üretir.
 * Tüm güncel OpenAI modellerini (gpt-4o, gpt-4o-mini, o3-mini, o1, gpt-4.5-preview vb.) ve özel model ID'lerini destekler.
 */
async function callOpenAiApi(apiKey: string, model: string, systemPrompt: string, messages: AiChatMessage[]): Promise<string> {
  const openaiModel = (model && model.trim()) ? model.trim() : 'gpt-4o-mini';
  const url = 'https://api.openai.com/v1/chat/completions';

  const isReasoningModel = openaiModel.startsWith('o1') || openaiModel.startsWith('o3');

  const formattedMessages = [
    { role: isReasoningModel ? 'user' : 'system', content: isReasoningModel ? `[Sistem Talimatı]: ${systemPrompt}` : systemPrompt },
    ...messages,
  ];

  const requestBody: any = {
    model: openaiModel,
    messages: formattedMessages,
  };

  // o1 ve o3-mini modelleri sabit temperature kullanır, parametre gönderilmez
  if (!isReasoningModel) {
    requestBody.temperature = 0.7;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenAI API Hatası (${response.status} - Model: ${openaiModel}): ${errText}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) {
    throw new Error('OpenAI API yanıt üretemedi.');
  }

  return text;
}

/**
 * Ana AI Yanıtlayıcı (Gemini veya OpenAI sağlayıcısını otomatik yönlendirir).
 */
export async function generateAiResponse(
  dealerId: string,
  userMessages: AiChatMessage[]
): Promise<string> {
  const dealer = await prisma.dealer.findUnique({
    where: { id: dealerId },
    select: {
      name: true,
      aiProvider: true,
      geminiApiKey: true,
      openaiApiKey: true,
      aiModel: true,
      aiSystemPromptExtra: true,
    },
  });

  if (!dealer) {
    throw new Error('Bayi bulunamadı.');
  }

  const provider = (dealer.aiProvider || 'GEMINI').toUpperCase();
  const storeContext = await getStoreContext(dealerId);
  const systemPrompt = buildSystemPrompt(storeContext, dealer.aiSystemPromptExtra);

  if (provider === 'OPENAI') {
    const apiKey = dealer.openaiApiKey || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API Anahtarı tanımlanmamış. Lütfen Ayarlar > Yapay Zeka sayfasından API anahtarınızı giriniz.');
    }
    return await callOpenAiApi(apiKey, dealer.aiModel || 'gpt-4o-mini', systemPrompt, userMessages);
  } else {
    // Default: GEMINI
    const apiKey = dealer.geminiApiKey || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('Google Gemini API Anahtarı tanımlanmamış. Lütfen Ayarlar > Yapay Zeka sayfasından ücretsiz Gemini API anahtarınızı giriniz.');
    }
    return await callGeminiApi(apiKey, dealer.aiModel || 'gemini-2.0-flash', systemPrompt, userMessages);
  }
}

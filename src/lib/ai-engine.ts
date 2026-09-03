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
  isOpenSession?: boolean;
  sessionNumber?: string | null;
  suppliersList?: Array<{ name: string; hasBalance: number; tlBalance: number }>;
  livePrices?: Array<{ id: string; label: string; bid: number; ask: number }>;
  sarrafiyeStocks?: Array<{ product: string; label: string; amount: number; minThreshold: number }>;
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
    livePricesList,
    stocksList,
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
      select: { id: true, sessionNumber: true, openingCashTL: true, systemCashTL: true },
    }),
    prisma.livePrice.findMany({
      take: 20,
    }),
    prisma.stock.findMany({
      where: { dealerId },
      select: { product: true, label: true, amount: true, minThreshold: true },
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
    .filter(m => m.type === 'INFLOW' && (m.currency === 'TRY' || m.currency === 'TL'))
    .reduce((acc, m) => acc + m.amount, 0);

  const topDebtorCustomers = customers
    .filter(c => c.hasBalance > 0 || c.tlBalance > 0)
    .sort((a, b) => b.hasBalance - a.hasBalance)
    .slice(0, 5);

  const criticalStockItems = productItems
    .filter(p => (p.quantity || 1) <= 1)
    .slice(0, 5)
    .map(p => ({ barcode: p.barcode, title: p.title || p.category || 'Ürün', quantity: p.quantity || 1 }));

  const suppliersList = suppliers.slice(0, 50).map(s => ({
    name: s.name,
    hasBalance: Number(s.hasBalance.toFixed(2)),
    tlBalance: Number(s.tlBalance.toFixed(2)),
  }));

  const livePrices = livePricesList.map(lp => ({
    id: lp.id,
    label: lp.label,
    bid: lp.bid,
    ask: lp.ask,
  }));

  const sarrafiyeStocks = stocksList.map(s => ({
    product: s.product,
    label: s.label || s.product,
    amount: s.amount,
    minThreshold: s.minThreshold,
  }));

  // Drawer cash is systemCashTL (which already includes openingCashTL); fallback to openingCashTL if null
  const drawerTL = drawerSession
    ? (drawerSession.systemCashTL !== null && drawerSession.systemCashTL !== undefined
        ? drawerSession.systemCashTL
        : (drawerSession.openingCashTL || 0))
    : 0;

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
    drawerTL,
    todaySalesVolumeTL,
    topDebtorCustomers,
    criticalStockItems,
    isOpenSession: Boolean(drawerSession),
    sessionNumber: drawerSession?.sessionNumber || null,
    suppliersList,
    livePrices,
    sarrafiyeStocks,
  };
}

/**
 * AI için sistem bağlam istemini inşa eder.
 */
export function buildSystemPrompt(context: StoreContextData, extraPrompt?: string | null): string {
  const pricesSummary = context.livePrices && context.livePrices.length > 0
    ? context.livePrices.map(p => `${p.label} [${p.id}]: Alış ₺${p.bid.toFixed(2)} | Satış ₺${p.ask.toFixed(2)}`).join(' ; ')
    : `Has Altın: Alış ₺${context.liveHasBid.toFixed(2)} | Satış ₺${context.liveHasAsk.toFixed(2)}`;

  const suppliersSummary = context.suppliersList && context.suppliersList.length > 0
    ? context.suppliersList.map(s => `${s.name} (Has Borcumuz: ${s.hasBalance.toFixed(2)} gr, TL Borcumuz: ₺${s.tlBalance.toLocaleString('tr-TR')})`).join(' ; ')
    : 'Kayıtlı toptancı borcu bulunmuyor';

  const sarrafiyeSummary = context.sarrafiyeStocks && context.sarrafiyeStocks.length > 0
    ? context.sarrafiyeStocks.map(s => `${s.label}: ${s.amount} Adet`).join(' ; ')
    : 'Kayıtlı sarrafiye stoğu bulunmuyor';

  return `Sen KuyumPanel sistemine entegre edilmiş, 40 yıllık Kapalıçarşı tecrübesine ve modern finans/muhasebe uzmanlığına sahip kıdemli bir "Kuyumcu Asistanı ve Patron Danışmanı"sın.

GÖREVİN:
Mağaza sahibine (patrona) mağazasının güncel stokları, altın fiyatları, borç-alacak dengesi, kârlılık oranları ve satış stratejileri hakkında net, profesyonel, güvenilir ve isabetli tavsiyeler vermek.
Ayrıca patronun doğal dilde vereceği komutlarla:
1. Alış ve Satış işlemlerini (nakit, kart, IBAN/havale, fiş yazdır/yazdırma, whatsapp fişi gönder seçenekleriyle) kaydetmek.
2. Toptancı mütabakatlarını ve borç bakiyelerini (has altın veya TL cinsinden) güncellemek.
3. Gün sonu almak ve kasa kapatma (Z-Raporu) işlemlerini gerçekleştirmek.

MAĞAZANIN ANLIK CANLI VERİLERİ (${context.dealerName}):
- Canlı Has Altın Kuru: Alış: ₺${context.liveHasBid.toFixed(2)} | Satış: ₺${context.liveHasAsk.toFixed(2)}
- Piyasa Fiyatları: ${pricesSummary}
- Kasa Oturumu: ${context.isOpenSession ? `AÇIK (${context.sessionNumber || 'Aktif Oturum'})` : 'KAPALI'} | Kasadaki Sistem Nakdi: ₺${Math.round(context.drawerTL).toLocaleString('tr-TR')} | Bugün Giriş Yapan Ciro: ₺${Math.round(context.todaySalesVolumeTL).toLocaleString('tr-TR')}
- Sarrafiye & Kasa Stokları: ${sarrafiyeSummary}
- Vitrin & Mücevherat Durumu: Toplam ${context.totalProductsCount} adet barkodlu ürün, Toplam ${context.totalGoldWeightGr.toFixed(2)} gr altın envanteri, ${context.totalDiamondCount} adet sertifikalı pırlanta.
- Müşteri Veresiye / Alacakları: ${context.customerReceivableHas.toFixed(2)} gr Has Altın + ₺${Math.round(context.customerReceivableTL).toLocaleString('tr-TR')}
- Toptancı / Atölye Borçları & Listesi: Toplam ${context.supplierDebtHas.toFixed(2)} gr Has + ₺${Math.round(context.supplierDebtTL).toLocaleString('tr-TR')} | Toptancılar: ${suppliersSummary}
- En Çok Borcu Olan Müşteriler: ${context.topDebtorCustomers.map(c => `${c.name} (${c.hasBalance.toFixed(2)} gr Has, ₺${Math.round(c.tlBalance)})`).join(', ') || 'Borçlu müşteri yok'}
- Azalan / Kritik Stoklar: ${context.criticalStockItems.map(i => `${i.title} [${i.barcode}]`).join(', ') || 'Tüm stoklar yeterli'}

KURALLAR:
1. Türkçe konuş, saygılı, esnaf samimiyetinde fakat üst düzey finansal ciddiyetle yanıt ver.
2. Patronun sorduğu sorulara mağazanın gerçek rakamlarını kullanarak yanıt üret.
3. Yanıtlarında Markdown başlıkları, madde işaretleri ve altın emojileri (💎, 📊, ⚖️, 💰) kullanarak okunabilirliği artır.
4. Altın borcu olan müşteriler için döviz kuru risklerini ve toptancı ödeme vadelerini hatırlat.

⚡ VERİTABANI İŞLEMLERİ & 2 AŞAMALI TEYİT PROTOKOLÜ:
Patron senden bir alış/satış yapmanı, stok güncellemeni, toptancı mütabakatı düzeltmeni, gün sonu almanı/kasa kapatmanı, borç yazmanı, tahsilat almanı veya fiyat alarmı kurmanı istediğinde:
ASLA "işlemi yaptım" veya "kaydettim" deme. Bunun yerine patrona işlemi net bir şekilde özetle ve mesajının EN SONUNA aşağıdaki formatta kesin ve geçerli bir JSON içeren :::ACTION_PROPOSAL bloğu ekle:

:::ACTION_PROPOSAL
{
  "actionType": "CREATE_TRANSACTION" | "RECONCILE_SUPPLIER" | "CLOSE_CASH_REGISTER" | "UPDATE_STOCK_QUANTITY" | "CREATE_PRODUCT_ITEM" | "UPDATE_PRODUCT_ITEM" | "UPDATE_STOCK_THRESHOLD" | "CREATE_PRICE_ALERT" | "ADD_CUSTOMER_DEBT" | "COLLECT_CUSTOMER_PAYMENT" | "ADD_SUPPLIER_DEBT" | "PAY_SUPPLIER" | "CREATE_CUSTOMER" | "ADD_CASH_MOVEMENT",
  "title": "İşlem Başlığı (Örn: Çeyrek Altın Satışı veya Toptancı Has Borcu Güncelleme)",
  "description": "Patronun okuyacağı net ve saygılı işlem açıklaması",
  "summary": {
    "İşlem": "Satış",
    "Ürün": "Çeyrek Altın",
    "Adet": "3 Adet",
    "Tutar": "₺16.500",
    "Ödeme": "Banka Havalesi / IBAN",
    "Fiş": "Yazdırılmayacak",
    "WhatsApp": "Gönderilecek"
  },
  "payload": {
    // actionType'a göre ilgili parametreler
  }
}
:::

Payload Parametre Kuralları:
1. CREATE_TRANSACTION (Alış ve Satış İşlemleri):
   - payload: {
       "type": "sell" | "buy",
       "product": "ECEYREKTL" | "EYARIMTL" | "ETAMTL" | "EATATL" | "EGREMSETL" | "mil24Ayar" | "mil22Ayar" | "mil14Ayar" | "USD" | "EUR" (veya ürün adı/barkod),
       "barcode": string (eğer belirli bir vitrin ürünü barkodu varsa, örn: "22BLZ00001"),
       "quantity": number,
       "price": number (birim fiyat; patron fiyat verdiyse o, vermediyse canlı satış/alış fiyatı),
       "total": number (toplam tutar = quantity * price),
       "paymentMethod": "CASH" | "CARD" | "BANK" | "HAS" | "DEBT" (Patron "iban", "havale", "eft" dediyse "BANK"; "kart", "pos" dediyse "CARD"; "nakit" dediyse "CASH"),
       "printReceipt": boolean (Patron "fiş yazdır" dediyse true, "fiş yazdırma" dediyse false, belirtmediyse false),
       "sendWhatsAppReceipt": boolean (Patron "fişi whatsapp tan gönder" veya "whatsapp" dediyse true, aksi halde false),
       "customerName": string (opsiyonel),
       "customerPhone": string (opsiyonel),
       "orderNote": string (opsiyonel)
     }

2. RECONCILE_SUPPLIER (Toptancı Mütabakatı & Bakiye Güncelleme):
   - payload: {
       "supplierName": string (Toptancı adı, örn: "Ahlatcı Metal" veya "A toptancısı"),
       "targetHasBalance": number (Yeni hedef Has altın borcu, örn: 100 gram has için 100),
       "previousHasBalance": number (opsiyonel, patronun belirttiği önceki has borcu, örn: 70),
       "targetTlBalance": number (opsiyonel yeni TL borcu),
       "deltaHas": number (opsiyonel, eğer patron "has borcumu 30 gr artır" gibi fark söylediyse),
       "deltaTl": number (opsiyonel),
       "description": string (İşlem açıklaması)
     }

3. CLOSE_CASH_REGISTER (Gün Sonu Z-Raporu & Kasa Kapatma):
   - payload: {
       "countedCashTL": number (Patron sayılan bir nakit tutarı belirtmişse onu yaz, belirtmemişse kasadaki sistem nakdini yaz),
       "notes": string (opsiyonel not)
     }

4. Diğer Eylemler:
   - UPDATE_STOCK_QUANTITY: { "product": string, "amount": number, "operation": "SET"|"ADD"|"SUBTRACT" }
   - CREATE_PRODUCT_ITEM: { "category": string, "carat": number, "weight": number, "quantity": number, "customBarcode": string (opsiyonel), "isDiamond": boolean, "diamondCarat": number (opsiyonel) }
   - UPDATE_PRODUCT_ITEM: { "barcode": string, "weight": number (opsiyonel), "status": "IN_STOCK"|"SOLD"|"RESERVED" (opsiyonel) }
   - UPDATE_STOCK_THRESHOLD: { "product": string, "minThreshold": number }
   - CREATE_PRICE_ALERT: { "productCode": string, "productLabel": string, "targetPrice": number, "priceType": "bid"|"ask", "condition": "GTE"|"LTE", "phone": string }
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

# Technical Specification & Reverse Engineering Analysis: R4, R5, R6

**Document Version:** 1.0  
**Project:** kuyumpanel (Enterprise Kuyumculuk Yönetim Paneli)  
**Author:** Spec Miner Agent (R4-R6)  
**Timestamp:** 2026-08-17T21:54:00+03:00  

---

## 1. Executive Summary & Scope

This specification analysis covers the technical requirements, architecture, API contracts, data models, user interface layouts, constants/enums, and edge cases for **Requirements R4, R5, and R6** of `kuyumpanel`:

1. **R4: Müşteri Bilgilendirme & TV Vitrin Ekranı (Digital Signage)**
   - Fullscreen responsive TV showcase mode (`/showcase`) for store windows and customer-facing TVs.
   - Real-time gold & currency rates synchronization via WebSocket (Altis & Harem) and server API fallback.
   - Promotional announcement banner/carousel and bottom continuous marquee ticker (kayan yazı bandı).
   - High-contrast luxury jewelry design optimized for 1080p / 4K viewing distances.

2. **R5: Mobil, PWA & Çevrimdışı / Kamera Barkod & İletişim**
   - Progressive Web App (PWA) configuration: `manifest.json`, Service Worker, offline caching strategy, mobile install prompts.
   - Integrated camera barcode scanner (`html5-qrcode`) with beep feedback, laser overlay, and haptics.
   - 1-Click WhatsApp communication for transaction receipts, customer account statements (Has/TL/FX balance), and price quotes.

3. **R6: Stok Devir Hızı & Kritik Stok Uyarıları**
   - Critical stock thresholds and automated visual warning system across dashboard, stock lists, and kiosk.
   - Turnover speed & circulation analytics (sales velocity, days-to-stockout, classification: HIZLI / NORMAL / YAVAŞ / HAREKETSİZ).
   - Automated reorder draft (Tedarik & Sipariş Taslağı) with 1-click WhatsApp wholesale ordering and printable purchase requisition.

---

## 2. Codebase Baseline & Existing Infrastructure

| Component / File | Current Status | Findings & Integration Plan for R4/R5/R6 |
|---|---|---|
| `prisma/schema.prisma` | Implemented | `Stock` model currently lacks `minThreshold`. Needs `minThreshold Float @default(5)` for configurable per-dealer critical levels. `Transaction` table has `createdAt`, `type`, `quantity`, `productCode` which provides data for 30/90-day turnover analytics. |
| `src/constants/prices.ts` | Implemented | Contains `ALTIS_WS_URL`, `HAREM_WS_URL`, codes (`GAUTRY`, `USDTRY`, `EURTRY`, `ECEYREKTL`, etc.), milyem defaults. |
| `src/constants/routes.ts` | Implemented | Needs addition of `ROUTES.SHOWCASE = '/showcase'`, `ROUTES.API_STOCKS_ANALYTICS = '/api/stocks/analytics'`, `ROUTES.API_STOCKS_REORDER = '/api/stocks/reorder'`. |
| `src/components/CameraScannerModal.tsx` | Implemented | Fully functioning `html5-qrcode` modal with camera selection, laser animation, and audio beep. Used in `price-check` and `transactions`. Needs export/integration in `stocks` and mobile toolbar. |
| `src/app/manifest.ts` / `manifest.json` | Missing | No PWA manifest or service worker currently exists in `public/` or `src/app/`. |
| `/showcase` (TV Display) | Missing | No dedicated digital signage page currently exists in `src/app/`. |
| WhatsApp Integration | Missing | No automated WhatsApp URL generators or formatters exist. |
| Stock Turnover & Reorder | Missing | Stock list only supports basic amount editing; no turnover velocity, critical threshold highlight, or reorder draft. |

---

## 3. Requirement R4: TV Vitrin & Digital Signage Mode

### 3.1 Architecture & UX Design
- **Route:** `/showcase` (Standalone page, isolated from admin layout without sidebar).
- **Display Resolution Target:** 1920x1080 (Full HD) up to 3840x2160 (4K), touch/remote/mouse compatible.
- **Visual Identity:** Luxury jewelry dark aesthetic (`bg-gray-950`), glowing gold gradients (`from-yellow-400 to-amber-500`), large high-contrast monospace typography.
- **Key Display Modules:**
  1. **Top Header:** Store Brand / Logo, Live Digital Clock with seconds (`HH:mm:ss`), Date in Turkish, Live Connection Indicator (Pulse Dot: Yeşil "Canlı Piyasa"). Fullscreen Toggle button (`F11` or on-screen icon that auto-hides after 5s of inactivity).
  2. **Hero Section (Left/Center Top):** Has Altın (24K Gram) Alış ve Satış Fiyatı (büyük gösterge).
  3. **Döviz Kurları (Left/Center):** USD/TRY ve EUR/TRY Canlı Alış / Satış.
  4. **Sarrafiye & Ziynet Altınları (Center Grid):** Çeyrek Altın, Yarım Altın, Tam Altın, Ata Altını, Gremse.
  5. **İşlenmiş & Bilezik Fiyatları (Right Grid):** 22 Ayar Gram Altın, Adana Burma Bilezik, Ajda Bilezik, 14 Ayar Gram.
  6. **Özel Duyuru / Kampanya Bandı (Top or Middle Banner):** Customizable store slogans (e.g. *"Düğün setlerinde özel işçilik indirimleri"*, *"Tüm kredi kartlarına taksit imkanı"*).
  7. **Alt Kayan Yazı Bandı (Bottom Marquee Ticker):** Smooth continuous marquee displaying real-time rates and dealer notice.

### 3.2 Live Synchronization Protocol
- Dual-channel real-time feed:
  1. Primary: Direct Client-Side WebSocket to `HAREM_WS_URL` and `ALTIS_WS_URL`.
  2. Failover: Server Proxy polling `/api/prices/live` and `/api/prices/altis` every 2.5 seconds.
- Real-time Price Offset Calculation:
  - Fetches `PriceSettings` to apply per-dealer spread offsets (`hasBid`, `hasAsk`, etc.) and custom milyem rates (`mil22Ayar`, `milAdanaBurma`, `milAjda`, `mil14Ayar`).
- Price Direction Flashing:
  - Up tick: `bg-emerald-500/20 text-emerald-400 border-emerald-500/40` + Green Arrow.
  - Down tick: `bg-red-500/20 text-red-400 border-red-500/40` + Red Arrow.

---

## 4. Requirement R5: Mobil, PWA, Kamera Barkod & WhatsApp

### 4.1 PWA (Progressive Web Application) Specification
- **Manifest Configuration (`src/app/manifest.ts` or `public/manifest.json`):**
  ```json
  {
    "name": "KuyumPanel — Kuyumculuk Yönetim Sistemi",
    "short_name": "KuyumPanel",
    "description": "Enterprise Kuyumculuk & Sarrafiye Yönetim Paneli",
    "start_url": "/",
    "display": "standalone",
    "background_color": "#030712",
    "theme_color": "#eab308",
    "orientation": "any",
    "icons": [
      {
        "src": "/icons/icon-192x192.png",
        "sizes": "192x192",
        "type": "image/png",
        "purpose": "any maskable"
      },
      {
        "src": "/icons/icon-512x512.png",
        "sizes": "512x512",
        "type": "image/png",
        "purpose": "any maskable"
      }
    ]
  }
  ```
- **Service Worker (`public/sw.js`):**
  - Caches app shell, CSS, static SVG icons, web fonts.
  - Intercepts offline requests and provides graceful offline fallback screen.
  - Network-first strategy for live API routes (`/api/prices/*`, `/api/transactions`, `/api/stocks`).
- **Mobile Meta Tags (`src/app/layout.tsx`):**
  - `viewport`: `width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no`
  - `themeColor`: `#030712`
  - `appleWebApp`: `{ capable: true, statusBarStyle: 'black-translucent', title: 'KuyumPanel' }`

### 4.2 Camera Barcode Scanner Optimization
- Uses existing `src/components/CameraScannerModal.tsx` (`html5-qrcode`).
- Supports CODE_128, EAN_13, QR_CODE.
- Audio beep generator via Web Audio API (`AudioContext` oscillator at 1200 Hz).
- Integration points:
  1. `/transactions`: Scan jewelry tag -> instant basket addition.
  2. `/price-check`: Kiosk barcode scanner -> instant live quote.
  3. `/stocks`: Barcode lookup and stock adjustment modal.

### 4.3 1-Click WhatsApp Sharing Infrastructure
- **Utility:** `src/lib/whatsapp.ts`
- **Generators:**
  1. `generateWhatsAppReceipt(txData)`: Formatted sales receipt sent to customer mobile with items, gram weight, total TL, payment breakdown, store info.
  2. `generateWhatsAppStatement(statementData)`: Detailed account statement with Has/TL balance, gold debts, and recent transactions.
  3. `generateWhatsAppQuote(quoteData)`: Live price quote for customer inquiry on specific jewelry piece.
  4. `generateWhatsAppWholesaleOrder(orderData)`: Wholesale purchase requisition sent to supplier/workshop.
- **URL Formatter:**
  `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}` (or `https://wa.me/...`).

---

## 5. Requirement R6: Stok Devir Hızı & Kritik Stok Uyarıları

### 5.1 Critical Stock Warning Engine
- **Threshold Rule:**
  - When `Stock.amount <= Stock.minThreshold`:
    * State `CRITICAL` (Kritik): Glowing Red Alert (`bg-red-500/20 text-red-400 border-red-500/40`).
  - When `Stock.amount <= Stock.minThreshold * 1.5`:
    * State `WARNING` (Uyarı): Yellow Alert (`bg-yellow-500/20 text-yellow-400 border-yellow-500/40`).
  - When `Stock.amount > Stock.minThreshold * 1.5`:
    * State `SAFE` (Güvenli): Green Badge (`bg-emerald-500/10 text-emerald-400`).
- **Dashboard & Sidebar Alerts:**
  - Critical stock badge counter on Dashboard and Sidebar ("3 Kritik Stok").
  - Dedicated "Kritik Stok Bildirimleri" widget on Dashboard with 1-click reorder trigger.

### 5.2 Stock Turnover & Circulation Mathematics
- **Metrics Formulations:**
  1. **Total Period Sales ($Q_{sold}$):**
     $$\sum \text{Transaction.quantity} \quad \text{where } \text{type} = \text{'sell'} \text{ within period } P \text{ (e.g. 30 days)}$$
  2. **Daily Sales Velocity ($V_{daily}$):**
     $$V_{daily} = \frac{Q_{sold}}{P_{days}}$$
  3. **Turnover Rate ($T_{rate}$):**
     $$T_{rate} = \frac{Q_{sold}}{\max(1, \text{CurrentStock})}$$
  4. **Estimated Days to Stockout ($D_{out}$):**
     $$D_{out} = \begin{cases} \frac{\text{CurrentStock}}{V_{daily}} & \text{if } V_{daily} > 0 \\ \infty & \text{if } V_{daily} = 0 \end{cases}$$
  5. **Turnover Status Classification:**
     - `HIZLI` (Fast Mover): $V_{daily} \ge 1.0$ (or sold $> 30$ units in 30 days).
     - `NORMAL` (Moderate): $0.2 \le V_{daily} < 1.0$.
     - `YAVAS` (Slow Mover): $0 < V_{daily} < 0.2$.
     - `HAREKETSIZ` (Dead / Stagnant Stock): $V_{daily} = 0$ over 30+ days.

### 5.3 Automated Reorder Draft (Tedarik & Sipariş Taslağı)
- **Calculation Logic:**
  - $\text{Deficit} = \max(0, \text{minThreshold} - \text{CurrentStock})$
  - $\text{SafetyStock} = \lceil V_{daily} \times \text{LeadTimeDays} \rceil \quad (\text{Default LeadTime} = 7 \text{ days})$
  - $\text{SuggestedReorderQty} = \text{Deficit} + \text{SafetyStock}$
- **Reorder List Actions:**
  - Grouping by Supplier (Toptancı) or Product Type (Sarrafiye / Döviz / Takı).
  - 1-Click "WhatsApp Sipariş Metni Oluştur".
  - 1-Click "Sipariş Listesi Yazdır / PDF".
  - 1-Click "Toptancı Mal Girişine Aktar".

---

## 6. Features Discovered & Specification Matrix

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|---|---|---|---|---|---|---|
| 1 | R4: Signage | Fullscreen TV Showcase (`/showcase`) | Standalone full-screen display for showcase TVs with live gold/FX rates, clock, and branding | Optional `?dealerId=...` | Full-screen HTML/CSS UI with live charts & tickers | Fallback to cached prices on connection loss | ORIGINAL_REQUEST.md § R4 |
| 2 | R4: Signage | Real-Time Ticker (Kayan Bant) | Continuous marquee at bottom of TV screen displaying exchange rates & announcements | Rate stream, announcement text | Horizontally scrolling CSS ticker | Displays default rates if stream empty | ORIGINAL_REQUEST.md § R4 |
| 3 | R4: Signage | Promotional Banner / Carousel | Display customizable promotional slogans and jewelry campaign announcements | Slogan list / settings | Auto-advancing banner or static text | Fallback to default store greeting | ORIGINAL_REQUEST.md § R4 |
| 4 | R4: Signage | Fullscreen Toggle & Auto-hide | F11 / click button to enter fullscreen, controls auto-hide after 5s | Mouse/touch event | `document.documentElement.requestFullscreen()` | Logs warning if browser blocks fullscreen | `src/app/(panel)/prices/page.tsx` |
| 5 | R5: Mobile/PWA | PWA Manifest & Icons | Allows installing KuyumPanel as standalone app on iPad/Android/iOS/Desktop | Manifest JSON, icon assets (192, 512) | Standalone window & home screen icon | Ignores if unsupported by browser | ORIGINAL_REQUEST.md § R5 |
| 6 | R5: Mobile/PWA | Service Worker Offline Cache | Caches static assets & provides offline availability for critical views | Fetch events | Cached response or offline UI | Network fallback | ORIGINAL_REQUEST.md § R5 |
| 7 | R5: Camera | Universal Camera Barcode Scanner | Multi-format barcode/QR scanner with beep sound and laser viewfinder | Device camera stream | Decoded barcode string | Error banner if camera permission denied | `CameraScannerModal.tsx` |
| 8 | R5: WhatsApp | 1-Click Transaction Receipt | Creates formatted WhatsApp receipt with line items and payment total | Transaction details, customer phone | WhatsApp deep link / window open | Validates phone or opens blank chat | ORIGINAL_REQUEST.md § R5 |
| 9 | R5: WhatsApp | 1-Click Account Statement | Creates formatted WhatsApp customer statement with Has/TL balance | Customer statement data | WhatsApp deep link / window open | Validates phone or opens blank chat | ORIGINAL_REQUEST.md § R5 |
| 10 | R5: WhatsApp | 1-Click Price Check Quote | Shares instant gold/jewelry price calculation with customer via WhatsApp | Product details, live price quote | WhatsApp deep link / window open | Validates phone or opens blank chat | `PriceCheckClient.tsx` |
| 11 | R6: Analytics | Critical Stock Thresholds | Configurable minimum stock levels per product and visual color coding | `minThreshold` values in DB | Color badges (Red/Yellow/Green) | Defaults to 0/5 if unset | ORIGINAL_REQUEST.md § R6 |
| 12 | R6: Analytics | Stock Turnover & Sales Velocity | Calculates 7/30/90-day sales speed, turnover rate, and days to stockout | Transaction history (`sell`) | Velocity metrics & status badges | Handles zero sales / zero stock safely | ORIGINAL_REQUEST.md § R6 |
| 13 | R6: Analytics | Critical Stock Dashboard Widget | High-priority dashboard banner highlighting out-of-stock and critical items | Stock levels vs thresholds | Count badge & urgent item list | Hidden when all stocks are healthy | `DashboardClient.tsx` |
| 14 | R6: Analytics | Automated Reorder Draft | Generates suggested wholesale purchase order based on deficits & sales velocity | Stock deficit & velocity formula | Order table with Has/TL cost estimate | Generates 0 order if stock sufficient | ORIGINAL_REQUEST.md § R6 |
| 15 | R6: Analytics | 1-Click Wholesale Reorder Order | Sends formatted replenishment order list to supplier via WhatsApp / Print | Draft reorder items, supplier phone | WhatsApp deep link / printable window | Alerts if supplier phone missing | ORIGINAL_REQUEST.md § R6 |

---

## 7. Edge Cases & Resilience Behaviors

| # | Feature | Input / Condition | Observed / Required Behavior |
|---|---|---|---|
| 1 | R4 TV Showcase | WebSocket disconnects during store hours | Display must NOT crash or show error dialog; keep last known prices, show subtle reconnecting indicator in header, poll `/api/prices/live` fallback. |
| 2 | R4 TV Showcase | TV screen left on 24/7 without refresh | Memory leaks prevented by cleaning up event listeners, refs, and socket subscriptions. Keep animation loops lightweight. |
| 3 | R4 TV Showcase | TV browser does not support fullscreen API | Gracefully maximize container within viewport without throwing unhandled exceptions. |
| 4 | R5 PWA / Camera | User denies camera permissions on mobile | Display descriptive Turkish instruction message: "Kamera erişim izni verilemedi. Lütfen tarayıcı ayarlarından kameraya izin verin" with retry button. |
| 5 | R5 WhatsApp | Customer phone has formatting (e.g. `0 (532) 123 45 67` or `+90532...`) | Sanitizer function strips non-digits, strips leading `0`, prepends country code `90` -> `905321234567`. |
| 6 | R5 WhatsApp | Customer has no phone number recorded | WhatsApp button opens WhatsApp Web with prefilled message allowing cashier to pick recipient manually. |
| 7 | R6 Turnover | Product has 0 stock and 0 sales in period | Avoid Division by Zero: turnover rate returns 0.00, velocity returns 0.00, status marked as `HAREKETSIZ`. |
| 8 | R6 Reorder | Stock exceeds threshold (no deficit) | Suggested reorder quantity evaluates to 0 and item is excluded from urgent reorder table. |
| 9 | R6 Reorder | Multi-dealer isolation | Turnover speed and critical alerts must strictly filter by current dealer's `dealerId`. |

---

## 8. Magic Numbers & Magic Strings (Rule Compliance)

To satisfy the system rule (`magic number / string kontrolü: önemli değerler sabit veya enum olarak tanımlanmalı`), all constants, routes, enums, and message strings must be centrally located:

### 8.1 Routes (`src/constants/routes.ts`)
```typescript
export const ROUTES = {
  // Existing routes...
  SHOWCASE: '/showcase',
  API_STOCKS_ANALYTICS: '/api/stocks/analytics',
  API_STOCKS_REORDER: '/api/stocks/reorder',
} as const;
```

### 8.2 Stock & Turnover Constants (`src/constants/stocks.ts`)
```typescript
export const STOCK_THRESHOLDS = {
  DEFAULT_MIN_SARRAFIYE: 5,
  DEFAULT_MIN_DOVIZ: 1000,
  DEFAULT_MIN_GRAM: 10,
  CRITICAL_MULTIPLIER: 1.0,
  WARNING_MULTIPLIER: 1.5,
} as const;

export const TURNOVER_STATUS = {
  FAST: 'HIZLI',
  NORMAL: 'NORMAL',
  SLOW: 'YAVAS',
  STAGNANT: 'HAREKETSIZ',
} as const;

export type TurnoverStatus = typeof TURNOVER_STATUS[keyof typeof TURNOVER_STATUS];

export const TURNOVER_PERIODS = {
  DAYS_7: 7,
  DAYS_30: 30,
  DAYS_90: 90,
} as const;
```

### 8.3 Signage & Showcase Constants (`src/constants/showcase.ts`)
```typescript
export const SHOWCASE_CONFIG = {
  PRICE_REFRESH_INTERVAL_MS: 2500,
  TICKER_SPEED_SECONDS: 35,
  AUTO_HIDE_CONTROLS_DELAY_MS: 5000,
  DEFAULT_ANNOUNCEMENT: 'Hoş Geldiniz • Canlı Altın ve Döviz Kurları • Kalite ve Güvenin Adresi',
} as const;
```

### 8.4 Turkish UI Messages (`src/constants/messages.ts`)
```typescript
export const MESSAGES = {
  // Showcase
  SHOWCASE_TITLE: 'TV Vitrin Ekranı',
  SHOWCASE_LIVE_MARKET: 'Canlı Piyasa',
  SHOWCASE_FULLSCREEN: 'Tam Ekran',
  SHOWCASE_EXIT_FULLSCREEN: 'Tam Ekrandan Çık',
  
  // WhatsApp
  WA_SEND_RECEIPT: 'WhatsApp Fiş Gönder',
  WA_SEND_STATEMENT: 'WhatsApp Ekstre Gönder',
  WA_SEND_ORDER: 'WhatsApp Sipariş İlet',
  
  // Stock Analytics & Reorder
  TURNOVER_TITLE: 'Stok Devir & Sirkülasyon Analizi',
  TURNOVER_VELOCITY: 'Günlük Satış Hızı',
  TURNOVER_DAYS_LEFT: 'Tahmini Tükenme',
  REORDER_TITLE: 'Tedarik & Sipariş Taslağı',
  REORDER_SUGGESTED: 'Önerilen Sipariş',
  REORDER_TOTAL_ESTIMATE: 'Tahmini Has Maliyeti',
  STOCK_CRITICAL_ALERT: 'Kritik Stok Uyarısı',
} as const;
```

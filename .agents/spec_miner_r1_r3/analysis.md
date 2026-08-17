# KuyumPanel Specification & Architecture Mining Report (R1, R2, R3)

**Author:** Spec Miner Subagent  
**Working Directory:** `c:\xampp\htdocs\kuyumpanel\.agents\spec_miner_r1_r3`  
**Date:** 2026-08-17  
**Scope:** 
- **R1:** Has / Altın Cinsinden Cari Hesap & Veresiye Takibi (Gram Has & TL dual balances, rate recording, ledger/statement history, accurate valuation).
- **R2:** Gün Sonu & Kasa Kapatma (Z-Raporu) (Consolidated cash/POS/scrap/has movements, opening/closing, reconciliation, Z-Report print/view).
- **R3:** Termal Kuyumcu Barkod & Kelebek Etiket Yazıcı Desteği (Jewelry butterfly/thermal label format, preview, browser printing / ZPL/HTML-canvas).

---

## 1. Executive Summary & Findings Matrix

| Requirement | Current Status in Codebase | Key Existing Files | Missing Capabilities / Gaps |
|---|---|---|---|
| **R1: Has / Altın Cari & Veresiye** | **Partially Implemented** (Basic Customer/Supplier & Transactions exist) | `prisma/schema.prisma:175-247`<br>`src/app/(panel)/customers/CustomersClient.tsx`<br>`src/app/api/customers/route.ts`<br>`src/app/api/customer-transactions/route.ts`<br>`src/app/(panel)/suppliers/page.tsx`<br>`src/app/api/suppliers/route.ts`<br>`src/app/api/supplier-transactions/route.ts` | • Hardcoded magic numbers for gold karat/ziynet conversions (`1.605`, `0.916`, etc.) in `customer-transactions/route.ts:89-102`.<br>• `Customer` lacks explicit cached `hasBalance` and `tlBalance` scalar fields in DB.<br>• Customer Statement lacks running balance ledger column.<br>• Ziynet quantity balances (Adet bazlı Ziynet) are not broken down in summary.<br>• No WhatsApp statement export format. |
| **R2: Gün Sonu & Kasa Kapatma (Z-Raporu)** | **Missing / Placeholder** (POS has payment method UI, but no Z-Report model or logic) | `prisma/schema.prisma:86-98` (`Transaction`)<br>`src/app/(panel)/transactions/page.tsx:647-651`<br>`src/app/api/transactions/route.ts`<br>`src/app/(panel)/DashboardClient.tsx` | • No `CashRegisterSession` / `ZReport` model or schema in Prisma.<br>• `Transaction` model does not persist `paymentMethod` (`cash`, `card`, `has`, `scrap`), `cardFeePercent`, or `customerId`.<br>• No consolidation endpoint aggregating POS sales, customer collections/debts, supplier payments, and scrap buys.<br>• No opening/closing cash entry, physical count (fiili sayım) input, or discrepancy calculation.<br>• No thermal Z-report printable slip or report screen. |
| **R3: Termal Kuyumcu Barkod & Kelebek Etiket** | **Basic Prototype Only** (Simple 50x12mm single popup using CDN JsBarcode) | `src/app/(panel)/stocks/page.tsx:629-742`<br>`src/app/api/products/route.ts:24-56`<br>`prisma/schema.prisma:121-146` (`ProductItem`) | • No standard jewelry butterfly (ipli / kelebek) dual-wing layout (left wing: carat/weight/type, bridge: blank for thread, right wing: barcode/price).<br>• External CDN dependency for JsBarcode instead of embedded zero-latency Canvas/SVG.<br>• No batch/multi-product label printing mode.<br>• No raw ZPL II code generation for industrial thermal printers (Zebra, TSC, Godex).<br>• No visual interactive label designer or print preview modal. |

---

## 2. Discovered Features & Detailed Specification Probing

### Table: Discovered Features
| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|---|---|---|---|---|---|---|
| 1 | R1: Cari | Has & TL Dual Balance | Independent tracking of Gram Has Gold and Fiat TL balances for customers and suppliers | Amount, Asset Type, Has Rate / Unit Price | Updated `hasBalance`, `tlBalance`, and Live Valuation in TL | Rejects <= 0 amounts, missing customer/supplier ID | `prisma/schema.prisma:181-247`, `src/app/api/customers/route.ts:33-72` |
| 2 | R1: Cari | Multi-Asset Transaction Recording | Support for TL, USD, EUR, HAS, 22K, 14K, CEYREK, YARIM, TAM, ATA with exact conversion ratios | Customer ID, Type (`BORC`/`TAHSILAT`), Asset Type, Amount, Unit Price | `CustomerTransaction` record with `hasEquivalent` snapshot | Returns 400 for invalid asset or negative amount | `src/app/api/customer-transactions/route.ts:58-103` |
| 3 | R1: Cari | Supplier Automatic Debt on Stock Entry | If `inShowcase=false` during jewellery entry, automatically creates `SupplierTransaction` (PURCHASE) with entry milyem (`costMilyem + laborMilyem`) * weight | `supplierName`, `weight`, `costMilyem`, `laborMilyem`, `quantity`, `inShowcase` | Increment in `Supplier.hasBalance` and ledger entry | Creates supplier if not existing, skips if inShowcase is true | `src/app/api/products/route.ts:220-279` |
| 4 | R1: Cari | Running Balance Customer/Supplier Ledger | Chronological transaction statement with progressive balance calculation (`runningHas`, `runningTl`) | `customerId` or `supplierId`, Date range | Paginated/full transaction history with running balances | Returns 404 if entity not found | `src/app/(panel)/suppliers/page.tsx:344-370` |
| 5 | R2: Kasa | Multi-Channel Cash Consolidation | Consolidates all daily inflows and outflows across POS sales, customer veresiye collections, supplier payments, and scrap gold buys | Session date or Session ID, Dealer ID | Breakdown of Cash (TL, USD, EUR), POS/Card, Has Altın, Hurda Alım | Returns empty breakdown if no transactions | `src/app/(panel)/transactions/page.tsx:852-1033` |
| 6 | R2: Kasa | Kasa Açılış & Kapanış (Session Management) | Opening cash register with initial float (devir kasası), closing with physical count (fiili sayım) and discrepancy check (kasa farkı) | Opening amounts (TL, USD, EUR, Has), Closing counted amounts, Cashier name | `ZReportSession` entity, discrepancy amounts, closing status | Prevents opening multiple active sessions simultaneously | Authoritative Request R2 |
| 7 | R2: Kasa | Z-Raporu Slip & A4 Print / Export | Formatted thermal receipt (58mm/80mm) and A4 document summarizing daily turnover, tax/VAT-free gold totals, payment splits, and cashier signature areas | Z-Report ID / Session ID | Print-ready HTML document / window trigger | Returns 404 if Z-Report not found | Authoritative Request R2 |
| 8 | R3: Barkod | Kuyumcu Kelebek (Butterfly) Dual-Wing Label | Industry-standard two-wing format with center cutout/tail space for thread/string | Product item data (carat, weight, title, selling milyem, barcode, price) | 2D HTML-Canvas / SVG vector dual-wing layout | Fallback to default dimensions if invalid preset | `src/app/(panel)/stocks/page.tsx:630-740` & R3 Spec |
| 9 | R3: Barkod | ZPL II (Zebra Programming Language) Output | Raw ZPL code for direct network or raw serial/USB thermal printing | Label dimensions (DPI, width, height), Product metadata, Barcode | ZPL command string (`^XA...^XZ`) | Validates barcode string characters | Authoritative Request R3 |
| 10 | R3: Barkod | Batch / Multi-Select Label Printing | Ability to select multiple products from stock inventory or batch-print labels after inventory intake | Array of Product IDs and print counts | Multi-page print stream / combined ZPL stream | Rejects empty selection list | `src/app/(panel)/stocks/page.tsx:850-1130` |

---

## 3. Deep-Dive Codebase Findings & Observations

### 3.1. Requirement 1 (Has & Altın Cari Hesap / Veresiye)
1. **Database Schema (`prisma/schema.prisma`)**:
   - `Customer` (`lines 218-231`): Missing `hasBalance` and `tlBalance` scalar fields. Each customer list fetch queries all related `CustomerTransaction` items and computes sums dynamically.
   - `CustomerTransaction` (`lines 234-247`):
     ```prisma
     model CustomerTransaction {
       id            String   @id @default(cuid())
       customerId    String
       customer      Customer @relation(fields: [customerId], references: [id], onDelete: Cascade)
       dealerId      String
       type          String   // "BORC" | "TAHSILAT"
       assetType     String   // "TL" | "USD" | "EUR" | "HAS" | "CEYREK" | "22K" | "14K" vb.
       amount        Float    
       hasEquivalent Float    @default(0) 
       unitPrice     Float?   
       description   String?  
       employeeName  String?  
       createdAt     DateTime @default(now())
     }
     ```
   - `Supplier` (`lines 175-188`) & `SupplierTransaction` (`lines 190-203`):
     `Supplier` has stored `hasBalance` and `tlBalance`. `SupplierTransaction` stores `hasAmount`, `tlAmount`, `unitPrice`, `documentNo`, `type` (`PURCHASE`, `HAS_PAYMENT`, `TL_PAYMENT`, `SETTLEMENT`).
2. **Business Logic & Conversion Ratio Analysis (`src/app/api/customer-transactions/route.ts:79-103`)**:
   ```ts
   // Observed hardcoded conversion logic:
   if (assetType === 'TL' && numPrice > 0) {
     calculatedHasEq = numAmount / numPrice;
   } else if (assetType === 'HAS') {
     calculatedHasEq = numAmount;
   } else if (assetType === '22K' || assetType === '22_AYAR') {
     calculatedHasEq = numAmount * 0.916;
   } else if (assetType === 'CEYREK') {
     calculatedHasEq = numAmount * 1.605;
   } else if (assetType === 'YARIM') {
     calculatedHasEq = numAmount * 3.21;
   } else if (assetType === 'TAM') {
     calculatedHasEq = numAmount * 6.42;
   } else if (assetType === 'ATA') {
     calculatedHasEq = numAmount * 6.60; // Note: In prices.ts, eataWeight is 7.008 or Ata milyem is 0.916 -> 7.216*0.916=6.608
   } else if (assetType === '14K' || assetType === '14_AYAR') {
     calculatedHasEq = numAmount * 0.585;
   }
   ```
   **Violation of Magic Number / String Rule**: All conversion factors and string identifiers are inline literals. They must be moved to constants in `src/constants/cari.ts` and `src/constants/gold.ts`.
3. **UI Assessment (`src/app/(panel)/customers/CustomersClient.tsx`)**:
   - `CustomersClient.tsx` has full CRUD for Customers, Borç/Tahsilat creation, live valuation against `GAUTRY`, `USDTRY`, `EURTRY`.
   - Missing: (1) Running balance ledger column in modal, (2) Ziynet piece count aggregation, (3) WhatsApp sharing template formatter.

---

### 3.2. Requirement 2 (Gün Sonu & Kasa Kapatma / Z-Raporu)
1. **Current Transaction Persistence (`src/app/api/transactions/route.ts:86-155`)**:
   ```prisma
   model Transaction {
     id           String   @id @default(cuid())
     dealerId     String
     type         String   // "buy" | "sell"
     productType  String   // "sarrafiye" | "döviz"
     productCode  String   
     quantity     Float    
     price        Float    
     total        Float    
     employeeName String?  
     createdAt    DateTime @default(now())
   }
   ```
   - **Critical Gap**: When POS transactions are completed in `transactions/page.tsx:904-947`, the user can select `paymentMethod` (`'cash' | 'bank' | 'card'`), input `cardFeePercent`, and enter `orderNote`. However, `Transaction` model and `POST /api/transactions` completely discard `paymentMethod`, `cardFeePercent`, and `orderNote`!
2. **Absence of Kasa / Z-Report Infrastructure**:
   - There is no model for tracking daily cash shifts/sessions or Z-Reports.
   - The button `<button className="...">Kasa</button>` on line 648 of `src/app/(panel)/transactions/page.tsx` is an inert button with no onClick handler.
   - Need dedicated data models:
     - `CashRegisterSession` (or `ZReport`): Represents a continuous register shift/day with opening balance, closing balance, counted physical cash, discrepancy, and status.
     - `CashMovement` (or dynamic calculation across `Transaction`, `CustomerTransaction`, `SupplierTransaction`, and manual cash in/out entries like expense/avans).

---

### 3.3. Requirement 3 (Termal Kuyumcu Barkod & Kelebek Etiket)
1. **Existing Label Print (`src/app/(panel)/stocks/page.tsx:629-742`)**:
   - Generates a single label popup:
     ```html
     @page { size: 50mm 12mm; margin: 0; }
     ...
     <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
     ```
   - **Gaps**:
     - Standard Turkish jewelry tag is a **Kelebek (Butterfly)** label with a bridge for string attachment. It requires:
       - Dimensions: e.g. 74mm x 12mm or 80mm x 13mm or 50mm x 12mm.
       - Wing 1 (Left): Shop Name, Carat (`14K`), Weight (`3.45 gr`), Category/Type.
       - Bridge (Center): 15-20mm blank space (cutout for string).
       - Wing 2 (Right): Barcode (Code 128) + Barcode text (`14KP00001`) + Live Sale Price or Encrypted Cost Code (e.g. Milyem tag).
     - External CDN dependency creates failure risk in offline / local intranet setups. A self-contained SVG or HTML5 Canvas barcode generator is needed.
     - ZPL II generator is missing for high-speed industrial label printers.

---

## 4. Proposed Data Architecture & Schema Enhancements

### 4.1. Prisma Schema Additions (`prisma/schema.prisma`)

```prisma
// ── 1. Cari / Customer Model Updates ──
model Customer {
  id           String                @id @default(cuid())
  name         String
  phone        String?
  email        String?
  tcNo         String?
  address      String?
  note         String?
  hasBalance   Float                 @default(0) // gr Has cinsinden borç (+) veya alacak (-) bakiyesi
  tlBalance    Float                 @default(0) // TL cinsinden borç (+) veya alacak (-) bakiyesi
  dealerId     String
  dealer       Dealer                @relation(fields: [dealerId], references: [id], onDelete: Cascade)
  transactions CustomerTransaction[]
  createdAt    DateTime              @default(now())
  updatedAt    DateTime              @updatedAt @default(now())
}

// ── 2. Enhanced Transaction Model (Payment Method & Scrap tracking) ──
model Transaction {
  id             String   @id @default(cuid())
  dealerId       String
  dealer         Dealer   @relation(fields: [dealerId], references: [id], onDelete: Cascade)
  type           String   // "buy" | "sell"
  productType    String   // "sarrafiye" | "döviz" | "hurda" | "taki"
  productCode    String   // Örn: "USD", "ECEYREKTL", "HURDA_22K", "14KP00001"
  quantity       Float    // Miktar / Ağırlık
  price          Float    // Birim fiyat (TL)
  total          Float    // Toplam tutar (TL)
  paymentMethod  String   @default("CASH") // "CASH" | "CARD" | "BANK" | "HAS" | "DEBT"
  cardFeePercent Float?   // Kredi kartı komisyon oranı (%)
  hasEquivalent  Float?   @default(0) // Has altın karşılığı (gr)
  orderNote      String?  
  customerId     String?  // İsteğe bağlı müşteri ilişkisi
  employeeName   String?  
  sessionId      String?  // İlgili Kasa / Z-Raporu oturumu
  createdAt      DateTime @default(now())
}

// ── 3. Gün Sonu & Kasa Kapatma (Z-Raporu) Modelleri ──
model CashRegisterSession {
  id              String         @id @default(cuid())
  dealerId        String
  dealer          Dealer         @relation(fields: [dealerId], references: [id], onDelete: Cascade)
  reportNo        String         // Örn: "Z-2026-0001"
  status          String         @default("OPEN") // "OPEN" | "CLOSED"
  openedBy        String         // Açan personel adı
  closedBy        String?        // Kapatan personel adı
  openedAt        DateTime       @default(now())
  closedAt        DateTime?      
  
  // Devir / Açılış Tutarları
  openingCashTL   Float          @default(0)
  openingCashUSD  Float          @default(0)
  openingCashEUR  Float          @default(0)
  openingHasGram  Float          @default(0)
  
  // Kapanış Hesaplanan / Sistem Tutarları
  systemCashTL    Float          @default(0)
  systemCashUSD   Float          @default(0)
  systemCashEUR   Float          @default(0)
  systemHasGram   Float          @default(0)
  systemCardTL    Float          @default(0)
  
  // Fiili Sayım Tutarları (Physical Cash Count)
  countedCashTL   Float?         
  countedCashUSD  Float?         
  countedCashEUR  Float?         
  countedHasGram  Float?         
  
  // Mutabakat Farkları (Counted - System)
  diffCashTL      Float?         
  diffCashUSD     Float?         
  diffCashEUR     Float?         
  diffHasGram     Float?         
  
  note            String?        
  movements       CashMovement[] 
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt
}

// Kasa İçi Manuel Giriş/Çıkış Hareketleri (Masraf, Avans, Kasadan Çekim)
model CashMovement {
  id          String              @id @default(cuid())
  sessionId   String
  session     CashRegisterSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  dealerId    String
  type        String              // "INFLOW" (Kasaya Giriş) | "OUTFLOW" (Kasadan Çıkış / Masraf)
  category    String              // "EXPENSE" | "DRAWING" | "CAPITAL" | "CORRECTION"
  currency    String              // "TL" | "USD" | "EUR" | "HAS"
  amount      Float
  description String
  employee    String?
  createdAt   DateTime            @default(now())
}
```

---

## 5. Constants & Enums Definition (Magic Strings & Numbers Compliance)

Following the rule `"magic number / string kontrolü: önemli değerler sabit veya enum olarak tanımlanmalı"`:

### 5.1. Cari & Altın Sabitleri (`src/constants/cari.ts`)
```ts
export const CARI_TX_TYPES = {
  BORC: 'BORC',
  TAHSILAT: 'TAHSILAT',
} as const;

export type CariTxType = (typeof CARI_TX_TYPES)[keyof typeof CARI_TX_TYPES];

export const ASSET_TYPES = {
  TL: 'TL',
  USD: 'USD',
  EUR: 'EUR',
  HAS: 'HAS',
  K24: '24K',
  K22: '22K',
  K18: '18K',
  K14: '14K',
  K8: '8K',
  CEYREK: 'CEYREK',
  YARIM: 'YARIM',
  TAM: 'TAM',
  ATA: 'ATA',
  GREMSE: 'GREMSE',
} as const;

export type AssetType = (typeof ASSET_TYPES)[keyof typeof ASSET_TYPES];

/** Has Altın Milyem ve Gram Standart Dönüşüm Katsayıları */
export const GOLD_FINENESS_FACTORS = {
  [ASSET_TYPES.HAS]: 1.000,
  [ASSET_TYPES.K24]: 0.995,
  [ASSET_TYPES.K22]: 0.916,
  [ASSET_TYPES.K18]: 0.750,
  [ASSET_TYPES.K14]: 0.585,
  [ASSET_TYPES.K8]: 0.333,
} as const;

/** Ziynet Altın Standart Has Gram Ağırlıkları */
export const ZIYNET_HAS_WEIGHTS = {
  [ASSET_TYPES.CEYREK]: 1.605, // 1.75 gr * 0.916 milyem = ~1.605 gr Has
  [ASSET_TYPES.YARIM]: 3.210,  // 3.50 gr * 0.916 milyem = ~3.210 gr Has
  [ASSET_TYPES.TAM]: 6.420,    // 7.00 gr * 0.916 milyem = ~6.420 gr Has
  [ASSET_TYPES.ATA]: 6.608,    // 7.216 gr * 0.916 milyem = ~6.608 gr Has
  [ASSET_TYPES.GREMSE]: 16.050,// 17.50 gr * 0.916 milyem = ~16.050 gr Has
} as const;
```

### 5.2. Kasa & Z-Raporu Sabitleri (`src/constants/zreport.ts`)
```ts
export const PAYMENT_METHODS = {
  CASH: 'CASH',
  CARD: 'CARD',
  BANK: 'BANK',
  HAS: 'HAS',
  DEBT: 'DEBT',
} as const;

export const SESSION_STATUS = {
  OPEN: 'OPEN',
  CLOSED: 'CLOSED',
} as const;

export const CASH_MOVEMENT_TYPES = {
  INFLOW: 'INFLOW',
  OUTFLOW: 'OUTFLOW',
} as const;

export const CASH_MOVEMENT_CATEGORIES = {
  EXPENSE: 'EXPENSE',       // Günlük Mağaza Masrafı
  DRAWING: 'DRAWING',       // Ortak / Patron Para Çekimi
  CAPITAL: 'CAPITAL',       // Kasa Takviyesi / Sermaye Girişi
  CORRECTION: 'CORRECTION', // Kasa Düzeltme
} as const;
```

### 5.3. Barkod & Kelebek Etiket Sabitleri (`src/constants/labels.ts`)
```ts
export const LABEL_FORMATS = {
  BUTTERFLY_74X12: 'BUTTERFLY_74X12', // Standart İpli Kelebek (74mm x 12mm)
  BUTTERFLY_80X13: 'BUTTERFLY_80X13', // Geniş Kelebek (80mm x 13mm)
  RECTANGLE_50X12: 'RECTANGLE_50X12', // Tek Parça Mini Etiket (50mm x 12mm)
  RECTANGLE_40X20: 'RECTANGLE_40X20', // Takı Kutusu Etiketi (40mm x 20mm)
} as const;

export const LABEL_DIMENSIONS = {
  [LABEL_FORMATS.BUTTERFLY_74X12]: {
    totalWidthMm: 74,
    heightMm: 12,
    leftWingWidthMm: 28,
    bridgeWidthMm: 18,
    rightWingWidthMm: 28,
  },
  [LABEL_FORMATS.BUTTERFLY_80X13]: {
    totalWidthMm: 80,
    heightMm: 13,
    leftWingWidthMm: 30,
    bridgeWidthMm: 20,
    rightWingWidthMm: 30,
  },
  [LABEL_FORMATS.RECTANGLE_50X12]: {
    totalWidthMm: 50,
    heightMm: 12,
    leftWingWidthMm: 50,
    bridgeWidthMm: 0,
    rightWingWidthMm: 0,
  },
} as const;

export const PRINTER_OUTPUT_MODES = {
  HTML_CANVAS: 'HTML_CANVAS',
  SVG_VECTOR: 'SVG_VECTOR',
  ZPL_ZEBRA: 'ZPL_ZEBRA',
} as const;
```

---

## 6. Edge Cases & Boundary Conditions Matrix

| # | Feature / Area | Edge Case / Input | Expected System Behavior & Mitigation |
|---|---|---|---|
| 1 | R1: Cari | Customer owes gold and pays with TL when live price has fluctuated | System records exact transaction unitPrice at execution time; calculates Has equivalent deducted based on that rate, avoiding balance drift. |
| 2 | R1: Cari | Zero or missing unitPrice in TL transaction | System falls back to latest live `GAUTRY.ask` from `HasPrice` singleton or prompts cashier to confirm valuation rate. |
| 3 | R1: Cari | Mixed Debt Settlement (Partial Cash TL + Partial Scrap Gold) | Transaction ledger captures individual leg lines (`TAHSILAT - TL`, `TAHSILAT - HURDA_22K`) and computes net residual Has balance accurately. |
| 4 | R2: Kasa | Kasa Session opened across midnight or multiple days | System tracks exact `openedAt` and `closedAt` timestamps; prevents overlapping sessions and links all intervening transactions to current active session ID. |
| 5 | R2: Kasa | Physical Count discrepancy (Kasa Açığı / Kasa Fazlası) | System computes `diff = counted - system`; if negative, flags `Kasa Açığı` in red with required explanation note; if positive, flags `Kasa Fazlası`. |
| 6 | R2: Kasa | Cancelled / Returned Transactions during the day | Returned transactions are recorded as inverse cash movements; Z-Report reflects gross sales, returns, and net takings separately. |
| 7 | R3: Barkod | Missing or low-resolution printer driver | HTML-Canvas rendering produces 300 DPI high-contrast 1-bit black/white bitmap with zero blur, readable by 1D laser & 2D CCD scanners. |
| 8 | R3: Barkod | Long product titles on small butterfly wing | Left wing CSS uses strict `text-overflow: ellipsis`, fixed 2-line clamping, and sub-7pt bold font sizes to prevent text overlapping onto the barcode wing. |
| 9 | R3: Barkod | ZPL special characters / Turkish letters in product title | ZPL generator maps Turkish characters (ç, ğ, ı, ö, ş, ü) using UTF-8 `^CI28` encoding directive in Zebra header. |

---

## 7. Recommended Implementation Roadmaps for Downstream Agents

### For R1 (Has / Gold Cari & Veresiye):
1. Create `src/constants/cari.ts` with all types, fineness factors, and ziynet weights.
2. Ensure `CustomerTransaction` and `Customer` synchronization preserves exact opening rates and provides progressive running balances in statement views.
3. Build customer ledger table with running balances and WhatsApp format message generator.

### For R2 (Gün Sonu & Kasa Kapatma / Z-Raporu):
1. Update `prisma/schema.prisma` with `CashRegisterSession` and `CashMovement` models, and update `Transaction` with `paymentMethod`.
2. Implement API route `/api/z-report` (GET current active session & breakdown, POST open session, PUT close session with physical count).
3. Create UI page `src/app/(panel)/transactions/z-report` (or `/z-report`) with cash flow summary cards, movement logging, physical counting wizard, and printable thermal Z-Report slip.

### For R3 (Termal Kuyumcu Barkod & Kelebek Etiket):
1. Create `src/constants/labels.ts` with dimensions and presets.
2. Build `src/components/ButterflyLabelPreview.tsx` and `src/components/LabelPrintModal.tsx` supporting:
   - Live dual-wing preview with millimeters visual scale.
   - Zero-dependency canvas/SVG Code128 barcode generator.
   - ZPL II generator for Zebra/TSC printers.
   - Batch printing modal with multi-product selection from `stocks/page.tsx`.

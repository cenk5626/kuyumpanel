# Milestone M1 Detailed Changes Log

**Agent:** Worker M1 (`worker_m1`)  
**Scope:** Constants, Enums & Database Schema Migrations  
**Timestamp:** 2026-08-17T19:00:00Z  

---

## 1. Files Created

### `src/constants/cari.ts`
- Defined `CUSTOMER_TRANSACTION_TYPES` (`BORC`, `TAHSILAT`, `ALACAK`, `ODEME`) and alias `CARI_TX_TYPES`.
- Defined `SUPPLIER_TRANSACTION_TYPES` (`PURCHASE`, `HAS_PAYMENT`, `TL_PAYMENT`, `SETTLEMENT`).
- Defined `ASSET_TYPES` (`TL`, `USD`, `EUR`, `HAS`, `24K`, `22K`, `18K`, `14K`, `8K`, `CEYREK`, `YARIM`, `TAM`, `ATA`, `GREMSE`).
- Exported `GOLD_FINENESS_RATES` and `GOLD_FINENESS_FACTORS` (`24K: 0.995`, `22K: 0.916`, `18K: 0.750`, `14K: 0.585`, `8K: 0.333`, `HAS: 1.000`).
- Exported `ZIYNET_WEIGHTS` and `ZIYNET_HAS_WEIGHTS` (`CEYREK: 1.605`, `YARIM: 3.210`, `TAM: 6.420`, `ATA: 6.608`, `GREMSE: 16.050`).
- Exported helper function `calculateHasEquivalent(assetType, amount, unitPrice)`.

### `src/constants/kasa.ts`
- Defined `PAYMENT_METHODS` (`CASH`, `CARD`, `BANK`, `HAS`, `DEBT`) and Turkish labels in `PAYMENT_METHOD_LABELS`.
- Defined `SESSION_STATUS` (`OPEN`, `CLOSED`).
- Defined `CASH_MOVEMENT_TYPES` (`POS_SALE`, `CUSTOMER_COLLECTION`, `SUPPLIER_PAYMENT`, `SCRAP_BUY`, `MANUAL_IN`, `MANUAL_OUT`, `INFLOW`, `OUTFLOW`).
- Defined `CASH_MOVEMENT_CATEGORIES` (`SALES`, `COLLECTION`, `SUPPLIER`, `SCRAP`, `EXPENSE`, `DRAWING`, `CAPITAL`, `CORRECTION`) and `CASH_MOVEMENT_CATEGORY_LABELS`.
- Defined `CASH_CURRENCIES` (`TL`, `USD`, `EUR`, `HAS`).

### `src/constants/labels.ts`
- Defined `LABEL_TEMPLATES` and `LABEL_FORMATS` (`BUTTERFLY_74x12`, `BARBELL_50x12`, `RECTANGLE_40x20`, `RECTANGLE_50x12`).
- Defined `LABEL_DIMENSIONS` detailing exact wing specifications (74x12mm: left wing 28mm, bridge 18mm, right wing 28mm; 50x12mm: left wing 20mm, bridge 10mm, right wing 20mm).
- Defined `BARCODE_TYPES` (`CODE128`, `EAN13`, `QR_CODE`).
- Defined `PRINTER_OUTPUT_MODES` (`HTML_CANVAS`, `SVG_VECTOR`, `ZPL_ZEBRA`, `ESC_POS`).
- Defined `LABEL_DPI` (`DPI_203: 203`, `DPI_300: 300`, `DPI_600: 600`) and converter `mmToDots(mm, dpi)`.

### `src/constants/stocks.ts`
- Defined `DEFAULT_MIN_STOCK_THRESHOLD = 5`.
- Defined `STOCK_THRESHOLDS` (`DEFAULT_MIN_STOCK: 5`, `DEFAULT_MIN_SARRAFIYE: 5`, `DEFAULT_MIN_DOVIZ: 1000`, `DEFAULT_MIN_GRAM: 10`, `CRITICAL_MULTIPLIER: 1.0`, `WARNING_MULTIPLIER: 1.5`).
- Defined `TURNOVER_CATEGORIES` and `TURNOVER_STATUS` (`HIZLI`, `NORMAL`, `YAVAS`, `HAREKETSIZ`) and `TURNOVER_STATUS_LABELS`.
- Defined `TURNOVER_PERIODS` (`DAYS_7: 7`, `DAYS_30: 30`, `DAYS_90: 90`).
- Defined `STOCK_ALERT_LEVELS` (`CRITICAL`, `WARNING`, `SAFE`).
- Defined helper functions `determineTurnoverCategory(dailyVelocity)` and `determineStockAlertLevel(currentAmount, minThreshold)`.

### `src/constants/showcase.ts`
- Defined `SHOWCASE_CONFIG` (`PRICE_REFRESH_INTERVAL_MS: 2500`, `TICKER_SPEED_SECONDS: 35`, `AUTO_HIDE_CONTROLS_DELAY_MS: 5000`, `DEFAULT_ANNOUNCEMENT`).
- Defined `SHOWCASE_CHANNELS` (`HAREM: 'harem'`, `ALTIS: 'altis'`).

### `src/constants/index.ts`
- Barrel export aggregating all constants and enums across `cari`, `kasa`, `labels`, `stocks`, `showcase`, `prices`, `routes`, `messages`, `roles`, `theme`, and `menu`.

---

## 2. Files Modified

### `prisma/schema.prisma`
- **Dealer Model:** Added reverse relations `cashRegisterSessions CashRegisterSession[]` and `cashMovements CashMovement[]`.
- **Stock Model:** Added `minThreshold Float @default(5)`.
- **Transaction Model:** Added `paymentMethod String @default("CASH")`, `cardFeePercent Float?`, `hasEquivalent Float? @default(0)`, `orderNote String?`, `customerId String?`, `sessionId String?`, and relation `session CashRegisterSession? @relation(...)`.
- **Customer Model:** Added `hasBalance Float @default(0)` and `tlBalance Float @default(0)`.
- **New Model `CashRegisterSession`:** Created schema with `id`, `sessionNumber`, `status`, `openingCash`, `closingCash`, `systemCash`, `countedCash`, `discrepancy`, `notes`, `openedAt`, `closedAt`, `openedBy`, `closedBy`, multi-currency breakdowns (`openingCashTL`, `systemCashTL`, `countedCashTL`, `diffCashTL`, etc.), `dealerId`, `movements`, `transactions`, `createdAt`, `updatedAt`.
- **New Model `CashMovement`:** Created schema with `id`, `sessionId`, `session`, `dealerId`, `dealer`, `type`, `category`, `paymentMethod`, `amount`, `currency`, `hasEquivalent`, `description`, `referenceId`, `employeeName`, `createdAt`.

### `src/constants/routes.ts`
- Added route paths: `SHOWCASE`, `Z_REPORT`, `API_STOCKS_ANALYTICS`, `API_STOCKS_REORDER`, `API_Z_REPORT`, `API_Z_REPORT_SESSION`, `API_Z_REPORT_SUMMARY`, `API_Z_REPORT_PRINT`.

### `src/constants/messages.ts`
- Added UI text keys for Z-Report (`Z_REPORT_TITLE`, `Z_REPORT_OPEN_SESSION`, `Z_REPORT_CLOSE_SESSION`, etc.), Showcase (`SHOWCASE_TITLE`, etc.), Labels (`LABEL_PRINT_TITLE`, etc.), WhatsApp (`WA_SEND_RECEIPT`, etc.), and Stock Turnover (`TURNOVER_TITLE`, `REORDER_TITLE`, etc.).

---

## 3. Migration and Typecheck Results
- Ran `npx prisma db push`: Synchronized SQLite database schema in `prisma/dev.db`.
- Ran `npx prisma generate`: Generated Prisma Client v5.22.0.
- Ran `npx tsc --noEmit`: 0 TypeScript compiler errors.
- Ran `npx tsx tests/run-all-tests.ts`: 100 passed out of 100 tests (100% pass rate).
- Ran ESLint on constants files: 0 lint errors, 0 warnings.

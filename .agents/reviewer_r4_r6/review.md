# Review & Adversarial Critique Report: Requirements R4, R5, R6

**Reviewed Artifacts**:
- `src/constants/showcase.ts`
- `src/constants/stocks.ts`
- `src/constants/messages.ts`
- `src/constants/routes.ts`
- `src/lib/whatsapp.ts`
- `src/lib/stocks/analytics.ts`
- `src/app/showcase/page.tsx` & `src/app/showcase/ShowcaseClient.tsx`
- `src/components/ShowcaseRatesGrid.tsx` & `src/components/ShowcaseTicker.tsx`
- `src/app/manifest.ts` & `public/sw.js`
- `src/components/CameraScannerModal.tsx`
- `src/components/CriticalStockBadge.tsx`
- `src/components/ReorderDraftModal.tsx`
- `src/app/(panel)/stocks/page.tsx`
- `src/app/(panel)/DashboardClient.tsx`
- `src/app/api/stocks/analytics/route.ts` & `src/app/api/stocks/reorder/route.ts`
- `tests/` Test Suites (Tiers 1–4 and Challenger Stress Suite)

---

## 1. Review Summary

**Verdict**: **APPROVE**  
**Overall Risk Assessment**: **LOW**  
**Integrity Status**: **CLEAN (No integrity violations detected)**  
**User Global Rule Compliance**: **100% (Zero magic numbers / magic strings, centralized constants in `src/constants/`)**

---

## 2. Requirement-by-Requirement Verification

### Requirement R4: TV Vitrin & Digital Signage Mode (`/showcase`)
- **Observation**:
  - `src/app/showcase/page.tsx` and `ShowcaseClient.tsx` provide an unmanned digital signage mode for in-store TV displays.
  - Automatic fullscreen handling via HTML5 Fullscreen API (`F11` and `f` shortcut handlers).
  - Floating controls auto-hide after 5,000ms (`SHOWCASE_CONFIG.AUTO_HIDE_CONTROLS_DELAY_MS`) of user inactivity.
  - Dual WebSocket live sync (`ALTIS_WS_URL` and `HAREM_WS_URL`) with HTTP polling fallback (`/api/prices/altis`) when running under HTTPS or during socket errors.
  - Live price calculation computes dynamic buy/sell rates for Has gold, foreign currencies (USD/EUR), ziynet coins (Çeyrek, Yarım, Tam, Ata, Gremse), and custom carats (24K, 22K, Adana Burma, Ajda, 14K) using milyem factors.
  - `ShowcaseTicker.tsx` sanitizes HTML/control characters via `sanitizeAnnouncement()` and loops store promotions and live market prices through a seamless CSS `@keyframes showcaseMarquee` animation.
- **Verification Result**: **PASS**

### Requirement R5: PWA, Camera Barcode, WhatsApp Sharing
- **Observation**:
  - **PWA Manifest (`src/app/manifest.ts`)**: Generates compliant manifest with `display: 'standalone'`, theme colors, and icons (`icon-192.png`, `icon-512.png` with standard and maskable configurations).
  - **Service Worker (`public/sw.js`)**: Implements network-first for API/WebSocket endpoints and stale-while-revalidate / cache fallback for offline navigation (`/`, `/showcase`).
  - **Camera Barcode Scanner (`CameraScannerModal.tsx`)**: Integrates `html5-qrcode` supporting 1D/2D symbologies (Code 128, Code 39, EAN-13, EAN-8, UPC-A, UPC-E, QR Code), audio feedback (1200Hz synthesized beep via Web Audio API), viewfinder overlay, and single/continuous scanning modes.
  - **WhatsApp Sharing Engine (`src/lib/whatsapp.ts`)**: Implements normalized phone number parsing (Turkish `905xx` formatting) and deep links for:
    1. POS Sales Receipts (`generateWhatsAppReceiptUrl`)
    2. Customer Has/TL Account Statements (`generateWhatsAppStatementUrl`)
    3. Live Price Quotes (`generateWhatsAppQuoteUrl`)
    4. Wholesale Supplier Reorder Requests (`generateWhatsAppWholesaleOrderUrl`)
  - Integration verified in `Transactions`, `CustomersClient`, `PriceCheckClient`, and `ReorderDraftModal`.
- **Verification Result**: **PASS**

### Requirement R6: Turnover Velocity Analytics & Critical Stock Alerts
- **Observation**:
  - **Mathematical Engine (`src/lib/stocks/analytics.ts`)**:
    - Daily velocity: $V_{daily} = \frac{Q_{sold}}{\max(1, P_{days})}$ (guarded against division by zero).
    - Days to stockout: $D_{out} = \frac{CurrentStock}{V_{daily}}$ (returns `Infinity` for zero velocity, `0` for zero/negative stock).
    - Velocity categorization: `HIZLI` ($V_{daily} \ge 1.0$ or $D_{out} \le 14$), `NORMAL` ($0.2 \le V_{daily} < 1.0$ or $D_{out} \le 45$), `YAVAS` ($0 < V_{daily} < 0.2$), `HAREKETSIZ` ($V_{daily} = 0$).
    - Stock alert levels: `CRITICAL` (Stock $\le$ minThreshold), `WARNING` (Stock $\le$ minThreshold $\times$ 1.5), `SAFE` (Stock $>$ minThreshold $\times$ 1.5).
    - Reorder draft sizing: $\text{Target} = \max(\text{minThreshold} \times 2, \text{minThreshold} + \lceil V_{daily} \times \text{leadTime}\rceil)$, $\text{Suggested} = \max(1, \text{Target} - \text{CurrentStock})$.
  - **Visual Alerts & UI**:
    - `CriticalStockBadge.tsx` and `TurnoverBadge` render responsive badges.
    - Dashboard alert banner highlights critical stock items and triggers `ReorderDraftModal`.
    - `ReorderDraftModal.tsx` provides manual quantity tweaking, WhatsApp PO generation, and print/PDF output.
    - Backend endpoints `/api/stocks/analytics` and `/api/stocks/reorder` enforce dealer multi-tenant isolation.
- **Verification Result**: **PASS**

---

## 3. Adversarial Stress & Failure Mode Analysis

| Challenge / Attack Surface | Scenario Tested | Outcome / Defense | Status |
|---|---|---|---|
| **Zero / Negative Period Days** | $P_{days} \le 0$ in velocity calculation | `Math.max(1, periodDays)` clamps to 1 day; prevents `NaN`/`Infinity` | **ROBUST** |
| **Dead Stock ($V_{daily} = 0$)** | 0 sales over 90 days with positive inventory | `calculateDaysToStockout` returns `Infinity`, categorizes as `HAREKETSIZ` | **ROBUST** |
| **Negative Stock (Oversold / Backorder)** | Stock amount $< 0$ | $D_{out} = 0$, suggested reorder adds deficit to target stock | **ROBUST** |
| **Mixed Content in HTTPS** | Running `/showcase` on HTTPS with `ws://` Altis socket | Automatically switches to `/api/prices/altis` HTTP polling fallback every 2.5s | **ROBUST** |
| **Rapid XSS / Malformed Announcements** | Ticker items containing `<script>`, `\n`, `\r` | `sanitizeAnnouncement` strips tags and multi-line whitespace | **ROBUST** |
| **Phone Number Formats** | Phone input with `+90`, `05xx`, spaces, dashes, or missing leading 0 | `normalizePhoneNumber` normalizes to standard `905xxxxxxxxx` | **ROBUST** |
| **Large Catalog Concurrency** | 10,000 SKUs batch turnover analytics | Processed in 15.48ms with 0 memory leak | **ROBUST** |

---

## 4. Test Execution & Build Attestation

1. **TypeScript Static Typecheck**:
   ```bash
   npx tsc --noEmit
   # Exit code: 0 (0 errors)
   ```

2. **Full Test Suite (Tiers 1–4)**:
   ```bash
   npx tsx tests/run-all-tests.ts
   # Total Tests Executed: 213
   # Total Passed: 213 (100.0%)
   # Total Failed: 0
   # Execution Duration: 41.39ms
   ```

3. **Challenger Stress & Concurrency Suite**:
   ```bash
   npx tsx tests/stress/challenger_stress_concurrency.test.ts
   # Total Stress Tests: 21
   # Total Passed: 21 (100.0%)
   # Total Failed: 0
   ```

---

## 5. Conclusion
The implementation of Requirements R4, R5, and R6 fully meets all functional specifications, adheres strictly to the User Global Rule against magic numbers/strings, enforces clean architecture and data isolation, and demonstrates high reliability under adversarial stress conditions.

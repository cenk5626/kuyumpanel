# Handoff Report: Spec Miner R4, R5, R6

- **Sender:** Spec Miner Subagent (R4, R5, R6)
- **Recipient:** Orchestrator (Parent Agent: `af2e4910-70f8-4856-9e07-f62c96e909b6`)
- **Scope:** Requirements R4 (TV Vitrin Modu), R5 (PWA, Kamera Barkod, WhatsApp İletişim), R6 (Stok Devir Analitiği, Kritik Uyarılar, Sipariş Taslağı)
- **Status:** Complete (Hard Handoff)

---

## 1. Observation

1. **Existing Routes and Views:**
   - Evaluated `src/app/(panel)/prices/page.tsx` (1263 lines): Implements live dual-socket feeds (Altis `ALTIS_WS_URL` and Harem `HAREM_WS_URL` + `/api/prices/altis` proxy fallback), custom price offsets, and 3-column layout (Has/Döviz, Ziynet, İşlenmiş Altın).
   - Evaluated `src/app/(panel)/price-check/PriceCheckClient.tsx` (415 lines): Implements barcode lookup, price check kiosk, and top ticker bar. Uses `CameraScannerModal.tsx`.
   - Evaluated `src/app/(panel)/stocks/page.tsx` (2259 lines): Contains standard stocks (`Stock`) and product items (`ProductItem`), category tree, and thermal label printing. Lacks turnover velocity calculation, critical stock threshold alerts, and reorder draft.
   - Evaluated `src/app/(panel)/transactions/page.tsx` (1225 lines): Contains retail/pos transactions, basket management, barcode auto-detection, and receipt triggers (`handlePrintReceipt`). Lacks 1-click WhatsApp receipt sharing.
   - Evaluated `src/app/(panel)/customers/CustomersClient.tsx` (959 lines): Contains customer account tracking, debt/payment entries, and printable account statements. Lacks 1-click WhatsApp statement sharing.
   - Evaluated `src/components/CameraScannerModal.tsx` (287 lines): Uses `html5-qrcode` 2.3.8 with camera device enumeration, audio beep oscillator, laser scanning visualizer, and single/continuous modes.

2. **Missing Components & Gaps:**
   - **R4:** No dedicated `/showcase` TV Vitrin Digital Signage route currently exists in `src/app/`.
   - **R5:** No `manifest.json`, `manifest.ts`, service worker `sw.js`, or WhatsApp generator utilities exist.
   - **R6:** `prisma/schema.prisma` `Stock` model lacks `minThreshold` column. No API for turnover analytics (`/api/stocks/analytics` or `/api/stocks/reorder`).

---

## 2. Logic Chain

1. **R4 (TV Vitrin / Digital Signage):**
   - *Observation:* The store needs an unmanned, high-visibility TV screen displaying live prices without administrative controls, sidebars, or login requirements.
   - *Deduction:* Create `src/app/showcase/page.tsx` and `ShowcaseClient.tsx` with high-contrast luxury UI, live WebSocket connections (`HAREM_WS_URL` / `ALTIS_WS_URL`), promotional banner, bottom scrolling ticker (kayan yazı), and auto-hiding fullscreen toggle (`F11`).

2. **R5 (PWA, Camera & WhatsApp):**
   - *Observation:* Users operate from mobile phones and tablets, requiring home-screen installation and direct camera scanning. WhatsApp is the primary communication channel in Turkish jewelry trade for sharing receipts and statements.
   - *Deduction:*
     * Add `src/app/manifest.ts` and `public/sw.js` for standalone PWA installation.
     * Export and connect `CameraScannerModal` into `stocks` and quick action menus.
     * Implement `src/lib/whatsapp.ts` with `generateWhatsAppReceipt`, `generateWhatsAppStatement`, `generateWhatsAppQuote`, and `generateWhatsAppWholesaleOrder`, adding 1-click buttons to `transactions`, `customers`, and `price-check`.

3. **R6 (Stok Devir & Kritik Uyarılar):**
   - *Observation:* Jewelers must prevent running out of fast-moving items (Sarrafiye/Bilezik) and identify dead capital (atıl/hareketsiz stok).
   - *Deduction:*
     * Add `minThreshold` to `Stock` model (`Float @default(5)`).
     * Calculate 30-day sales velocity ($V_{daily} = \text{SoldQuantity} / 30$) and days-to-stockout ($D_{out} = \text{CurrentStock} / V_{daily}$) from `Transaction` history.
     * Categorize items into `HIZLI`, `NORMAL`, `YAVAS`, and `HAREKETSIZ`.
     * Build Critical Stock Dashboard widget and automated Reorder Draft table with WhatsApp wholesale ordering.

---

## 3. Caveats

1. **Browser Security & Camera / Fullscreen Permissions:**
   - Camera scanning (`navigator.mediaDevices.getUserMedia`) and Fullscreen API (`requestFullscreen`) require user interaction and HTTPS (or `localhost`). Fallback error messaging and manual barcode entry are provided.
2. **WebSocket Mixed-Content on HTTPS:**
   - As observed in `src/app/(panel)/prices/page.tsx`, insecure `ws://` sockets are blocked by browsers on HTTPS. The showcase mode must inherit the existing fallback polling via `/api/prices/altis` and secure `wss://` Harem sockets.
3. **WhatsApp Deep Linking:**
   - `https://api.whatsapp.com/send` opens WhatsApp Web on desktop browsers and WhatsApp Native App on mobile devices seamlessly.

---

## 4. Conclusion

The specifications for R4, R5, and R6 have been fully probed, reverse-engineered, and documented in `analysis.md`. The design adheres strictly to the project rules (zero magic strings/numbers, Turkish UI conventions, multi-dealer data isolation, and Next.js App Router best practices). Implementation can proceed without ambiguities.

---

## 5. Verification Method

To independently verify the discoveries and requirements:
1. **Schema Check:** Inspect `prisma/schema.prisma` lines 71-98 (`Stock` and `Transaction` models).
2. **Prices & WS Feed Check:** Inspect `src/constants/prices.ts` and `src/app/(panel)/prices/page.tsx` lines 150-320.
3. **Camera Component Check:** Inspect `src/components/CameraScannerModal.tsx`.
4. **Detailed Technical Artifact:** Read `c:\xampp\htdocs\kuyumpanel\.agents\spec_miner_r4_r6\analysis.md`.

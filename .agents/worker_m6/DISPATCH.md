## 2026-08-17T19:05:04Z
You are a Worker subagent implementing Milestone M6 (Mobil/PWA, Kamera, WhatsApp & Stok Devir / Kritik Uyarılar - R5 + R6) for kuyumpanel.

Your working directory: c:\xampp\htdocs\kuyumpanel\.agents\worker_m6
Project root: c:\xampp\htdocs\kuyumpanel
Files to read first:
- c:\xampp\htdocs\kuyumpanel\.agents\ORIGINAL_REQUEST.md
- c:\xampp\htdocs\kuyumpanel\PROJECT.md
- c:\xampp\htdocs\kuyumpanel\.agents\spec_miner_r4_r6\analysis.md
- c:\xampp\htdocs\kuyumpanel\src\constants\stocks.ts

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Scope & Tasks:
1. PWA & Mobile Support (R5):
   - Create `src/app/manifest.ts` defining web app metadata (name: "KuyumPanel Enterprise", display: "standalone", theme_color, icons, Turkish locale).
   - Create `public/sw.js` for basic service worker caching and offline fallback.
   - Verify `CameraScannerModal` can be triggered smoothly on mobile and desktop from stocks, transactions, and price-check.
2. WhatsApp 1-Click Sharing Infrastructure (R5):
   - Implement `src/lib/whatsapp.ts`:
     * `generateWhatsAppReceiptUrl`: Formats retail sale receipt with product details, carat, gram, total price, and store header.
     * `generateWhatsAppStatementUrl`: Formats customer account statement with total Gram Has debt, TL balance, spot valuation, and last 5 transactions.
     * `generateWhatsAppQuoteUrl`: Formats price quote for customer inquiries.
     * `generateWhatsAppWholesaleOrderUrl`: Formats wholesale replenishment order for suppliers.
   - Integrate WhatsApp receipt sharing button in `src/app/(panel)/transactions/page.tsx` after checkout completion and in transaction history.
3. Stok Devir Hızı & Kritik Stok Uyarıları (R6):
   - Implement `src/lib/stocks/analytics.ts`:
     * Pure calculation engine for daily sales velocity ($V_{daily} = \text{SoldQuantity} / \text{Days}$) over 7/30/90 days.
     * Days-to-stockout calculation ($D_{out} = \text{CurrentStock} / V_{daily}$).
     * Categorization: `HIZLI` (high circulation), `NORMAL`, `YAVAS`, `HAREKETSIZ` (dead stock / zero sales in period).
     * Reorder quantity recommendation ($Q_{suggested} = (\text{TargetDays} \times V_{daily}) - \text{CurrentStock}$).
   - Create API endpoints:
     * `src/app/api/stocks/analytics/route.ts`: Returns stock turnover summary, category counts, top moving items, and dead capital list.
     * `src/app/api/stocks/reorder-draft/route.ts`: Returns list of products below `minThreshold` with suggested reorder quantities.
   - Create components:
     * `src/components/CriticalStockBadge.tsx`: Visual alert badges (`Kritik Stok`, `Tükenmek Üzere`, `Güvenli Seviye`).
     * `src/components/ReorderDraftModal.tsx`: Interactive modal displaying low-stock items, calculated replenishment needs, and 1-click WhatsApp order generator to suppliers.
   - Update `src/app/(panel)/stocks/page.tsx`:
     * Add critical stock highlights and turnover category indicators in the stock table.
     * Add filter by stock level (Hepsi, Kritik Seviye, Hareketsiz).
     * Add "Sipariş Taslağı" (Reorder Draft) action button in the toolbar.
   - Update `src/app/(panel)/DashboardClient.tsx`:
     * Add Critical Stock Alert card / widget showing count of items needing immediate replenishment.
4. Verify TypeScript compilation (`npx tsc --noEmit`) and run tests (`npx tsx tests/run-all-tests.ts`).
5. Write `changes.md` and `handoff.md` in your working directory and notify orchestrator via `send_message`.

# Handoff Report: Specification Mining for R1, R2, and R3

**Author:** Spec Miner Subagent (R1, R2, R3)  
**Date:** 2026-08-17  
**Workspace:** `c:\xampp\htdocs\kuyumpanel\.agents\spec_miner_r1_r3`  
**Target:** Parent Orchestrator / Downstream Implementer Agents  

---

## 1. Observation

Direct observations from inspecting the codebase:

1. **R1 (Has / Altın Cari & Veresiye Takibi):**
   - In `prisma/schema.prisma:218-247`, `Customer` model contains identity fields (`id`, `name`, `phone`, `email`, `tcNo`, `address`, `note`, `dealerId`) and `CustomerTransaction` contains (`type`, `assetType`, `amount`, `hasEquivalent`, `unitPrice`, `description`, `employeeName`).
   - In `src/app/api/customer-transactions/route.ts:89-102`, conversion factors (`0.916`, `1.605`, `3.21`, `6.42`, `6.60`, `0.585`) and transaction types (`"BORC"`, `"TAHSILAT"`) are inline hardcoded magic numbers/strings without enum or constant abstraction.
   - In `src/app/(panel)/customers/CustomersClient.tsx:34-41` and `src/app/api/customers/route.ts:33-72`, customer balances are calculated on-the-fly across `tlBalance`, `usdBalance`, `eurBalance`, and `totalHasEquivalent`. `Customer` lacks cached `hasBalance` and `tlBalance` scalar columns in the database table (unlike `Supplier` which has explicit `hasBalance` and `tlBalance` fields in `prisma/schema.prisma:181-182`).
   - In `src/app/(panel)/customers/CustomersClient.tsx:894-945`, the customer statement modal renders a table without a running balance (`Yürüyen Bakiye`) calculation column.

2. **R2 (Gün Sonu & Kasa Kapatma / Z-Raporu):**
   - In `prisma/schema.prisma:86-98`, `Transaction` model stores `type` (`buy`/`sell`), `productType`, `productCode`, `quantity`, `price`, `total`, `employeeName`, `dealerId`, `createdAt`.
   - In `src/app/(panel)/transactions/page.tsx:904-947`, the POS UI allows the cashier to pick payment methods (`cash`, `bank`, `card`) with `cardFeePercent` and `orderNote`. However, in `src/app/api/transactions/route.ts:86-155`, none of these fields (`paymentMethod`, `cardFeePercent`, `orderNote`, `customerId`) are persisted into the database.
   - In `src/app/(panel)/transactions/page.tsx:648-651`, a `<button ...>Kasa</button>` element exists in the header, but it has no `onClick` handler and no associated page/modal.
   - Searching for `Z-Raporu` across `src/` returns 0 results (`No results found`). There is currently no `CashRegisterSession` or `ZReport` data model or API endpoint in the system.

3. **R3 (Termal Kuyumcu Barkod & Kelebek Etiket Yazıcı Desteği):**
   - In `src/app/(panel)/stocks/page.tsx:629-742`, `handlePrintLabel` opens a basic popup window printing a 50mm x 12mm single rectangular sticker and relies on an external CDN `<script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>`.
   - There is no support for Turkish jewelry standard **Kelebek (Butterfly)** dual-wing labels (Left Wing: Carat, Weight, Category; Bridge: blank thread space; Right Wing: Code 128 barcode, selling price/milyem tag).
   - There is no raw ZPL II generator for network/serial Zebra/TSC thermal label printers and no batch/multi-selection printing workflow from the inventory table.

4. **Global User Rule Compliance:**
   - User Global Rule: `"magic number / string kontrolü: önemli değerler sabit veya enum olarak tanımlanmalı"`. Multiple magic numbers exist in currency, carat conversion, payment methods, and label dimensions that must be centralized in `src/constants/`.

---

## 2. Logic Chain

1. **From Observation 1 to R1 Architecture:**
   - Because `CustomerTransaction` already stores `amount`, `hasEquivalent`, and `unitPrice`, the historical snapshot is preserved. However, because conversion ratios are hardcoded in `route.ts:89-102`, any new product type (e.g. 18K, 8K, Gremse, Reşat) causes calculation bugs or code duplication.
   - Centralizing all gold fineness factors (`24K: 0.995`, `22K: 0.916`, `18K: 0.750`, `14K: 0.585`, `8K: 0.333`) and ziynet weights (`Çeyrek: 1.605`, `Yarım: 3.210`, `Tam: 6.420`, `Ata: 6.608`, `Gremse: 16.050`) into `src/constants/cari.ts` guarantees exact and maintainable dual-balance valuation.
   - Adding a progressive running balance computation to `CustomersClient.tsx` aligns customer statements with the existing supplier ledger in `suppliers/page.tsx:344-370`.

2. **From Observation 2 to R2 Architecture:**
   - Because `Transaction` in `api/transactions/route.ts` discards the payment method selected in `transactions/page.tsx`, the system currently cannot distinguish cash vs POS card vs gold payment at the end of the day.
   - Introducing `paymentMethod` (`CASH`, `CARD`, `BANK`, `HAS`, `DEBT`) to `Transaction` and adding `CashRegisterSession` and `CashMovement` models to `prisma/schema.prisma` enables a complete Daily Z-Report engine.
   - Consolidating POS sales + Customer Collections (`TAHSILAT`) + Supplier Payments (`TL_PAYMENT`/`HAS_PAYMENT`) + Scrap Gold Buys (`buy`) delivers the required reconciliation between system turnover and physical count (fiili sayım).

3. **From Observation 3 to R3 Architecture:**
   - The current 50x12mm single rectangular print in `stocks/page.tsx` is incompatible with jewelry string tags.
   - Introducing a 2-wing Kelebek layout (e.g. 74mm x 12mm with 28mm-18mm-28mm geometry) rendered via embedded HTML-Canvas/SVG eliminates CDN dependencies and produces crisp 300 DPI thermal prints on standard jewelry label printers (Argox, TSC, Zebra, Godex).
   - Adding a ZPL II string builder and batch printing modal allows high-volume retail jewelers to tag newly added stock in bulk.

---

## 3. Caveats

1. **Printer Hardware Variation:** Thermal printers vary across 203 DPI, 300 DPI, and 600 DPI. Canvas/SVG scaling must use millimeter-based CSS `@page { size: 74mm 12mm; margin: 0; }` with vector fonts for universal driver compatibility.
2. **Database Migration:** Adding new models (`CashRegisterSession`, `CashMovement`) and updating `Customer` and `Transaction` requires running `npx prisma db push` or `prisma migrate`.
3. **No Code Changed:** In adherence to the Spec Miner read-only mandate, no source code was modified during this turn.

---

## 4. Conclusion

Requirements R1, R2, and R3 have clear technical boundaries, schemas, and API contracts defined in `analysis.md`:
- **R1:** Centralize gold conversion constants, add running balance ledger in customer statements, and enforce exact live valuation.
- **R2:** Create `CashRegisterSession` and `CashMovement` models, persist `paymentMethod` on all POS transactions, and build a unified Z-Report dashboard with opening/closing reconciliation and thermal receipt print.
- **R3:** Replace the basic label snippet with a dual-wing Kelebek (74x12mm / 80x13mm) Canvas/SVG vector preview/print component, a multi-product batch printer, and a ZPL II generator.

---

## 5. Verification Method

To verify these findings and downstream implementations:
1. **Inspect Data Models:** Review `prisma/schema.prisma` and compare against proposed models in `analysis.md` § 4.
2. **Inspect Existing UI & Routes:**
   - `src/app/(panel)/customers/CustomersClient.tsx` (R1)
   - `src/app/api/customer-transactions/route.ts` (R1)
   - `src/app/(panel)/transactions/page.tsx` (R2)
   - `src/app/api/transactions/route.ts` (R2)
   - `src/app/(panel)/stocks/page.tsx:629-742` (R3)
3. **Run Lint and Build Verification:**
   - Run `npx prisma generate`
   - Run `npm run lint` or `npm run build` to ensure type-checking and layout compliance.

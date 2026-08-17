# DISPATCH — 2026-08-17T19:00:28Z

## Task Assignment
Milestone M4: Termal Kuyumcu Barkod & Kelebek Etiket Yazıcı Desteği - R3

Files Exclusively Owned:
- `src/lib/labels/kelebek.ts` (create)
- `src/lib/labels/zpl.ts` (create)
- `src/components/KelebekLabelModal.tsx` (create)
- `src/components/BatchLabelPrintModal.tsx` (create)
- `src/app/(panel)/stocks/page.tsx` (update to integrate single/batch Kelebek printing)

Scope & Tasks:
1. Implement `src/lib/labels/kelebek.ts`:
   - Pure local vector Code 128 barcode generator (SVG/Canvas) without external CDN dependencies.
   - Jewelry standard Kelebek (74mm x 12mm) dual-wing layout generator:
     * Left Wing (28mm): Ayar / Carat (e.g. 14K / 585), Gram / Weight (e.g. 3.45 gr), Product Name / Group.
     * Bridge (18mm): Blank spacing for jewelry string/thread.
     * Right Wing (28mm): Code 128 Barcode, Barcode text, Retail Price / Milyem code, Store Name.
   - HTML print template with precise `@media print` CSS rules: `@page { size: 74mm 12mm; margin: 0; }`.
2. Implement `src/lib/labels/zpl.ts`:
   - Raw ZPL II command string generator for direct thermal printing on Zebra/TSC/Argox printers (`^XA`, `^FO`, `^BC`, `^FD`, `^XZ`).
3. Build `src/components/KelebekLabelModal.tsx`:
   - Interactive modal showing high-fidelity live dual-wing preview of the jewelry label.
   - Option to print via browser dialog or copy raw ZPL II code.
   - Template switcher (74x12mm Kelebek, 50x12mm Barbell).
4. Build `src/components/BatchLabelPrintModal.tsx`:
   - Multi-product batch label preview and continuous roll print for newly received or selected inventory items.
5. Update `src/app/(panel)/stocks/page.tsx`:
   - Replace old popup print with `KelebekLabelModal` on individual product rows.
   - Add multi-selection checkboxes and a "Toplu Etiket Yazdır" button opening `BatchLabelPrintModal`.
6. Verify TypeScript compilation (`npx tsc --noEmit`) and run tests (`npx tsx tests/run-all-tests.ts`).
7. Write `changes.md` and `handoff.md` in working directory and notify parent via `send_message`.

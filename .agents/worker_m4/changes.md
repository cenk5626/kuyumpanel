# Changes Summary — Milestone M4 (Termal Kuyumcu Barkod & Kelebek Etiket Yazıcı Desteği - R3)

## 1. Created `src/lib/labels/kelebek.ts`
- **Pure Local Vector Code 128 Barcode Engine**:
  - Implemented standard 107-pattern Code 128 Set B lookup table.
  - Modulo 103 checksum calculation and module bar-to-SVG `<rect>` generator.
  - Zero external CDN or internet dependencies for 100% offline reliability.
- **Dual-Wing Jewelry Butterfly (Kelebek) Label Layouts**:
  - `BUTTERFLY_74x12` (74mm × 12mm: 28mm Left Wing, 18mm Bridge, 28mm Right Wing).
  - `BARBELL_50x12` (50mm × 12mm: 20mm Left Wing, 10mm Bridge, 20mm Right Wing).
  - `RECTANGLE_40x20` & `RECTANGLE_50x12` single-wing box labels.
  - Left Wing renders Store Name, Carat & Weight (`14K | 3.45 gr`), Product Title (truncated to prevent overflow), and Milyem (`M:0.585`).
  - Right Wing renders crisp Code 128 vector barcode, readable human barcode text, and Live Retail Sale Price in TL.
  - Middle Bridge maintains exact blank cutout spacing for jewelry string/thread.
- **HTML Print Document Generator**:
  - Generates standalone print HTML with `@page { size: <W>mm <H>mm; margin: 0mm; }` and `-webkit-print-color-adjust: exact;`.
  - Supports continuous roll batch pagination with `page-break-after: always; break-after: page;`.

## 2. Created `src/lib/labels/zpl.ts`
- **Industrial ZPL II Thermal Printer Command Generator**:
  - Emits native ZPL II streams for Zebra, TSC, Godex, Argox, and Bixolon label printers.
  - Standard commands: `^XA`, `^PW<dots>`, `^LL<dots>`, `^LH0,0`, `^CI28` (UTF-8 encoding for Turkish characters), `^FO<x>,<y>`, `^A0N`, `^BY`, `^BCN`, `^FD`, `^FS`, `^XZ`.
  - Configured DPI modes: 203 DPI (8 dots/mm) and 300 DPI (11.811 dots/mm).
  - Accurate physical coordinate separation between left and right wings across string bridge.
  - `generateBatchZPL` supporting multi-item continuous print streams and item quantity multipliers.

## 3. Created `src/components/KelebekLabelModal.tsx`
- **Interactive High-Fidelity Single Label Preview & Print Modal**:
  - Live vector preview showing realistic butterfly shape, scale measurements, and dual-wing separation.
  - Interactive template switcher (`74x12mm Kelebek`, `50x12mm Halter`, `40x20mm Kutu`, `50x12mm Düz`).
  - Live tab switcher between "Canlı Önizleme" and "ZPL II Kodu".
  - ZPL II DPI selector (203 DPI vs 300 DPI) with 1-click clipboard copy and `.zpl` / `.prn` file download.
  - Direct browser thermal print with iframe print trigger avoiding popup blockers.
  - Customization toggles: Kopya Sayısı (Quantity), Mağaza Başlığı (Store Name), Fiyat Göster (Show TL Price), Milyem Göster.

## 4. Created `src/components/BatchLabelPrintModal.tsx`
- **Multi-Product Batch Label Printing Modal**:
  - Displays selected inventory items with thumbnail vector SVG previews.
  - Per-item quantity/copy counter adjustment and item removal.
  - Summary metrics: Toplam Seçilen Ürün, Toplam Basılacak Etiket Sayısı, Toplam Altın Ağırlığı (gr).
  - Batch continuous roll printing via browser print dialog.
  - Batch ZPL II stream generation with 1-click copy and bulk file download.

## 5. Updated `src/app/(panel)/stocks/page.tsx`
- Replaced old CDN JsBarcode popup print with `KelebekLabelModal` on individual row print buttons.
- Added multi-selection checkboxes across product table rows with header select/deselect all.
- Added batch actions toolbar with "Toplu Etiket Yazdır" button displaying active selection count.
- Connected `BatchLabelPrintModal` for bulk label printing.

## 6. Verification
- `npx tsc --noEmit` passed with 0 errors.
- `npx tsx tests/run-all-tests.ts` passed 213/213 tests (100% pass rate).

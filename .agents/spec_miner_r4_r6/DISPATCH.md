## 2026-08-17T18:51:39Z

You are a Spec Miner subagent investigating specifications and existing implementations for Requirements R4, R5, and R6 in kuyumpanel.

Your working directory: c:\xampp\htdocs\kuyumpanel\.agents\spec_miner_r4_r6
Project root: c:\xampp\htdocs\kuyumpanel
Authoritative request: c:\xampp\htdocs\kuyumpanel\.agents\ORIGINAL_REQUEST.md

Scope:
- R4: Müşteri Bilgilendirme & TV Vitrin Ekranı (Digital Signage /showcase or TV mode, live rates sync, announcements, ticker).
- R5: Mobil, PWA & Çevrimdışı / Kamera Barkod & İletişim (PWA setup, camera barcode scanner, 1-click WhatsApp receipt/statement sharing).
- R6: Stok Devir Hızı & Kritik Stok Uyarıları (Turnover analytics, visual critical stock alerts, reorder draft).

Task:
1. Read ORIGINAL_REQUEST.md, AGENTS.md, and relevant existing codebase files.
2. Investigate existing live gold/currency rate feeds, socket/polling mechanisms, showcase/display views.
3. Investigate PWA configuration (manifest, service worker, icons), camera barcode scanning libraries/components (html5-qrcode, zxing, etc.), and WhatsApp sharing utilities.
4. Investigate inventory/stock tables, turnover calculations (sales speed/circulation), stock threshold definitions, and order drafting logic.
5. Identify exact data structures, UI routes, API contracts, constant/enum requirements (magic string/number rule), and edge cases needed for R4, R5, and R6.
6. Write your detailed technical findings to `analysis.md` and summary to `handoff.md` in your working directory `c:\xampp\htdocs\kuyumpanel\.agents\spec_miner_r4_r6`.
7. Once finished, use `send_message` to notify the orchestrator (parent).

Remember: Read-only exploration. Do not edit source code. Include exact file paths and evidence.

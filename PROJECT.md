# Project: kuyumpanel Enterprise Jewelry Management System

## Architecture
kuyumpanel is a high-performance Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS v4 + Prisma ORM (SQLite / LibSQL) enterprise jewelry retail and wholesale ERP.
- **Frontend Layer**: Next.js App Router (`src/app/`), React 19 Client/Server Components, Framer Motion animations, Lucide React icons.
- **Backend API Layer**: Next.js Route Handlers (`src/app/api/*`) with NextAuth v5 session guards, dealer multi-tenant isolation, structured JSON responses.
- **Data Layer**: Prisma ORM (`prisma/schema.prisma`), centralized constants and enums in `src/constants/` with zero magic strings/numbers.
- **Realtime / Hardware Layer**: WebSocket connectors (`Harem` & `Altis`), Canvas/SVG vector thermal label engine, HTML5 camera barcode scanner, PWA offline/standalone support.

## Feature Inventory
| # | Feature | Description | Milestone | Source | Status |
|---|---------|-------------|-----------|--------|:------:|
| 1 | Centralized Constants & Enums | Centralized gold fineness factors, ziynet weights, payment methods, transaction types, and label dimensions | M1 | User Rule & Survey | **DONE** |
| 2 | DB Schema Migrations | `CashRegisterSession`, `CashMovement`, `minThreshold` on `Stock`, and dual-balance fields | M1 | Survey | **DONE** |
| 3 | Gram Has & TL Dual Balance Ledger | Independent and consistent Gram Has and TL balances for customers and suppliers | M2 | R1 (ORIGINAL_REQUEST §13) | **DONE** |
| 4 | Accurate Gold Valuation & Rate Recording | Store historical transaction gold fineness and calculate live portfolio valuation | M2 | R1 (ORIGINAL_REQUEST §13, 34) | **DONE** |
| 5 | Detailed Customer Statement & Running Balance | Comprehensive statement with chronological running balance (`Yürüyen Bakiye`) | M2 | R1 (ORIGINAL_REQUEST §13, 33) | **DONE** |
| 6 | Multi-Payment POS Transaction Persistence | Capture and persist payment methods (`CASH`, `CARD`, `BANK`, `HAS`, `DEBT`) | M3 | R2 (ORIGINAL_REQUEST §16, 37) | **DONE** |
| 7 | Cash Register Session & Daily Consolidation | Aggregate sales, customer collections, supplier payments, and scrap buys | M3 | R2 (ORIGINAL_REQUEST §16, 37) | **DONE** |
| 8 | Opening/Closing Reconciliation & Z-Report UI | Dashboard at `/z-report` for opening drawer, counting physical cash, variance check | M3 | R2 (ORIGINAL_REQUEST §16, 38) | **DONE** |
| 9 | Thermal Z-Report Slip Print | 80mm/58mm thermal receipt layout with complete daily metrics breakdown | M3 | R2 (ORIGINAL_REQUEST §16, 38) | **DONE** |
| 10 | Dual-Wing Kelebek Label Layout (74x12mm) | Left wing (Carat/Weight/Category), Bridge (blank), Right wing (Barcode/Price/Milyem) | M4 | R3 (ORIGINAL_REQUEST §19, 41) | **DONE** |
| 11 | Canvas/SVG Vector Print & ZPL II Generator | Local vector label renderer (no external CDN) + ZPL string builder for thermal printers | M4 | R3 (ORIGINAL_REQUEST §19, 41) | **DONE** |
| 12 | Bulk / Batch Label Printing Modal | Multi-selection batch label printing from inventory table | M4 | R3 (ORIGINAL_REQUEST §19, 41) | **DONE** |
| 13 | Standalone Fullscreen Showcase Route (`/showcase`) | High-contrast TV showcase digital signage mode with live price socket sync | M5 | R4 (ORIGINAL_REQUEST §22, 42) | **DONE** |
| 14 | Promotional Banners & Scrolling Marquee (Ticker) | Configurable store announcements, custom messages, and bottom live ticker tape | M5 | R4 (ORIGINAL_REQUEST §22, 42) | **DONE** |
| 15 | PWA Manifest & Service Worker | Web App Manifest and Service Worker for standalone mobile/tablet installation | M6 | R5 (ORIGINAL_REQUEST §25) | **DONE** |
| 16 | Camera Barcode Scanner Integration | Fast camera-based barcode scanning modal hooked into retail POS and stock lookup | M6 | R5 (ORIGINAL_REQUEST §25, 45) | **DONE** |
| 17 | 1-Click WhatsApp Sharing | Instant WhatsApp link generation for transaction receipts, statements, and quotes | M6 | R5 (ORIGINAL_REQUEST §25, 46) | **DONE** |
| 18 | Stock Turnover Velocity Analytics | 7/30/90-day circulation speed ($V_{daily}$, $D_{out}$) categorizing items by velocity | M6 | R6 (ORIGINAL_REQUEST §28, 50) | **DONE** |
| 19 | Visual Critical Stock Alerts & Reorder Draft | Prominent badges for low-stock items and 1-click wholesale reorder draft list | M6 | R6 (ORIGINAL_REQUEST §28, 49) | **DONE** |
| 20 | E2E Testing Suite (Tiers 1-4) & Adversarial Hardening | Comprehensive automated test harness, verification scripts, and adversarial edge tests | M7 | Dual Track Strategy | **DONE** |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|:------:|
| M1 | Constants, Enums & Schema Migration | Centralized enums/constants in `src/constants/`, schema updates, Prisma client generation | none | **DONE** |
| M2 | Has / Altın Cari & Veresiye Takibi (R1) | Dual Has/TL customer balances, conversion engine, running ledger, valuation | M1 | **DONE** |
| M3 | Gün Sonu & Kasa Kapatma (Z-Raporu) (R2) | Multi-channel payment persistence, cash register session, Z-Report UI & thermal print | M1 | **DONE** |
| M4 | Termal Kelebek Etiket Yazıcı Desteği (R3) | Dual-wing 74x12mm label renderer, ZPL II builder, batch print modal in stocks | M1 | **DONE** |
| M5 | TV Vitrin & Digital Signage (R4) | Fullscreen `/showcase` route, live WebSocket rates, announcements, marquee ticker | M1 | **DONE** |
| M6 | Mobil/PWA, Kamera, WhatsApp & Stok Devir (R5+R6) | PWA setup, camera scanner hook, WhatsApp generator, turnover analytics, reorder draft | M1, M2 | **DONE** |
| M7 | E2E Integration, 100% Test Pass & Hardening | Full requirement test pass (Tiers 1-4) and Tier 5 adversarial stress hardening | M2, M3, M4, M5, M6 | **DONE** |

## Interface Contracts
- `src/constants/cari.ts`: `GOLD_FINENESS_RATES`, `ZIYNET_WEIGHTS`, `CUSTOMER_TRANSACTION_TYPES`, `ASSET_TYPES`.
- `src/constants/kasa.ts`: `PAYMENT_METHODS`, `CASH_MOVEMENT_TYPES`, `SESSION_STATUS`, `DISCREPANCY_STATUS`.
- `src/constants/labels.ts`: `LABEL_TEMPLATES`, `LABEL_DIMENSIONS`, `LABEL_DPI`, `BARCODE_TYPES`.
- `src/constants/stocks.ts`: `DEFAULT_MIN_STOCK_THRESHOLD`, `TURNOVER_CATEGORIES`, `STOCK_ALERT_LEVELS`.
- `src/constants/showcase.ts`: `SHOWCASE_INTERVALS`, `SHOWCASE_CHANNELS`.

## Code Layout
- `src/constants/`: Centralized enums and configuration tables (zero magic values).
- `src/lib/`: Backend utilities (`cari.ts`, `z-report.ts`, `whatsapp.ts`, `labels/kelebek.ts`, `labels/zpl.ts`, `stocks/analytics.ts`).
- `src/app/api/`: REST API endpoints (`customers/[id]/statement`, `z-report`, `z-report/session`, `stocks/analytics`, `stocks/reorder`).
- `src/app/(panel)/`: Authenticated ERP views (`customers`, `transactions`, `stocks`, `suppliers`, `z-report`, `prices`, `price-check`, `dashboard`).
- `src/app/showcase/`: Unmanned TV Showcase Digital Signage route.
- `src/components/`: Modular components (`KelebekLabelModal`, `BatchLabelPrintModal`, `ZReportSlipModal`, `CameraScannerModal`, `CriticalStockBadge`, `ReorderDraftModal`, `ShowcaseRatesGrid`, `ShowcaseTicker`).
- `tests/`: 213 automated tests across Tiers 1-4 + empirical stress and lifecycle verification suites.

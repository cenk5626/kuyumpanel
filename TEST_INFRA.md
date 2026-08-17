# E2E Test Infra: kuyumpanel Enterprise Jewelry Management System

## Test Philosophy
- Opaque-box, requirement-driven. Derives from `ORIGINAL_REQUEST.md` and `PROJECT.md`.
- Systematic 4-tier methodology:
  - **Tier 1 - Feature Coverage (>=5 per feature)**: Isolated functional validation of every feature.
  - **Tier 2 - Boundary & Corner Cases (>=5 per feature)**: Zero values, extreme gold prices, negative amounts, high carats, empty inputs.
  - **Tier 3 - Cross-Feature Combinations (Pairwise)**: Multi-channel sales affecting cash sessions, stock reductions updating turnover velocity, customer veresiye affecting balance statements.
  - **Tier 4 - Real-World Application Scenarios**: Full daily lifecycle (open cash register -> retail sale with mixed cash/card -> gold scrap purchase -> customer debt entry -> daily Z-report close -> wholesale replenishment draft).

## Feature Inventory Mapping
| # | Feature | Requirement | Tier 1 | Tier 2 | Tier 3 | Tier 4 |
|---|---------|-------------|:------:|:------:|:------:|:------:|
| 1 | Centralized Constants & Enums | Rule & Survey | 5 | 5 | ✓ | ✓ |
| 2 | DB Schema Migrations | Survey | 5 | 5 | ✓ | ✓ |
| 3 | Gram Has & TL Dual Balance Ledger | R1 | 5 | 5 | ✓ | ✓ |
| 4 | Accurate Gold Valuation & Rate Recording | R1 | 5 | 5 | ✓ | ✓ |
| 5 | Detailed Customer Statement & Running Balance | R1 | 5 | 5 | ✓ | ✓ |
| 6 | Multi-Payment POS Transaction Persistence | R2 | 5 | 5 | ✓ | ✓ |
| 7 | Cash Register Session & Daily Consolidation | R2 | 5 | 5 | ✓ | ✓ |
| 8 | Opening/Closing Reconciliation & Z-Report UI | R2 | 5 | 5 | ✓ | ✓ |
| 9 | Thermal Z-Report Slip Print | R2 | 5 | 5 | ✓ | ✓ |
| 10 | Dual-Wing Kelebek Label Layout (74x12mm) | R3 | 5 | 5 | ✓ | ✓ |
| 11 | Canvas/SVG Vector Print & ZPL II Generator | R3 | 5 | 5 | ✓ | ✓ |
| 12 | Bulk / Batch Label Printing Modal | R3 | 5 | 5 | ✓ | ✓ |
| 13 | Standalone Fullscreen Showcase Route (`/showcase`) | R4 | 5 | 5 | ✓ | ✓ |
| 14 | Promotional Banners & Scrolling Marquee | R4 | 5 | 5 | ✓ | ✓ |
| 15 | PWA Manifest & Service Worker | R5 | 5 | 5 | ✓ | ✓ |
| 16 | Camera Barcode Scanner Integration | R5 | 5 | 5 | ✓ | ✓ |
| 17 | 1-Click WhatsApp Sharing | R5 | 5 | 5 | ✓ | ✓ |
| 18 | Stock Turnover Velocity Analytics | R6 | 5 | 5 | ✓ | ✓ |
| 19 | Visual Critical Stock Alerts & Reorder Draft | R6 | 5 | 5 | ✓ | ✓ |
| 20 | E2E Integration & Verification | All | 5 | 5 | ✓ | ✓ |

## Test Architecture
- Test Runner: Node.js / TypeScript test suites in `tests/` executable via standard scripts (`npm test` or `npx tsx tests/run-all-tests.ts`).
- Verification outputs: JSON logs and JUnit/Console reports.

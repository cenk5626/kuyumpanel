# BRIEFING — 2026-08-17T21:54:00+03:00

## Mission
Investigate specifications, data models, business logic, API routes, UI components, and edge cases for Requirements R1 (Has / Gold Cari & Veresiye), R2 (Gün Sonu & Kasa Kapatma / Z-Raporu), and R3 (Termal Kuyumcu Barkod & Kelebek Etiket) in kuyumpanel.

## 🔒 My Identity
- Archetype: spec_miner
- Roles: Specification Miner, Domain Expert
- Working directory: c:\xampp\htdocs\kuyumpanel\.agents\spec_miner_r1_r3
- Original parent: af2e4910-70f8-4856-9e07-f62c96e909b6
- Milestone: Requirements Exploration & Specification Mining (R1, R2, R3)

## 🔒 Key Constraints
- Read-only exploration: Do NOT edit any application source code.
- Magic string & magic number rule: All critical values must be defined as constants or enums.
- Strict Next.js guidelines: Follow Next.js App Router conventions.
- All evidence must include exact file paths and line numbers.
- Self-contained handoff with 5 components (Observation, Logic Chain, Caveats, Conclusion, Verification Method).

## Current Parent
- Conversation ID: af2e4910-70f8-4856-9e07-f62c96e909b6
- Updated: 2026-08-17T21:54:00+03:00

## Task Summary
- **What to build/probe**:
  1. R1: Has & Altın Cinsinden Cari Hesap & Veresiye Takibi (TL & Gram Has dual balances, rate snapshotting, ledger/statement history, accurate valuation).
  2. R2: Gün Sonu & Kasa Kapatma (Z-Raporu) (Consolidated cash/POS/scrap/has movements, opening/closing, reconciliation, Z-Report print/view).
  3. R3: Termal Kuyumcu Barkod & Kelebek Etiket Yazıcı Desteği (Jewelry butterfly/thermal label format, preview, browser printing / ZPL/HTML-canvas).
- **Completed Deliverables**:
  - `analysis.md`: Exhaustive technical specification with feature tables, schema definitions, constant mappings, edge case matrices, and architecture blueprints.
  - `handoff.md`: 5-component structured handoff report with exact observations, logic chains, caveats, conclusions, and verification steps.

## Key Decisions Made
- Discovered that R1 needs constant definitions for fineness/ziynet factors and running balance ledger.
- Discovered that R2 requires adding `paymentMethod` to `Transaction` and introducing `CashRegisterSession` & `CashMovement` models.
- Discovered that R3 requires standard dual-wing Kelebek (74x12mm / 80x13mm) Canvas/SVG vector preview/print, batch print, and ZPL II generator.

## Artifact Index
- `c:\xampp\htdocs\kuyumpanel\.agents\spec_miner_r1_r3\DISPATCH.md` — Dispatch message
- `c:\xampp\htdocs\kuyumpanel\.agents\spec_miner_r1_r3\progress.md` — Progress tracker and liveness heartbeat
- `c:\xampp\htdocs\kuyumpanel\.agents\spec_miner_r1_r3\BRIEFING.md` — Agent briefing & situational awareness
- `c:\xampp\htdocs\kuyumpanel\.agents\spec_miner_r1_r3\analysis.md` — Detailed technical findings for R1, R2, R3
- `c:\xampp\htdocs\kuyumpanel\.agents\spec_miner_r1_r3\handoff.md` — Final 5-component handoff report

# BRIEFING — 2026-08-17T21:54:35+03:00

## Mission
Probe and document specifications and existing implementations for Requirements R4 (Digital Signage / TV Showcase), R5 (Mobile/PWA, Camera Barcode Scanner, WhatsApp Sharing), and R6 (Stock Turnover Speed & Critical Stock Alerts, Reorder Drafts) for kuyumpanel.

## 🔒 My Identity
- Archetype: Specification Miner
- Roles: Teamwork specialist, specification probing, reverse engineering
- Working directory: c:\xampp\htdocs\kuyumpanel\.agents\spec_miner_r4_r6
- Original parent: af2e4910-70f8-4856-9e07-f62c96e909b6
- Milestone: Spec Mining R4-R6

## 🔒 Key Constraints
- Read-only exploration: do NOT edit source code files.
- Magic number / string control: all important values must be represented by constants or enums.
- Comprehensive technical evidence: exact file paths, line numbers, schemas, APIs, UI routes.
- 5-Component handoff report in `handoff.md` and detailed analysis in `analysis.md`.
- Communicate to caller via `send_message`.

## Current Parent
- Conversation ID: af2e4910-70f8-4856-9e07-f62c96e909b6
- Updated: 2026-08-17T21:54:35+03:00

## Task Summary
- **What to build**: Specification discovery for R4 (TV Signage), R5 (PWA/Barcode/WhatsApp), R6 (Turnover/Alerts/Reorders).
- **Success criteria**: Detailed technical spec, API definitions, schemas, constants/enums, edge cases in analysis.md and handoff.md.
- **Interface contracts**: Defined in analysis.md & handoff.md.
- **Code layout**: Kuyumpanel project root `c:\xampp\htdocs\kuyumpanel`.

## Key Decisions Made
- Completed in-depth exploration of codebase and specifications.
- Documented full requirements for R4 (TV Showcase `/showcase`, WebSocket synchronization, announcement banners, ticker).
- Documented full requirements for R5 (PWA manifest, service worker, camera barcode scanning, 1-click WhatsApp receipt/statement/quote sharing).
- Documented full requirements for R6 (Turnover speed formulas, critical stock thresholds, visual alerts, reorder draft with wholesale WhatsApp ordering).
- Compiled all findings in `analysis.md` and `handoff.md`.

## Artifact Index
- `c:\xampp\htdocs\kuyumpanel\.agents\spec_miner_r4_r6\DISPATCH.md` — Dispatch prompt
- `c:\xampp\htdocs\kuyumpanel\.agents\spec_miner_r4_r6\BRIEFING.md` — Persistent state
- `c:\xampp\htdocs\kuyumpanel\.agents\spec_miner_r4_r6\progress.md` — Heartbeat log
- `c:\xampp\htdocs\kuyumpanel\.agents\spec_miner_r4_r6\analysis.md` — Detailed technical findings
- `c:\xampp\htdocs\kuyumpanel\.agents\spec_miner_r4_r6\handoff.md` — 5-Component handoff report

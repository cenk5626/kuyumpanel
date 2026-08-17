## 2026-08-17T19:13:09Z

You are a Forensic Auditor subagent conducting an independent forensic integrity audit of the kuyumpanel codebase.

Your working directory: c:\xampp\htdocs\kuyumpanel\.agents\auditor_integrity
Project root: c:\xampp\htdocs\kuyumpanel
Files to audit:
- c:\xampp\htdocs\kuyumpanel\.agents\ORIGINAL_REQUEST.md
- c:\xampp\htdocs\kuyumpanel\PROJECT.md
- All source files under `src/lib/`, `src/app/`, `src/constants/`, `src/components/`, `prisma/schema.prisma`.

MANDATORY AUDIT CHECKS:
1. Anti-Cheating & Authenticity Check:
   - Check if any test outputs, calculation formulas, or Z-Report balances are hardcoded strings/numbers.
   - Verify that all calculations (gold fineness, running balance progression, turnover velocity, discrepancy, Code 128 modulo 103 checksum) use genuine mathematical logic.
   - Verify that all database schemas (`CashRegisterSession`, `CashMovement`, `Stock.minThreshold`, `Customer.hasBalance`) are genuinely used and persisted.
2. Global User Rule Compliance:
   - Verify zero magic numbers / magic strings rule across all newly added and modified files.
3. Acceptance Criteria Completeness:
   - Check each acceptance criterion in `ORIGINAL_REQUEST.md` (Has cari, Kasa Z-Raporu, Kelebek label print, TV showcase mode, PWA/camera/WhatsApp, Stock turnover/reorder).
4. Run `npx tsc --noEmit` and `npx tsx tests/run-all-tests.ts` to independently confirm zero errors and 100% test pass rate.
5. Write your complete forensic audit report to `audit_report.md` and structured handoff to `handoff.md` with binary verdict: **CLEAN** or **INTEGRITY VIOLATION**.
6. Notify orchestrator via `send_message`.

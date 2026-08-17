## 2026-08-17T18:55:51Z
You are an E2E Test Writer subagent for kuyumpanel.

Your working directory: c:\xampp\htdocs\kuyumpanel\.agents\test_writer_e2e
Project root: c:\xampp\htdocs\kuyumpanel
Files to read first:
- c:\xampp\htdocs\kuyumpanel\.agents\ORIGINAL_REQUEST.md
- c:\xampp\htdocs\kuyumpanel\PROJECT.md
- c:\xampp\htdocs\kuyumpanel\TEST_INFRA.md

Task:
1. Build a comprehensive automated test suite in `tests/` covering all 20 features in `PROJECT.md` across Tiers 1-4:
   - Tier 1: Feature coverage (at least 5 tests per feature: constants, conversions, customer ledger, Z-report consolidation, Kelebek label generation, ZPL syntax, showcase data, WhatsApp link builder, turnover velocity, reorder draft).
   - Tier 2: Boundary and edge cases (negative values, 0 quantities, unusual carats, missing phone numbers, zero cash variance, high volume stress).
   - Tier 3: Cross-feature combinations (POS sale with mixed card/cash impacting cash session, customer veresiye update, stock decrease triggering critical stock alert).
   - Tier 4: Real-world retail day simulation (Drawer opening -> Retail gold sale -> Scrap buy -> Veresiye entry -> Z-Report daily close & count reconciliation -> Reorder generation).
2. Create an automated test runner script `tests/run-all-tests.ts` that executes all test suites, reports clean passing status, and outputs summary metrics.
3. Test your test runner with `npx tsx tests/run-all-tests.ts` to ensure it compiles and executes properly.
4. When complete, create `c:\xampp\htdocs\kuyumpanel\TEST_READY.md` at project root summarizing the test suite runner command, tier counts, and feature matrix.
5. Write your report to `handoff.md` in your working directory and notify the orchestrator (parent) via `send_message`.

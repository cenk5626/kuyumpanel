## 2026-08-17T19:00:27Z
You are a Worker subagent implementing Milestone M2 (Has / Altın Cari & Veresiye Takibi - R1) for kuyumpanel.

Your working directory: c:\xampp\htdocs\kuyumpanel\.agents\worker_m2
Project root: c:\xampp\htdocs\kuyumpanel
Files to read first:
- c:\xampp\htdocs\kuyumpanel\.agents\ORIGINAL_REQUEST.md
- c:\xampp\htdocs\kuyumpanel\PROJECT.md
- c:\xampp\htdocs\kuyumpanel\.agents\spec_miner_r1_r3\analysis.md
- c:\xampp\htdocs\kuyumpanel\src\constants\cari.ts

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Files You Exclusively Own:
- `src/lib/cari.ts` (create)
- `src/app/api/customers/[id]/statement/route.ts` (create)
- `src/app/api/customer-transactions/route.ts` (update)
- `src/app/api/customers/route.ts` (update)
- `src/app/(panel)/customers/CustomersClient.tsx` (update)
- `src/app/(panel)/customers/page.tsx` (update)

Scope & Tasks:
1. Implement `src/lib/cari.ts`: Helper functions for customer ledger calculations, gold fineness conversions using `src/constants/cari.ts`, calculating progressive running balances (`runningBalanceTL`, `runningBalanceHas`), and live portfolio valuation.
2. Implement `src/app/api/customers/[id]/statement/route.ts`: Endpoint returning full chronological transactions with opening balance, progressive running balance at each row, total Gram Has debt/credit, total TL debt/credit, and current valuation.
3. Update `src/app/api/customer-transactions/route.ts`: Use constants from `src/constants/cari.ts` (no magic numbers/strings), calculate exact `hasEquivalent` on all debt and collection entries, and update `Customer` `hasBalance` and `tlBalance` consistently.
4. Update `src/app/(panel)/customers/CustomersClient.tsx` & `customers/page.tsx`:
   - Dual-balance summary cards (Toplam Gram Has Bakiye & Toplam TL Bakiye).
   - Live gold valuation badge showing current TL equivalent of Gram Has debts.
   - Comprehensive customer statement modal with running balance column, date filters, and print/export layout.
   - New transaction modal with gold carat selection (24K, 22K, 18K, 14K, 8K) and Ziynet selection (Çeyrek, Yarım, Tam, Ata, Gremse) with auto-calculated Has gramaj.
5. Verify TypeScript compilation (`npx tsc --noEmit`) and run tests (`npx tsx tests/run-all-tests.ts`).
6. Write `changes.md` and `handoff.md` in your working directory and notify the orchestrator (parent) via `send_message`.

# BRIEFING — 2026-08-17T22:04:00+03:00

## Mission
Implement Milestone M2 (Has / Altın Cari & Veresiye Takibi - R1) for kuyumpanel: dual-currency customer balances (TL & Gram Has), gold fineness conversion logic, customer statement endpoint with progressive running balances & valuation, updated customer transaction API, and rich UI in CustomersClient.tsx & customers/page.tsx.

## 🔒 My Identity
- Archetype: worker
- Roles: implementer, qa, specialist
- Working directory: c:\xampp\htdocs\kuyumpanel\.agents\worker_m2
- Original parent: af2e4910-70f8-4856-9e07-f62c96e909b6
- Milestone: M2 (Has / Altın Cari & Veresiye Takibi - R1)

## 🔒 Key Constraints
- No magic numbers or strings (use enums/constants from `src/constants/cari.ts` and related constants).
- Genuine implementations only (no dummy/facade implementations).
- Maintain dual-currency balance tracking (TL and Gram Has) cleanly and correctly in DB and computations.
- Typescript compilation must pass cleanly for owned files (`npx tsc --noEmit`).
- All tests must pass (`npx tsx tests/run-all-tests.ts`).

## Current Parent
- Conversation ID: af2e4910-70f8-4856-9e07-f62c96e909b6
- Updated: 2026-08-17T22:04:00+03:00

## Task Summary
- **What to build**:
  1. `src/lib/cari.ts`: Pure calculations for gold fineness, ziynet conversions, running balance ledger, dual-balance aggregation, portfolio valuation, and WhatsApp message builder.
  2. `src/app/api/customers/[id]/statement/route.ts`: Detailed customer statement endpoint with date filtering, opening balances, running balances, and spot gold valuation.
  3. `src/app/api/customer-transactions/route.ts`: Gold conversions, transaction saving, dual balance updating using constants and Prisma transaction.
  4. `src/app/api/customers/route.ts`: Handling customer balance aggregations/fields using pure cari engine.
  5. `src/app/(panel)/customers/CustomersClient.tsx` & `customers/page.tsx`: UI for dual-balance cards, valuation badge, statement modal with date filter/export/print/WhatsApp share, and new transaction modal with gold carat & ziynet presets.
- **Success criteria**:
  - Full TS typecheck passes for all owned files.
  - All 213 test suites in `tests/run-all-tests.ts` pass with 100% rate.
  - Dedicated unit tests `tests/cari_lib_verification.test.ts` pass with 100% rate.
- **Interface contracts**: `src/constants/cari.ts`, `PROJECT.md`
- **Code layout**: `src/lib/cari.ts`, `src/app/api/customers/[id]/statement/route.ts`, `src/app/api/customer-transactions/route.ts`, `src/app/api/customers/route.ts`, `src/app/(panel)/customers/`

## Key Decisions Made
- `src/lib/cari.ts` handles all gold fineness conversions (`24K`, `22K`, `18K`, `14K`, `8K`), ziynet piece calculations (`Çeyrek`, `Yarım`, `Tam`, `Ata`, `Gremse`), progressive running balances (`runningBalanceTL`, `runningBalanceHas`), portfolio valuation, and WhatsApp URL generation.
- `src/app/api/customer-transactions/route.ts` runs in a Prisma `$transaction` that automatically recalculates and synchronizes `Customer` `hasBalance` and `tlBalance` scalar fields.
- `CustomersClient.tsx` features instant multi-asset category switching (`TL`, `Altın Ayar`, `Ziynet Altın`, `Döviz`), real-time Has equivalent previews, date filtering on statement modals with opening balance calculations, print styles, and WhatsApp 1-click customer statement dispatch.

## Change Tracker
- **Files created**:
  - `src/lib/cari.ts`
  - `src/app/api/customers/[id]/statement/route.ts`
  - `tests/cari_lib_verification.test.ts`
- **Files modified**:
  - `src/app/api/customer-transactions/route.ts`
  - `src/app/api/customers/route.ts`
  - `src/app/(panel)/customers/page.tsx`
  - `src/app/(panel)/customers/CustomersClient.tsx`
- **Build status**: PASS
- **Pending issues**: none

## Quality Status
- **Build/test result**: PASS (213/213 test suites passed in `tests/run-all-tests.ts` + 5/5 passed in `tests/cari_lib_verification.test.ts`)
- **Lint status**: clean
- **Tests added/modified**: `tests/cari_lib_verification.test.ts`

## Loaded Skills
- none

## Artifact Index
- `.agents/worker_m2/DISPATCH.md` — Assignment
- `.agents/worker_m2/progress.md` — Progress tracker
- `.agents/worker_m2/BRIEFING.md` — Working memory
- `.agents/worker_m2/changes.md` — Detailed list of changes
- `.agents/worker_m2/handoff.md` — Handoff report

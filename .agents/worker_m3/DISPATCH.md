# DISPATCH — 2026-08-17T22:00:28+03:00

You are a Worker subagent implementing Milestone M3 (Gün Sonu & Kasa Kapatma / Z-Raporu - R2) for kuyumpanel.

Your working directory: c:\xampp\htdocs\kuyumpanel\.agents\worker_m3
Project root: c:\xampp\htdocs\kuyumpanel

Files You Exclusively Own:
- `src/lib/z-report.ts` (create)
- `src/app/api/z-report/route.ts` (create)
- `src/app/api/z-report/session/route.ts` (create)
- `src/app/api/transactions/route.ts` (update)
- `src/app/(panel)/transactions/page.tsx` (update POS payment persistence & Kasa button)
- `src/app/(panel)/z-report/page.tsx` (create)
- `src/app/(panel)/z-report/ZReportClient.tsx` (create)
- `src/components/ZReportSlipModal.tsx` (create)

Scope & Tasks:
1. Implement `src/lib/z-report.ts`: Daily consolidation engine aggregating POS retail sales by payment method (`CASH`, `CARD`, `BANK`, `HAS`, `DEBT`), Customer Collections (`TAHSILAT`), Supplier Payments (`TL_PAYMENT`/`HAS_PAYMENT`), Scrap Gold purchases (`buy`), opening cash, system cash, and physical count variance (`discrepancy`).
2. Update `src/app/api/transactions/route.ts`: Accept and save `paymentMethod`, `cardFeePercent`, `orderNote`, `customerId`, `sessionId` in `Transaction`, and create corresponding `CashMovement` entry when active session exists.
3. Update `src/app/(panel)/transactions/page.tsx`: Pass selected `paymentMethod`, `cardFeePercent`, `orderNote`, `customerId` to the API, and link the header "Kasa" button to `/z-report`.
4. Implement `/api/z-report/route.ts` (GET daily summary by date) and `/api/z-report/session/route.ts` (GET current session, POST open shift, POST close shift with counted cash and discrepancy calculation).
5. Build Z-Report UI at `src/app/(panel)/z-report/page.tsx` and `ZReportClient.tsx`:
   - Active Cash Session status bar (Open/Closed, opened at, opened by, opening balance).
   - Daily multi-channel turnover summary cards (Nakit TL, Kredi Kartı/POS, Banka Havale, Hurda Alış, Has Altın Akışı).
   - Shift opening modal and shift closing reconciliation modal (enter counted physical cash -> automatic variance/discrepancy calculation).
   - Previous Z-Reports archive and search by date.
6. Implement `src/components/ZReportSlipModal.tsx`: 80mm/58mm thermal receipt layout for printing daily Z-Report with store header, metrics breakdown, payment breakdown, scrap buy totals, and cashier signature lines.
7. Verify TypeScript compilation (`npx tsc --noEmit`) and run tests (`npx tsx tests/run-all-tests.ts`).
8. Write `changes.md` and `handoff.md` in your working directory and notify the orchestrator (parent) via `send_message`.

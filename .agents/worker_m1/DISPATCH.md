## 2026-08-17T18:55:51Z
You are a Worker subagent implementing Milestone M1 (Constants, Enums & Database Schema Migrations) for kuyumpanel.

Your working directory: c:\xampp\htdocs\kuyumpanel\.agents\worker_m1
Project root: c:\xampp\htdocs\kuyumpanel
Files to read first:
- c:\xampp\htdocs\kuyumpanel\.agents\ORIGINAL_REQUEST.md
- c:\xampp\htdocs\kuyumpanel\PROJECT.md
- c:\xampp\htdocs\kuyumpanel\.agents\spec_miner_r1_r3\analysis.md
- c:\xampp\htdocs\kuyumpanel\.agents\spec_miner_r4_r6\analysis.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Scope & Task:
1. Create and export centralized constants and enums (satisfying the zero magic numbers/strings rule):
   - `src/constants/cari.ts`: Gold fineness factors (`24K: 0.995`, `22K: 0.916`, `18K: 0.750`, `14K: 0.585`, `8K: 0.333`), Ziynet weights (`CEYREK: 1.605`, `YARIM: 3.210`, `TAM: 6.420`, `ATA: 6.608`, `GREMSE: 16.050`), transaction types (`BORC`, `TAHSILAT`, `ALACAK`, `ODEME`).
   - `src/constants/kasa.ts`: Payment methods (`CASH`, `CARD`, `BANK`, `HAS`, `DEBT`), cash movement types (`POS_SALE`, `CUSTOMER_COLLECTION`, `SUPPLIER_PAYMENT`, `SCRAP_BUY`, `MANUAL_IN`, `MANUAL_OUT`), session statuses (`OPEN`, `CLOSED`).
   - `src/constants/labels.ts`: Label templates (`BUTTERFLY_74x12`, `BARBELL_50x12`), dimensions, wing sizes (Left wing 28mm, bridge 18mm, right wing 28mm), barcode types.
   - `src/constants/stocks.ts`: Turnover velocity categories (`HIZLI`, `NORMAL`, `YAVAS`, `HAREKETSIZ`), default minimum stock thresholds (`DEFAULT_MIN_STOCK_THRESHOLD = 5`).
2. Update `prisma/schema.prisma`:
   - Extend `Transaction` model with `paymentMethod`, `cardFeePercent`, `orderNote`, `customerId`.
   - Extend `Stock` model with `minThreshold` (`Float @default(5)`).
   - Add `CashRegisterSession` model (`id`, `sessionNumber`, `status`, `openingCash`, `closingCash`, `systemCash`, `countedCash`, `discrepancy`, `notes`, `openedAt`, `closedAt`, `openedBy`, `closedBy`, `dealerId`, `createdAt`, `updatedAt`).
   - Add `CashMovement` model (`id`, `sessionId`, `type`, `paymentMethod`, `amount`, `currency`, `hasEquivalent`, `description`, `referenceId`, `employeeName`, `dealerId`, `createdAt`).
3. Run `npx prisma db push` and `npx prisma generate` to apply the migrations to the SQLite database and generate the Prisma Client.
4. Verify TypeScript compilation cleanly with `npx tsc --noEmit`.
5. Write your detailed changes to `changes.md` and summary report to `handoff.md` in your working directory `c:\xampp\htdocs\kuyumpanel\.agents\worker_m1`.
6. Notify orchestrator via `send_message` upon completion.

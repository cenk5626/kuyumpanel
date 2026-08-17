# Changes Implemented - Milestone M2 (Has / Altın Cari & Veresiye Takibi - R1)

## Summary
Milestone M2 implements full enterprise jewelry dual-currency customer balances (TL & Gram Has), physical gold fineness conversion engine, comprehensive customer statement generation with progressive running balances (`runningBalanceTL` and `runningBalanceHas`), spot gold portfolio valuation, and interactive UI for customer veresiye tracking and statement dispatch.

## Files Created / Modified

### 1. `src/lib/cari.ts` (Created)
- **Role**: Pure domain calculation engine for jewelry ledger operations.
- **Key Capabilities**:
  - `calculateGoldFineness`: Converts carat weights (`24K`, `22K`, `18K`, `14K`, `8K`) to pure Gram Has equivalent via `GOLD_FINENESS_RATES`.
  - `calculateZiynetHas`: Converts piece quantities of standard Turkish minted gold coins (`Çeyrek`, `Yarım`, `Tam`, `Ata`, `Gremse`) to pure Gram Has equivalent.
  - `computeCustomerStatement`: Computes chronological running balance step-by-step (`runningBalanceTL`, `runningBalanceHas`), progressive summary, total debit/credit totals, and spot rate valuation.
  - `calculatePortfolioValuation`: Evaluates multi-asset portfolios (`Has`, `TL`, `USD`, `EUR`) in TL at live market spot rates.
  - `calculateCustomerBalancesFromTransactions`: Aggregates customer balances across arbitrary transaction sets.
  - `normalizePhoneNumber` & `buildWhatsAppStatementUrl`: Builds pre-formatted WhatsApp share links for customer statement dispatch.

### 2. `src/app/api/customers/[id]/statement/route.ts` (Created)
- **Role**: Dynamic REST API endpoint returning customer account statement.
- **Key Capabilities**:
  - Validates session and multi-tenant dealer authorization.
  - Supports `startDate`, `endDate`, and `spotRate` query parameters.
  - Calculates opening balance (`openingBalance.tl`, `openingBalance.has`) for filtered date ranges.
  - Returns detailed chronological transaction rows with running balances and full summary metrics.

### 3. `src/app/api/customer-transactions/route.ts` (Updated)
- **Role**: Customer debt and collection transaction endpoint.
- **Key Changes**:
  - Removed all hardcoded magic numbers and string literals, adopting `@/constants/cari`.
  - Uses `calculateHasEquivalent` for precise gold fineness calculations on every debt and payment entry.
  - Executes database updates within a Prisma `$transaction` that automatically recalculates and syncs `Customer` `hasBalance` and `tlBalance` scalar fields.

### 4. `src/app/api/customers/route.ts` (Updated)
- **Role**: Customer directory listing and CRUD endpoint.
- **Key Changes**:
  - Utilizes `calculateCustomerBalancesFromTransactions` from `@/lib/cari`.
  - Ensures accurate dual-balance serialization (`tlBalance`, `hasBalance`, `totalHasEquivalent`, `usdBalance`, `eurBalance`).

### 5. `src/app/(panel)/customers/page.tsx` (Updated)
- **Role**: Server Component for customer management page.
- **Key Changes**:
  - Uses `calculateCustomerBalancesFromTransactions` to prepare initial customer states.
  - Fetches and passes live spot gold rate (`GAUTRY`) and FX rates (`USDTRY`, `EURTRY`).

### 6. `src/app/(panel)/customers/CustomersClient.tsx` (Updated)
- **Role**: Interactive customer veresiye dashboard and statement client component.
- **Key Features**:
  - **Dual-Balance Summary Cards**: Visual cards for Toplam Gram Has Alacak (with live spot valuation badge) and Net TL Borç Bakiyesi (with Has equivalent).
  - **New Transaction Modal**:
    - Asset category selector: `TL`, `Altın Ayar (Gram)`, `Ziynet Altın (Adet)`, `Döviz ($/€)`.
    - Gold carat options (`24K`, `22K`, `18K`, `14K`, `8K`) with auto-calculated Has gramaj.
    - Ziynet coin options (`Çeyrek`, `Yarım`, `Tam`, `Ata`, `Gremse`) with auto-calculated Has gramaj.
    - Real-time preview of Has equivalent and estimated TL valuation.
  - **Customer Statement Modal**:
    - Detailed running balance table with `Yürüyen Has (gr)` and `Yürüyen TL (₺)` columns.
    - Quick date filters: "Tümü", "Bugün", "Son 7 Gün", "Son 30 Gün", and custom date pickers.
    - Opening balance banner when date filters are active.
    - High-contrast clean print layout (`@media print` support).
    - 1-Click WhatsApp statement sharing button.

### 7. `tests/cari_lib_verification.test.ts` (Created)
- **Role**: Dedicated verification test for `src/lib/cari.ts` operations (100% pass).

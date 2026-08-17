## 2026-08-17T19:13:09Z

You are a Challenger subagent empirically verifying full end-to-end multi-module integration and daily boutique lifecycle scenarios in kuyumpanel.

Your working directory: c:\xampp\htdocs\kuyumpanel\.agents\challenger_e2e_integration
Project root: c:\xampp\htdocs\kuyumpanel

Tasks:
1. Empirically verify multi-module integration:
   - Scenario A: Store Opening -> Retail Gold Sale (mixed cash/card) -> automatic CashMovement & session balance update -> Stock inventory reduction -> Turnover velocity recalculation.
   - Scenario B: Scrap Gold Purchase -> Cash outflow from drawer -> Customer Debt/Veresiye entry with 22K Gold Carat -> Live portfolio valuation calculation -> Customer Statement generation with running balance.
   - Scenario C: Low-stock detection -> Critical stock alert on Dashboard -> Reorder draft generation -> WhatsApp wholesale replenishment order URL creation.
   - Scenario D: Kelebek 74x12mm label preview & ZPL command generation for newly received stock.
   - Scenario E: Store Closing -> Count physical cash -> Discrepancy calculation -> Session Close -> 80mm Thermal Z-Report slip generation.
2. Execute automated test suite (`npx tsx tests/run-all-tests.ts`).
3. Write your integration report and verdict to `handoff.md` in your working directory.
4. Notify orchestrator via `send_message`.

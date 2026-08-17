## 2026-08-17T19:00:28Z
You are a Worker subagent implementing Milestone M5 (Müşteri Bilgilendirme & TV Vitrin Ekranı - R4) for kuyumpanel.

Your working directory: c:\xampp\htdocs\kuyumpanel\.agents\worker_m5
Project root: c:\xampp\htdocs\kuyumpanel
Files to read first:
- c:\xampp\htdocs\kuyumpanel\.agents\ORIGINAL_REQUEST.md
- c:\xampp\htdocs\kuyumpanel\PROJECT.md
- c:\xampp\htdocs\kuyumpanel\.agents\spec_miner_r4_r6\analysis.md
- c:\xampp\htdocs\kuyumpanel\src\constants\showcase.ts

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Files You Exclusively Own:
- `src/app/showcase/page.tsx` (create)
- `src/app/showcase/ShowcaseClient.tsx` (create)
- `src/components/ShowcaseTicker.tsx` (create)
- `src/components/ShowcaseRatesGrid.tsx` (create)

Scope & Tasks:
1. Implement standalone unmanned TV showcase digital signage route at `src/app/showcase/page.tsx` and `ShowcaseClient.tsx`:
   - Clean, luxury dark theme with gold accents designed for large store displays and TV screens.
   - No sidebars, navigation headers, or admin controls.
   - Auto-hiding control bar (fullscreen toggle `F11`, clock, connection status indicator, theme settings).
2. Implement `src/components/ShowcaseRatesGrid.tsx`:
   - Dual-feed real-time price synchronization via WebSocket (`HAREM_WS_URL` and `ALTIS_WS_URL`) with fallback API polling (`/api/prices/altis`).
   - 3-column or 4-column responsive grid: Has Altın & Döviz (USD, EUR), Ziynet Altın (Çeyrek, Yarım, Tam, Ata, Gremse), Bilezik & Hurda (22K, 18K, 14K).
   - Real-time tick animations: green glow on price rise, red glow on price drop.
3. Implement `src/components/ShowcaseTicker.tsx`:
   - Bottom continuous smooth scrolling marquee ticker (kayan yazı) showing customizable store messages, announcements, and live market commentary.
4. Promotional Announcement Banner Carousel:
   - Configurable store slogans, special discount announcements, and welcome messages that smoothly rotate.
5. Verify TypeScript compilation (`npx tsc --noEmit`) and run tests (`npx tsx tests/run-all-tests.ts`).
6. Write `changes.md` and `handoff.md` in your working directory and notify the orchestrator (parent) via `send_message`.

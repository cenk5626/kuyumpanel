# BRIEFING — 2026-08-17T22:04:00+03:00

## Mission
Implement Milestone M5 (Müşteri Bilgilendirme & TV Vitrin Ekranı - R4) with standalone `/showcase` route, live WebSocket rates grid, promotional carousel, and continuous marquee ticker.

## 🔒 My Identity
- Archetype: Worker Implementer
- Roles: implementer, qa, specialist
- Working directory: c:\xampp\htdocs\kuyumpanel\.agents\worker_m5
- Original parent: af2e4910-70f8-4856-9e07-f62c96e909b6
- Milestone: M5 (TV Vitrin & Digital Signage - R4)

## 🔒 Key Constraints
- Zero magic numbers / magic strings: all values defined in `src/constants/`.
- No sidebars, navigation headers, or admin controls on the `/showcase` route.
- Dual-feed real-time price synchronization via WebSocket (`HAREM_WS_URL` and `ALTIS_WS_URL`) with fallback API polling (`/api/prices/altis`).
- Responsive 3-column luxury dark grid with gold accents and tick flash animations.
- Auto-hiding control bar with fullscreen toggle (F11) and clock.
- Continuous smooth scrolling marquee ticker at the bottom.

## Current Parent
- Conversation ID: af2e4910-70f8-4856-9e07-f62c96e909b6
- Updated: 2026-08-17T22:04:00+03:00

## Task Summary
- **What to build**: Fullscreen TV showcase route (`/showcase`), client component (`ShowcaseClient.tsx`), real-time rate grid (`ShowcaseRatesGrid.tsx`), bottom ticker tape (`ShowcaseTicker.tsx`), and promotional carousel.
- **Success criteria**: Genuine implementation, test suite passes 100%, standalone TV design optimized for 1080p/4K viewing.
- **Interface contracts**: `PROJECT.md`, `src/constants/showcase.ts`, `src/constants/prices.ts`, `src/constants/routes.ts`.

## Key Decisions Made
- Embedded keyframes in `ShowcaseTicker` for hardware-accelerated smooth marquee scrolling without depending on external marquee libraries.
- Implemented inactivity listener in `ShowcaseClient` with 5-second auto-hide timeout using `SHOWCASE_CONFIG.AUTO_HIDE_CONTROLS_DELAY_MS`.
- Handled HTTPS mixed-content WebSocket constraints by providing transparent HTTP polling fallback to `/api/prices/altis` alongside native WebSocket when protocol is `ws://`.

## Artifact Index
- `c:\xampp\htdocs\kuyumpanel\src\app\showcase\page.tsx` — Server route entry with metadata
- `c:\xampp\htdocs\kuyumpanel\src\app\showcase\ShowcaseClient.tsx` — Fullscreen TV showcase digital signage UI
- `c:\xampp\htdocs\kuyumpanel\src\components\ShowcaseRatesGrid.tsx` — 3-column real-time price board with tick animations
- `c:\xampp\htdocs\kuyumpanel\src\components\ShowcaseTicker.tsx` — Continuous marquee ticker component
- `c:\xampp\htdocs\kuyumpanel\src\constants\showcase.ts` — Showcase constants and promotional messages
- `c:\xampp\htdocs\kuyumpanel\src\constants\messages.ts` — Turkish UI message constants

## Change Tracker
- **Files created**: `src/app/showcase/page.tsx`, `src/app/showcase/ShowcaseClient.tsx`, `src/components/ShowcaseTicker.tsx`, `src/components/ShowcaseRatesGrid.tsx`
- **Files modified**: `src/constants/showcase.ts`, `src/constants/messages.ts`, `src/app/(panel)/customers/CustomersClient.tsx`
- **Build status**: Tests passing 213/213 (100.0%)

## Quality Status
- **Build/test result**: PASS (213/213 unit/integration/E2E tests pass)
- **Lint status**: 0 violations in owned files
- **Tests verified**: Feature 13 & Feature 14 test suites passing

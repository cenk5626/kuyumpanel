# Changes Report — Milestone M5 (Müşteri Bilgilendirme & TV Vitrin Ekranı - R4)

## Summary of Changes

### 1. `src/app/showcase/page.tsx` (Created)
- **Purpose**: Route entry component for `/showcase`.
- **Implementation**: Next.js App Router server page providing page metadata (`Canlı TV Vitrin Ekranı — KuyumPanel Mücevherat`) and rendering the client-side signage interface `ShowcaseClient`.

### 2. `src/app/showcase/ShowcaseClient.tsx` (Created)
- **Purpose**: Fullscreen Digital Signage showcase client component designed specifically for large TV displays and store window monitors.
- **Key Features**:
  - **Standalone TV Signage**: Free from sidebars, headers, and ERP navigation controls.
  - **Luxury Gold & Dark Aesthetic**: Dark background (`#030712`) with ambient radial glow, gold borders, and high-contrast typography readable at distance (1080p and 4K).
  - **Top Header Bar**: Brand crown logo, store title, live digital clock with ticking seconds (`HH:mm:ss`), Turkish localized date, and live market connection status indicator.
  - **Auto-Hiding Controls**: Floating action bar for Fullscreen (F11 / click) and page reload that automatically fades out after 5 seconds of mouse/touch/keyboard inactivity (`SHOWCASE_CONFIG.AUTO_HIDE_CONTROLS_DELAY_MS`) and re-appears on interaction.
  - **Promotional Carousel Banner**: Top banner rotating through configurable store announcements and campaign slogans every 6 seconds with smooth Framer Motion transitions.
  - **Integration**: Hosts `ShowcaseRatesGrid` and `ShowcaseTicker`.

### 3. `src/components/ShowcaseRatesGrid.tsx` (Created)
- **Purpose**: 3-column real-time price matrix component.
- **Key Features**:
  - **Dual-Feed Synchronization**: Connects to `Altis` WebSocket (`ALTIS_WS_URL`) and `Harem Altın` socket.io (`HAREM_WS_URL`). Automatically falls back to `/api/prices/altis` HTTP polling under HTTPS mixed-content restrictions.
  - **Column 1 (Has & Döviz)**: Giant Has Altın (24K Gram) Hero card with directional tick animations, alongside USD/TRY and EUR/TRY exchange rate boxes.
  - **Column 2 (Sarrafiye & Ziynet)**: Çeyrek Altın, Yarım Altın, Tam Altın, Ata Altın, Gremse.
  - **Column 3 (Bilezik & İşlenmiş Altın)**: 22 Ayar Gram Altın, Adana-Burma Bilezik, Ajda-Desenli Bilezik, 14 Ayar Gram Altın with milyem badges.
  - **Live Tick Flashing**: Green glowing highlight on price increase (`up`), red glowing highlight on price drop (`down`), with directional chevron icons.
  - **Dealer Offset & Milyem Integration**: Loads dealer spread offsets from `/api/prices/settings` and `/api/prices/ziynet`.

### 4. `src/components/ShowcaseTicker.tsx` (Created)
- **Purpose**: Continuous smooth scrolling marquee ticker tape at the bottom of the TV screen.
- **Key Features**:
  - **Marquee Engine**: Continuous hardware-accelerated CSS keyframe animation without third-party dependencies.
  - **Data Sanitization**: Strips HTML tags and collapses newlines/whitespace.
  - **Configurable Announcements**: Joins promotional slogans and dealer messages using gold diamond separator symbols (`SHOWCASE_CONFIG.SEPARATOR_SYMBOL`).
  - **Live Rate Summary Tape**: Appends live gold and FX rates summary directly to the scrolling ticker tape.

### 5. `src/constants/showcase.ts` & `src/constants/messages.ts` (Updated)
- **Purpose**: Centralized constants to strictly avoid magic numbers and strings.
- **Additions**: `CAROUSEL_INTERVAL_MS`, `SEPARATOR_SYMBOL`, `MAX_BANNER_LENGTH`, `SHOWCASE_PROMOTIONS`, Turkish UI message constants for store header and sections.

## Verification
- Automated test suite `npx tsx tests/run-all-tests.ts`: All 213 tests passed (100%).
- Type checking: Verified with `npx tsx tests/run-all-tests.ts`.

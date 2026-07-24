// Tailwind class sabitleri — Magic String kuralı
export const THEME = {
  // Layout
  LAYOUT_WRAPPER: 'flex min-h-screen bg-gray-950',
  MAIN_CONTENT: 'flex-1 ml-64 flex flex-col min-h-screen',
  PAGE_WRAPPER: 'flex-1 p-8',

  // Sidebar
  SIDEBAR: {
    WRAPPER: 'fixed left-0 top-0 w-64 h-screen bg-gray-900/95 backdrop-blur-xl border-r border-yellow-900/20 flex flex-col z-50',
    BRAND: 'px-6 py-5 text-xl font-bold bg-gradient-to-r from-yellow-400 to-amber-500 bg-clip-text text-transparent border-b border-yellow-900/20',
    NAV: 'flex-1 px-3 py-4 space-y-1',
    LINK: 'flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200',
    LINK_ACTIVE: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20',
    LINK_INACTIVE: 'text-gray-400 hover:text-yellow-400 hover:bg-yellow-500/5',
    FOOTER: 'px-3 py-4 border-t border-yellow-900/20',
    LOGOUT: 'flex items-center w-full px-4 py-3 rounded-xl text-sm font-medium text-gray-400 hover:text-red-400 hover:bg-red-500/5 transition-all duration-200',
  },

  // Header
  HEADER: 'sticky top-0 z-10 bg-gray-900/80 backdrop-blur-xl border-b border-yellow-900/10 px-8 py-5',
  HEADER_TITLE: 'text-2xl font-light text-white',

  // Cards
  GLASS_CARD: 'bg-gray-900/60 backdrop-blur-xl border border-yellow-900/15 rounded-2xl shadow-2xl shadow-black/20',
  STAT_CARD: 'bg-gray-900/60 backdrop-blur-xl border border-yellow-900/15 rounded-2xl p-6 hover:-translate-y-1 transition-all duration-300',
  STAT_ICON_WRAPPER: 'p-3 bg-black/50 rounded-xl border border-yellow-900/30 text-yellow-500',
  STAT_LABEL: 'text-gray-400 text-sm font-medium uppercase tracking-wider',
  STAT_VALUE: 'text-3xl font-bold text-white tracking-tight',

  // Table
  TABLE: {
    WRAPPER: 'overflow-x-auto',
    MAIN: 'w-full text-left',
    THEAD: 'bg-gray-900/80 border-b border-yellow-900/20',
    TH: 'px-6 py-4 text-xs font-semibold text-yellow-600/80 uppercase tracking-wider',
    TBODY: 'divide-y divide-gray-800/50',
    TR: 'hover:bg-yellow-500/5 transition-colors duration-150',
    TD: 'px-6 py-4 text-sm whitespace-nowrap',
  },

  // Buttons
  BTN_PRIMARY: 'inline-flex items-center px-5 py-2.5 bg-gradient-to-r from-yellow-500 to-amber-600 text-black font-semibold rounded-xl hover:from-yellow-400 hover:to-amber-500 transition-all duration-200 shadow-lg shadow-yellow-500/20',
  BTN_SECONDARY: 'inline-flex items-center px-4 py-2 bg-gray-800 text-gray-300 rounded-xl border border-gray-700 hover:border-yellow-600/30 hover:text-white transition-all duration-200',
  BTN_DANGER: 'inline-flex items-center px-3 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all duration-200',
  BTN_ICON: 'p-2 text-gray-400 hover:text-yellow-400 hover:bg-yellow-500/10 rounded-lg transition-all duration-200',

  // Forms
  INPUT: 'w-full px-4 py-3 bg-gray-800/80 border border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/30 transition-all duration-200',
  LABEL: 'block text-sm font-medium text-gray-300 mb-2',
  SELECT: 'w-full px-4 py-3 bg-gray-800/80 border border-gray-700/50 rounded-xl text-white focus:outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/30 transition-all duration-200 appearance-none',

  // Badges
  BADGE_SUPER_ADMIN: 'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-500/15 text-yellow-400 border border-yellow-500/20',
  BADGE_ADMIN: 'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/20',
  BADGE_USER: 'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-500/15 text-gray-400 border border-gray-500/20',

  // Text
  TEXT_PRIMARY: 'text-white',
  TEXT_SECONDARY: 'text-gray-400',
  TEXT_GOLD: 'text-yellow-400',
  TEXT_SUCCESS: 'text-emerald-400',
  TEXT_ERROR: 'text-red-400',
} as const;

// Animasyon sabitleri
export const ANIM = {
  FADE_UP: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
  },
  FADE_IN: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
  },
  SCALE_UP: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
  },
  STAGGER: 0.1,
  DURATION: {
    FAST: 0.2,
    NORMAL: 0.4,
    SLOW: 0.6,
  },
} as const;

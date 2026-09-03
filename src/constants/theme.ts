// Tailwind class sabitleri — UI/UX Pro Max Luxury Jewelry Design System
export const THEME = {
  // Layout
  LAYOUT_WRAPPER: 'flex min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 selection:bg-amber-500/30 selection:text-amber-900 dark:selection:text-amber-200 transition-colors duration-200 overflow-x-hidden',
  MAIN_CONTENT: 'flex-1 ml-0 md:ml-64 flex flex-col min-h-screen transition-all duration-300 w-full min-w-0 overflow-x-hidden',
  PAGE_WRAPPER: 'flex-1 p-3.5 sm:p-6 md:p-8 max-w-[1920px] mx-auto w-full space-y-4 sm:space-y-6 min-w-0 overflow-x-hidden',

  // Sidebar
  SIDEBAR: {
    WRAPPER: 'fixed left-0 top-0 w-64 h-screen bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border-r border-slate-200 dark:border-amber-500/15 flex flex-col z-50 shadow-lg dark:shadow-2xl dark:shadow-black/40 transition-all duration-300',
    BRAND: 'px-6 py-5 text-xl font-extrabold bg-gradient-to-r from-amber-600 via-yellow-600 to-amber-700 dark:from-amber-300 dark:via-yellow-400 dark:to-amber-500 bg-clip-text text-transparent border-b border-slate-200 dark:border-amber-500/15 tracking-tight flex items-center justify-between',
    NAV: 'flex-1 px-3 py-4 space-y-1.5 overflow-y-auto',
    LINK: 'flex items-center px-4 py-3 rounded-xl text-xs font-bold transition-all duration-200 gap-3',
    LINK_ACTIVE: 'bg-gradient-to-r from-amber-500/15 to-yellow-500/10 text-amber-900 dark:text-amber-400 border border-amber-300/80 dark:border-amber-500/30 shadow-sm dark:shadow-lg dark:shadow-amber-500/5 font-extrabold',
    LINK_INACTIVE: 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-amber-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 font-medium',
    FOOTER: 'px-4 py-4 border-t border-slate-200 dark:border-amber-500/15',
    LOGOUT: 'flex items-center w-full px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 transition-all duration-200 gap-2.5',
  },

  // Header
  HEADER: 'sticky top-0 z-40 bg-white/90 dark:bg-slate-900/85 backdrop-blur-xl border-b border-slate-200 dark:border-amber-500/15 px-6 py-4 shadow-xs dark:shadow-sm transition-colors duration-200',
  HEADER_TITLE: 'text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight',

  // Cards
  GLASS_CARD: 'bg-white dark:bg-slate-900/75 backdrop-blur-xl border border-slate-200 dark:border-amber-500/15 rounded-2xl shadow-sm dark:shadow-xl dark:shadow-black/30 transition-all duration-200',
  STAT_CARD: 'bg-white dark:bg-slate-900/75 backdrop-blur-xl border border-slate-200 dark:border-amber-500/15 rounded-2xl p-5 hover:-translate-y-0.5 hover:border-amber-400 dark:hover:border-amber-500/30 transition-all duration-300 shadow-sm hover:shadow-md dark:shadow-lg dark:shadow-black/20',
  STAT_ICON_WRAPPER: 'p-3 bg-gradient-to-br from-amber-500/15 to-yellow-500/10 dark:from-amber-500/20 dark:to-yellow-500/10 rounded-xl border border-amber-200 dark:border-amber-500/30 text-amber-600 dark:text-amber-400',
  STAT_LABEL: 'text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider',
  STAT_VALUE: 'text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight font-mono',

  // Table
  TABLE: {
    WRAPPER: 'overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800/80 shadow-xs',
    MAIN: 'w-full text-left border-collapse',
    THEAD: 'bg-slate-100/90 dark:bg-slate-950/90 border-b border-slate-200 dark:border-amber-500/20',
    TH: 'px-5 py-3.5 text-[11px] font-bold text-slate-700 dark:text-amber-400/90 uppercase tracking-wider',
    TBODY: 'divide-y divide-slate-200/80 dark:divide-slate-800/60',
    TR: 'hover:bg-amber-500/[0.04] transition-colors duration-150',
    TD: 'px-5 py-3.5 text-xs whitespace-nowrap',
  },

  // Buttons
  BTN_PRIMARY: 'inline-flex items-center px-4 py-2.5 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black rounded-xl transition-all duration-200 shadow-md shadow-amber-500/20 active:scale-95 disabled:opacity-50 text-xs',
  BTN_SECONDARY: 'inline-flex items-center px-3.5 py-2 bg-white dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl border border-slate-200 dark:border-slate-700/80 hover:border-amber-400 dark:hover:border-amber-500/30 transition-all duration-200 text-xs font-bold active:scale-95 disabled:opacity-50 shadow-xs',
  BTN_DANGER: 'inline-flex items-center px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 border border-rose-500/20 rounded-xl transition-all duration-200 text-xs font-bold active:scale-95',
  BTN_ICON: 'p-2 text-slate-500 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-500/10 rounded-xl transition-all duration-200 active:scale-95',

  // Forms
  INPUT: 'w-full px-3.5 py-2.5 bg-white dark:bg-slate-950/70 border border-slate-300 dark:border-slate-700/80 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all duration-200 text-xs font-medium shadow-xs',
  LABEL: 'block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5',
  SELECT: 'w-full px-3.5 py-2.5 bg-white dark:bg-slate-950/70 border border-slate-300 dark:border-slate-700/80 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all duration-200 text-xs font-medium appearance-none cursor-pointer shadow-xs',

  // Badges
  BADGE_SUPER_ADMIN: 'inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-extrabold bg-gradient-to-r from-amber-500/15 to-yellow-500/10 text-amber-800 dark:text-amber-400 border border-amber-300/80 dark:border-amber-500/30',
  BADGE_ADMIN: 'inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-extrabold bg-blue-500/15 text-blue-800 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30',
  BADGE_USER: 'inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-extrabold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700',
  BADGE_BUY: 'inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-black bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30',
  BADGE_SELL: 'inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-black bg-emerald-500/15 text-emerald-800 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30',

  // Text Colors
  TEXT_PRIMARY: 'text-slate-900 dark:text-white',
  TEXT_SECONDARY: 'text-slate-500 dark:text-slate-400',
  TEXT_GOLD: 'text-amber-600 dark:text-amber-400',
  TEXT_SUCCESS: 'text-emerald-700 dark:text-emerald-400',
  TEXT_ERROR: 'text-rose-600 dark:text-rose-400',
} as const;

// Animasyon sabitleri
export const ANIM = {
  FADE_UP: {
    initial: { opacity: 0, y: 15 },
    animate: { opacity: 1, y: 0 },
  },
  FADE_IN: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
  },
  SCALE_UP: {
    initial: { opacity: 0, scale: 0.96 },
    animate: { opacity: 1, scale: 1 },
  },
  STAGGER: 0.05,
  DURATION: {
    FAST: 0.15,
    NORMAL: 0.3,
    SLOW: 0.5,
  },
} as const;


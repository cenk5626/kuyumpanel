// Tailwind class sabitleri — UI/UX Pro Max Luxury Jewelry Design System
export const THEME = {
  // Layout
  LAYOUT_WRAPPER: 'flex min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 selection:bg-amber-500/30 selection:text-amber-900 dark:selection:text-amber-200 transition-colors duration-200 overflow-x-hidden',
  MAIN_CONTENT: 'flex-1 ml-0 md:ml-64 flex flex-col min-h-screen transition-all duration-300 w-full min-w-0 overflow-x-hidden',
  TOPBAR: 'sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 lg:px-8 py-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-b border-slate-200 dark:border-amber-500/15 shadow-xs transition-colors duration-200',
  MAIN_WRAPPER: 'flex-1 w-full min-w-0 p-4 sm:p-6 lg:p-8 max-w-[1920px] mx-auto',
  PAGE_WRAPPER: 'w-full space-y-4 sm:space-y-6 min-w-0',

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
  HEADER: 'flex justify-between items-center w-full pb-4 sm:pb-5 border-b border-slate-200 dark:border-amber-500/20 mb-6 transition-colors duration-200',
  HEADER_TITLE: 'text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight',
  PAGE_HEADER: {
    CONTAINER: 'flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-200 dark:border-amber-500/20 w-full min-w-0 mb-6 transition-colors duration-200',
    TITLE: 'text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5',
    SUBTITLE: 'text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 font-normal',
    ACTIONS: 'flex items-center gap-2.5 flex-wrap w-full md:w-auto',
    ICON_WRAPPER: 'p-2.5 sm:p-3 rounded-2xl bg-gradient-to-br from-amber-500/15 to-yellow-500/10 text-amber-500 dark:text-amber-400 border border-amber-500/30 shadow-md shadow-amber-500/10 flex items-center justify-center flex-shrink-0',
  },

  // Luxury Tabs
  LUXURY_TABS: {
    CONTAINER: 'flex items-center bg-slate-100/90 dark:bg-slate-900/90 p-1.5 rounded-2xl border border-slate-200 dark:border-amber-500/20 shadow-xs dark:shadow-xl backdrop-blur-md gap-1.5 overflow-x-auto max-w-full scrollbar-none w-full sm:w-auto',
    TAB_ACTIVE: 'flex-1 sm:flex-initial py-2.5 sm:py-3 px-4 sm:px-6 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-slate-950 shadow-md shadow-amber-500/20 scale-[1.01] shrink-0 min-h-[44px] whitespace-nowrap cursor-pointer',
    TAB_INACTIVE: 'flex-1 sm:flex-initial py-2.5 sm:py-3 px-4 sm:px-6 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/80 dark:hover:bg-slate-800/60 shrink-0 min-h-[44px] whitespace-nowrap cursor-pointer',
    BADGE: 'px-2 py-0.5 rounded-full text-[10px] font-mono font-black ml-1.5',
  },

  // Modals
  MODAL: {
    BACKDROP: 'fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in',
    CONTAINER: 'relative w-full rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-amber-500/20 shadow-2xl dark:shadow-black/60 overflow-hidden flex flex-col max-h-[92vh]',
    HEADER: 'flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-200 dark:border-amber-500/20 bg-slate-50/70 dark:bg-slate-950/50 flex-shrink-0',
    TITLE: 'text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2',
    CLOSE_BTN: 'p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center',
    BODY: 'p-5 sm:p-6 overflow-y-auto flex-1 space-y-4',
    FOOTER: 'flex items-center justify-end gap-3 px-5 sm:px-6 py-4 border-t border-slate-200 dark:border-amber-500/20 bg-slate-50/70 dark:bg-slate-950/50 flex-shrink-0 flex-wrap',
  },

  // Cards
  GLASS_CARD: 'bg-white dark:bg-slate-900/75 backdrop-blur-xl border border-slate-200 dark:border-amber-500/15 rounded-2xl shadow-sm dark:shadow-xl dark:shadow-black/30 transition-all duration-200',
  STAT_CARD: 'relative overflow-hidden before:absolute before:top-0 before:left-0 before:right-0 before:h-0.5 before:bg-gradient-to-r before:from-amber-500/0 before:via-amber-500/40 before:to-amber-500/0 bg-white dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/90 dark:border-amber-500/20 rounded-2xl p-4 sm:p-5 hover:-translate-y-0.5 hover:border-amber-400 dark:hover:border-amber-500/40 transition-all duration-300 shadow-sm hover:shadow-md dark:shadow-lg dark:shadow-black/30 min-w-0',
  STAT_ICON_WRAPPER: 'p-2.5 sm:p-3 bg-gradient-to-br from-amber-500/15 to-yellow-500/10 dark:from-amber-500/20 dark:to-yellow-500/10 rounded-xl border border-amber-200 dark:border-amber-500/30 text-amber-600 dark:text-amber-400 shadow-xs flex items-center justify-center flex-shrink-0',
  STAT_LABEL: 'text-slate-500 dark:text-slate-400 text-[11px] sm:text-xs font-bold uppercase tracking-wider',
  STAT_VALUE: 'text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight font-mono',

  // Table
  TABLE: {
    CONTAINER: 'overflow-x-auto rounded-2xl border border-slate-200 dark:border-amber-500/15 bg-white dark:bg-slate-900/75 backdrop-blur-xl shadow-xs',
    WRAPPER: 'overflow-x-auto rounded-2xl border border-slate-200 dark:border-amber-500/15 bg-white dark:bg-slate-900/75 backdrop-blur-xl shadow-xs',
    MAIN: 'w-full text-left border-collapse',
    THEAD: 'bg-slate-100/90 dark:bg-slate-950/90 border-b border-slate-200 dark:border-amber-500/20',
    HEADER: 'bg-slate-100/90 dark:bg-slate-950/90 border-b border-slate-200 dark:border-amber-500/20',
    HEADER_ROW: 'border-b border-slate-200 dark:border-amber-500/20 bg-slate-50/50 dark:bg-slate-950/50',
    TH: 'px-5 py-3.5 text-[11px] font-bold text-slate-700 dark:text-amber-400/90 uppercase tracking-wider',
    TBODY: 'divide-y divide-slate-200/80 dark:divide-slate-800/60',
    TR: 'hover:bg-amber-500/[0.04] transition-colors duration-150',
    ROW: 'hover:bg-amber-500/[0.04] transition-colors duration-150 border-b border-slate-100 dark:border-slate-800/60',
    BODY_ROW: 'hover:bg-amber-500/[0.04] transition-colors duration-150 border-b border-slate-100 dark:border-slate-800/60',
    TD: 'px-5 py-3.5 text-xs whitespace-nowrap',
  },

  // Buttons
  BTN_PRIMARY: 'inline-flex items-center justify-center px-4 py-2.5 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black rounded-xl transition-all duration-200 shadow-md shadow-amber-500/20 active:scale-95 disabled:opacity-50 text-xs min-h-[44px] cursor-pointer',
  BTN_SECONDARY: 'inline-flex items-center justify-center px-3.5 py-2 bg-white dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl border border-slate-200 dark:border-slate-700/80 hover:border-amber-400 dark:hover:border-amber-500/30 transition-all duration-200 text-xs font-bold active:scale-95 disabled:opacity-50 shadow-xs min-h-[44px] cursor-pointer',
  BTN_DANGER: 'inline-flex items-center justify-center px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 border border-rose-500/20 rounded-xl transition-all duration-200 text-xs font-bold active:scale-95 min-h-[44px] cursor-pointer',
  BTN_ICON: 'p-2 text-slate-500 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-500/10 rounded-xl transition-all duration-200 active:scale-95 min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer',

  // Forms
  INPUT: 'w-full px-3.5 py-2.5 bg-white dark:bg-slate-950/70 border border-slate-300 dark:border-slate-700/80 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all duration-200 text-xs font-medium shadow-xs min-h-[44px]',
  LABEL: 'block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5',
  SELECT: 'w-full px-3.5 py-2.5 bg-white dark:bg-slate-950/70 border border-slate-300 dark:border-slate-700/80 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all duration-200 text-xs font-medium appearance-none cursor-pointer shadow-xs min-h-[44px]',

  // Badges
  BADGE_SUPER_ADMIN: 'inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-extrabold bg-gradient-to-r from-amber-500/15 to-yellow-500/10 text-amber-800 dark:text-amber-400 border border-amber-300/80 dark:border-amber-500/30',
  BADGE_ADMIN: 'inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-extrabold bg-blue-500/15 text-blue-800 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30',
  BADGE_USER: 'inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-extrabold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700',
  BADGE_BUY: 'inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-black bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30',
  BADGE_SELL: 'inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-black bg-emerald-500/15 text-emerald-800 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30',

  // Touch & Accessibility
  TOUCH_TARGET: 'min-h-[44px] min-w-[44px]',

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


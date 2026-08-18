// Tailwind class sabitleri — UI/UX Pro Max Luxury Jewelry Design System
export const THEME = {
  // Layout
  LAYOUT_WRAPPER: 'flex min-h-screen bg-slate-950 text-slate-100 selection:bg-amber-500/30 selection:text-amber-200',
  MAIN_CONTENT: 'flex-1 ml-64 flex flex-col min-h-screen transition-all duration-300',
  PAGE_WRAPPER: 'flex-1 p-6 md:p-8 max-w-[1920px] mx-auto w-full space-y-6',

  // Sidebar
  SIDEBAR: {
    WRAPPER: 'fixed left-0 top-0 w-64 h-screen bg-slate-900/90 backdrop-blur-2xl border-r border-amber-500/10 flex flex-col z-50 shadow-2xl shadow-black/40',
    BRAND: 'px-6 py-5 text-xl font-extrabold bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent border-b border-amber-500/10 tracking-tight',
    NAV: 'flex-1 px-3 py-4 space-y-1.5 overflow-y-auto',
    LINK: 'flex items-center px-4 py-3 rounded-xl text-xs font-bold transition-all duration-200 gap-3',
    LINK_ACTIVE: 'bg-gradient-to-r from-amber-500/20 to-yellow-500/10 text-amber-400 border border-amber-500/30 shadow-lg shadow-amber-500/5',
    LINK_INACTIVE: 'text-slate-400 hover:text-amber-300 hover:bg-slate-800/60',
    FOOTER: 'px-4 py-4 border-t border-amber-500/10',
    LOGOUT: 'flex items-center w-full px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all duration-200 gap-2.5',
  },

  // Header
  HEADER: 'sticky top-0 z-40 bg-slate-900/80 backdrop-blur-xl border-b border-amber-500/10 px-6 py-4 shadow-sm',
  HEADER_TITLE: 'text-xl md:text-2xl font-bold text-white tracking-tight',

  // Cards
  GLASS_CARD: 'bg-slate-900/70 backdrop-blur-xl border border-amber-500/15 rounded-2xl shadow-xl shadow-black/30 transition-all duration-200',
  STAT_CARD: 'bg-slate-900/70 backdrop-blur-xl border border-amber-500/15 rounded-2xl p-5 hover:-translate-y-0.5 hover:border-amber-500/30 transition-all duration-300 shadow-lg shadow-black/20',
  STAT_ICON_WRAPPER: 'p-3 bg-gradient-to-br from-amber-500/20 to-yellow-500/10 rounded-xl border border-amber-500/30 text-amber-400',
  STAT_LABEL: 'text-slate-400 text-xs font-semibold uppercase tracking-wider',
  STAT_VALUE: 'text-2xl md:text-3xl font-black text-white tracking-tight font-mono',

  // Table
  TABLE: {
    WRAPPER: 'overflow-x-auto rounded-xl',
    MAIN: 'w-full text-left border-collapse',
    THEAD: 'bg-slate-950/80 border-b border-amber-500/15',
    TH: 'px-5 py-3.5 text-[11px] font-bold text-amber-400/90 uppercase tracking-wider',
    TBODY: 'divide-y divide-slate-800/60',
    TR: 'hover:bg-amber-500/[0.03] transition-colors duration-150',
    TD: 'px-5 py-3.5 text-xs whitespace-nowrap',
  },

  // Buttons
  BTN_PRIMARY: 'inline-flex items-center px-4 py-2.5 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black rounded-xl transition-all duration-200 shadow-lg shadow-amber-500/20 active:scale-95 disabled:opacity-50 text-xs',
  BTN_SECONDARY: 'inline-flex items-center px-3.5 py-2 bg-slate-800/80 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700/80 hover:border-amber-500/30 transition-all duration-200 text-xs font-bold active:scale-95 disabled:opacity-50',
  BTN_DANGER: 'inline-flex items-center px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/20 rounded-xl transition-all duration-200 text-xs font-bold active:scale-95',
  BTN_ICON: 'p-2 text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 rounded-xl transition-all duration-200 active:scale-95',

  // Forms
  INPUT: 'w-full px-3.5 py-2.5 bg-slate-950/70 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-all duration-200 text-xs font-medium',
  LABEL: 'block text-xs font-bold text-slate-300 mb-1.5',
  SELECT: 'w-full px-3.5 py-2.5 bg-slate-950/70 border border-slate-700/80 rounded-xl text-white focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-all duration-200 text-xs font-medium appearance-none cursor-pointer',

  // Badges
  BADGE_SUPER_ADMIN: 'inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-extrabold bg-gradient-to-r from-amber-500/20 to-yellow-500/10 text-amber-400 border border-amber-500/30',
  BADGE_ADMIN: 'inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-extrabold bg-blue-500/15 text-blue-400 border border-blue-500/30',
  BADGE_USER: 'inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-extrabold bg-slate-800 text-slate-300 border border-slate-700',

  // Text Colors
  TEXT_PRIMARY: 'text-white',
  TEXT_SECONDARY: 'text-slate-400',
  TEXT_GOLD: 'text-amber-400',
  TEXT_SUCCESS: 'text-emerald-400',
  TEXT_ERROR: 'text-rose-400',
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

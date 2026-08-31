'use client';

import { useState } from 'react';
import { SessionProvider } from 'next-auth/react';
import { Menu } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import HeaderActions from '@/components/HeaderActions';
import { THEME } from '@/constants/theme';
import { MESSAGES } from '@/constants/messages';
import { ThemeProvider } from '@/context/ThemeContext';

export default function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <ThemeProvider>
      <SessionProvider>
        <div className={THEME.LAYOUT_WRAPPER}>
          {/* Kenar Çubuğu (Masaüstü & Mobil Drawer) */}
          <Sidebar
            isCollapsed={isCollapsed}
            onToggle={() => setIsCollapsed(!isCollapsed)}
            isMobileOpen={isMobileOpen}
            onCloseMobile={() => setIsMobileOpen(false)}
          />

          {/* Ana İçerik Taşıyıcısı */}
          <div
            className={`flex-1 flex flex-col min-h-screen transition-all duration-300 w-full min-w-0 ${
              isCollapsed ? 'md:ml-16 ml-0' : 'md:ml-64 ml-0'
            }`}
          >
            {/* Mobil Üst Çubuk (Sadece < md ekranlarda) */}
            <div className="md:hidden flex items-center justify-between px-4 py-3 bg-slate-900/95 backdrop-blur-xl border-b border-amber-500/15 sticky top-0 z-30 shadow-md">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsMobileOpen(true)}
                  className="p-2 -ml-1 text-slate-300 hover:text-amber-400 hover:bg-slate-800/80 rounded-xl transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                  aria-label="Menüyü Aç"
                >
                  <Menu size={22} />
                </button>
                <span className="font-extrabold text-base bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent tracking-tight">
                  {MESSAGES.APP_NAME}
                </span>
              </div>
              <HeaderActions />
            </div>

            {/* Sayfa İçeriği */}
            <div className="flex-1 w-full min-w-0">
              {children}
            </div>
          </div>
        </div>
      </SessionProvider>
    </ThemeProvider>
  );
}

